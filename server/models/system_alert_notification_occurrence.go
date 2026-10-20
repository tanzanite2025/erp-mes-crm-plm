package models

import "time"

// This source event marker prevents a delayed firing webhook from reopening an
// already resolved alert occurrence, including when resolution arrived first.
type SystemAlertNotificationOccurrence struct {
	ID         string     `gorm:"size:64;primaryKey"`
	ResolvedAt *time.Time `gorm:"index"`
	CreatedAt  time.Time
}
