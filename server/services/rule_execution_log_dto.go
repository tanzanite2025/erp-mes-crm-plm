package services

import (
	"encoding/json"
	"strings"
	"time"
	"xdfc-server/models"
)

type RuleExecutionLogResponse struct {
	ID              string          `json:"id"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
	EventKey        string          `json:"eventKey"`
	Entity          string          `json:"entity"`
	SourceCode      string          `json:"sourceCode"`
	ActionCode      string          `json:"actionCode"`
	StatusCode      string          `json:"statusCode"`
	RuleID          string          `json:"ruleId"`
	RuleName        string          `json:"ruleName"`
	SegmentID       string          `json:"segmentId"`
	SegmentTitle    string          `json:"segmentTitle"`
	ExecutionType   string          `json:"executionType"`
	ExecutionStatus string          `json:"executionStatus"`
	CommandID       string          `json:"commandId"`
	Title           string          `json:"title"`
	Content         string          `json:"content"`
	ActionURL       string          `json:"actionUrl"`
	Targets         json.RawMessage `json:"targets"`
	Metadata        json.RawMessage `json:"metadata"`
	Result          json.RawMessage `json:"result"`
	ErrorMessage    string          `json:"errorMessage"`
	TriggeredAt     time.Time       `json:"triggeredAt"`
}

type RuleExecutionLogListQuery struct {
	Page            int
	PageSize        int
	EventKey        string
	Entity          string
	SourceCode      string
	ActionCode      string
	StatusCode      string
	RuleID          string
	SegmentID       string
	ExecutionType   string
	ExecutionStatus string
}

type RuleExecutionLogListResponse struct {
	Items    []RuleExecutionLogResponse `json:"items"`
	Total    int64                      `json:"total"`
	Page     int                        `json:"page"`
	PageSize int                        `json:"pageSize"`
}

func MapRuleExecutionLogToResponse(model models.RuleExecutionLog) RuleExecutionLogResponse {
	return RuleExecutionLogResponse{
		ID:              model.ID,
		CreatedAt:       model.CreatedAt,
		UpdatedAt:       model.UpdatedAt,
		EventKey:        strings.TrimSpace(model.EventKey),
		Entity:          strings.TrimSpace(model.Entity),
		SourceCode:      strings.TrimSpace(model.SourceCode),
		ActionCode:      strings.TrimSpace(model.ActionCode),
		StatusCode:      strings.TrimSpace(model.StatusCode),
		RuleID:          strings.TrimSpace(model.RuleID),
		RuleName:        strings.TrimSpace(model.RuleName),
		SegmentID:       strings.TrimSpace(model.SegmentID),
		SegmentTitle:    strings.TrimSpace(model.SegmentTitle),
		ExecutionType:   strings.TrimSpace(model.ExecutionType),
		ExecutionStatus: strings.TrimSpace(model.ExecutionStatus),
		CommandID:       strings.TrimSpace(model.CommandID),
		Title:           strings.TrimSpace(model.Title),
		Content:         strings.TrimSpace(model.Content),
		ActionURL:       strings.TrimSpace(model.ActionURL),
		Targets:         model.Targets,
		Metadata:        model.Metadata,
		Result:          model.Result,
		ErrorMessage:    strings.TrimSpace(model.ErrorMessage),
		TriggeredAt:     model.TriggeredAt,
	}
}

func MapRuleExecutionLogsToResponse(items []models.RuleExecutionLog) []RuleExecutionLogResponse {
	result := make([]RuleExecutionLogResponse, 0, len(items))
	for _, item := range items {
		result = append(result, MapRuleExecutionLogToResponse(item))
	}
	return result
}
