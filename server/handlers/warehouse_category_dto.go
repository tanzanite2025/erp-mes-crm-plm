package handlers

import (
	"time"
	"xdfc-server/models"
)

type WarehouseCategoryRequest struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Code        string `json:"code"`
	Description string `json:"description"`
	IsSystem    bool   `json:"isSystem"`
	Active      bool   `json:"active"`
	SortOrder   int    `json:"sortOrder"`
}

type WarehouseCategoryResponse struct {
	ID          string    `json:"id"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	Name        string    `json:"name"`
	Code        string    `json:"code"`
	Description string    `json:"description"`
	IsSystem    bool      `json:"isSystem"`
	Active      bool      `json:"active"`
	SortOrder   int       `json:"sortOrder"`
}

type WarehouseCategoryListResponse struct {
	Items    []WarehouseCategoryResponse `json:"items"`
	Total    int64                       `json:"total"`
	Page     int                         `json:"page"`
	PageSize int                         `json:"pageSize"`
}

func mapWarehouseCategoryRequestToModel(input WarehouseCategoryRequest) models.WarehouseCategory {
	return models.WarehouseCategory{
		BaseModel:   models.BaseModel{ID: input.ID},
		Name:        input.Name,
		Code:        input.Code,
		Description: input.Description,
		IsSystem:    input.IsSystem,
		Active:      input.Active,
		SortOrder:   input.SortOrder,
	}
}

func mapWarehouseCategoryToResponse(model models.WarehouseCategory) WarehouseCategoryResponse {
	return WarehouseCategoryResponse{
		ID:          model.ID,
		CreatedAt:   model.CreatedAt,
		UpdatedAt:   model.UpdatedAt,
		Name:        model.Name,
		Code:        model.Code,
		Description: model.Description,
		IsSystem:    model.IsSystem,
		Active:      model.Active,
		SortOrder:   model.SortOrder,
	}
}

func mapWarehouseCategoriesToResponse(items []models.WarehouseCategory) []WarehouseCategoryResponse {
	result := make([]WarehouseCategoryResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapWarehouseCategoryToResponse(item))
	}
	return result
}
