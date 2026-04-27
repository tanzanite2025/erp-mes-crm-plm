package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"
)

type StandardCommandRequest struct {
	ID         string          `json:"id"`
	ActionType string          `json:"actionType"`
	BindType   string          `json:"bindType"`
	NodeType   string          `json:"nodeType"`
	Title      string          `json:"title"`
	Content    string          `json:"content"`
	TargetLink string          `json:"targetLink"`
	Params     json.RawMessage `json:"params"`
}

type StandardCommandResponse struct {
	ID         string          `json:"id"`
	CreatedAt  time.Time       `json:"createdAt"`
	UpdatedAt  time.Time       `json:"updatedAt"`
	ActionType string          `json:"actionType"`
	BindType   string          `json:"bindType"`
	NodeType   string          `json:"nodeType"`
	Title      string          `json:"title"`
	Content    string          `json:"content"`
	TargetLink string          `json:"targetLink"`
	Params     json.RawMessage `json:"params"`
}

type NotificationRuleApprovalDTO struct {
	Enabled              bool    `json:"enabled"`
	Module               string  `json:"module"`
	Action               string  `json:"action"`
	Approver1ID          string  `json:"approver1Id"`
	Approver2ID          string  `json:"approver2Id"`
	DynamicApproverField *string `json:"dynamicApproverField"`
	ReasonTemplate       string  `json:"reasonTemplate"`
}

type RuleSegmentDTO struct {
	ID                 string                       `json:"id"`
	Title              string                       `json:"title"`
	TargetStatuses     []string                     `json:"targetStatuses"`
	CommandIDs         []string                     `json:"commandIds"`
	AssigneeGroups     []string                     `json:"assigneeGroups"`
	AssigneeUsernames  []string                     `json:"assigneeUsernames"`
	ResolveOnStatuses  []string                     `json:"resolveOnStatuses"`
	DynamicTargetField *string                      `json:"dynamicTargetField"`
	Approval           *NotificationRuleApprovalDTO `json:"approval,omitempty"`
}

type NotificationRuleRequest struct {
	ID         string           `json:"id"`
	Name       string           `json:"name"`
	Enabled    bool             `json:"enabled"`
	Entity     string           `json:"entity"`
	SourceCode string           `json:"sourceCode"`
	ActionCode string           `json:"actionCode"`
	Segments   []RuleSegmentDTO `json:"segments"`
	Version    int              `json:"version"`
}

type NotificationRuleResponse struct {
	ID         string           `json:"id"`
	CreatedAt  time.Time        `json:"createdAt"`
	UpdatedAt  time.Time        `json:"updatedAt"`
	Name       string           `json:"name"`
	Enabled    bool             `json:"enabled"`
	Entity     string           `json:"entity"`
	SourceCode string           `json:"sourceCode"`
	ActionCode string           `json:"actionCode"`
	Segments   []RuleSegmentDTO `json:"segments"`
	Version    int              `json:"version"`
}

func MapStandardCommandRequestToModel(input StandardCommandRequest) models.StandardCommand {
	return models.StandardCommand{
		BaseModel:  models.BaseModel{ID: input.ID},
		ActionType: input.ActionType,
		BindType:   input.BindType,
		NodeType:   input.NodeType,
		Title:      input.Title,
		Content:    input.Content,
		TargetLink: input.TargetLink,
		Params:     input.Params,
	}
}

func MapStandardCommandToResponse(model models.StandardCommand) StandardCommandResponse {
	return StandardCommandResponse{
		ID:         model.ID,
		CreatedAt:  model.CreatedAt,
		UpdatedAt:  model.UpdatedAt,
		ActionType: model.ActionType,
		BindType:   model.BindType,
		NodeType:   model.NodeType,
		Title:      model.Title,
		Content:    model.Content,
		TargetLink: model.TargetLink,
		Params:     model.Params,
	}
}

func MapStandardCommandsToResponse(items []models.StandardCommand) []StandardCommandResponse {
	result := make([]StandardCommandResponse, 0, len(items))
	for _, item := range items {
		result = append(result, MapStandardCommandToResponse(item))
	}
	return result
}

