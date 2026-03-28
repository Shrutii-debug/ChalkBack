package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"unicode"

	"github.com/go-chi/chi/v5"

	"chalkback/config"
	authmw "chalkback/middleware"
	"chalkback/models"
)

func normalizeQuestion(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var result []rune
	for _, r := range s {
		if !unicode.IsPunct(r) {
			result = append(result, r)
		}
	}
	return strings.TrimSpace(string(result))
}

func levenshtein(a, b string) int {
	ra := []rune(a)
	rb := []rune(b)
	la, lb := len(ra), len(rb)

	dp := make([][]int, la+1)
	for i := range dp {
		dp[i] = make([]int, lb+1)
	}

	for i := 0; i <= la; i++ {
		dp[i][0] = i
	}
	for j := 0; j <= lb; j++ {
		dp[0][j] = j
	}

	for i := 1; i <= la; i++ {
		for j := 1; j <= lb; j++ {
			if ra[i-1] == rb[j-1] {
				dp[i][j] = dp[i-1][j-1]
			} else {
				dp[i][j] = 1 + minInt(dp[i-1][j], minInt(dp[i][j-1], dp[i-1][j-1]))
			}
		}
	}
	return dp[la][lb]
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func isDuplicateQuestion(newQ string, existing []models.Question) bool {
	normalized := normalizeQuestion(newQ)
	for _, q := range existing {
		existingNorm := normalizeQuestion(q.QuestionText)
		dist := levenshtein(normalized, existingNorm)
		maxLen := len([]rune(normalized))
		if len([]rune(existingNorm)) > maxLen {
			maxLen = len([]rune(existingNorm))
		}
		if maxLen == 0 {
			continue
		}
		similarity := 1.0 - float64(dist)/float64(maxLen)
		if similarity >= 0.85 {
			return true
		}
	}
	return false
}

func SubmitQuestion(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TeacherSlug  string `json:"teacher_slug"`
		QuestionText string `json:"question_text"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	if req.QuestionText == "" {
		jsonError(w, "question_text is required", http.StatusBadRequest)
		return
	}

	var teacher models.Teacher
	if err := config.DB.Where("slug = ?", req.TeacherSlug).First(&teacher).Error; err != nil {
		jsonError(w, "teacher not found", http.StatusNotFound)
		return
	}

	var existing []models.Question
	config.DB.Where("teacher_id = ?", teacher.ID).Find(&existing)

	if isDuplicateQuestion(req.QuestionText, existing) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"message": "question submitted"})
		return
	}

	q := models.Question{
		TeacherID:    teacher.ID,
		QuestionText: req.QuestionText,
	}

	if err := config.DB.Create(&q).Error; err != nil {
		jsonError(w, "failed to save question", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "question submitted"})
}

func GetPublicQA(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	var teacher models.Teacher
	if err := config.DB.Where("slug = ?", slug).First(&teacher).Error; err != nil {
		jsonError(w, "teacher not found", http.StatusNotFound)
		return
	}

	var questions []models.Question
	config.DB.Where("teacher_id = ? AND is_answered = true", teacher.ID).
		Order("created_at desc").
		Find(&questions)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(questions)
}

func GetAllQuestions(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)

	var questions []models.Question
	config.DB.Where("teacher_id = ?", teacherID).
		Order("is_answered asc, created_at desc").
		Find(&questions)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(questions)
}

func AnswerQuestion(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		jsonError(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req struct {
		AnswerText string `json:"answer_text"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	var q models.Question
	if err := config.DB.Where("id = ? AND teacher_id = ?", id, teacherID).First(&q).Error; err != nil {
		jsonError(w, "question not found", http.StatusNotFound)
		return
	}

	q.AnswerText = req.AnswerText
	q.IsAnswered = true
	config.DB.Save(&q)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(q)
}