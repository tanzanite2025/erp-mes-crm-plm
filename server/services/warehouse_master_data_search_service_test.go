package services

import (
	"strings"
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupWarehouseMasterDataSearchTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dbName := "warehouse_master_data_search_" + strings.NewReplacer("/", "_", " ", "_").Replace(t.Name())
	testDB, err := gorm.Open(sqlite.Open("file:"+dbName+"?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE materials (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT,
			name TEXT,
			category TEXT,
			spec TEXT,
			uom TEXT,
			status TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_materials_deleted_at ON materials(deleted_at)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE products (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			sku TEXT,
			name TEXT,
			model_code TEXT,
			description TEXT,
			status TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_products_deleted_at ON products(deleted_at)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE inventory (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			material_id TEXT NOT NULL,
			quantity REAL DEFAULT 0,
			category_code TEXT NOT NULL
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_inventory_deleted_at ON inventory(deleted_at)`).Error)

	return testDB
}

func seedWarehouseMasterDataSearchTestData(t *testing.T) {
	t.Helper()

	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, created_at, updated_at, code, name, category, spec, uom, status)
		VALUES
			('mat-rim-1', ?, ?, 'MAT-RIM-001', 'Carbon Rim Blank', 'RAW', '700C', 'PCS', 'Active'),
			('mat-zero-1', ?, ?, 'MAT-ZERO-001', 'Zero Stock Rim', 'RAW', '650B', 'PCS', 'Active'),
			('mat-draft-1', ?, ?, 'MAT-DRAFT-001', 'Draft Rim', 'RAW', 'Draft', 'PCS', 'Draft')
	`, now, now, now, now, now, now).Error)

	require.NoError(t, db.DB.Exec(`
		INSERT INTO products (id, created_at, updated_at, sku, name, model_code, description, status)
		VALUES
			('prod-rim-1', ?, ?, 'PROD-RIM-001', 'Finished Rim', 'FR-01', 'Road rim', 'active'),
			('prod-draft-1', ?, ?, 'PROD-DRAFT-001', 'Draft Finished Rim', 'DF-01', 'Draft rim', 'Draft')
	`, now, now, now, now).Error)

	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, quantity, category_code)
		VALUES
			('inv-mat-rim-1', ?, ?, 'mat-rim-1', 8, 'WH_A'),
			('inv-mat-rim-2', ?, ?, 'mat-rim-1', 2, 'WH_B'),
			('inv-mat-zero-1', ?, ?, 'mat-zero-1', 0, 'WH_A'),
			('inv-prod-rim-1', ?, ?, 'prod-rim-1', 3, 'FINISHED')
	`, now, now, now, now, now, now, now, now).Error)
}

func TestSearchWarehouseMasterDataSupportsInboundSelectionWithoutStockGate(t *testing.T) {
	originalDB := db.DB
	testDB := setupWarehouseMasterDataSearchTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})
	seedWarehouseMasterDataSearchTestData(t)

	items, err := SearchWarehouseMasterData("rim", string(WarehouseMasterDataScopeInbound))
	require.NoError(t, err)

	ids := make([]string, 0, len(items))
	for _, item := range items {
		ids = append(ids, item.ID)
	}
	require.Contains(t, ids, "prod-rim-1")
	require.Contains(t, ids, "mat-rim-1")
	require.Contains(t, ids, "mat-zero-1")
	require.NotContains(t, ids, "mat-draft-1")
	require.NotContains(t, ids, "prod-draft-1")
}

func TestSearchWarehouseMasterDataShipmentSelectionRequiresPositiveStock(t *testing.T) {
	originalDB := db.DB
	testDB := setupWarehouseMasterDataSearchTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})
	seedWarehouseMasterDataSearchTestData(t)

	items, err := SearchWarehouseMasterData("rim", string(WarehouseMasterDataScopeShipment))
	require.NoError(t, err)

	ids := make([]string, 0, len(items))
	stockByID := make(map[string]float64, len(items))
	for _, item := range items {
		ids = append(ids, item.ID)
		stockByID[item.ID] = item.Stock
	}
	require.Equal(t, []string{"prod-rim-1", "mat-rim-1"}, ids)
	require.InDelta(t, 3, stockByID["prod-rim-1"], 0.000001)
	require.InDelta(t, 10, stockByID["mat-rim-1"], 0.000001)
}

func TestSearchWarehouseMasterDataDefaultsUnknownScopeToAll(t *testing.T) {
	originalDB := db.DB
	testDB := setupWarehouseMasterDataSearchTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})
	seedWarehouseMasterDataSearchTestData(t)

	items, err := SearchWarehouseMasterData("", "legacy")
	require.NoError(t, err)
	require.Len(t, items, 3)
	require.Equal(t, "prod-rim-1", items[0].ID)
}
