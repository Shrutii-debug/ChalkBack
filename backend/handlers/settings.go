package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"chalkback/config"
	authmw "chalkback/middleware"
	"chalkback/models"
)

func GetSettings(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)

	var settings models.TeacherSettings
	result := config.DB.Where("teacher_id = ?", teacherID).First(&settings)

	if result.Error != nil {
		settings = models.TeacherSettings{
			TeacherID:        teacherID,
			ShowMood:         true,
			ShowPoll:         true,
			ShowRatings:      true,
			ShowFeedbackText: true,
			ShowOneThing:     true,
			ShowQA:           true,
			RatingFields:     "Clarity,Engagement,Pace,Helpfulness",
		}
		config.DB.Create(&settings)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"show_mood":          settings.ShowMood,
		"show_poll":          settings.ShowPoll,
		"show_ratings":       settings.ShowRatings,
		"show_feedback_text": settings.ShowFeedbackText,
		"show_one_thing":     settings.ShowOneThing,
		"show_qa":            settings.ShowQA,
		"rating_fields":      strings.Split(settings.RatingFields, ","),
	})
}

func SaveSettings(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)

	var req struct {
		ShowMood         bool     `json:"show_mood"`
		ShowPoll         bool     `json:"show_poll"`
		ShowRatings      bool     `json:"show_ratings"`
		ShowFeedbackText bool     `json:"show_feedback_text"`
		ShowOneThing     bool     `json:"show_one_thing"`
		ShowQA           bool     `json:"show_qa"`
		RatingFields     []string `json:"rating_fields"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	if len(req.RatingFields) == 0 {
		jsonError(w, "at least one rating field required", http.StatusBadRequest)
		return
	}
	if len(req.RatingFields) > 4 {
		jsonError(w, "maximum 4 rating fields allowed", http.StatusBadRequest)
		return
	}

	var settings models.TeacherSettings
	config.DB.Where("teacher_id = ?", teacherID).First(&settings)

	settings.TeacherID = teacherID
	settings.ShowMood = req.ShowMood
	settings.ShowPoll = req.ShowPoll
	settings.ShowRatings = req.ShowRatings
	settings.ShowFeedbackText = req.ShowFeedbackText
	settings.ShowOneThing = req.ShowOneThing
	settings.ShowQA = req.ShowQA
	settings.RatingFields = strings.Join(req.RatingFields, ",")

	config.DB.Save(&settings)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "settings saved"})
}

func GetPublicSettings(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	var teacher models.Teacher
	if err := config.DB.Where("form_token = ?", token).First(&teacher).Error; err != nil {
		jsonError(w, "teacher not found", http.StatusNotFound)
		return
	}

	var settings models.TeacherSettings
	result := config.DB.Where("teacher_id = ?", teacher.ID).First(&settings)

	if result.Error != nil {
		settings = models.TeacherSettings{
			ShowMood:         true,
			ShowPoll:         true,
			ShowRatings:      true,
			ShowFeedbackText: true,
			ShowOneThing:     true,
			ShowQA:           true,
			RatingFields:     "Clarity,Engagement,Pace,Helpfulness",
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"show_mood":          settings.ShowMood,
		"show_poll":          settings.ShowPoll,
		"show_ratings":       settings.ShowRatings,
		"show_feedback_text": settings.ShowFeedbackText,
		"show_one_thing":     settings.ShowOneThing,
		"show_qa":            settings.ShowQA,
		"rating_fields":      strings.Split(settings.RatingFields, ","),
	})
}