package models

import "time"

// AIUsageLog records every outbound AI proxy request without storing prompts or secrets.
type AIUsageLog struct {
	BaseModel
	UserID            string     `gorm:"index;size:100" json:"userId"`
	Username          string     `gorm:"index;size:100" json:"username"`
	RoutePermissionID string     `gorm:"index;size:160" json:"routePermissionId"`
	Provider          string     `gorm:"index;size:32" json:"provider"`
	Model             string     `gorm:"size:160" json:"model"`
	Stream            bool       `gorm:"index" json:"stream"`
	Status            string     `gorm:"index;size:32" json:"status"`
	ErrorCode         string     `gorm:"size:80" json:"errorCode"`
	HTTPStatus        int        `gorm:"index" json:"httpStatus"`
	PromptRunes       int        `json:"promptRunes"`
	RequestBytes      int        `json:"requestBytes"`
	ResponseBytes     int        `json:"responseBytes"`
	DurationMs        int64      `json:"durationMs"`
	IP                string     `gorm:"size:64" json:"ip"`
	CompletedAt       *time.Time `gorm:"index" json:"completedAt"`
}

func (AIUsageLog) TableName() string {
	return "ai_usage_logs"
}
