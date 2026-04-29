package services

import (
	"fmt"
	"testing"
	"xdfc-server/db"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupMrpRequirementsTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE products (
			id TEXT PRIMARY KEY NOT NULL,
			deleted_at DATETIME,
			sku TEXT,
			name TEXT,
			tech_series TEXT,
			brake_type TEXT,
			version_level TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE materials (
			id TEXT PRIMARY KEY NOT NULL,
			deleted_at DATETIME,
			code TEXT,
			name TEXT,
			spec TEXT,
			uom TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE boms (
			id TEXT PRIMARY KEY NOT NULL,
			deleted_at DATETIME,
			product_id TEXT,
			status TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE bom_items (
			id TEXT PRIMARY KEY NOT NULL,
			bom_id TEXT,
			section TEXT,
			material_id TEXT,
			unit TEXT,
			standard_usage REAL
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE packaging_rules (
			id TEXT PRIMARY KEY NOT NULL,
			material_id TEXT,
			pack_unit TEXT,
			conversion_factor REAL,
			direction TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE inventory (
			id TEXT PRIMARY KEY NOT NULL,
			deleted_at DATETIME,
			material_id TEXT,
			quantity REAL
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			customer_name TEXT,
			status TEXT,
			order_date TEXT,
			delivery_date TEXT,
			is_deleted BOOLEAN
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE sales_order_lines (
			id INTEGER PRIMARY KEY,
			sales_order_id TEXT,
			line_no INTEGER,
			product_id TEXT,
			product_model TEXT,
			product_code TEXT,
			specification TEXT,
			model_code_snapshot TEXT,
			hole_prefix_snapshot TEXT,
			appearance_id TEXT,
			appearance_name_snapshot TEXT,
			appearance_barcode_code_snapshot TEXT,
			appearance_description_snapshot TEXT,
			appearance_image_url_snapshot TEXT,
			qty REAL,
			uom TEXT,
			status TEXT
		)
	`).Error)

	return testDB
}

func TestGetMrpRequirementsReturnsEmptyCollectionsWhenNoData(t *testing.T) {
	originalDB := db.DB
	testDB := setupMrpRequirementsTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
	})

	result, err := GetMrpRequirements(GetMrpRequirementsParams{})
	require.NoError(t, err)
	require.Empty(t, result.Requirements)
	require.Equal(t, 0, result.Stats.TotalMaterials)
	require.Equal(t, 0, result.Stats.MissingBOMCount)
	require.Equal(t, 0, result.Stats.ActiveOrderCount)
	require.Empty(t, result.Stats.AnalyzedModels)
}

func TestGetMrpRequirementsCalculatesRequirementAndPackaging(t *testing.T) {
	originalDB := db.DB
	testDB := setupMrpRequirementsTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
	})

	require.NoError(t, testDB.Exec(`INSERT INTO products (id, sku, name, tech_series, brake_type, version_level) VALUES ('prod-1', 'SKU-1', '前叉A', 'TS', 'DISC', 'V1')`).Error)
	require.NoError(t, testDB.Exec(`INSERT INTO materials (id, code, name, spec, uom) VALUES ('mat-1', 'MAT-001', '钢管', 'Φ10', 'PCS')`).Error)
	require.NoError(t, testDB.Exec(`INSERT INTO boms (id, product_id, status) VALUES ('bom-1', 'prod-1', 'active')`).Error)
	require.NoError(t, testDB.Exec(`INSERT INTO bom_items (id, bom_id, section, material_id, unit, standard_usage) VALUES ('bom-item-1', 'bom-1', '机加', 'mat-1', 'PCS', 2)`).Error)
	require.NoError(t, testDB.Exec(`INSERT INTO packaging_rules (id, material_id, pack_unit, conversion_factor, direction) VALUES ('pack-1', 'mat-1', '箱', 5, 'forward')`).Error)
	require.NoError(t, testDB.Exec(`INSERT INTO inventory (id, material_id, quantity) VALUES ('inv-1', 'mat-1', 3)`).Error)
	require.NoError(t, testDB.Exec(`INSERT INTO sales_orders (id, order_no, customer_name, status, order_date, delivery_date, is_deleted) VALUES ('so-1', 'SO-001', '客户A', 'Pending', '2026-04-07', '2026-04-10', 0)`).Error)
	require.NoError(t, testDB.Exec(`INSERT INTO sales_order_lines (id, sales_order_id, line_no, product_id, product_model, product_code, specification, qty, uom, status) VALUES (1, 'so-1', 1, 'prod-1', 'M1', 'SKU-1', 'Spec-A', 4, 'PCS', 'Pending')`).Error)

	result, err := GetMrpRequirements(GetMrpRequirementsParams{SelectedKeys: []string{"SO-001-1"}})
	require.NoError(t, err)
	require.Len(t, result.Requirements, 1)
	req := result.Requirements[0]
	require.Equal(t, "mat-1", req.MaterialID)
	require.Equal(t, "MAT-001", req.MaterialCode)
	require.Equal(t, "钢管", req.MaterialName)
	require.Equal(t, "机加", req.Section)
	require.Equal(t, 8.0, req.TotalRequired)
	require.Equal(t, 3.0, req.InventoryQty)
	require.Equal(t, 0.0, req.LockedQty)
	require.Equal(t, 0.0, req.OnWayPurchaseQty)
	require.Equal(t, 0.0, req.WipQty)
	require.Equal(t, 3.0, req.UsableStock)
	require.Equal(t, 3.0, req.TotalSupply)
	require.Equal(t, 5.0, req.EffectiveGap)
	require.Equal(t, 5.0, req.ShortageGap)
	require.NotNil(t, req.Packaging)
	require.Equal(t, 2, req.Packaging.PackQty)
	require.Equal(t, "箱", req.Packaging.PackUnit)
	require.Len(t, req.SourceOrders, 1)
	require.Equal(t, "SO-001", req.SourceOrders[0].OrderNo)
	require.Equal(t, 1, result.Stats.TotalMaterials)
	require.Equal(t, 1, result.Stats.ActiveOrderCount)
	require.Equal(t, 0, result.Stats.MissingBOMCount)
	require.Len(t, result.Stats.AnalyzedModels, 1)
	require.Equal(t, "M1", result.Stats.AnalyzedModels[0].ModelName)
	require.Equal(t, 4.0, result.Stats.AnalyzedModels[0].TotalQty)
}
