package models

import (
	"encoding/json"
	"time"
)

// SystemNotificationInboxEntry is one account's durable notification. Business
// state remains in the referenced document or approval request.
type SystemNotificationInboxEntry struct {
	ID                       string          `gorm:"type:uuid;primaryKey" json:"id"`
	RecipientUserID          string          `gorm:"type:uuid;not null;index:idx_notification_recipient_created,priority:1" json:"-"`
	DeduplicationKey         string          `gorm:"size:64;not null;uniqueIndex" json:"-"`
	EventKey                 string          `gorm:"type:text;not null" json:"-"`
	PurposeKey               string          `gorm:"type:text;not null" json:"-"`
	SourceCode               string          `gorm:"size:100;index:idx_notification_business_reference,priority:1" json:"sourceCode"`
	BusinessTargetID         string          `gorm:"size:100;index:idx_notification_business_reference,priority:2" json:"targetId"`
	ApprovalRequestID        string          `gorm:"size:100;index" json:"approvalRequestId,omitempty"`
	RuleID                   string          `gorm:"size:100;index" json:"ruleId,omitempty"`
	SegmentID                string          `gorm:"size:100" json:"segmentId,omitempty"`
	CommandID                string          `gorm:"size:100" json:"commandId,omitempty"`
	BusinessResolutionEntity string          `gorm:"size:50" json:"-"`
	ResolveOnStatusCodes     json.RawMessage `gorm:"type:jsonb;not null;default:'[]'" json:"-"`
	NotificationType         string          `gorm:"size:50;not null" json:"type"`
	Priority                 string          `gorm:"size:20;not null" json:"priority"`
	Title                    string          `gorm:"type:text;not null" json:"title"`
	Content                  string          `gorm:"type:text;not null" json:"content"`
	ActionURL                string          `gorm:"type:text" json:"actionUrl,omitempty"`
	VisibilityPermission     string          `gorm:"size:100" json:"-"`
	Metadata                 json.RawMessage `gorm:"type:jsonb;not null" json:"metadata"`
	RequiresAction           bool            `gorm:"not null;default:false" json:"requiresAction"`
	CreatedAt                time.Time       `gorm:"index:idx_notification_recipient_created,priority:2,sort:desc" json:"timestamp"`
	UpdatedAt                time.Time       `json:"updatedAt"`
	ReadAt                   *time.Time      `json:"readAt"`
	ArchivedAt               *time.Time      `json:"archivedAt"`
	ResolvedAt               *time.Time      `gorm:"index" json:"resolvedAt"`
	ExpiresAt                *time.Time      `gorm:"index" json:"expiresAt"`
}
