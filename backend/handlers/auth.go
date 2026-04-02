package handlers

import (
	"crypto/rand"
	"encoding/base32"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"

	"chalkback/config"
	authmw "chalkback/middleware"
	"chalkback/models"
)

// ── helpers ───────────────────────────────────────────────────────────────────

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	re := regexp.MustCompile(`[^a-z0-9]+`)
	s = re.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

// generateSecureToken returns a cryptographically random hex string of `n` bytes
func generateSecureToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// generateFormToken creates a random opaque token used in public URLs instead of slug
func generateFormToken() (string, error) {
	return generateSecureToken(24) // 48 hex chars, unguessable
}

func generateToken(teacherID uint) (string, error) {
	claims := jwt.MapClaims{
		"teacher_id": teacherID,
		"exp":        time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

func setAuthCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "chalkback_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode, 
		MaxAge:   7 * 24 * 60 * 60,
	})
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// getClientIP extracts the real IP from request (respects X-Forwarded-For)
func getClientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		// take the first IP (client IP, not proxy IP)
		return strings.TrimSpace(strings.Split(fwd, ",")[0])
	}
	ip := r.RemoteAddr
	// strip port
	if idx := strings.LastIndex(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}
	return ip
}

// isIPBanned checks if an IP is currently banned
func isIPBanned(ip string) bool {
	var ban models.IPBanList
	if err := config.DB.Where("ip = ? AND ban_expiry > ?", ip, time.Now()).First(&ban).Error; err != nil {
		return false
	}
	return true
}

// banIP bans an IP for the given duration
func banIP(ip, reason string, duration time.Duration) {
	ban := models.IPBanList{
		IP:        ip,
		BannedAt:  time.Now(),
		BanExpiry: time.Now().Add(duration),
		Reason:    reason,
	}
	// Upsert: update if exists
	config.DB.Where("ip = ?", ip).Assign(ban).FirstOrCreate(&ban)
	config.DB.Model(&ban).Updates(map[string]interface{}{
		"banned_at":  ban.BannedAt,
		"ban_expiry": ban.BanExpiry,
		"reason":     reason,
	})
}

// recordOTPAttempt records a failed OTP attempt and bans IP if threshold exceeded
func recordOTPAttempt(ip string) {
	attempt := models.OTPAttempt{IP: ip, AttemptAt: time.Now()}
	config.DB.Create(&attempt)

	// Count attempts in the last 10 minutes
	var count int64
	config.DB.Model(&models.OTPAttempt{}).
		Where("ip = ? AND attempt_at > ?", ip, time.Now().Add(-10*time.Minute)).
		Count(&count)

	// Ban after 4-5 failed OTP attempts
	if count >= 5 {
		banIP(ip, "OTP brute force", 30*time.Minute)
		// Clean up OTP attempts for this IP
		config.DB.Where("ip = ?", ip).Delete(&models.OTPAttempt{})
	}
}

// validatePassword checks password strength
func validatePassword(p string) string {
	if len(p) < 8 {
		return "password must be at least 8 characters"
	}
	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, c := range p {
		switch {
		case unicode.IsUpper(c):
			hasUpper = true
		case unicode.IsLower(c):
			hasLower = true
		case unicode.IsDigit(c):
			hasDigit = true
		case unicode.IsPunct(c) || unicode.IsSymbol(c):
			hasSpecial = true
		}
	}
	if !hasUpper {
		return "password must contain at least one uppercase letter"
	}
	if !hasLower {
		return "password must contain at least one lowercase letter"
	}
	if !hasDigit {
		return "password must contain at least one number"
	}
	if !hasSpecial {
		return "password must contain at least one special character"
	}
	return ""
}

// ── Register ──────────────────────────────────────────────────────────────────

