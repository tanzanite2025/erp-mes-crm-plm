package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"
)

var allowedRuleExecutionTypes = map[string]struct{}{
	"match":    {},
	"notify":   {},
	"approval": {},
	"workflow": {},
}

var allowedRuleExecutionStatuses = map[string]struct{}{
	"matched": {},
	"success": {},
	"failed":  {},
	"skipped": {},
}

type RuleExecutionLogRequest struct {
	ID              string          `json:"id"`
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
	TriggeredAt     *time.Time      `json:"triggeredAt"`
}

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

func normalizeJSONPayload(raw json.RawMessage, fallback string) (json.RawMessage, error) {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" {
		trimmed = fallback
	}
	normalized := json.RawMessage(trimmed)
	if !json.Valid(normalized) {
		return nil, fmt.Errorf("invalid json payload")
	}
	return normalized, nil
}

func normalizeRuleExecutionLogRequest(input RuleExecutionLogRequest) (RuleExecutionLogRequest, error) {
	input.ID = strings.TrimSpace(input.ID)
	input.EventKey = strings.TrimSpace(input.EventKey)
	input.Entity = strings.TrimSpace(input.Entity)
	input.SourceCode = strings.TrimSpace(input.SourceCode)
	input.ActionCode = strings.TrimSpace(input.ActionCode)
	input.StatusCode = strings.TrimSpace(input.StatusCode)
	input.RuleID = strings.TrimSpace(input.RuleID)
	input.RuleName = strings.TrimSpace(input.RuleName)
	input.SegmentID = strings.TrimSpace(input.SegmentID)
	input.SegmentTitle = strings.TrimSpace(input.SegmentTitle)
	input.ExecutionType = strings.TrimSpace(strings.ToLower(input.ExecutionType))
	input.ExecutionStatus = strings.TrimSpace(strings.ToLower(input.ExecutionStatus))
	input.CommandID = strings.TrimSpace(input.CommandID)
	input.Title = strings.TrimSpace(input.Title)
	input.Content = strings.TrimSpace(input.Content)
	input.ActionURL = strings.TrimSpace(input.ActionURL)
	input.ErrorMessage = strings.TrimSpace(input.ErrorMessage)

	targets, err := normalizeJSONPayload(input.Targets, "[]")
	if err != nil {
		return input, fmt.Errorf("targets: %w", err)
	}
	metadata, err := normalizeJSONPayload(input.Metadata, "{}")
	if err != nil {
		return input, fmt.Errorf("metadata: %w", err)
	}
	result, err := normalizeJSONPayload(input.Result, "{}")
	if err != nil {
		return input, fmt.Errorf("result: %w", err)
	}

	input.Targets = targets
	input.Metadata = metadata
	input.Result = result

	return input, nil
}

func validateRuleExecutionLogRequest(input RuleExecutionLogRequest) error {
	if err := requireNonEmpty("sourceCode", input.SourceCode); err != nil {
		return err
	}
	if err := requireNonEmpty("actionCode", input.ActionCode); err != nil {
		return err
	}
	if err := requireNonEmpty("executionType", input.ExecutionType); err != nil {
		return err
	}
	if err := requireEnum("executionType", input.ExecutionType, allowedRuleExecutionTypes); err != nil {
		return err
	}
	if err := requireNonEmpty("executionStatus", input.ExecutionStatus); err != nil {
		return err
	}
	if err := requireEnum("executionStatus", input.ExecutionStatus, allowedRuleExecutionStatuses); err != nil {
		return err
	}
	return nil
}

func MapRuleExecutionLogRequestToModel(input RuleExecutionLogRequest) (models.RuleExecutionLog, error) {
	normalized, err := normalizeRuleExecutionLogRequest(input)
	if err != nil {
		return models.RuleExecutionLog{}, err
	}
	if err := validateRuleExecutionLogRequest(normalized); err != nil {
		return models.RuleExecutionLog{}, err
	}

	triggeredAt := time.Now()
	if normalized.TriggeredAt != nil && !normalized.TriggeredAt.IsZero() {
		triggeredAt = normalized.TriggeredAt.UTC()
	}

	return models.RuleExecutionLog{
		BaseModel:       models.BaseModel{ID: normalized.ID},
		EventKey:        normalized.EventKey,
		Entity:          normalized.Entity,
		SourceCode:      normalized.SourceCode,
		ActionCode:      normalized.ActionCode,
		StatusCode:      normalized.StatusCode,
		RuleID:          normalized.RuleID,
		RuleName:        normalized.RuleName,
		SegmentID:       normalized.SegmentID,
		SegmentTitle:    normalized.SegmentTitle,
		ExecutionType:   normalized.ExecutionType,
		ExecutionStatus: normalized.ExecutionStatus,
		CommandID:       normalized.CommandID,
		Title:           normalized.Title,
		Content:         normalized.Content,
		ActionURL:       normalized.ActionURL,
		Targets:         normalized.Targets,
		Metadata:        normalized.Metadata,
		Result:          normalized.Result,
		ErrorMessage:    normalized.ErrorMessage,
		TriggeredAt:     triggeredAt,
	}, nil
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
