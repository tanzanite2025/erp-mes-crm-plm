package services

import (
	"log"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
)

type reservationAggregateRow struct {
	MaterialID   string
	CategoryCode string
	BatchNo      string
	Reserved     float64
}

func inventoryReservationKey(materialID string, categoryCode string, batchNo string) string {
	return strings.TrimSpace(materialID) + "|" + strings.TrimSpace(categoryCode) + "|" + strings.TrimSpace(batchNo)
}

func loadReservationTotals(items []models.Inventory) (map[string]float64, error) {
	keys := make(map[string]reservationAggregateRow, len(items))
	for _, item := range items {
		key := inventoryReservationKey(item.MaterialID, item.CategoryCode, item.BatchNo)
		keys[key] = reservationAggregateRow{
			MaterialID:   strings.TrimSpace(item.MaterialID),
			CategoryCode: strings.TrimSpace(item.CategoryCode),
			BatchNo:      strings.TrimSpace(item.BatchNo),
		}
	}

	reservedMap := make(map[string]float64, len(keys))
	for key := range keys {
		reservedMap[key] = 0
	}

	for _, candidate := range keys {
		if candidate.MaterialID == "" || candidate.CategoryCode == "" {
			continue
		}

		var total float64
		query := db.DB.Model(&models.Reservation{}).
			Where("material_id = ? AND category_code = ? AND status = ?", candidate.MaterialID, candidate.CategoryCode, "RESERVED")

		if candidate.BatchNo == "" {
			query = query.Where("(batch_no = '' OR batch_no IS NULL)")
		} else {
			query = query.Where("batch_no = ?", candidate.BatchNo)
		}

		if err := query.Select("COALESCE(SUM(quantity), 0)").Scan(&total).Error; err != nil {
			return nil, err
		}

		reservedMap[inventoryReservationKey(candidate.MaterialID, candidate.CategoryCode, candidate.BatchNo)] = total
	}

	return reservedMap, nil
}

// RebuildSearchIndex 全量重构搜索引擎索引情况情况总量针对。
func RebuildSearchIndex() (int, error) {
	var items []models.Inventory
	if err := db.DB.Find(&items).Error; err != nil {
		return 0, err
	}

	total := 0
	for _, item := range items {
		// 异步推送到 Rust 搜索微服务情况情况总量针对。
		doc := SearchDocument{
			ID:       item.ID,
			Code:     item.MaterialCode,
			Name:     item.MaterialName,
			Model:    item.MaterialSpec,
			Category: item.CategoryCode,
			Version:  uint64(item.UpdatedAt.UnixNano()),
		}
		if err := GlobalSearchClient.SyncIndex(doc); err == nil {
			total++
		}
	}

	log.Printf("[SEARCH_REBUILD] Completed re-indexing %d items", total)
	return total, nil
}

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

	reservedMap, err := loadReservationTotals(items)
	if err != nil {
		return InventoryListResponse{}, err
	}

	return InventoryListResponse{
		Items:    MapInventoryListToResponse(items, materialCategoryMap, reservedMap),
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

func GetInventoryValuation() (InventoryValuationResponse, error) {
	var totalValue float64
	if err := db.DB.Model(&models.Inventory{}).
		Select("COALESCE(SUM(total_value), 0)").
		Scan(&totalValue).Error; err != nil {
		return InventoryValuationResponse{}, err
	}

	return InventoryValuationResponse{
		TotalValue: totalValue,
	}, nil
}

func GetInventoryAlertSummary() (InventoryAlertSummaryResponse, error) {
	type materialMinStock struct {
		ID       string
		MinStock float64
	}
	type materialStock struct {
		MaterialID string
		Quantity   float64
	}

	var trackedMaterials []materialMinStock
	if err := db.DB.Model(&models.Material{}).
		Select("id, min_stock").
		Where("min_stock > ?", 0).
		Find(&trackedMaterials).Error; err != nil {
		return InventoryAlertSummaryResponse{}, err
	}

	if len(trackedMaterials) == 0 {
		return InventoryAlertSummaryResponse{AlertCount: 0}, nil
	}

	materialIDs := make([]string, 0, len(trackedMaterials))
	for _, material := range trackedMaterials {
		materialIDs = append(materialIDs, material.ID)
	}

	var stocks []materialStock
	if err := db.DB.Model(&models.Inventory{}).
		Select("material_id, COALESCE(SUM(quantity), 0) AS quantity").
		Where("material_id IN ?", materialIDs).
		Group("material_id").
		Scan(&stocks).Error; err != nil {
		return InventoryAlertSummaryResponse{}, err
	}

	stockMap := make(map[string]float64, len(stocks))
	for _, stock := range stocks {
		stockMap[stock.MaterialID] = stock.Quantity
	}

	var alertCount int64
	for _, material := range trackedMaterials {
		currentStock := stockMap[material.ID]
		if currentStock < material.MinStock {
			alertCount++
		}
	}

	return InventoryAlertSummaryResponse{
		AlertCount: alertCount,
	}, nil
}