func trimStringList(values []string) []string {
	if values == nil {
		return []string{}
	}

	result := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func normalizeOptionalStringPointer(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func normalizeNotificationRuleApprovalDTO(
	input *NotificationRuleApprovalDTO,
) *NotificationRuleApprovalDTO {
	if input == nil {
		return nil
	}

	normalized := *input
	normalized.Module = strings.TrimSpace(normalized.Module)
	normalized.Action = strings.TrimSpace(normalized.Action)
	normalized.Approver1ID = strings.TrimSpace(normalized.Approver1ID)
	normalized.Approver2ID = strings.TrimSpace(normalized.Approver2ID)
	normalized.DynamicApproverField = normalizeOptionalStringPointer(normalized.DynamicApproverField)
	normalized.ReasonTemplate = strings.TrimSpace(normalized.ReasonTemplate)
	if normalized.Module == "" {
		normalized.Module = "Trading"
	}
	if normalized.Action == "" {
		normalized.Action = "ORDER_REVIEW"
	}
	if normalized.ReasonTemplate == "" {
		normalized.ReasonTemplate = "Business rule [RuleName] / [SegmentTitle] matched. Please approve document [OrderNo]."
	}
	return &normalized
}

func validateNotificationRuleApprovalDTO(
	segmentIndex int,
	input *NotificationRuleApprovalDTO,
) error {
	if input == nil {
		return nil
	}
	if err := requireNonEmpty(
		fmt.Sprintf("segments[%d].approval.module", segmentIndex),
		input.Module,
	); err != nil {
		return err
	}
	if err := requireNonEmpty(
		fmt.Sprintf("segments[%d].approval.action", segmentIndex),
		input.Action,
	); err != nil {
		return err
	}
	if input.Enabled &&
		strings.TrimSpace(input.Approver1ID) == "" &&
		strings.TrimSpace(input.Approver2ID) == "" &&
		input.DynamicApproverField == nil {
		return fmt.Errorf("segments[%d].approval approver is required when enabled", segmentIndex)
	}
	return nil
}

func normalizeNotificationRuleSegments(
	segments []RuleSegmentDTO,
) []RuleSegmentDTO {
	if segments == nil {
		return []RuleSegmentDTO{}
	}

	result := make([]RuleSegmentDTO, 0, len(segments))
	for index, segment := range segments {
		segment.ID = strings.TrimSpace(segment.ID)
		segment.Title = strings.TrimSpace(segment.Title)
		segment.TargetStatuses = trimStringList(segment.TargetStatuses)
		segment.CommandIDs = trimStringList(segment.CommandIDs)
		segment.AssigneeGroups = trimStringList(segment.AssigneeGroups)
		segment.AssigneeUsernames = trimStringList(segment.AssigneeUsernames)
		segment.ResolveOnStatuses = trimStringList(segment.ResolveOnStatuses)
		segment.DynamicTargetField = normalizeOptionalStringPointer(segment.DynamicTargetField)
		segment.Approval = normalizeNotificationRuleApprovalDTO(segment.Approval)
		if segment.ID == "" {
			segment.ID = buildNotificationRuleSegmentID(index, segment)
		}
		result = append(result, segment)
	}
	return result
}

func buildNotificationRuleSegmentID(index int, segment RuleSegmentDTO) string {
	return buildBusinessEventConfigItemID(
		"segment",
		index,
		segment.Title,
		strings.Join(segment.TargetStatuses, "-"),
	)
}

func validateNotificationRuleSegments(segments []RuleSegmentDTO) error {
	segmentIDs := make(map[string]struct{}, len(segments))
	for index, segment := range segments {
		if err := requireNonEmpty(fmt.Sprintf("segments[%d].id", index), segment.ID); err != nil {
			return err
		}
		if _, ok := segmentIDs[segment.ID]; ok {
			return fmt.Errorf("segments[%d].id duplicated: %s", index, segment.ID)
		}
		segmentIDs[segment.ID] = struct{}{}
		if err := requireNonEmpty(fmt.Sprintf("segments[%d].title", index), segment.Title); err != nil {
			return err
		}
		if err := validateNotificationRuleApprovalDTO(index, segment.Approval); err != nil {
			return err
		}
	}
	return nil
}

func marshalNotificationRuleSegments(segments []RuleSegmentDTO) (json.RawMessage, error) {
	normalized := normalizeNotificationRuleSegments(segments)
	if err := validateNotificationRuleSegments(normalized); err != nil {
		return nil, err
	}

	raw, err := json.Marshal(normalized)
	if err != nil {
		return nil, err
	}
	return raw, nil
}

func unmarshalNotificationRuleSegments(raw json.RawMessage) ([]RuleSegmentDTO, error) {
	if len(raw) == 0 {
		return []RuleSegmentDTO{}, nil
	}

	var segments []RuleSegmentDTO
	if err := json.Unmarshal(raw, &segments); err != nil {
		return nil, err
	}
	normalized := normalizeNotificationRuleSegments(segments)
	if err := validateNotificationRuleSegments(normalized); err != nil {
		return nil, err
	}
	return normalized, nil
}

func normalizeNotificationRuleRequest(input NotificationRuleRequest) NotificationRuleRequest {
	input.ID = strings.TrimSpace(input.ID)
	input.Name = strings.TrimSpace(input.Name)
	input.Entity = strings.TrimSpace(input.Entity)
	input.SourceCode = strings.TrimSpace(input.SourceCode)
	input.ActionCode = strings.TrimSpace(input.ActionCode)
	input.Segments = normalizeNotificationRuleSegments(input.Segments)
	return input
}

func validateNotificationRuleRequest(input NotificationRuleRequest) error {
	if err := requireNonEmpty("name", input.Name); err != nil {
		return err
	}
	if err := requireNonEmpty("entity", input.Entity); err != nil {
		return err
	}
	if err := requireEnum("entity", input.Entity, allowedBusinessEventEntities); err != nil {
		return err
	}
	if err := requireNonEmpty("sourceCode", input.SourceCode); err != nil {
		return err
	}
	if err := requireNonEmpty("actionCode", input.ActionCode); err != nil {
		return err
	}
	return validateNotificationRuleSegments(input.Segments)
}

func MapNotificationRuleRequestToModel(
	input NotificationRuleRequest,
) (models.NotificationRule, error) {
	normalized := normalizeNotificationRuleRequest(input)
	if err := validateNotificationRuleRequest(normalized); err != nil {
		return models.NotificationRule{}, err
	}

	segments, err := marshalNotificationRuleSegments(normalized.Segments)
	if err != nil {
		return models.NotificationRule{}, err
	}

	return models.NotificationRule{
		BaseModel:  models.BaseModel{ID: normalized.ID},
		Name:       normalized.Name,
		Enabled:    normalized.Enabled,
		Entity:     normalized.Entity,
		SourceCode: normalized.SourceCode,
		ActionCode: normalized.ActionCode,
		Segments:   segments,
		Version:    normalized.Version,
	}, nil
}

func MapNotificationRuleToResponse(model models.NotificationRule) (NotificationRuleResponse, error) {
	segments, err := unmarshalNotificationRuleSegments(model.Segments)
	if err != nil {
		return NotificationRuleResponse{}, err
	}

	return NotificationRuleResponse{
		ID:         model.ID,
		CreatedAt:  model.CreatedAt,
		UpdatedAt:  model.UpdatedAt,
		Name:       strings.TrimSpace(model.Name),
		Enabled:    model.Enabled,
		Entity:     strings.TrimSpace(model.Entity),
		SourceCode: strings.TrimSpace(model.SourceCode),
		ActionCode: strings.TrimSpace(model.ActionCode),
		Segments:   segments,
		Version:    model.Version,
	}, nil
}

func MapNotificationRulesToResponse(items []models.NotificationRule) ([]NotificationRuleResponse, error) {
	result := make([]NotificationRuleResponse, 0, len(items))
	for _, item := range items {
		mapped, err := MapNotificationRuleToResponse(item)
		if err != nil {
			return nil, err
		}
		result = append(result, mapped)
	}
	return result, nil
}
