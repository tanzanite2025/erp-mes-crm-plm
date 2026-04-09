package handlers

import (
	"encoding/json"
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

type NotificationRuleRequest struct {
	ID       string          `json:"id"`
	Name     string          `json:"name"`
	Enabled  bool            `json:"enabled"`
	Entity   string          `json:"entity"`
	Segments json.RawMessage `json:"segments"`
}

type NotificationRuleResponse struct {
	ID        string          `json:"id"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
	Name      string          `json:"name"`
	Enabled   bool            `json:"enabled"`
	Entity    string          `json:"entity"`
	Segments  json.RawMessage `json:"segments"`
}

func mapStandardCommandRequestToModel(input StandardCommandRequest) models.StandardCommand {
	return models.StandardCommand{
		BaseModel: models.BaseModel{ID: input.ID},
		ActionType: input.ActionType,
		BindType:   input.BindType,
		NodeType:   input.NodeType,
		Title:      input.Title,
		Content:    input.Content,
		TargetLink: input.TargetLink,
		Params:     input.Params,
	}
}

func mapStandardCommandToResponse(model models.StandardCommand) StandardCommandResponse {
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

func mapStandardCommandsToResponse(items []models.StandardCommand) []StandardCommandResponse {
	result := make([]StandardCommandResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapStandardCommandToResponse(item))
	}
	return result
}

func mapNotificationRuleRequestToModel(input NotificationRuleRequest) models.NotificationRule {
	return models.NotificationRule{
		BaseModel: models.BaseModel{ID: input.ID},
		Name:      input.Name,
		Enabled:   input.Enabled,
		Entity:    input.Entity,
		Segments:  input.Segments,
	}
}

func mapNotificationRuleToResponse(model models.NotificationRule) NotificationRuleResponse {
	return NotificationRuleResponse{
		ID:        model.ID,
		CreatedAt: model.CreatedAt,
		UpdatedAt: model.UpdatedAt,
		Name:      model.Name,
		Enabled:   model.Enabled,
		Entity:    model.Entity,
		Segments:  model.Segments,
	}
}

func mapNotificationRulesToResponse(items []models.NotificationRule) []NotificationRuleResponse {
	result := make([]NotificationRuleResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapNotificationRuleToResponse(item))
	}
	return result
}