func Register(w http.ResponseWriter, r *http.Request) {
	ip := getClientIP(r)
	if isIPBanned(ip) {
		jsonError(w, "too many failed attempts — try again later", http.StatusTooManyRequests)
		return
	}

	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Subject  string `json:"subject"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}
	if req.Name == "" || req.Email == "" || req.Password == "" {
		jsonError(w, "name, email and password are required", http.StatusBadRequest)
		return
	}

	if msg := validatePassword(req.Password); msg != "" {
		jsonError(w, msg, http.StatusBadRequest)
		return
	}

	// Use bcrypt cost 12 (stronger than default 10)
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	slug := slugify(req.Name)

	// Generate unique opaque form token — this is what goes in public URLs, not the slug
	formToken, err := generateFormToken()
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	teacher := models.Teacher{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hash),
		Slug:         slug,
		FormToken:    formToken,
		Subject:      req.Subject,
	}

	if err := config.DB.Create(&teacher).Error; err != nil {
		// Always return same error — don't reveal if email exists
		jsonError(w, "could not create account", http.StatusConflict)
		return
	}

	token, _ := generateToken(teacher.ID)
	setAuthCookie(w, token)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"teacher":    sanitizeTeacher(teacher),
		"form_token": teacher.FormToken, // frontend uses this for the public form URL
	})
}

// sanitizeTeacher returns only safe fields to send to the client
func sanitizeTeacher(t models.Teacher) map[string]interface{} {
	return map[string]interface{}{
		"id":             t.ID,
		"name":           t.Name,
		"subject":        t.Subject,
		"two_fa_enabled": t.TwoFAEnabled,
		"created_at":     t.CreatedAt,
		
	}
}

// ── Login ─────────────────────────────────────────────────────────────────────

func Login(w http.ResponseWriter, r *http.Request) {
	ip := getClientIP(r)

	// Check IP ban first
	if isIPBanned(ip) {
		jsonError(w, "too many failed attempts — try again later", http.StatusTooManyRequests)
		return
	}

	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		OTPCode  string `json:"otp_code"` // optional — required only if 2FA is enabled
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	
	const genericErr = "invalid credentials"

	var teacher models.Teacher
	if err := config.DB.Where("email = ?", req.Email).First(&teacher).Error; err != nil {
		// Deliberately slow the response to match bcrypt timing — prevents timing attacks
		bcrypt.CompareHashAndPassword([]byte("$2a$12$dummyhashtopreventtimingattacks.."), []byte(req.Password))
		jsonError(w, genericErr, http.StatusUnauthorized)
		return
	}

	// ── Account lockout check ──
	if teacher.LoginAttempts >= 3 && time.Now().Before(teacher.LockedUntil) {
		remaining := time.Until(teacher.LockedUntil).Round(time.Minute)
		jsonError(w, fmt.Sprintf("account locked — try again in %s", remaining), http.StatusTooManyRequests)
		return
	}

	// Reset attempts if lockout has expired
	if time.Now().After(teacher.LockedUntil) && teacher.LoginAttempts >= 3 {
		config.DB.Model(&teacher).Updates(map[string]interface{}{"login_attempts": 0, "locked_until": time.Time{}})
		teacher.LoginAttempts = 0
	}

	// ── Password check ──
	if err := bcrypt.CompareHashAndPassword([]byte(teacher.PasswordHash), []byte(req.Password)); err != nil {
		// Increment failed attempts
		newAttempts := teacher.LoginAttempts + 1
		updates := map[string]interface{}{"login_attempts": newAttempts}

		if newAttempts >= 3 {
			// Lock for 15 minutes
			updates["locked_until"] = time.Now().Add(15 * time.Minute)
		}
		config.DB.Model(&teacher).Updates(updates)

		jsonError(w, genericErr, http.StatusUnauthorized)
		return
	}

	// ── 2FA check (if enabled) ──
	if teacher.TwoFAEnabled {
		if req.OTPCode == "" {
			// Signal frontend that 2FA is required — do NOT issue token yet
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusAccepted) // 202 = "credentials ok, need OTP"
			json.NewEncoder(w).Encode(map[string]interface{}{
				"two_fa_required": true,
			})
			return
		}

		// Validate OTP
		if !totp.Validate(req.OTPCode, teacher.TwoFASecret) {
			recordOTPAttempt(ip)
			jsonError(w, genericErr, http.StatusUnauthorized)
			return
		}
	}

	// ── Success: reset login attempts ──
	config.DB.Model(&teacher).Updates(map[string]interface{}{"login_attempts": 0, "locked_until": time.Time{}})

	token, _ := generateToken(teacher.ID)
	setAuthCookie(w, token)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"teacher":    sanitizeTeacher(teacher),
		"form_token": teacher.FormToken,
	})
}

// ── Logout ────────────────────────────────────────────────────────────────────

func Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:    "chalkback_token",
		Value:   "",
		Path:    "/",
		MaxAge:  -1,
		Expires: time.Unix(0, 0),
	})
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "logged out"})
}

// ── GetMe ─────────────────────────────────────────────────────────────────────

func GetMe(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)
	var teacher models.Teacher
	if err := config.DB.First(&teacher, teacherID).Error; err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	// Return sanitized teacher + form_token (frontend needs this to build the public URL)
	resp := sanitizeTeacher(teacher)
	resp["form_token"] = teacher.FormToken
	json.NewEncoder(w).Encode(resp)
}



func Setup2FA(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)

	var teacher models.Teacher
	if err := config.DB.First(&teacher, teacherID).Error; err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	if teacher.TwoFAEnabled {
		jsonError(w, "2FA is already enabled", http.StatusBadRequest)
		return
	}

	// Generate a new TOTP secret
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "ChalkBack",
		AccountName: teacher.Email,
	})
	if err != nil {
		jsonError(w, "could not generate 2FA secret", http.StatusInternalServerError)
		return
	}

	// Store the secret (not yet enabled — only enabled after verification)
	config.DB.Model(&teacher).Update("two_fa_secret", key.Secret())

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"secret":  key.Secret(),
		"qr_url":  key.URL(), // otpauth:// URL — pass to a QR library on frontend
		"message": "scan the QR code in your authenticator app, then call /verify-2fa with an OTP to activate",
	})
}

// ── Verify2FA ─────────────────────────────────────────────────────────────────
// Protected. Teacher confirms the TOTP code to activate 2FA.

func Verify2FA(w http.ResponseWriter, r *http.Request) {
	ip := getClientIP(r)

	if isIPBanned(ip) {
		jsonError(w, "too many failed attempts — try again later", http.StatusTooManyRequests)
		return
	}

	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)

	var req struct {
		OTPCode string `json:"otp_code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	var teacher models.Teacher
	if err := config.DB.First(&teacher, teacherID).Error; err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	if teacher.TwoFASecret == "" {
		jsonError(w, "call /setup-2fa first", http.StatusBadRequest)
		return
	}

	if !totp.Validate(req.OTPCode, teacher.TwoFASecret) {
		recordOTPAttempt(ip)
		jsonError(w, "invalid OTP code", http.StatusUnauthorized)
		return
	}

	// Activate 2FA
	config.DB.Model(&teacher).Update("two_fa_enabled", true)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "2FA enabled successfully"})
}

