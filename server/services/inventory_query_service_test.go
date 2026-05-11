package services

import (
	"testing"
	"xdfc-server/db"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupInventoryAlertSummaryTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB := setupInventoryThresholdRuleServiceTestDB(t)
	for _, statement := range []string{
		`CREATE TABLE inventory (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			material_id TEXT NOT NULL,
			material_name TEXT,
			material_code TEXT,
			material_spec TEXT,
			quantity REAL DEFAULT 0,
			total_value REAL DEFAULT 0,
			average_unit_cost REAL DEFAULT 0,
			category_code TEXT NOT NULL,
			batch_no TEXT,
			uom TEXT
		)`,
		`CREATE INDEX idx_inventory_deleted_at ON inventory(deleted_at)`,
		`CREATE TABLE bom_items (
			id TEXT PRIMARY KEY NOT NULL,
			bom_id TEXT NOT NULL,
			section TEXT,
			material_id TEXT,
			unit TEXT,
			standard_usage REAL DEFAULT 0
		)`,
	} {
		require.NoError(t, testDB.Exec(statement).Error)
	}

	return testDB
}

func seedInventoryAlertSummaryStock(t *testing.T, testDB *gorm.DB, id string, materialID string, quantity float64) {
	t.Helper()
	require.NoError(t, testDB.Exec(
		`INSERT INTO inventory (id, material_id, quantity, category_code, uom) VALUES (?, ?, ?, ?, ?)`,
		id,
		materialID,
		quantity,
		"MATERIAL",
		"PCS",
	).Error)
}

func seedInventoryAlertSummaryBOMItem(t *testing.T, testDB *gorm.DB, id string, bomID string, materialID string, standardUsage float64) {
	t.Helper()
	require.NoError(t, testDB.Exec(
		`INSERT INTO bom_items (id, bom_id, section, material_id, unit, standard_usage) VALUES (?, ?, ?, ?, ?, ?)`,
		id,
		bomID,
		"ASSEMBLY",
		materialID,
		"PCS",
		standardUsage,
	).Error)
}

func TestGetInventoryAlertSummaryCountsMaterialAndBOMAlertsSeparately(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryAlertSummaryTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedInventoryThresholdTestMaterial(t, testDB, "mat-low", "MAT-LOW-001", "Low Stock Material", 10)
	seedInventoryThresholdTestMaterial(t, testDB, "mat-bom", "MAT-BOM-001", "BOM Limited Material", 0)
	seedInventoryThresholdTestBOM(t, testDB, "prod-1", "bom-1", "Trail Wheel", "SKU-001", "BOM-TRAIL-001")
	seedInventoryAlertSummaryBOMItem(t, testDB, "bom-item-1", "bom-1", "mat-bom", 2)
	seedInventoryAlertSummaryStock(t, testDB, "inv-low", "mat-low", 7)
	seedInventoryAlertSummaryStock(t, testDB, "inv-bom", "mat-bom", 7)

	_, err := CreateInventoryThresholdRule(InventoryThresholdRuleWriteInput{
		TargetType:   InventoryThresholdTargetBOM,
		BOMID:        inventoryThresholdRuleServiceStringPtr("bom-1"),
		ThresholdQty: 4,
		Enabled:      true,
	})
	require.NoError(t, err)

	response, err := GetInventoryAlertSummary()
	require.NoError(t, err)
	require.EqualValues(t, 2, response.AlertCount)
	require.EqualValues(t, 1, response.MaterialAlertCount)
	require.EqualValues(t, 1, response.BOMAlertCount)
}

func TestGetInventoryAlertSummarySkipsHealthyBOMThresholds(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryAlertSummaryTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedInventoryThresholdTestMaterial(t, testDB, "mat-bom", "MAT-BOM-001", "Healthy BOM Material", 0)
	seedInventoryThresholdTestBOM(t, testDB, "prod-1", "bom-1", "Trail Wheel", "SKU-001", "BOM-TRAIL-001")
	seedInventoryAlertSummaryBOMItem(t, testDB, "bom-item-1", "bom-1", "mat-bom", 2)
	seedInventoryAlertSummaryStock(t, testDB, "inv-bom", "mat-bom", 10)

	_, err := CreateInventoryThresholdRule(InventoryThresholdRuleWriteInput{
		TargetType:   InventoryThresholdTargetBOM,
		BOMID:        inventoryThresholdRuleServiceStringPtr("bom-1"),
		ThresholdQty: 4,
		Enabled:      true,
	})
	require.NoError(t, err)

	response, err := GetInventoryAlertSummary()
	require.NoError(t, err)
	require.EqualValues(t, 0, response.AlertCount)
	require.EqualValues(t, 0, response.MaterialAlertCount)
	require.EqualValues(t, 0, response.BOMAlertCount)
}

