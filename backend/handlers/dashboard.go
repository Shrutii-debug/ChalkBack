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
/*
a package level variable. A map where keys are words and values are true. Declared once when the program starts, available to all functions in this file.
Why a map and not a slice/array? Because checking if a word exists in a map is O(1) — instant, regardless of how many words are in it.
 Checking if a word exists in an array/slice is O(n) — you have to scan every element.
  Since we check thousands of words against this list, speed matters.
*/

type WordCount struct {
	Word string `json:"word"`
	Count int `json:"count"`
}

func GetSummary(w http.ResponseWriter, r *http.Request){
	teacherID := r.Context().Value(authmw.TeacherIDKey).(uint)

	var feedbacks []models.Feedback
	config.DB.Where("teacher_id = ?", teacherID).Find(&feedbacks)

	total := len(feedbacks)

	if total == 0 {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
            "total_responses":    0,
            "avg_clarity":        0,
            "avg_engagement":     0,
            "avg_pace":           0,
            "avg_helpfulness":    0,
            "mood_counts":        map[string]int{"1": 0, "2": 0, "3": 0, "4": 0},
            "poll_counts":        map[string]int{},
            "one_thing_snippets": []string{},
        })
        return
    }

	/*
	Why handle the zero case separately? Because if there's no feedback yet, 
	we'd divide by zero when calculating averages — which crashes the program. We return empty/zero values instead 
	and return early so none of the calculation code below runs.
[]string{} — an empty string slice. In JSON this becomes [] — an empty array. The frontend can handle this gracefully.
	*/

	var sumClarity, sumEngagement, sumPace, sumHelpfulness float64
    moodCounts := map[string]int{"1": 0, "2": 0, "3": 0, "4": 0}
	//Because JSON object keys are always strings. If we used integer keys, Go's JSON encoder would convert them to strings anyway — so we just use strings from the start to be explicit.
    pollCounts := map[string]int{}
    var oneThingSnippets []string

	for _, f := range feedbacks {
		sumClarity += float64(f.RatingClarity)
        sumEngagement += float64(f.RatingEngagement)
        sumPace += float64(f.RatingPace)
        sumHelpfulness += float64(f.RatingHelpfulness)

		key := string(rune('0' + f.Mood))
        moodCounts[key]++

		/*
		f.Mood is an integer — value 1, 2, 3, or 4.
We want to use it as a string key in moodCounts — "1", "2", "3", or "4".
'0' — the character zero in Go. Its ASCII value is 48.
'0' + f.Mood — if f.Mood is 3, then '0' + 3 = 48 + 3 = 51. ASCII 51 is the character '3'.
rune(...) — convert the number to a Unicode character.
string(...) — convert the character to a string. So 51 → '3' → "3".
So the whole thing: f.Mood = 3 → "3". We get the string version of the mood number.
*/
if f.QuickPollAnswer != "" {
            pollCounts[f.QuickPollAnswer]++
        }

		if f.OneThingToImprove != "" {
            oneThingSnippets = append(oneThingSnippets, f.OneThingToImprove)
        }
    }
	n := float64(total)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "total_responses":    total,
        "avg_clarity":        sumClarity / n,
        "avg_engagement":     sumEngagement / n,
        "avg_pace":           sumPace / n,
        "avg_helpfulness":    sumHelpfulness / n,
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
