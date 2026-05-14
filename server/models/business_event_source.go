package models

import "encoding/json"

// BusinessEventSource describes a configurable business object that routing
// rules can listen to, such as sales orders, purchase orders, logistics, etc.
//
// Note: Code uniqueness is enforced via a partial unique index
//       (idx_business_event_sources_code WHERE deleted_at IS NULL)
//       created in db.ensureBusinessEventSourceCodeUniqueIndex(), so soft-deleted
//       records do not block reusing the same code.
type BusinessEventSource struct {
	BaseModel
	Code        string          `json:"code" gorm:"size:80;index;not null"`
	Name        string          `json:"name" gorm:"size:120;not null"`
	Module      string          `json:"module" gorm:"size:80"`
	Entity      string          `json:"entity" gorm:"size:50"`
	Enabled     bool            `json:"enabled" gorm:"default:true"`
	Description string          `json:"description" gorm:"size:500"`
	Config      json.RawMessage `json:"config" gorm:"type:jsonb"`
}

func (BusinessEventSource) TableName() string {
	return "business_event_sources"
}
