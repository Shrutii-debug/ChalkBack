package handlers

import (
	"chalkback/config"
	authmw "chalkback/middleware"
	"chalkback/models"
	"encoding/json"
	
	"net/http"

	"github.com/go-chi/chi/v5"
)

func GetFormInfo(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug") //reads the slug part from the URL
	 //fmt.Println("SLUG IS:", slug)

	var teacher models.Teacher
	if err := config.DB.Where("slug = ?", slug).First(&teacher).Error; err != nil {
		jsonError(w, "teacher not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content_Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"name":    teacher.Name,
		"subject": teacher.Subject,
		"slug":    teacher.Slug,
	})
}

func SubmitFeedback(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TeacherSlug       string `json:"teacher_slug"`
		Mood              int    `json:"mood"`
		RatingClarity     int    `json:"rating_clarity"`
		RatingEngagement  int    `json:"rating_engagement"`
		RatingPace        int    `json:"rating_pace"`
		RatingHelpfulness int    `json:"rating_helpfulness"`
		FeedbackText      string `json:"feedback_text"`
		OneThingToImprove string `json:"one_thing_to_improve"`
		QuickPollAnswer   string `json:"quick_poll_answer"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	if req.OneThingToImprove == "" {
		jsonError(w, "one_thing_to_improve is required", http.StatusBadRequest)
		return
	}

	if req.Mood < 1 || req.Mood > 4 {
		jsonError(w, "mood must be between 1 and 4", http.StatusBadRequest)
		return
	}

	var teacher models.Teacher
	if err := config.DB.Where("slug = ?", req.TeacherSlug).First(&teacher).Error; err != nil {
		jsonError(w, "teacher not found", http.StatusNotFound)
		return
	}

	feedback := models.Feedback{
		TeacherID:         teacher.ID,
		Mood:              req.Mood,
		RatingClarity:     req.RatingClarity,
		RatingEngagement:  req.RatingEngagement,
		RatingPace:        req.RatingPace,
		RatingHelpfulness: req.RatingHelpfulness,
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

	var feedbacks []models.Feedback //a slice of feedback objects

	if err := config.DB.Where("teacher_id = ?", teacherID).
		Order("created_at desc").
		Find(&feedbacks).Error; err != nil {
		jsonError(w, "failed to fetch feedback", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(feedbacks)
}
