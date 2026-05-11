package services

import (
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type reservationAggregateRow struct {
	MaterialID   string
	CategoryCode string
	BatchNo      string
	Reserved     float64
}

type inventoryAlertTrackedMaterial struct {
	ID       string
	MinStock float64
}

type inventoryAlertMaterialStock struct {
	MaterialID string
	Quantity   float64
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

func loadInventoryAlertTrackedMaterials() ([]inventoryAlertTrackedMaterial, error) {
	var trackedMaterials []inventoryAlertTrackedMaterial
	if err := db.DB.Model(&models.Material{}).
		Select("id, min_stock").
		Where("min_stock > ?", 0).
		Find(&trackedMaterials).Error; err != nil {
		return nil, err
	}

	return trackedMaterials, nil
}

func loadEnabledBOMThresholdRules() ([]models.InventoryThresholdRule, error) {
	var rules []models.InventoryThresholdRule
	if err := db.DB.Model(&models.InventoryThresholdRule{}).
		Order("updated_at desc").
		Where("target_type = ? AND enabled = ? AND threshold_qty > ?", InventoryThresholdTargetBOM, true, 0).
		Find(&rules).Error; err != nil {
		return nil, err
	}

	return rules, nil
}

func loadInventoryTotalsByMaterialIDs(materialIDs []string) (map[string]float64, error) {
	stockMap := make(map[string]float64)
	uniqueMaterialIDs := make([]string, 0, len(materialIDs))
	seen := make(map[string]struct{}, len(materialIDs))

	for _, materialID := range materialIDs {
		trimmedID := strings.TrimSpace(materialID)
		if trimmedID == "" {
			continue
		}
		if _, exists := seen[trimmedID]; exists {
			continue
		}
		seen[trimmedID] = struct{}{}
		uniqueMaterialIDs = append(uniqueMaterialIDs, trimmedID)
		stockMap[trimmedID] = 0
	}

	if len(uniqueMaterialIDs) == 0 {
		return stockMap, nil
	}

	var stocks []inventoryAlertMaterialStock
	if err := db.DB.Model(&models.Inventory{}).
		Select("material_id, COALESCE(SUM(quantity), 0) AS quantity").
		Where("material_id IN ?", uniqueMaterialIDs).
		Group("material_id").
		Scan(&stocks).Error; err != nil {
		return nil, err
	}

	for _, stock := range stocks {
		stockMap[strings.TrimSpace(stock.MaterialID)] = stock.Quantity
	}

	return stockMap, nil
}

func loadTrackedBOMsForInventoryAlerts(bomIDs []string) (map[string]models.BOM, error) {
	bomMap := make(map[string]models.BOM)
	uniqueBOMIDs := make([]string, 0, len(bomIDs))
	seen := make(map[string]struct{}, len(bomIDs))

	for _, bomID := range bomIDs {
		trimmedID := strings.TrimSpace(bomID)
		if trimmedID == "" {
			continue
		}
		if _, exists := seen[trimmedID]; exists {
			continue
		}
		seen[trimmedID] = struct{}{}
		uniqueBOMIDs = append(uniqueBOMIDs, trimmedID)
	}

	if len(uniqueBOMIDs) == 0 {
		return bomMap, nil
	}

	var boms []models.BOM
	if err := db.DB.Select("id", "bom_no", "product_id", "status").
		Preload("Product", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id", "sku", "name")
		}).
		Preload("Items", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id", "bom_id", "material_id", "standard_usage")
		}).
		Where("id IN ?", uniqueBOMIDs).
		Find(&boms).Error; err != nil {
		return nil, err
	}

	for _, bom := range boms {
		bomMap[bom.ID] = bom
	}

	return bomMap, nil
}

func loadInventoryAlertMaterialMetadata(materialIDs []string) (map[string]models.Material, error) {
	materialMap := make(map[string]models.Material)
	uniqueMaterialIDs := make([]string, 0, len(materialIDs))
	seen := make(map[string]struct{}, len(materialIDs))

	for _, materialID := range materialIDs {
		trimmedID := strings.TrimSpace(materialID)
		if trimmedID == "" {
			continue
		}
		if _, exists := seen[trimmedID]; exists {
			continue
		}
		seen[trimmedID] = struct{}{}
		uniqueMaterialIDs = append(uniqueMaterialIDs, trimmedID)
	}

	if len(uniqueMaterialIDs) == 0 {
		return materialMap, nil
	}

	var materials []models.Material
	if err := db.DB.Model(&models.Material{}).
		Select("id", "code", "name", "spec").
		Where("id IN ?", uniqueMaterialIDs).
		Find(&materials).Error; err != nil {
		return nil, err
	}

	for _, material := range materials {
		materialMap[material.ID] = material
	}

	return materialMap, nil
}

