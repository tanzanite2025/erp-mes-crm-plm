package handlers

import (
	"time"
	"xdfc-server/models"
)

type WarehouseCategoryRequest struct {
	ID                        string `json:"id"`
	Name                      string `json:"name"`
	Code                      string `json:"code"`
	Description               string `json:"description"`
	IsSystem                  bool   `json:"isSystem"`
	Active                    bool   `json:"active"`
	SortOrder                 int    `json:"sortOrder"`
	AllowInbound              bool   `json:"allowInbound"`
	AllowShipment             bool   `json:"allowShipment"`
	AllowStocktake            bool   `json:"allowStocktake"`
	AllowPurchaseReceipt      bool   `json:"allowPurchaseReceipt"`
	DefaultForProductInbound  bool   `json:"defaultForProductInbound"`
	DefaultForMaterialInbound bool   `json:"defaultForMaterialInbound"`
	DefaultForPurchaseReceipt bool   `json:"defaultForPurchaseReceipt"`
}

type WarehouseCategoryResponse struct {
	ID                        string    `json:"id"`
	CreatedAt                 time.Time `json:"createdAt"`
	UpdatedAt                 time.Time `json:"updatedAt"`
	Version                   int       `json:"version"`
	Name                      string    `json:"name"`
	Code                      string    `json:"code"`
	Description               string    `json:"description"`
	IsSystem                  bool      `json:"isSystem"`
	Active                    bool      `json:"active"`
	SortOrder                 int       `json:"sortOrder"`
	AllowInbound              bool      `json:"allowInbound"`
	AllowShipment             bool      `json:"allowShipment"`
	AllowStocktake            bool      `json:"allowStocktake"`
	AllowPurchaseReceipt      bool      `json:"allowPurchaseReceipt"`
	DefaultForProductInbound  bool      `json:"defaultForProductInbound"`
	DefaultForMaterialInbound bool      `json:"defaultForMaterialInbound"`
	DefaultForPurchaseReceipt bool      `json:"defaultForPurchaseReceipt"`
}

type WarehouseCategoryOptionResponse struct {
	Value                     string `json:"value"`
	Label                     string `json:"label"`
	Code                      string `json:"code"`
	Name                      string `json:"name"`
	Active                    bool   `json:"active"`
	SortOrder                 int    `json:"sortOrder"`
	AllowInbound              bool   `json:"allowInbound"`
	AllowShipment             bool   `json:"allowShipment"`
	AllowStocktake            bool   `json:"allowStocktake"`
	AllowPurchaseReceipt      bool   `json:"allowPurchaseReceipt"`
	DefaultForProductInbound  bool   `json:"defaultForProductInbound"`
	DefaultForMaterialInbound bool   `json:"defaultForMaterialInbound"`
	DefaultForPurchaseReceipt bool   `json:"defaultForPurchaseReceipt"`
}

type WarehouseCategoryListResponse struct {
	Items    []WarehouseCategoryResponse `json:"items"`
	Total    int64                       `json:"total"`
	Page     int                         `json:"page"`
	PageSize int                         `json:"pageSize"`
}

func mapWarehouseCategoryRequestToModel(input WarehouseCategoryRequest) models.WarehouseCategory {
	return models.WarehouseCategory{
		BaseModel:                 models.BaseModel{ID: input.ID},
		Name:                      input.Name,
		Code:                      input.Code,
		Description:               input.Description,
		IsSystem:                  input.IsSystem,
		Active:                    input.Active,
		SortOrder:                 input.SortOrder,
		AllowInbound:              input.AllowInbound,
		AllowShipment:             input.AllowShipment,
		AllowStocktake:            input.AllowStocktake,
		AllowPurchaseReceipt:      input.AllowPurchaseReceipt,
		DefaultForProductInbound:  input.DefaultForProductInbound,
		DefaultForMaterialInbound: input.DefaultForMaterialInbound,
		DefaultForPurchaseReceipt: input.DefaultForPurchaseReceipt,
	}
}

func mapWarehouseCategoryToResponse(model models.WarehouseCategory) WarehouseCategoryResponse {
	return WarehouseCategoryResponse{
		ID:                        model.ID,
		CreatedAt:                 model.CreatedAt,
		UpdatedAt:                 model.UpdatedAt,
		Version:                   optimisticVersionForResponse(model.UpdatedAt, model.CreatedAt),
		Name:                      model.Name,
		Code:                      model.Code,
		Description:               model.Description,
		IsSystem:                  model.IsSystem,
		Active:                    model.Active,
		SortOrder:                 model.SortOrder,
		AllowInbound:              model.AllowInbound,
		AllowShipment:             model.AllowShipment,
		AllowStocktake:            model.AllowStocktake,
		AllowPurchaseReceipt:      model.AllowPurchaseReceipt,
		DefaultForProductInbound:  model.DefaultForProductInbound,
		DefaultForMaterialInbound: model.DefaultForMaterialInbound,
		DefaultForPurchaseReceipt: model.DefaultForPurchaseReceipt,
	}
}

func mapWarehouseCategoriesToResponse(items []models.WarehouseCategory) []WarehouseCategoryResponse {
	result := make([]WarehouseCategoryResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapWarehouseCategoryToResponse(item))
	}
	return result
}

func mapWarehouseCategoryOption(model models.WarehouseCategory) WarehouseCategoryOptionResponse {
	return WarehouseCategoryOptionResponse{
		Value:                     model.Code,
		Label:                     model.Name,
		Code:                      model.Code,
		Name:                      model.Name,
		Active:                    model.Active,
		SortOrder:                 model.SortOrder,
		AllowInbound:              model.AllowInbound,
		AllowShipment:             model.AllowShipment,
		AllowStocktake:            model.AllowStocktake,
		AllowPurchaseReceipt:      model.AllowPurchaseReceipt,
		DefaultForProductInbound:  model.DefaultForProductInbound,
		DefaultForMaterialInbound: model.DefaultForMaterialInbound,
		DefaultForPurchaseReceipt: model.DefaultForPurchaseReceipt,
	}
}

func mapWarehouseCategoryOptions(items []models.WarehouseCategory) []WarehouseCategoryOptionResponse {
	result := make([]WarehouseCategoryOptionResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapWarehouseCategoryOption(item))
	}
	return result
}
