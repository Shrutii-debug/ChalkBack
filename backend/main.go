package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"chalkback/config"
	"chalkback/handlers"
	authmw "chalkback/middleware"
)

func main() {
	godotenv.Load()

	config.InitDB()

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{os.Getenv("FRONTEND_URL")},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.Post("/api/auth/register", handlers.Register)
	r.Post("/api/auth/login", handlers.Login)
	r.Post("/api/auth/logout", handlers.Logout)
	r.Post("/api/auth/forgot-password", handlers.ForgotPassword)
	r.Post("/api/auth/reset-password", handlers.ResetPassword)		

	r.Get("/api/form/{slug}", handlers.GetFormInfo)
	r.Get("/api/form/{slug}/settings", handlers.GetPublicSettings)
	r.Post("/api/feedback", handlers.SubmitFeedback)
	r.Post("/api/questions", handlers.SubmitQuestion)
	r.Get("/api/qa/{slug}", handlers.GetPublicQA)

	r.Group(func(r chi.Router) {
		r.Use(authmw.RequireAuth)

		r.Get("/api/dashboard/me", handlers.GetMe)
		r.Get("/api/dashboard/summary", handlers.GetSummary)
		r.Get("/api/dashboard/feedback", handlers.GetAllFeedback)
		r.Get("/api/dashboard/wordcloud", handlers.GetWordCloud)
		r.Get("/api/dashboard/qa", handlers.GetAllQuestions)
		r.Post("/api/dashboard/qa/{id}/answer", handlers.AnswerQuestion)
		r.Get("/api/dashboard/settings", handlers.GetSettings)
		r.Post("/api/dashboard/settings", handlers.SaveSettings)
		r.Post("/api/dashboard/change-password", handlers.ChangePassword)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("ChalkBack API running on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}