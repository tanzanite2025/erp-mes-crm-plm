package db

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestProductionMaterialPendingConsumptionWarehouseInitializationPersistsFalseCapabilitiesAndStableIdentity(t *testing.T) {
	database := openIsolatedDatabaseForProductionMaterialWarehouseNameAlignmentTests(t)
	ensureDefaultWarehouseCategories()
	var original models.WarehouseCategory
	require.NoError(t, database.First(&original, "code = ?", models.ProductionMaterialPendingConsumptionWarehouseCategoryCode).Error)
	require.NotEmpty(t, original.ID)
	require.Equal(t, "生产待耗用物料", original.Name)
	require.True(t, original.IsSystem)
	require.True(t, original.Active)
	require.True(t, original.AllowInbound)
	require.True(t, original.AllowShipment)
	require.False(t, original.AllowStocktake)
	require.False(t, original.AllowPurchaseReceipt)
	require.False(t, original.DefaultForProductInbound)
	require.False(t, original.DefaultForMaterialInbound)
	require.False(t, original.DefaultForPurchaseReceipt)

	ensureDefaultWarehouseCategories()
	var reloaded models.WarehouseCategory
	require.NoError(t, database.First(&reloaded, "code = ?", original.Code).Error)
	require.Equal(t, original, reloaded)
	var count int64
	require.NoError(t, database.Model(&models.WarehouseCategory{}).Where("code = ?", original.Code).Count(&count).Error)
	require.EqualValues(t, 1, count)
}

func TestProductionMaterialPendingConsumptionWarehouseInitializationCorrectsDedicatedRoutingAndPreservesDirectionalSuspension(t *testing.T) {
	database := openIsolatedDatabaseForProductionMaterialWarehouseNameAlignmentTests(t)
	ensureDefaultWarehouseCategories()
	var original models.WarehouseCategory
	require.NoError(t, database.First(&original, "code = ?", models.ProductionMaterialPendingConsumptionWarehouseCategoryCode).Error)
	require.NoError(t, database.Model(&original).Updates(map[string]interface{}{
		"name":                         "错误的普通仓库用途",
		"allow_inbound":                false,
		"allow_shipment":               false,
		"allow_stocktake":              true,
		"allow_purchase_receipt":       true,
		"default_for_product_inbound":  true,
		"default_for_material_inbound": true,
		"default_for_purchase_receipt": true,
	}).Error)
	custom := models.WarehouseCategory{
		Name: "自定义库存仓", Code: "CUSTOM_WAREHOUSE_FOR_CAPABILITY_TEST",
		AllowPurchaseReceipt: true, DefaultForProductInbound: true,
		DefaultForMaterialInbound: true, DefaultForPurchaseReceipt: true,
	}
	require.NoError(t, database.Create(&custom).Error)
	require.NoError(t, database.First(&custom, "code = ?", custom.Code).Error)

	ensureDefaultWarehouseCategories()
	ensureDefaultWarehouseCategories()
	var reloaded models.WarehouseCategory
	require.NoError(t, database.First(&reloaded, "code = ?", original.Code).Error)
	require.Equal(t, original.ID, reloaded.ID)
	require.Equal(t, "生产待耗用物料", reloaded.Name)
	require.False(t, reloaded.AllowInbound)
	require.False(t, reloaded.AllowShipment)
	require.False(t, reloaded.AllowStocktake)
	require.False(t, reloaded.AllowPurchaseReceipt)
	require.False(t, reloaded.DefaultForProductInbound)
	require.False(t, reloaded.DefaultForMaterialInbound)
	require.False(t, reloaded.DefaultForPurchaseReceipt)
	var reloadedCustom models.WarehouseCategory
	require.NoError(t, database.First(&reloadedCustom, "code = ?", custom.Code).Error)
	require.Equal(t, custom, reloadedCustom)
}
