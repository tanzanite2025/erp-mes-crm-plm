package models

import (
	"time"
)

// ApprovalRequest stores one approval instance, including any request-level approver overrides.
type ApprovalRequest struct {
	BaseModel
	RequesterID string `gorm:"type:uuid;index;not null" json:"requesterId"`
	Requester   *User  `gorm:"foreignKey:RequesterID" json:"requester,omitempty"`

	TargetID    string `gorm:"size:100;index" json:"targetId"`
	Reason      string `gorm:"type:text" json:"reason"`
	Approver1ID string `gorm:"type:uuid;index" json:"approver1Id"`
	Approver2ID string `gorm:"type:uuid;index" json:"approver2Id"`

	CurrentLevel int    `gorm:"default:1" json:"currentLevel"`
	Status       string `gorm:"size:50;default:'PENDING'" json:"status"`

	AuthCode  string     `gorm:"size:100" json:"authCode"`
	ExpiresAt *time.Time `json:"expiresAt"`
	Module    string     `gorm:"size:50" json:"module"`
	Action    string     `gorm:"size:50" json:"action"`
	VerifierID string     `gorm:"size:100;index" json:"verifierId"`
}

func (ApprovalRequest) TableName() string {
	return "approval_requests"
}
