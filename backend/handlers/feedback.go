package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"chalkback/config"
	authmw "chalkback/middleware"
	"chalkback/models"
)

func GetFormInfo(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	var teacher models.Teacher
	if err := config.DB.Where("slug = ?", slug).First(&teacher).Error; err != nil {
		jsonError(w, "teacher not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"name":    teacher.Name,
		"subject": teacher.Subject,
		"slug":    teacher.Slug,
	})
}

func SubmitFeedback(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TeacherSlug       string         `json:"teacher_slug"`
		Mood              int            `json:"mood"`
		Ratings           map[string]int `json:"ratings"`
		FeedbackText      string         `json:"feedback_text"`
		OneThingToImprove string         `json:"one_thing_to_improve"`
		QuickPollAnswer   string         `json:"quick_poll_answer"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	var teacher models.Teacher
	if err := config.DB.Where("slug = ?", req.TeacherSlug).First(&teacher).Error; err != nil {
		jsonError(w, "teacher not found", http.StatusNotFound)
		return
	}

	ratingsBytes, err := json.Marshal(req.Ratings)
	if err != nil {
		jsonError(w, "invalid ratings", http.StatusBadRequest)
		return
	}

	feedback := models.Feedback{
		TeacherID:         teacher.ID,
		Mood:              req.Mood,
		RatingsJSON:       string(ratingsBytes),
		FeedbackText:      req.FeedbackText,
		OneThingToImprove: req.OneThingToImprove,
		QuickPollAnswer:   req.QuickPollAnswer,
	}

	if err := config.DB.Create(&feedback).Error; err != nil {
		jsonError(w, "failed to save feedback", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "feedback submitted"})
}

func GetAllFeedback(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)

	var feedbacks []models.Feedback
	if err := config.DB.Where("teacher_id = ?", teacherID).
		Order("created_at desc").
		Find(&feedbacks).Error; err != nil {
		jsonError(w, "failed to fetch feedback", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(feedbacks)
}