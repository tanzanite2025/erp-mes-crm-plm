package handlers

import (
	"encoding/json"
	"strings"
	"time"
	"xdfc-server/models"
)

type BOMSectionRequest struct {
	ID          string `json:"id"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsSystem    bool   `json:"isSystem"`
	Active      bool   `json:"active"`
	SortOrder   int    `json:"sortOrder"`
	IsDefault   bool   `json:"isDefault"`
}

type BOMSectionResponse struct {
	ID          string    `json:"id"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	Version     int       `json:"version"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IsSystem    bool      `json:"isSystem"`
	Active      bool      `json:"active"`
	SortOrder   int       `json:"sortOrder"`
	IsDefault   bool      `json:"isDefault"`
	LegacyNames []string  `json:"legacyNames"`
}

type BOMSectionOptionResponse struct {
	Value       string   `json:"value"`
	Label       string   `json:"label"`
	Code        string   `json:"code"`
	Name        string   `json:"name"`
	Active      bool     `json:"active"`
	SortOrder   int      `json:"sortOrder"`
	IsDefault   bool     `json:"isDefault"`
	LegacyNames []string `json:"legacyNames"`
}

type BOMSectionListResponse struct {
	Items    []BOMSectionResponse `json:"items"`
	Total    int64                `json:"total"`
	Page     int                  `json:"page"`
	PageSize int                  `json:"pageSize"`
}

func normalizeBOMSectionStringSlice(values []string) []string {
	result := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func marshalBOMSectionStringSlice(values []string) json.RawMessage {
	normalized := normalizeBOMSectionStringSlice(values)
	if len(normalized) == 0 {
		return json.RawMessage("[]")
	}
	data, err := json.Marshal(normalized)
	if err != nil {
		return json.RawMessage("[]")
	}
	return data
}

func parseBOMSectionStringSlice(raw json.RawMessage) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var values []string
	if err := json.Unmarshal(raw, &values); err != nil {
		return []string{}
	}
	return normalizeBOMSectionStringSlice(values)
}

func mapBOMSectionRequestToModel(input BOMSectionRequest) models.BOMSection {
	return models.BOMSection{
		BaseModel:   models.BaseModel{ID: input.ID},
		Code:        input.Code,
		Name:        input.Name,
		Description: input.Description,
		IsSystem:    input.IsSystem,
		Active:      input.Active,
		SortOrder:   input.SortOrder,
		IsDefault:   input.IsDefault,
	}
}

func mapBOMSectionToResponse(model models.BOMSection) BOMSectionResponse {
	return BOMSectionResponse{
		ID:          model.ID,
		CreatedAt:   model.CreatedAt,
		UpdatedAt:   model.UpdatedAt,
		Version:     optimisticVersionForResponse(model.UpdatedAt, model.CreatedAt),
		Code:        model.Code,
		Name:        model.Name,
		Description: model.Description,
		IsSystem:    model.IsSystem,
		Active:      model.Active,
		SortOrder:   model.SortOrder,
		IsDefault:   model.IsDefault,
		LegacyNames: parseBOMSectionStringSlice(model.LegacyNames),
	}
}

func mapBOMSectionsToResponse(items []models.BOMSection) []BOMSectionResponse {
	result := make([]BOMSectionResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapBOMSectionToResponse(item))
	}
	return result
}

func mapBOMSectionOption(model models.BOMSection) BOMSectionOptionResponse {
	return BOMSectionOptionResponse{
		Value:       model.Code,
		Label:       model.Name,
		Code:        model.Code,
		Name:        model.Name,
		Active:      model.Active,
		SortOrder:   model.SortOrder,
		IsDefault:   model.IsDefault,
		LegacyNames: parseBOMSectionStringSlice(model.LegacyNames),
	}
}

func mapBOMSectionOptions(items []models.BOMSection) []BOMSectionOptionResponse {
	result := make([]BOMSectionOptionResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapBOMSectionOption(item))
	}
	return result
}
