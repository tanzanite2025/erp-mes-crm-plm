package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestProductionOutsourceInventoryAdapterDoesNotTreatProductIDAsMaterialID(t *testing.T) {
	_, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	require.NoError(t, database.Unscoped().
		Where("product_id = ?", line.ProductID).
		Delete(&models.ProductInventoryMaterialMapping{}).Error)

	require.NoError(t, database.Create(&models.Material{
		BaseModel: models.BaseModel{ID: "product-1"},
		Code:      "MATERIAL-ONLY",
		Name:      "仅用于验证的物料",
		UOM:       "PCS",
	}).Error)
	require.NoError(t, database.Create(&models.Inventory{
		BaseModel:       models.BaseModel{ID: "inventory-product-id-trap"},
		MaterialID:      "product-1",
		MaterialName:    "仅用于验证的物料",
		MaterialCode:    "MATERIAL-ONLY",
		Quantity:        10,
		TotalValue:      100,
		AverageUnitCost: 10,
		CategoryCode:    "FINISHED",
		UOM:             "PCS",
	}).Error)

	err := database.Transaction(func(tx *gorm.DB) error {
		_, err := applyProductionOutsourceInventoryTransferTx(tx, productionOutsourceInventoryTransferInput{
			TransferID:         "00000000-0000-0000-0000-000000000903",
			TransferType:       OutsourceTransferTypeSend,
			ProductID:          line.ProductID,
			ProductCode:        "PRODUCT-ONLY",
			Quantity:           1,
			UOM:                "PCS",
			SourceCategory:     "FINISHED",
			TargetCategory:     ProductionOutsourceInventoryCategory,
			OutsourceOrderID:   line.OutsourceOrderID,
			OutsourceOrderLine: line.ID,
			Operator:           "tester",
		})
		return err
	})

	require.Error(t, err)

	var ledgerCount int64
	require.NoError(t, database.Model(&models.InventoryLedgerEntry{}).
		Where("transfer_id = ?", "00000000-0000-0000-0000-000000000903").
		Count(&ledgerCount).Error)
	require.Zero(t, ledgerCount)
}
