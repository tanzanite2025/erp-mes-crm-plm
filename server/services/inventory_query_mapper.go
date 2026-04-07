package services

import "xdfc-server/models"

func MapInventoryToResponse(item models.Inventory, materialCategory string) InventoryItemResponse {
	return InventoryItemResponse{
		ID:               item.ID,
		CreatedAt:        item.CreatedAt,
		UpdatedAt:        item.UpdatedAt,
		LastUpdated:      item.UpdatedAt,
		MaterialID:       item.MaterialID,
		MaterialName:     item.MaterialName,
		MaterialCode:     item.MaterialCode,
		MaterialCategory: materialCategory,
		MaterialSpec:     item.MaterialSpec,
		Quantity:         item.Quantity,
		TotalValue:       item.TotalValue,
		AverageUnitCost:  item.AverageUnitCost,
		CategoryCode:     item.CategoryCode,
		BatchNo:          item.BatchNo,
		UOM:              item.UOM,
		Version:          1,
	}
}

func MapInventoryListToResponse(items []models.Inventory, materialCategoryMap map[string]string) []InventoryItemResponse {
	response := make([]InventoryItemResponse, 0, len(items))
	for _, item := range items {
		response = append(response, MapInventoryToResponse(item, materialCategoryMap[item.MaterialID]))
	}
	return response
}

func MapInboundHistoryToResponse(items []models.InboundRecord) []InventoryInboundRecordResponse {
	response := make([]InventoryInboundRecordResponse, 0, len(items))
	for _, item := range items {
		response = append(response, MapInboundRecordToResponse(item))
	}
	return response
}

func MapShipmentHistoryToResponse(items []models.ShipmentRecord) []InventoryShipmentRecordResponse {
	response := make([]InventoryShipmentRecordResponse, 0, len(items))
	for _, item := range items {
		response = append(response, MapShipmentRecordToResponse(item))
	}
	return response
}
