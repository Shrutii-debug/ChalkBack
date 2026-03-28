package handlers

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"

	"chalkback/config"
	authmw "chalkback/middleware"
	"chalkback/models"
)

var stopWords = map[string]bool{
	"the": true, "a": true, "an": true, "and": true, "or": true,
	"but": true, "in": true, "on": true, "at": true, "to": true,
	"for": true, "of": true, "with": true, "is": true, "it": true,
	"he": true, "she": true, "they": true, "we": true, "i": true,
	"my": true, "his": true, "her": true, "this": true, "that": true,
	"was": true, "are": true, "be": true, "been": true, "has": true,
	"have": true, "had": true, "do": true, "does": true, "did": true,
	"will": true, "would": true, "could": true, "should": true, "can": true,
	"not": true, "more": true, "very": true, "so": true, "just": true,
	"also": true, "as": true, "from": true, "by": true, "about": true,
	"like": true, "when": true, "if": true, "there": true, "their": true,
	"what": true, "how": true, "which": true, "who": true, "its": true,
	"our": true, "your": true, "some": true, "all": true, "up": true,
	"out": true, "him": true, "them": true, "then": true, "than": true,
	"me": true, "into": true, "no": true, "one": true, "you": true,
}

type WordCount struct {
	Word  string `json:"word"`
	Count int    `json:"count"`
}

func GetSummary(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)

	var feedbacks []models.Feedback
	config.DB.Where("teacher_id = ?", teacherID).Find(&feedbacks)

	total := len(feedbacks)
	if total == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"total_responses":    0,
			"avg_ratings":        map[string]float64{},
			"mood_counts":        map[string]int{"1": 0, "2": 0, "3": 0, "4": 0},
			"poll_counts":        map[string]int{},
			"one_thing_snippets": []string{},
		})
		return
	}

	moodCounts := map[string]int{"1": 0, "2": 0, "3": 0, "4": 0}
	pollCounts := map[string]int{}
	var oneThingSnippets []string
	ratingSums := map[string]float64{}
	ratingCounts := map[string]int{}

	for _, f := range feedbacks {
		key := string(rune('0' + f.Mood))
		moodCounts[key]++

		if f.QuickPollAnswer != "" {
			pollCounts[f.QuickPollAnswer]++
		}

		if f.OneThingToImprove != "" {
			oneThingSnippets = append(oneThingSnippets, f.OneThingToImprove)
		}

		if f.RatingsJSON != "" {
			var ratings map[string]int
			if err := json.Unmarshal([]byte(f.RatingsJSON), &ratings); err == nil {
				for field, val := range ratings {
					ratingSums[field] += float64(val)
					ratingCounts[field]++
				}
			}
		}
	}

	avgRatings := map[string]float64{}
	for field, sum := range ratingSums {
		avgRatings[field] = sum / float64(ratingCounts[field])
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"total_responses":    total,
		"avg_ratings":        avgRatings,
		"mood_counts":        moodCounts,
		"poll_counts":        pollCounts,
		"one_thing_snippets": oneThingSnippets,
	})
}

func GetWordCloud(w http.ResponseWriter, r *http.Request) {
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)

	var feedbacks []models.Feedback
	config.DB.Where("teacher_id = ?", teacherID).Find(&feedbacks)

	freq := map[string]int{}
	for _, f := range feedbacks {
		text := f.FeedbackText + " " + f.OneThingToImprove
		words := strings.Fields(strings.ToLower(text))
		for _, w := range words {
			cleaned := strings.Trim(w, ".,!?;:\"'()[]")
			if len(cleaned) > 2 && !stopWords[cleaned] {
				freq[cleaned]++
			}
		}
	}

	var result []WordCount
	for word, count := range freq {
		if count >= 2 {
			result = append(result, WordCount{Word: word, Count: count})
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Count > result[j].Count
	})

	if len(result) > 50 {
		result = result[:50]
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}