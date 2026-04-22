package models

import (
	"encoding/json"
	"time"
)

// RuleExecutionLog captures rule matches and downstream action execution
// results so routing, approvals, and audit flows can be stitched together.
type RuleExecutionLog struct {
	BaseModel
	EventKey        string          `json:"eventKey" gorm:"size:160;index"`
	Entity          string          `json:"entity" gorm:"size:50;index"`
	SourceCode      string          `json:"sourceCode" gorm:"size:80;index"`
	ActionCode      string          `json:"actionCode" gorm:"size:80;index"`
	StatusCode      string          `json:"statusCode" gorm:"size:80;index"`
	RuleID          string          `json:"ruleId" gorm:"size:36;index"`
	RuleName        string          `json:"ruleName" gorm:"size:255"`
	SegmentID       string          `json:"segmentId" gorm:"size:120;index"`
	SegmentTitle    string          `json:"segmentTitle" gorm:"size:255"`
	ExecutionType   string          `json:"executionType" gorm:"size:40;index"`
	ExecutionStatus string          `json:"executionStatus" gorm:"size:40;index"`
	CommandID       string          `json:"commandId" gorm:"size:36;index"`
	Title           string          `json:"title" gorm:"size:255"`
	Content         string          `json:"content" gorm:"type:text"`
	ActionURL       string          `json:"actionUrl" gorm:"size:500"`
	Targets         json.RawMessage `json:"targets" gorm:"type:jsonb"`
	Metadata        json.RawMessage `json:"metadata" gorm:"type:jsonb"`
	Result          json.RawMessage `json:"result" gorm:"type:jsonb"`
	ErrorMessage    string          `json:"errorMessage" gorm:"type:text"`
	TriggeredAt     time.Time       `json:"triggeredAt" gorm:"index"`
}

func (RuleExecutionLog) TableName() string {
	return "rule_execution_logs"
}
