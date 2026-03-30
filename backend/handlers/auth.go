package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"chalkback/config"
	authmw "chalkback/middleware"
	"chalkback/models"
)

// ── helpers ──────────────────────────────────────────────────────────────────

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	re := regexp.MustCompile(`[^a-z0-9]+`)
	s = re.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
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
		Secure:   os.Getenv("ENV") == "production",
		SameSite: http.SameSiteLaxMode,
		MaxAge:   7 * 24 * 60 * 60,
	})
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// validatePassword checks:
// - at least 8 characters
// - at least one uppercase letter
// - at least one lowercase letter
// - at least one digit
// - at least one special character
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
	return "" // empty = valid
}

// ── Register ─────────────────────────────────────────────────────────────────

func Register(w http.ResponseWriter, r *http.Request) {
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

	// Validate password strength
	if msg := validatePassword(req.Password); msg != "" {
		jsonError(w, msg, http.StatusBadRequest)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	slug := slugify(req.Name)
	teacher := models.Teacher{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hash),
		Slug:         slug,
		Subject:      req.Subject,
	}

	if err := config.DB.Create(&teacher).Error; err != nil {
		jsonError(w, "email already exists", http.StatusConflict)
		return
	}

	token, _ := generateToken(teacher.ID)
	setAuthCookie(w, token)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"teacher": teacher,
		"token":   token,
	})
}

// ── Login ────────────────────────────────────────────────────────────────────

func Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	var teacher models.Teacher
	if err := config.DB.Where("email = ?", req.Email).First(&teacher).Error; err != nil {
		jsonError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(teacher.PasswordHash), []byte(req.Password)); err != nil {
		jsonError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	token, _ := generateToken(teacher.ID)
	setAuthCookie(w, token)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"teacher": teacher,
		"token":   token,
	})
}

// ── Logout ───────────────────────────────────────────────────────────────────

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

// ── GetMe ────────────────────────────────────────────────────────────────────

func GetMe(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)
	var teacher models.Teacher
	if err := config.DB.First(&teacher, teacherID).Error; err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(teacher)
}

// ── ChangePassword ───────────────────────────────────────────────────────────
// Protected route — teacher must be logged in.
// Body: { "current_password": "...", "new_password": "..." }

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

	// Validate new password strength
	if msg := validatePassword(req.NewPassword); msg != "" {
		jsonError(w, msg, http.StatusBadRequest)
		return
	}

	var teacher models.Teacher
	if err := config.DB.First(&teacher, teacherID).Error; err != nil {
		jsonError(w, "teacher not found", http.StatusNotFound)
		return
	}

	// Verify current password is correct
	if err := bcrypt.CompareHashAndPassword([]byte(teacher.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		jsonError(w, "current password is incorrect", http.StatusUnauthorized)
		return
	}

	// Hash new password and save
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
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

// ── ForgotPassword ───────────────────────────────────────────────────────────
// Public route.
// Body: { "email": "..." }
// In production you'd email the token. Here we return it directly so you can
// integrate any email service (SendGrid, Resend, etc.) later.

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

	var teacher models.Teacher
	if err := config.DB.Where("email = ?", req.Email).First(&teacher).Error; err != nil {
		// Don't reveal whether the email exists — always return success
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "if that email exists, a reset link has been sent"})
		return
	}

	// Generate a simple reset token (random-ish using time + id)
	// In production, use crypto/rand for a truly random token
	raw := fmt.Sprintf("%d-%d", teacher.ID, time.Now().UnixNano())
	tokenHash, _ := bcrypt.GenerateFromPassword([]byte(raw), bcrypt.MinCost)
	resetToken := fmt.Sprintf("%x", tokenHash)[:40] // take first 40 chars

	expiry := time.Now().Add(1 * time.Hour)

	config.DB.Model(&teacher).Updates(map[string]interface{}{
		"reset_token":        resetToken,
		"reset_token_expiry": expiry,
	})

	// TODO: Send email with reset link:
	// resetLink := os.Getenv("FRONTEND_URL") + "/reset-password?token=" + resetToken
	// SendEmail(teacher.Email, resetLink)

	// For now, return token in response so you can test it
	// Remove the "token" field once you integrate an email service
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "if that email exists, a reset link has been sent",
		"token":   resetToken, // REMOVE THIS in production after adding email
	})
}

// ── ResetPassword ────────────────────────────────────────────────────────────
// Public route.
// Body: { "token": "...", "new_password": "..." }

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

	// Validate new password strength
	if msg := validatePassword(req.NewPassword); msg != "" {
		jsonError(w, msg, http.StatusBadRequest)
		return
	}

	// Find teacher with this token
	var teacher models.Teacher
	if err := config.DB.Where("reset_token = ?", req.Token).First(&teacher).Error; err != nil {
		jsonError(w, "invalid or expired reset token", http.StatusBadRequest)
		return
	}

	// Check token hasn't expired
	if time.Now().After(teacher.ResetTokenExpiry) {
		jsonError(w, "reset token has expired", http.StatusBadRequest)
		return
	}

	// Hash new password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	// Save new password and clear reset token
	config.DB.Model(&teacher).Updates(map[string]interface{}{
		"password_hash":      string(hash),
		"reset_token":        "",
		"reset_token_expiry": time.Time{},
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "password reset successfully"})
}