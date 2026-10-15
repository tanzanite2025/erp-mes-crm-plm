package models

import "time"

// The receipt is committed with every effect of the command it represents.
type ProductionExecutionCommandRequestReceipt struct {
	CommandType        string    `gorm:"size:40;primaryKey"`
	IdempotencyKey     string    `gorm:"size:128;primaryKey"`
	RequestFingerprint string    `gorm:"size:64;not null"`
	ResponseSnapshot   string    `gorm:"type:text;not null"`
	CreatedAt          time.Time `gorm:"not null"`
}
