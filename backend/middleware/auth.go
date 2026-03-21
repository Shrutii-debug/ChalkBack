package middleware

import (
    "context"
    "net/http"
    "os"
    "strings"

    "github.com/golang-jwt/jwt/v5"
)

type contextKey string

const TeacherIDKey contextKey = "teacher ID"

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request)  {
		tokenStr := ""

		cookie, err := r.Cookie("chalkback_token")

		if err == nil {
			tokenStr = cookie.Value
		}

		if tokenStr == "" {
			bearer := r.Header.Get("Authorization")
			if strings.HasPrefix(bearer, "Bearer "){
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

		if err != nil || !token.Valid{
			http.Error(w, `{"error":"unauthorized}`, http.StatusUnauthorized)
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