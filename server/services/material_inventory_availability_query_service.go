package services

import (
	"fmt"
	"gorm.io/gorm"
	"strings"
)

const ProductionMaterialInventoryWarehouseCategoryCode = "MATERIAL"

type MaterialInventoryAvailability struct {
	InventoryQty float64
	ReservedQty  float64
	AvailableQty float64
	Unit         string
}

// QueryMaterialInventoryAvailability aggregates the same per-batch availability
// used by warehouse picking. MRP retains its existing material-level contract.
func QueryMaterialInventoryAvailability(database *gorm.DB, materialIDs []string, categoryCodes []string) (map[string]MaterialInventoryAvailability, error) {
	batches, err := QueryMaterialInventoryBatchAvailability(database, materialIDs, categoryCodes)
	if err != nil {
		return nil, err
	}
	availability := make(map[string]MaterialInventoryAvailability)
	for _, batch := range batches {
		total := availability[batch.MaterialID]
		if batch.Unit != "" {
			if total.Unit != "" && !strings.EqualFold(total.Unit, batch.Unit) {
				return nil, fmt.Errorf("[CRITICAL] inventory units disagree for material %s", batch.MaterialID)
			}
			total.Unit = batch.Unit
		}
		total.InventoryQty += batch.InventoryQty
		total.ReservedQty += batch.ReservedQty
		total.AvailableQty += batch.AvailableQty
		if !isFiniteProductionMaterialRequirementQuantity(total.InventoryQty) || !isFiniteProductionMaterialRequirementQuantity(total.ReservedQty) || !isFiniteProductionMaterialRequirementQuantity(total.AvailableQty) {
			return nil, fmt.Errorf("[CRITICAL] aggregate inventory exceeds supported range for material %s", batch.MaterialID)
		}
		availability[batch.MaterialID] = total
	}
	return availability, nil
}
