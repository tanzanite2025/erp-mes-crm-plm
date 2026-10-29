package services

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type MaterialInventoryBatchAvailability struct {
	InventoryID  string  `json:"inventoryId"`
	MaterialID   string  `json:"materialId"`
	CategoryCode string  `json:"categoryCode"`
	BatchNo      string  `json:"batchNo"`
	Unit         string  `json:"unit"`
	InventoryQty float64 `json:"inventoryQty"`
	ReservedQty  float64 `json:"reservedQty"`
	AvailableQty float64 `json:"availableQty"`
}

// QueryMaterialInventoryBatchAvailability only reads the caller's explicit scope.
// Reservation-only batches remain visible to aggregate readers with zero stock.
func QueryMaterialInventoryBatchAvailability(database *gorm.DB, materialIDs []string, categoryCodes []string) ([]MaterialInventoryBatchAvailability, error) {
	if database == nil || len(categoryCodes) == 0 {
		return nil, fmt.Errorf("[CRITICAL] inventory availability requires a database and explicit warehouse scope")
	}
	result := []MaterialInventoryBatchAvailability{}
	if len(materialIDs) == 0 {
		return result, nil
	}
	var inventory []models.Inventory
	if err := database.Where("material_id IN ? AND category_code IN ?", materialIDs, categoryCodes).Find(&inventory).Error; err != nil {
		return nil, err
	}
	var reservations []models.Reservation
	if err := database.Where("material_id IN ? AND category_code IN ? AND status = ?", materialIDs, categoryCodes, "RESERVED").Find(&reservations).Error; err != nil {
		return nil, err
	}
	byBatch := make(map[string]MaterialInventoryBatchAvailability)
	for _, balance := range inventory {
		if !isFiniteProductionMaterialRequirementQuantity(balance.Quantity) || balance.Quantity < 0 || strings.TrimSpace(balance.UOM) == "" {
			return nil, fmt.Errorf("[CRITICAL] invalid inventory quantity or unit for material %s", balance.MaterialID)
		}
		key := inventoryReservationKey(balance.MaterialID, balance.CategoryCode, balance.BatchNo)
		if _, exists := byBatch[key]; exists {
			return nil, fmt.Errorf("[CRITICAL] duplicate inventory balances for material %s warehouse %s batch %s", balance.MaterialID, balance.CategoryCode, balance.BatchNo)
		}
		byBatch[key] = MaterialInventoryBatchAvailability{
			InventoryID: balance.ID, MaterialID: balance.MaterialID, CategoryCode: balance.CategoryCode,
			BatchNo: balance.BatchNo, Unit: balance.UOM, InventoryQty: balance.Quantity,
		}
	}
	for _, reservation := range reservations {
		if !isFiniteProductionMaterialRequirementQuantity(reservation.Quantity) || reservation.Quantity < 0 {
			return nil, fmt.Errorf("[CRITICAL] invalid reserved quantity for material %s", reservation.MaterialID)
		}
		key := inventoryReservationKey(reservation.MaterialID, reservation.CategoryCode, reservation.BatchNo)
		batch := byBatch[key]
		batch.MaterialID, batch.CategoryCode, batch.BatchNo = reservation.MaterialID, reservation.CategoryCode, reservation.BatchNo
		batch.ReservedQty += reservation.Quantity
		if !isFiniteProductionMaterialRequirementQuantity(batch.ReservedQty) {
			return nil, fmt.Errorf("[CRITICAL] reserved inventory exceeds supported range")
		}
		byBatch[key] = batch
	}
	for _, batch := range byBatch {
		batch.AvailableQty = math.Max(0, batch.InventoryQty-batch.ReservedQty)
		result = append(result, batch)
	}
	sort.Slice(result, func(i, j int) bool {
		left, right := result[i], result[j]
		if left.MaterialID != right.MaterialID {
			return left.MaterialID < right.MaterialID
		}
		if left.CategoryCode != right.CategoryCode {
			return left.CategoryCode < right.CategoryCode
		}
		return left.BatchNo < right.BatchNo
	})
	return result, nil
}
