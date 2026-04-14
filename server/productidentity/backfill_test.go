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
			code TEXT,
			name TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE products (
			id TEXT PRIMARY KEY,
			sku TEXT,
			name TEXT,
			type_id TEXT,
			model_code TEXT,
			version_level TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE product_attribute_values (
			id TEXT PRIMARY KEY,
			product_id TEXT,
			category_key TEXT,
			option_value TEXT,
			sort_order INTEGER
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
