package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"unicode"

	"github.com/go-chi/chi/v5"

	"chalkback/config"
	authmw "chalkback/middleware"
	"chalkback/models"
)

// ── Content validation ────────────────────────────────────────────────────────

// Basic abuse word list — extend as needed
var abuseWords = map[string]bool{
	"fuck": true, "shit": true, "bitch": true, "asshole": true, "bastard": true,
	"damn": true, "crap": true, "piss": true, "dick": true, "cock": true,
	"pussy": true, "slut": true, "whore": true, "nigger": true, "faggot": true,
	"retard": true, "idiot": true, "stupid": true, "moron": true, "dumbass": true,
	
}

// containsAbuse checks if text contains abusive words
func containsAbuse(text string) bool {
	words := strings.Fields(strings.ToLower(text))
	for _, w := range words {
		// Strip punctuation for matching
		cleaned := strings.Map(func(r rune) rune {
			if unicode.IsLetter(r) {
				return r
			}
			return -1
		}, w)
		if abuseWords[cleaned] {
			return true
		}
	}
	return false
}

// isRealSentence does a basic heuristic check:
// - at least 3 words
// - at least one word with 3+ characters
// - not all the same character repeated
// - has at least some letters (not just symbols/numbers)
func isRealSentence(text string) bool {
	text = strings.TrimSpace(text)
	if text == "" {
		return true // empty is allowed (optional fields)
	}

	words := strings.Fields(text)
	if len(words) < 2 {
		// Single word is okay for short answers but must have real letters
		letterCount := 0
		for _, r := range text {
			if unicode.IsLetter(r) {
				letterCount++
			}
		}
		return letterCount >= 2
	}

	// Count words with meaningful length
	meaningfulWords := 0
	letterOnlyRunes := 0
	for _, word := range words {
		cleaned := strings.Map(func(r rune) rune {
			if unicode.IsLetter(r) {
				return r
			}
			return -1
		}, word)
		if len(cleaned) >= 2 {
			meaningfulWords++
		}
		letterOnlyRunes += len([]rune(cleaned))
	}

	// Must have at least 2 meaningful words and mostly letters
	totalRunes := len([]rune(text))
	if totalRunes == 0 {
		return false
	}
	letterRatio := float64(letterOnlyRunes) / float64(totalRunes)

	return meaningfulWords >= 2 && letterRatio >= 0.5
}

// validateTextContent validates both real-sentence check and abuse check
func validateTextContent(text, fieldName string) string {
	if text == "" {
		return ""
	}
	if !isRealSentence(text) {
		return fieldName + " must be a meaningful sentence"
	}
	if containsAbuse(text) {
		return fieldName + " contains inappropriate language"
	}
	return ""
}

// ── GetFormInfo — uses form_token, not slug ───────────────────────────────────

func GetFormInfo(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	var teacher models.Teacher
	if err := config.DB.Where("form_token = ?", token).First(&teacher).Error; err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"name":    teacher.Name,
		"subject": teacher.Subject,
		// slug and email intentionally omitted
	})
}

// ── SubmitFeedback — uses form_token ─────────────────────────────────────────

func SubmitFeedback(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FormToken         string         `json:"form_token"`
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

	// ── Content validation ──
	if msg := validateTextContent(req.FeedbackText, "feedback"); msg != "" {
		jsonError(w, msg, http.StatusBadRequest)
		return
	}
	if msg := validateTextContent(req.OneThingToImprove, "improvement suggestion"); msg != "" {
		jsonError(w, msg, http.StatusBadRequest)
		return
	}

	// Validate mood range
	if req.Mood != 0 && (req.Mood < 1 || req.Mood > 4) {
		jsonError(w, "invalid mood value", http.StatusBadRequest)
		return
	}

	// Validate poll answer
	validPolls := map[string]bool{"Too fast": true, "Just right": true, "Too slow": true, "": true}
	if !validPolls[req.QuickPollAnswer] {
		jsonError(w, "invalid poll answer", http.StatusBadRequest)
		return
	}

	var teacher models.Teacher
	if err := config.DB.Where("form_token = ?", req.FormToken).First(&teacher).Error; err != nil {
		jsonError(w, "not found", http.StatusNotFound)
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

// ── GetAllFeedback — dashboard ────────────────────────────────────────────────

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