package services

import (
	"context"
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type ProductionMaterialIssuanceMaterialBatchAvailability struct {
	DocumentID      string                               `json:"documentId"`
	ExpectedVersion int                                  `json:"expectedVersion"`
	MaterialID      string                               `json:"materialId"`
	Unit            string                               `json:"unit"`
	Items           []MaterialInventoryBatchAvailability `json:"items"`
}

func GetProductionMaterialIssuanceMaterialBatchAvailability(ctx context.Context, database *gorm.DB, documentID string, expectedVersion int, materialID string) (ProductionMaterialIssuanceMaterialBatchAvailability, error) {
	result := ProductionMaterialIssuanceMaterialBatchAvailability{Items: []MaterialInventoryBatchAvailability{}}
	if database == nil || documentID == "" || materialID == "" || expectedVersion <= 0 {
		return result, ErrProductionMaterialIssuanceInvalidRequest
	}
	err := database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		state, err := readProductionMaterialIssuanceWarehouseAllocationStateTx(tx, documentID)
		if err != nil {
			return err
		}
		if state.Review.Document.Version != expectedVersion || state.Review.Document.Status != models.ProductionMaterialIssuanceDispatched {
			return ErrProductionMaterialIssuanceBasisChanged
		}
		unit := ""
		for _, row := range state.Review.SourceMaterials {
			if row.MaterialID == materialID {
				unit = row.Unit
				break
			}
		}
		if unit == "" {
			return ErrProductionMaterialIssuanceAllocationInvalid
		}
		var material models.Material
		if err := tx.First(&material, "id = ?", materialID).Error; err != nil {
			return err
		}
		if !strings.EqualFold(material.Status, "Active") || !strings.EqualFold(strings.TrimSpace(material.UOM), strings.TrimSpace(unit)) {
			return fmt.Errorf("%w: 物料停用或主单位与原单不一致", ErrProductionMaterialIssuanceBasisChanged)
		}
		var warehouse models.WarehouseCategory
		if err := tx.Where("code = ?", ProductionMaterialInventoryWarehouseCategoryCode).First(&warehouse).Error; err != nil {
			return err
		}
		if !warehouse.IsSystem || !warehouse.Active || !warehouse.AllowShipment {
			return fmt.Errorf("%w: 生产物料仓库不允许发料", ErrProductionMaterialIssuanceBasisChanged)
		}
		batches, err := QueryMaterialInventoryBatchAvailability(tx, []string{materialID}, []string{ProductionMaterialInventoryWarehouseCategoryCode})
		if err != nil {
			return err
		}
		result.DocumentID, result.ExpectedVersion, result.MaterialID, result.Unit = documentID, expectedVersion, materialID, unit
		for _, batch := range batches {
			if batch.InventoryID == "" {
				continue
			}
			if !strings.EqualFold(strings.TrimSpace(batch.Unit), strings.TrimSpace(unit)) {
				return fmt.Errorf("%w: 批次主单位与原单不一致", ErrProductionMaterialIssuanceBasisChanged)
			}
			result.Items = append(result.Items, batch)
		}
		return nil
	}, productionMaterialIssuanceConsistentReadOptions(database)...)
	return result, err
}
