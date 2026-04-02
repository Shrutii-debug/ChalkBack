package middleware

import (
	"context"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"chalkback/config"
	"chalkback/models"
)

type contextKey string

const TeacherIDKey contextKey = "teacher ID"

// getClientIP extracts real client IP
func getClientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		return strings.TrimSpace(strings.Split(fwd, ",")[0])
	}
	ip := r.RemoteAddr
	if idx := strings.LastIndex(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}
	return ip
}

// IPBanMiddleware blocks requests from banned IPs
func IPBanMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)
		var ban models.IPBanList
		if err := config.DB.Where("ip = ? AND ban_expiry > ?", ip, time.Now()).First(&ban).Error; err == nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error":"too many failed attempts — try again later"}`))
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireAuth validates JWT from cookie or Authorization header
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenStr := ""

		cookie, err := r.Cookie("chalkback_token")
		if err == nil {
			tokenStr = cookie.Value
		}

		if tokenStr == "" {
			bearer := r.Header.Get("Authorization")
			if strings.HasPrefix(bearer, "Bearer ") {
				tokenStr = strings.TrimPrefix(bearer, "Bearer ")
			}
		}

		if tokenStr == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		secret := os.Getenv("JWT_SECRET")

		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		teacherID := uint(claims["teacher_id"].(float64))

		ctx := context.WithValue(r.Context(), TeacherIDKey, teacherID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}