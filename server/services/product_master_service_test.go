package services

import (
	"encoding/json"
	"fmt"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupProductMasterServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE product_templates (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			revision_no TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			change_type TEXT,
			change_order_no TEXT,
			site_code TEXT,
			is_default_site NUMERIC,
			name TEXT NOT NULL,
			code TEXT NOT NULL,
			component_key TEXT,
			description TEXT,
			active NUMERIC,
			version INTEGER
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE product_types (
			id TEXT PRIMARY KEY,
			parent_id TEXT,
			template_id TEXT,
			name TEXT NOT NULL,
			code TEXT,
			description TEXT,
			active NUMERIC,
			sort_order INTEGER,
			created_at DATETIME,
			updated_at DATETIME,
			version INTEGER
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE products (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			revision_no TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			change_type TEXT,
			change_order_no TEXT,
			site_code TEXT,
			is_default_site NUMERIC,
			sku TEXT NOT NULL,
			name TEXT NOT NULL,
			model_code TEXT,
			type_id TEXT,
			depth REAL,
			width_internal REAL,
			width_external REAL,
			tire_type TEXT,
			brake_type TEXT,
			tech_series TEXT,
			version_level TEXT,
			weight REAL,
			length REAL,
			angle REAL,
			clamp TEXT,
			offset REAL,
			axle_crown REAL,
			steerer TEXT,
			image TEXT,
			restrictions BLOB,
			mold_group TEXT,
			description TEXT,
			engineering_spec_id TEXT,
			technical_specs BLOB,
			barcode_config BLOB,
			attachments BLOB,
			status TEXT,
			version INTEGER
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE product_attribute_values (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_id TEXT,
			category_key TEXT,
			option_value TEXT,
			sort_order INTEGER,
			version INTEGER
		)
	`).Error)

	previousDB := db.DB
	db.DB = testDB

	t.Cleanup(func() {
		db.DB = previousDB
		sqlDB, err := testDB.DB()
		require.NoError(t, err)
		require.NoError(t, sqlDB.Close())
	})

	return testDB
}

func TestBuildProductPatchInputRejectsTemplateKeyDelta(t *testing.T) {
	payload := map[string]json.RawMessage{
		"templateKey": json.RawMessage(`{"new":"FORK"}`),
	}

	_, err := BuildProductPatchInput("product-1", 1, payload)
	require.Error(t, err)
	require.Contains(t, err.Error(), "templateKey")
}

func TestApplyDerivedTemplateKeysDerivesFromProductTypeTemplate(t *testing.T) {
	testDB := setupProductMasterServiceTestDB(t)
	templateID := "template-1"
	typeID := "type-1"
	productID := "product-1"

	require.NoError(t, testDB.Create(&models.ProductTemplate{
		BaseModel:    models.BaseModel{ID: templateID},
		Name:         "Fork Template",
		Code:         "FORK_STD",
		ComponentKey: "FORK",
		Active:       true,
		Version:      1,
	}).Error)

	require.NoError(t, testDB.Create(&models.ProductType{
		ID:         typeID,
		Name:       "Fork Type",
		Code:       "FORK_TYPE",
		TemplateID: &templateID,
		Active:     true,
		Version:    1,
	}).Error)

	require.NoError(t, testDB.Create(&models.Product{
		BaseModel: models.BaseModel{ID: productID},
		SKU:       "PRD-001",
		Name:      "Fork Product",
		ModelCode: "01",
		TypeID:    typeID,
		Status:    "Active",
		Version:   1,
	}).Error)

	product, err := GetProductByID(productID)
	require.NoError(t, err)
	require.Equal(t, "FORK", product.TemplateKey)
}
