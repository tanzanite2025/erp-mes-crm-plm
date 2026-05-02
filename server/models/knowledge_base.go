package models

import (
	"encoding/json"
	"time"
)

type KnowledgeBaseEntry struct {
	BaseModel
	Title        string          `gorm:"size:255;not null;index" json:"title"`
	Category     string          `gorm:"size:40;not null;index" json:"category"`
	Summary      string          `gorm:"type:text;not null" json:"summary"`
	ContentHTML  string          `gorm:"column:content_html;type:text;not null" json:"content"`
	ContentText  string          `gorm:"column:content_text;type:text;not null" json:"contentText"`
	Keywords     json.RawMessage `gorm:"type:jsonb;not null;default:'[]'" json:"keywords"`
	RoutePath    string          `gorm:"size:255;index" json:"routePath"`
	HasImage     bool            `gorm:"not null;default:false" json:"hasImage"`
	HasVideo     bool            `gorm:"not null;default:false" json:"hasVideo"`
	ViewCount    int             `gorm:"not null;default:0" json:"viewCount"`
	LastViewedAt *time.Time      `json:"lastViewedAt,omitempty"`
	Version      int             `gorm:"not null;default:1" json:"version"`
	CreatedBy    *string         `gorm:"type:uuid;index" json:"createdBy,omitempty"`
	UpdatedBy    *string         `gorm:"type:uuid;index" json:"updatedBy,omitempty"`
}

func (KnowledgeBaseEntry) TableName() string {
	return "knowledge_base_entries"
}