func evaluateInventoryBOMAlertDetails(
	rules []models.InventoryThresholdRule,
	bomMap map[string]models.BOM,
	stockMap map[string]float64,
	materialMap map[string]models.Material,
) []InventoryBOMAlertDetailResponse {
	details := make([]InventoryBOMAlertDetailResponse, 0, len(rules))

	for _, rule := range rules {
		if rule.BOMID == nil {
			continue
		}

		trackedBOM, exists := bomMap[strings.TrimSpace(*rule.BOMID)]
		if !exists || !isInventoryAlertActiveBOMStatus(trackedBOM.Status) {
			continue
		}

		shortages := make([]InventoryBOMAlertShortageResponse, 0)
		for _, item := range trackedBOM.Items {
			materialID := strings.TrimSpace(item.MaterialID)
			if materialID == "" || item.StandardUsage <= 0 {
				continue
			}

			requiredQty := rule.ThresholdQty * item.StandardUsage
			if requiredQty <= 0 {
				continue
			}

			currentStock := stockMap[materialID]
			if currentStock >= requiredQty {
				continue
			}

			material := materialMap[materialID]
			materialName := strings.TrimSpace(material.Name)
			if materialName == "" {
				materialName = materialID
			}

			shortages = append(shortages, InventoryBOMAlertShortageResponse{
				MaterialID:   materialID,
				MaterialCode: strings.TrimSpace(material.Code),
				MaterialName: materialName,
				MaterialSpec: strings.TrimSpace(material.Spec),
				RequiredQty:  requiredQty,
				CurrentStock: currentStock,
				ShortageQty:  requiredQty - currentStock,
			})
		}

		if len(shortages) == 0 {
			continue
		}

		bomNo := strings.TrimSpace(trackedBOM.BOMNo)
		if bomNo == "" {
			bomNo = strings.TrimSpace(rule.TargetCodeSnapshot)
		}

		productName := strings.TrimSpace(rule.TargetNameSnapshot)
		productSKU := ""
		if trackedBOM.Product != nil {
			if strings.TrimSpace(trackedBOM.Product.Name) != "" {
				productName = strings.TrimSpace(trackedBOM.Product.Name)
			}
			productSKU = strings.TrimSpace(trackedBOM.Product.SKU)
		}

		details = append(details, InventoryBOMAlertDetailResponse{
			RuleID:       rule.ID,
			BOMID:        trackedBOM.ID,
			BOMNo:        bomNo,
			ProductID:    strings.TrimSpace(trackedBOM.ProductID),
			ProductName:  productName,
			ProductSKU:   productSKU,
			ThresholdQty: rule.ThresholdQty,
			Shortages:    shortages,
			TriggeredAt:  rule.UpdatedAt,
		})
	}

	return details
}

func ListInventoryBOMAlertDetails() (InventoryBOMAlertDetailListResponse, error) {
	bomRules, err := loadEnabledBOMThresholdRules()
	if err != nil {
		return InventoryBOMAlertDetailListResponse{}, err
	}

	if len(bomRules) == 0 {
		return InventoryBOMAlertDetailListResponse{Items: []InventoryBOMAlertDetailResponse{}, Total: 0}, nil
	}

	bomIDs := make([]string, 0, len(bomRules))
	for _, rule := range bomRules {
		if rule.BOMID == nil {
			continue
		}
		bomIDs = append(bomIDs, *rule.BOMID)
	}

	bomMap, err := loadTrackedBOMsForInventoryAlerts(bomIDs)
	if err != nil {
		return InventoryBOMAlertDetailListResponse{}, err
	}

	materialIDs := make([]string, 0)
	for _, bom := range bomMap {
		for _, item := range bom.Items {
			materialIDs = append(materialIDs, item.MaterialID)
		}
	}

	stockMap, err := loadInventoryTotalsByMaterialIDs(materialIDs)
	if err != nil {
		return InventoryBOMAlertDetailListResponse{}, err
	}

	materialMap, err := loadInventoryAlertMaterialMetadata(materialIDs)
	if err != nil {
		return InventoryBOMAlertDetailListResponse{}, err
	}

	items := evaluateInventoryBOMAlertDetails(bomRules, bomMap, stockMap, materialMap)
	return InventoryBOMAlertDetailListResponse{
		Items: items,
		Total: len(items),
	}, nil
}

func isInventoryAlertActiveBOMStatus(status string) bool {
	trimmedStatus := strings.TrimSpace(status)
	if trimmedStatus == "" {
		return true
	}

	return strings.EqualFold(trimmedStatus, "active")
}

func GetInventoryAlertSummary() (InventoryAlertSummaryResponse, error) {
	trackedMaterials, err := loadInventoryAlertTrackedMaterials()
	if err != nil {
		return InventoryAlertSummaryResponse{}, err
	}

	bomRules, err := loadEnabledBOMThresholdRules()
	if err != nil {
		return InventoryAlertSummaryResponse{}, err
	}

	if len(trackedMaterials) == 0 && len(bomRules) == 0 {
		return InventoryAlertSummaryResponse{AlertCount: 0, MaterialAlertCount: 0, BOMAlertCount: 0}, nil
	}

	bomIDs := make([]string, 0, len(bomRules))
	for _, rule := range bomRules {
		if rule.BOMID == nil {
			continue
		}
		bomIDs = append(bomIDs, *rule.BOMID)
	}

	bomMap, err := loadTrackedBOMsForInventoryAlerts(bomIDs)
	if err != nil {
		return InventoryAlertSummaryResponse{}, err
	}

	materialIDs := make([]string, 0, len(trackedMaterials)+len(bomRules))
	for _, material := range trackedMaterials {
		materialIDs = append(materialIDs, material.ID)
	}

	for _, bom := range bomMap {
		for _, item := range bom.Items {
			materialIDs = append(materialIDs, item.MaterialID)
		}
	}

	stockMap, err := loadInventoryTotalsByMaterialIDs(materialIDs)
	if err != nil {
		return InventoryAlertSummaryResponse{}, err
	}

	materialMap, err := loadInventoryAlertMaterialMetadata(materialIDs)
	if err != nil {
		return InventoryAlertSummaryResponse{}, err
	}

	var materialAlertCount int64
	for _, material := range trackedMaterials {
		currentStock := stockMap[material.ID]
		if currentStock < material.MinStock {
			materialAlertCount++
		}
	}

	bomAlertDetails := evaluateInventoryBOMAlertDetails(bomRules, bomMap, stockMap, materialMap)
	bomAlertCount := int64(len(bomAlertDetails))

	return InventoryAlertSummaryResponse{
		AlertCount:         materialAlertCount + bomAlertCount,
		MaterialAlertCount: materialAlertCount,
		BOMAlertCount:      bomAlertCount,
	}, nil
}
