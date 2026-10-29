package db

import (
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openIsolatedDatabaseForProductionMaterialWarehouseNameAlignmentTests(t *testing.T) *gorm.DB {
	t.Helper()
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	previousDatabase := DB
	t.Cleanup(func() {
		DB = previousDatabase
		require.NoError(t, connection.Close())
	})
	DB = database
	// SQLite uses a local ID default; production retains PostgreSQL UUID generation.
	require.NoError(t, database.Exec(`CREATE TABLE warehouse_categories (
		id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
		created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
		name TEXT NOT NULL, code TEXT NOT NULL UNIQUE, description TEXT,
		is_system BOOLEAN DEFAULT false, active BOOLEAN DEFAULT true,
		sort_order INTEGER DEFAULT 0,
		allow_inbound BOOLEAN DEFAULT true, allow_shipment BOOLEAN DEFAULT true,
		allow_stocktake BOOLEAN DEFAULT true, allow_purchase_receipt BOOLEAN DEFAULT false,
		default_for_product_inbound BOOLEAN DEFAULT false,
		default_for_material_inbound BOOLEAN DEFAULT false,
		default_for_purchase_receipt BOOLEAN DEFAULT false
	)`).Error)
	return database
}

func TestProductionMaterialWarehouseInitializationPreservesSystemIdentityAcrossRepeatedStartup(t *testing.T) {
	database := openIsolatedDatabaseForProductionMaterialWarehouseNameAlignmentTests(t)
	ensureDefaultWarehouseCategories()
	var original models.WarehouseCategory
	require.NoError(t, database.First(&original, "code = ?", "MATERIAL").Error)
	require.Equal(t, "生产物料仓库", original.Name)
	require.NotEmpty(t, original.Description)
	require.True(t, original.IsSystem)
	require.True(t, original.Active)
	require.True(t, original.DefaultForMaterialInbound)
	require.True(t, original.DefaultForPurchaseReceipt)

	ensureDefaultWarehouseCategories()
	var reloaded models.WarehouseCategory
	require.NoError(t, database.First(&reloaded, "code = ?", "MATERIAL").Error)
	require.Equal(t, original, reloaded)
	var count int64
	require.NoError(t, database.Model(&models.WarehouseCategory{}).Where("code = ?", "MATERIAL").Count(&count).Error)
	require.EqualValues(t, 1, count)
}

func TestProductionMaterialWarehouseInitializationEnforcesCanonicalNameWithoutChangingInventoryOrCustomWarehouses(t *testing.T) {
	for _, testCase := range []struct {
		name         string
		originalName string
		isSystem     bool
	}{
		{name: "legacy_material_warehouse_name", originalName: "物料仓库", isSystem: true},
		{name: "noncanonical_system_name", originalName: "待统一名称", isSystem: true},
		{name: "fixed_code_without_system_flag", originalName: "待统一名称"},
		{name: "empty_name", isSystem: true},
		{name: "renamed_system_category", originalName: "一厂原料仓", isSystem: true},
		{name: "canonical_name", originalName: "生产物料仓库", isSystem: true},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			database := openIsolatedDatabaseForProductionMaterialWarehouseNameAlignmentTests(t)
			original := models.WarehouseCategory{
				Name: testCase.originalName, Code: "MATERIAL", IsSystem: testCase.isSystem,
				Description: "保留原有仓库说明", SortOrder: 25,
				AllowPurchaseReceipt: true, DefaultForMaterialInbound: true, DefaultForPurchaseReceipt: true,
			}
			require.NoError(t, database.Create(&original).Error)
			other := models.WarehouseCategory{Name: "辅助备料仓", Code: "CUSTOM_MATERIAL"}
			require.NoError(t, database.Create(&other).Error)
			require.NoError(t, database.Exec(`CREATE TABLE inventory (
				id TEXT PRIMARY KEY, category_code TEXT, quantity REAL, total_value REAL
			)`).Error)
			require.NoError(t, database.Exec("INSERT INTO inventory VALUES (?, ?, ?, ?)", "existing-balance", "MATERIAL", 125.5, 400).Error)

			ensureDefaultWarehouseCategories()
			ensureDefaultWarehouseCategories()

			var reloaded models.WarehouseCategory
			require.NoError(t, database.First(&reloaded, "code = ?", "MATERIAL").Error)
			require.Equal(t, original.ID, reloaded.ID)
			require.Equal(t, original.Code, reloaded.Code)
			require.Equal(t, "生产物料仓库", reloaded.Name)
			require.Equal(t, original.Description, reloaded.Description)
			require.Equal(t, original.SortOrder, reloaded.SortOrder)
			require.True(t, reloaded.IsSystem)
			require.NoError(t, database.First(&other, "code = ?", "CUSTOM_MATERIAL").Error)
			require.Equal(t, "辅助备料仓", other.Name)
			require.False(t, other.IsSystem)
			var balance struct {
				CategoryCode string
				Quantity     float64
				TotalValue   float64
			}
			require.NoError(t, database.Table("inventory").Where("id = ?", "existing-balance").Take(&balance).Error)
			require.Equal(t, "MATERIAL", balance.CategoryCode)
			require.Equal(t, 125.5, balance.Quantity)
			require.Equal(t, float64(400), balance.TotalValue)
		})
	}
}
