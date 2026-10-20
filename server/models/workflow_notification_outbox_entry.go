package models

import (
	"encoding/json"
	"time"
)

// WorkflowNotificationOutboxEntry is written in the business transaction and
// delivered only after commit. Delivery is at least once; ID is stable on retry.
type WorkflowNotificationOutboxEntry struct {
	BaseModel
	Payload        json.RawMessage `gorm:"type:jsonb;not null"`
	InboxEntryID   *string         `gorm:"type:uuid;index"`
	ExecutionLogID *string         `gorm:"type:uuid;index"`
	Attempts       int
	NextAttemptAt  time.Time  `gorm:"index"`
	DeliveredAt    *time.Time `gorm:"index"`
	CanceledAt     *time.Time `gorm:"index"`
	FailedAt       *time.Time `gorm:"index"`
	LastError      string     `gorm:"type:text"`
}
