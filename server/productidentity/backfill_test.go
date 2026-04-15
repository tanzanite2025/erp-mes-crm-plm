package productidentity

import (
	"fmt"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupBackfillTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE product_types (
			id TEXT PRIMARY KEY,
			parent_id TEXT,
			template_id TEXT,
			name TEXT,
			code TEXT,
			description TEXT,
			active BOOLEAN DEFAULT TRUE,
			sort_order INTEGER DEFAULT 0,
			created_at DATETIME,
			updated_at DATETIME,
			version INTEGER DEFAULT 1
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
			is_default_site BOOLEAN DEFAULT TRUE,
			sku TEXT,
			name TEXT,
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
			version INTEGER DEFAULT 1
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
			version INTEGER DEFAULT 1
		)
	`).Error)
	return testDB
}

func TestPlanBlankProductSKUBackfillDerivesFromTypeAndAttributeVersion(t *testing.T) {
	testDB := setupBackfillTestDB(t)
	now := time.Now()

	require.NoError(t, testDB.Create(&models.ProductType{ID: "type-1", Code: "MTB", Name: "MTB"}).Error)
	require.NoError(t, testDB.Create(&models.Product{
		BaseModel: models.BaseModel{ID: "product-1", CreatedAt: now, UpdatedAt: now},
		Name:      "R50",
		TypeID:    "type-1",
		ModelCode: "09",
	}).Error)
	require.NoError(t, testDB.Create(&models.ProductAttributeValue{
		BaseModel:   models.BaseModel{ID: "attr-1"},
		ProductID:   "product-1",
		CategoryKey: "versionLevel",
		OptionValue: "lightweight",
		SortOrder:   1,
	}).Error)

	plans, err := PlanBlankProductSKUBackfill(testDB)
	require.NoError(t, err)
	require.Len(t, plans, 1)
	require.Equal(t, "MTB-09-LIGHTWEIGHT", plans[0].DerivedSKU)
}

func TestApplyBlankProductSKUBackfillUpdatesBlankRows(t *testing.T) {
	testDB := setupBackfillTestDB(t)
	now := time.Now()

	require.NoError(t, testDB.Create(&models.ProductType{ID: "type-1", Code: "RD", Name: "Road"}).Error)
	require.NoError(t, testDB.Create(&models.Product{
		BaseModel: models.BaseModel{ID: "product-1", CreatedAt: now, UpdatedAt: now},
		Name:      "Road Fork",
		TypeID:    "type-1",
		ModelCode: "7",
	}).Error)

	plans, err := ApplyBlankProductSKUBackfill(testDB)
	require.NoError(t, err)
	require.Len(t, plans, 1)

	var product models.Product
	require.NoError(t, testDB.First(&product, "id = ?", "product-1").Error)
	require.Equal(t, "RD-7", product.SKU)
}

func TestPlanBlankProductSKUBackfillRejectsDerivedSKUCollision(t *testing.T) {
	testDB := setupBackfillTestDB(t)
	now := time.Now()

	require.NoError(t, testDB.Create(&models.ProductType{ID: "type-1", Code: "MTB", Name: "MTB"}).Error)
	require.NoError(t, testDB.Create(&models.Product{
		BaseModel: models.BaseModel{ID: "product-blank", CreatedAt: now, UpdatedAt: now},
		Name:      "R50",
		TypeID:    "type-1",
		ModelCode: "01",
	}).Error)
	require.NoError(t, testDB.Create(&models.Product{
		BaseModel: models.BaseModel{ID: "product-existing", CreatedAt: now.Add(time.Second), UpdatedAt: now.Add(time.Second)},
		SKU:       "MTB-01",
		Name:      "Existing",
		TypeID:    "type-1",
		ModelCode: "01",
	}).Error)

	_, err := PlanBlankProductSKUBackfill(testDB)
	require.Error(t, err)
	require.Contains(t, err.Error(), "collision")
}
