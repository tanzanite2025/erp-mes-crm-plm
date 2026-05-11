package services

import (
	"fmt"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupInventoryThresholdRuleServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(
		sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())),
		&gorm.Config{Logger: logger.Default.LogMode(logger.Silent)},
	)
	require.NoError(t, err)

	for _, statement := range []string{
		`CREATE TABLE materials (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			category TEXT,
			spec TEXT,
			uom TEXT,
			min_stock REAL DEFAULT 0,
			status TEXT
		)`,
		`CREATE INDEX idx_materials_deleted_at ON materials(deleted_at)`,
		`CREATE TABLE products (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			sku TEXT NOT NULL,
			name TEXT NOT NULL
		)`,
		`CREATE INDEX idx_products_deleted_at ON products(deleted_at)`,
		`CREATE TABLE boms (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			bom_no TEXT NOT NULL,
			product_id TEXT NOT NULL,
			status TEXT,
			description TEXT
		)`,
		`CREATE INDEX idx_boms_deleted_at ON boms(deleted_at)`,
		`CREATE TABLE inventory_threshold_rules (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			target_type TEXT NOT NULL,
			material_id TEXT,
			bom_id TEXT,
			target_name_snapshot TEXT NOT NULL,
			target_code_snapshot TEXT,
			threshold_qty REAL DEFAULT 0,
			enabled NUMERIC DEFAULT 1,
			notes TEXT
		)`,
		`CREATE INDEX idx_inventory_threshold_rules_deleted_at ON inventory_threshold_rules(deleted_at)`,
	} {
		require.NoError(t, testDB.Exec(statement).Error)
	}

	return testDB
}

func seedInventoryThresholdTestMaterial(t *testing.T, testDB *gorm.DB, id string, code string, name string, minStock float64) {
	t.Helper()
	require.NoError(t, testDB.Exec(
		`INSERT INTO materials (id, code, name, min_stock, status) VALUES (?, ?, ?, ?, ?)`,
		id,
		code,
		name,
		minStock,
		"Active",
	).Error)
}

func seedInventoryThresholdTestBOM(t *testing.T, testDB *gorm.DB, productID string, bomID string, productName string, productSKU string, bomNo string) {
	t.Helper()
	require.NoError(t, testDB.Exec(
		`INSERT INTO products (id, sku, name) VALUES (?, ?, ?)`,
		productID,
		productSKU,
		productName,
	).Error)
	require.NoError(t, testDB.Exec(
		`INSERT INTO boms (id, bom_no, product_id, status) VALUES (?, ?, ?, ?)`,
		bomID,
		bomNo,
		productID,
		"active",
	).Error)
}

func inventoryThresholdRuleServiceStringPtr(value string) *string {
	return &value
}

func TestCreateInventoryThresholdRuleSyncsMaterialMinStock(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryThresholdRuleServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedInventoryThresholdTestMaterial(t, testDB, "mat-1", "MAT-001", "Carbon Fiber", 0)

	rule, err := CreateInventoryThresholdRule(InventoryThresholdRuleWriteInput{
		TargetType:   InventoryThresholdTargetMaterial,
		MaterialID:   inventoryThresholdRuleServiceStringPtr("mat-1"),
		ThresholdQty: 12.5,
		Enabled:      true,
		Notes:        "primary floor stock",
	})
	require.NoError(t, err)
	require.Equal(t, InventoryThresholdTargetMaterial, rule.TargetType)
	require.Equal(t, "Carbon Fiber", rule.TargetNameSnapshot)
	require.Equal(t, "MAT-001", rule.TargetCodeSnapshot)

	var material models.Material
	require.NoError(t, testDB.First(&material, "id = ?", "mat-1").Error)
	require.Equal(t, 12.5, material.MinStock)
}

func TestCreateInventoryThresholdRuleRejectsDuplicateMaterialTarget(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryThresholdRuleServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedInventoryThresholdTestMaterial(t, testDB, "mat-1", "MAT-001", "Carbon Fiber", 0)

	_, err := CreateInventoryThresholdRule(InventoryThresholdRuleWriteInput{
		TargetType:   InventoryThresholdTargetMaterial,
		MaterialID:   inventoryThresholdRuleServiceStringPtr("mat-1"),
		ThresholdQty: 8,
		Enabled:      true,
	})
	require.NoError(t, err)

	_, err = CreateInventoryThresholdRule(InventoryThresholdRuleWriteInput{
		TargetType:   InventoryThresholdTargetMaterial,
		MaterialID:   inventoryThresholdRuleServiceStringPtr("mat-1"),
		ThresholdQty: 10,
		Enabled:      true,
	})
	require.ErrorIs(t, err, ErrInventoryThresholdRuleDuplicateTarget)

	var count int64
	require.NoError(t, testDB.Model(&models.InventoryThresholdRule{}).Count(&count).Error)
	require.EqualValues(t, 1, count)
}

func TestUpdateInventoryThresholdRuleDisabledResetsMaterialMinStock(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryThresholdRuleServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedInventoryThresholdTestMaterial(t, testDB, "mat-1", "MAT-001", "Carbon Fiber", 0)

	rule, err := CreateInventoryThresholdRule(InventoryThresholdRuleWriteInput{
		TargetType:   InventoryThresholdTargetMaterial,
		MaterialID:   inventoryThresholdRuleServiceStringPtr("mat-1"),
		ThresholdQty: 6,
		Enabled:      true,
	})
	require.NoError(t, err)

	updatedRule, err := UpdateInventoryThresholdRule(rule.ID, InventoryThresholdRuleWriteInput{
		TargetType:   InventoryThresholdTargetMaterial,
		MaterialID:   inventoryThresholdRuleServiceStringPtr("mat-1"),
		ThresholdQty: 6,
		Enabled:      false,
	})
	require.NoError(t, err)
	require.False(t, updatedRule.Enabled)

	var material models.Material
	require.NoError(t, testDB.First(&material, "id = ?", "mat-1").Error)
	require.Equal(t, 0.0, material.MinStock)
}

func TestCreateInventoryThresholdRuleBuildsBOMSnapshots(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryThresholdRuleServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedInventoryThresholdTestBOM(t, testDB, "prod-1", "bom-1", "Trail Wheel", "SKU-001", "BOM-TRAIL-001")

	rule, err := CreateInventoryThresholdRule(InventoryThresholdRuleWriteInput{
		TargetType:   InventoryThresholdTargetBOM,
		BOMID:        inventoryThresholdRuleServiceStringPtr("bom-1"),
		ThresholdQty: 18,
		Enabled:      true,
	})
	require.NoError(t, err)
	require.Equal(t, InventoryThresholdTargetBOM, rule.TargetType)
	require.Nil(t, rule.MaterialID)
	require.NotNil(t, rule.BOMID)
	require.Equal(t, "Trail Wheel", rule.TargetNameSnapshot)
	require.Equal(t, "BOM-TRAIL-001", rule.TargetCodeSnapshot)
}
