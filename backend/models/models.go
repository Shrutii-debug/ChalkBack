package models

import "time"

type Teacher struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"not null" json:"name"`
	Email        string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	Slug         string    `gorm:"uniqueIndex;not null" json:"slug"`
	Subject      string    `json:"subject"`
	CreatedAt    time.Time `json:"created_at"`
}

type Feedback struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	TeacherID         uint      `gorm:"index;not null" json:"teacher_id"`
	Mood              int       `json:"mood"`
	RatingsJSON       string    `json:"ratings_json"`
	FeedbackText      string    `json:"feedback_text"`
	OneThingToImprove string    `json:"one_thing_to_improve"`
	QuickPollAnswer   string    `json:"quick_poll_answer"`
	CreatedAt         time.Time `json:"created_at"`
}

type Question struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TeacherID    uint      `gorm:"index;not null" json:"teacher_id"`
	QuestionText string    `gorm:"not null" json:"question_text"`
	AnswerText   string    `json:"answer_text"`
	IsAnswered   bool      `gorm:"default:false" json:"is_answered"`
	CreatedAt    time.Time `json:"created_at"`
}

type TeacherSettings struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	TeacherID        uint      `gorm:"uniqueIndex;not null" json:"teacher_id"`
	ShowMood         bool      `gorm:"default:true" json:"show_mood"`
	ShowPoll         bool      `gorm:"default:true" json:"show_poll"`
	ShowRatings      bool      `gorm:"default:true" json:"show_ratings"`
	ShowFeedbackText bool      `gorm:"default:true" json:"show_feedback_text"`
	ShowOneThing     bool      `gorm:"default:true" json:"show_one_thing"`
	ShowQA           bool      `gorm:"default:true" json:"show_qa"`
	RatingFields     string    `gorm:"default:'Clarity,Engagement,Pace,Helpfulness'" json:"rating_fields"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}