func TestListInventoryBOMAlertDetailsReturnsTriggeredBOMShortages(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryAlertSummaryTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedInventoryThresholdTestMaterial(t, testDB, "mat-bom-1", "MAT-BOM-001", "Resin A", 0)
	seedInventoryThresholdTestMaterial(t, testDB, "mat-bom-2", "MAT-BOM-002", "Fiber B", 0)
	seedInventoryThresholdTestBOM(t, testDB, "prod-1", "bom-1", "Trail Wheel", "SKU-001", "BOM-TRAIL-001")
	seedInventoryAlertSummaryBOMItem(t, testDB, "bom-item-1", "bom-1", "mat-bom-1", 2)
	seedInventoryAlertSummaryBOMItem(t, testDB, "bom-item-2", "bom-1", "mat-bom-2", 1)
	seedInventoryAlertSummaryStock(t, testDB, "inv-bom-1", "mat-bom-1", 5)
	seedInventoryAlertSummaryStock(t, testDB, "inv-bom-2", "mat-bom-2", 2)

	_, err := CreateInventoryThresholdRule(InventoryThresholdRuleWriteInput{
		TargetType:   InventoryThresholdTargetBOM,
		BOMID:        inventoryThresholdRuleServiceStringPtr("bom-1"),
		ThresholdQty: 4,
		Enabled:      true,
	})
	require.NoError(t, err)

	response, err := ListInventoryBOMAlertDetails()
	require.NoError(t, err)
	require.Equal(t, 1, response.Total)
	require.Len(t, response.Items, 1)
	require.Equal(t, "bom-1", response.Items[0].BOMID)
	require.Equal(t, "BOM-TRAIL-001", response.Items[0].BOMNo)
	require.Equal(t, "Trail Wheel", response.Items[0].ProductName)
	require.Equal(t, "SKU-001", response.Items[0].ProductSKU)
	require.Equal(t, 4.0, response.Items[0].ThresholdQty)
	require.Len(t, response.Items[0].Shortages, 2)
	require.Equal(t, "MAT-BOM-001", response.Items[0].Shortages[0].MaterialCode)
	require.Equal(t, 8.0, response.Items[0].Shortages[0].RequiredQty)
	require.Equal(t, 5.0, response.Items[0].Shortages[0].CurrentStock)
	require.Equal(t, 3.0, response.Items[0].Shortages[0].ShortageQty)
	require.Equal(t, "MAT-BOM-002", response.Items[0].Shortages[1].MaterialCode)
	require.Equal(t, 4.0, response.Items[0].Shortages[1].RequiredQty)
	require.Equal(t, 2.0, response.Items[0].Shortages[1].CurrentStock)
	require.Equal(t, 2.0, response.Items[0].Shortages[1].ShortageQty)
}

func TestListInventoryBOMAlertDetailsSkipsHealthyRules(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryAlertSummaryTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	seedInventoryThresholdTestMaterial(t, testDB, "mat-bom", "MAT-BOM-001", "Healthy BOM Material", 0)
	seedInventoryThresholdTestBOM(t, testDB, "prod-1", "bom-1", "Trail Wheel", "SKU-001", "BOM-TRAIL-001")
	seedInventoryAlertSummaryBOMItem(t, testDB, "bom-item-1", "bom-1", "mat-bom", 2)
	seedInventoryAlertSummaryStock(t, testDB, "inv-bom", "mat-bom", 12)

	_, err := CreateInventoryThresholdRule(InventoryThresholdRuleWriteInput{
		TargetType:   InventoryThresholdTargetBOM,
		BOMID:        inventoryThresholdRuleServiceStringPtr("bom-1"),
		ThresholdQty: 4,
		Enabled:      true,
	})
	require.NoError(t, err)

	response, err := ListInventoryBOMAlertDetails()
	require.NoError(t, err)
	require.Equal(t, 0, response.Total)
	require.Empty(t, response.Items)
}
