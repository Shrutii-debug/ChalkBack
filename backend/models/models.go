package models

import "time"

type Teacher struct {
	ID   uint  `gorm:"primaryKey" json:"id"`
	Name  string `gorm:"not null" json:"name"`
	Email string `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string `gorm:"nor null" json:"-"`
	Slug string `gorm:"uniqueIndex;not null" json:"slug"`
	Subject string `json:"subject"`
	CreatedAt time.Time `json:"created_at"`
}

type Feedback struct {
	ID  uint `gorm:"primaryKey" json:"id"`
	TeacherID  uint `gorm:"index;not null" json:"teacher_id"`
	Mood int `gorm:"not null" json:"mood"`
	RatingClarity  int `json:"rating_clarity"`
	RatingEngagement int `json:"rating_engagement"`
	RatingPace int `json:"rating_pace"`
	RatingHelpfulness int `json:"rating_helpfulness"`
	FeedbackText string `json:"feedback_text"`
	OneThingToImprove string `gorm:"not null" json:"one_thing_to_improve"`
	QuickPollAnswer string `json:"quick_poll_answer"`
	CreatedAt time.Time `json:"created_at"`
}

type Question struct {
	ID  uint `gorm:"primaryKey" json:"id"`
	TeacherID uint `gorm:"index;not null" json:"teacher_id"`
	QuestionText string `gorm:"not null" json:"question_text"`
	AnswerText string `json:"answer_text"`
	IsAnswered bool `gorm:"default:false" json:"is_answered"`
	CreatedAT time.Time `json:"created_at"`
}