package services

import (
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
)

func ListInventory(page, pageSize int) (InventoryListResponse, error) {
	var total int64
	query := db.DB.Model(&models.Inventory{})
	query.Count(&total)

	var items []models.Inventory
	if err := query.Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return InventoryListResponse{}, err
	}

	materialCategoryMap := make(map[string]string, len(items))
	materialIDs := make([]string, 0, len(items))
	for _, item := range items {
		materialID := strings.TrimSpace(item.MaterialID)
		if materialID == "" {
			continue
		}
		if _, exists := materialCategoryMap[materialID]; exists {
			continue
		}
		materialCategoryMap[materialID] = "FINISHED"
		materialIDs = append(materialIDs, materialID)
	}

	if len(materialIDs) > 0 {
		var materials []models.Material
		if err := db.DB.Select("id", "category").Where("id IN ?", materialIDs).Find(&materials).Error; err != nil {
			return InventoryListResponse{}, err
		}
		for _, material := range materials {
			category := strings.TrimSpace(material.Category)
			if category == "" {
				category = "MATERIAL"
			}
			materialCategoryMap[material.ID] = category
		}
	}

	return InventoryListResponse{
		Items:    MapInventoryListToResponse(items, materialCategoryMap),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func ListInboundHistory(page, pageSize int) InventoryInboundHistoryResponse {
	var total int64
	query := db.DB.Model(&models.InboundRecord{})
	query.Count(&total)

	var items []models.InboundRecord
	query.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items)

	return InventoryInboundHistoryResponse{
		Items:    MapInboundHistoryToResponse(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}
}

func ListShipmentHistory(page, pageSize int) InventoryShipmentHistoryResponse {
	var total int64
	query := db.DB.Model(&models.ShipmentRecord{})
	query.Count(&total)

	var items []models.ShipmentRecord
	query.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items)

	return InventoryShipmentHistoryResponse{
		Items:    MapShipmentHistoryToResponse(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}
}