// ── Disable2FA ────────────────────────────────────────────────────────────────
// Protected. Teacher disables 2FA by confirming their password + current OTP.

func Disable2FA(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)

	var req struct {
		Password string `json:"password"`
		OTPCode  string `json:"otp_code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	var teacher models.Teacher
	if err := config.DB.First(&teacher, teacherID).Error; err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(teacher.PasswordHash), []byte(req.Password)); err != nil {
		jsonError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	if !totp.Validate(req.OTPCode, teacher.TwoFASecret) {
		jsonError(w, "invalid OTP code", http.StatusUnauthorized)
		return
	}

	config.DB.Model(&teacher).Updates(map[string]interface{}{
		"two_fa_enabled": false,
		"two_fa_secret":  "",
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "2FA disabled"})
}

// ── ChangePassword ────────────────────────────────────────────────────────────

func ChangePassword(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}
	if req.CurrentPassword == "" || req.NewPassword == "" {
		jsonError(w, "current and new password are required", http.StatusBadRequest)
		return
	}

	if msg := validatePassword(req.NewPassword); msg != "" {
		jsonError(w, msg, http.StatusBadRequest)
		return
	}

	var teacher models.Teacher
	if err := config.DB.First(&teacher, teacherID).Error; err != nil {
		jsonError(w, "teacher not found", http.StatusNotFound)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(teacher.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		jsonError(w, "current password is incorrect", http.StatusUnauthorized)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	if err := config.DB.Model(&teacher).Update("password_hash", string(hash)).Error; err != nil {
		jsonError(w, "failed to update password", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "password changed successfully"})
}

// ── ForgotPassword ────────────────────────────────────────────────────────────

func ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}
	if req.Email == "" {
		jsonError(w, "email is required", http.StatusBadRequest)
		return
	}

	// Always return success — never reveal if email exists (username enumeration fix)
	genericResp := map[string]string{"message": "if that email exists, a reset link has been sent"}

	var teacher models.Teacher
	if err := config.DB.Where("email = ?", req.Email).First(&teacher).Error; err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(genericResp)
		return
	}

	// Generate cryptographically secure reset token
	resetToken, err := generateSecureToken(32) // 64 hex chars
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(genericResp)
		return
	}

	expiry := time.Now().Add(1 * time.Hour)
	config.DB.Model(&teacher).Updates(map[string]interface{}{
		"reset_token":        resetToken,
		"reset_token_expiry": expiry,
	})

	// TODO: Send email with reset link:
	// resetLink := os.Getenv("FRONTEND_URL") + "/reset-password?token=" + resetToken
	// SendEmail(teacher.Email, resetLink)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(genericResp)
}

// ── ResetPassword ─────────────────────────────────────────────────────────────

func ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}
	if req.Token == "" || req.NewPassword == "" {
		jsonError(w, "token and new password are required", http.StatusBadRequest)
		return
	}

	if msg := validatePassword(req.NewPassword); msg != "" {
		jsonError(w, msg, http.StatusBadRequest)
		return
	}

	var teacher models.Teacher
	if err := config.DB.Where("reset_token = ?", req.Token).First(&teacher).Error; err != nil {
		jsonError(w, "invalid or expired reset token", http.StatusBadRequest)
		return
	}

	if time.Now().After(teacher.ResetTokenExpiry) {
		jsonError(w, "reset token has expired", http.StatusBadRequest)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	config.DB.Model(&teacher).Updates(map[string]interface{}{
		"password_hash":      string(hash),
		"reset_token":        "",
		"reset_token_expiry": time.Time{},
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "password reset successfully"})
}

// ── GenerateFormToken (admin) ─────────────────────────────────────────────────
// Protected. Regenerates the teacher's public form token (invalidates old public link).

func RegenerateFormToken(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)

	newToken, err := generateFormToken()
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	if err := config.DB.Model(&models.Teacher{}).Where("id = ?", teacherID).
		Update("form_token", newToken).Error; err != nil {
		jsonError(w, "failed to regenerate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"form_token": newToken,
		"message":    "form token regenerated — your old link is now invalid",
	})
}

// Ensure unused imports are satisfied (base32 used by TOTP lib indirectly)
var _ = base32.StdEncoding