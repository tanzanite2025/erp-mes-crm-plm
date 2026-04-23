package models

import (
	"encoding/json"
	"time"
)

type PrepregLabelOcrSession struct {
	BaseModel
	SessionID   string          `gorm:"size:80;uniqueIndex;not null" json:"sessionId"`
	UploadToken string          `gorm:"size:120;not null" json:"-"`
	Status      string          `gorm:"size:24;default:'Waiting';index" json:"status"`
	RawText     string          `gorm:"type:text" json:"rawText"`
	Fields      json.RawMessage `gorm:"type:jsonb;not null;default:'{}'" json:"fields"`
	ImageName   string          `gorm:"size:255" json:"imageName"`
	ImageSize   int64           `json:"imageSize"`
	SubmittedAt *time.Time      `json:"submittedAt,omitempty"`
	ExpiresAt   time.Time       `gorm:"index" json:"expiresAt"`
}

func (PrepregLabelOcrSession) TableName() string {
	return "prepreg_label_ocr_sessions"
}
