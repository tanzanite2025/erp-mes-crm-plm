package services

import "xdfc-server/models"

func MapInventoryToResponse(item models.Inventory, materialCategory string, reserved float64) InventoryItemResponse {
	onHand := item.Quantity
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
		OnHand:           onHand,
		Reserved:         reserved,
		AvailableQty:     onHand - reserved,
		Quantity:         item.Quantity,
		TotalValue:       item.TotalValue,
		AverageUnitCost:  item.AverageUnitCost,
		CategoryCode:     item.CategoryCode,
		BatchNo:          item.BatchNo,
		UOM:              item.UOM,
		Version:          optimisticVersionFromTimestamps(item.UpdatedAt, item.CreatedAt),
	}
}

func MapInventoryListToResponse(items []models.Inventory, materialCategoryMap map[string]string, reservedMap map[string]float64) []InventoryItemResponse {
	response := make([]InventoryItemResponse, 0, len(items))
	for _, item := range items {
		response = append(response, MapInventoryToResponse(item, materialCategoryMap[item.MaterialID], reservedMap[inventoryReservationKey(item.MaterialID, item.CategoryCode, item.BatchNo)]))
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
