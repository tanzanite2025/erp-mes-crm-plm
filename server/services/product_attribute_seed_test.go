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

func setupProductAttributeSeedTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE product_attribute_categories (
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
			key TEXT NOT NULL,
			name_zh TEXT NOT NULL,
			name_en TEXT,
			description TEXT,
			sort_order INTEGER DEFAULT 0,
			active NUMERIC DEFAULT 1,
			version INTEGER DEFAULT 1
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_product_attribute_categories_deleted_at ON product_attribute_categories(deleted_at)`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE product_attribute_options (
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
			category TEXT NOT NULL,
			value TEXT NOT NULL,
			label TEXT NOT NULL,
			label_en TEXT,
			description TEXT,
			sort_order INTEGER DEFAULT 0,
			active NUMERIC DEFAULT 1,
			version INTEGER DEFAULT 1
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_product_attribute_options_deleted_at ON product_attribute_options(deleted_at)`).Error)
	prevDB := db.DB
	db.DB = testDB

	sqlDB, err := testDB.DB()
	require.NoError(t, err)
	t.Cleanup(func() {
		db.DB = prevDB
		_ = sqlDB.Close()
	})

	return testDB
}

func TestSeedDefaultProductAttributeCategoriesSeedsFreshTable(t *testing.T) {
	testDB := setupProductAttributeSeedTestDB(t)

	require.NoError(t, SeedDefaultProductAttributeCategories(testDB))

	var count int64
	require.NoError(t, testDB.Model(&models.ProductAttributeCategory{}).Count(&count).Error)
	require.EqualValues(t, len(defaultProductAttributeCategories()), count)
}

func TestSeedDefaultProductAttributeCategoriesSkipsWhenSoftDeletedHistoryExists(t *testing.T) {
	testDB := setupProductAttributeSeedTestDB(t)

	category := models.ProductAttributeCategory{
		BaseModel: models.BaseModel{ID: "cat-tech-series"},
		Key:       "tech-series",
		NameZh:    "工艺系列",
		NameEn:    "Technical Series",
		SortOrder: 10,
		Active:    true,
		Version:   1,
	}
	normalizeProductAttributeCategory(&category)
	require.NoError(t, testDB.Create(&category).Error)
	require.NoError(t, testDB.Delete(&category).Error)

	require.NoError(t, SeedDefaultProductAttributeCategories(testDB))

	var activeCount int64
	require.NoError(t, testDB.Model(&models.ProductAttributeCategory{}).Count(&activeCount).Error)
	require.EqualValues(t, 0, activeCount)

	var allCount int64
	require.NoError(t, testDB.Unscoped().Model(&models.ProductAttributeCategory{}).Count(&allCount).Error)
	require.EqualValues(t, 1, allCount)
}

func TestSeedDefaultProductAttributeOptionsSeedsFreshTable(t *testing.T) {
	testDB := setupProductAttributeSeedTestDB(t)

	require.NoError(t, SeedDefaultProductAttributeOptions(testDB))

	var count int64
	require.NoError(t, testDB.Model(&models.ProductAttributeOption{}).Count(&count).Error)
	require.EqualValues(t, len(defaultProductAttributeOptions()), count)
}

func TestSeedDefaultProductAttributeOptionsSkipsWhenSoftDeletedHistoryExists(t *testing.T) {
	testDB := setupProductAttributeSeedTestDB(t)

	option := models.ProductAttributeOption{
		BaseModel:   models.BaseModel{ID: "opt-disc"},
		CategoryKey: "brake-type",
		Value:       "disc",
		LabelZh:     "碟刹",
		LabelEn:     "Disc",
		SortOrder:   10,
		Active:      true,
		Version:     1,
	}
	normalizeProductAttributeOption(&option)
	require.NoError(t, testDB.Create(&option).Error)
	require.NoError(t, testDB.Delete(&option).Error)

	require.NoError(t, SeedDefaultProductAttributeOptions(testDB))

	var activeCount int64
	require.NoError(t, testDB.Model(&models.ProductAttributeOption{}).Count(&activeCount).Error)
	require.EqualValues(t, 0, activeCount)

	var allCount int64
	require.NoError(t, testDB.Unscoped().Model(&models.ProductAttributeOption{}).Count(&allCount).Error)
	require.EqualValues(t, 1, allCount)
}

func TestCreateProductAttributeOptionCanonicalizesHistoricalCategoryKey(t *testing.T) {
	testDB := setupProductAttributeSeedTestDB(t)

	require.NoError(t, testDB.Create(&models.ProductAttributeCategory{
		BaseModel: models.BaseModel{ID: "cat-version"},
		Key:       "versionLevel",
		NameZh:    "版本等级",
		NameEn:    "Version Level",
		SortOrder: 40,
		Active:    true,
		Version:   1,
	}).Error)

	saved, err := CreateProductAttributeOption(SaveProductAttributeOptionInput{
		CategoryKey: "versionlevel",
		Value:       "matte-black",
		LabelZh:     "哑黑",
		LabelEn:     "Matte Black",
		SortOrder:   10,
		Active:      true,
	})
	require.NoError(t, err)
	require.Equal(t, "versionLevel", saved.CategoryKey)

	var persisted models.ProductAttributeOption
	require.NoError(t, testDB.First(&persisted, "category = ? AND value = ?", "versionLevel", "matte-black").Error)
	require.Equal(t, "versionLevel", persisted.CategoryKey)
}

func TestListProductAttributeOptionsReturnsCanonicalCategoryKeyForHistoricalRows(t *testing.T) {
	testDB := setupProductAttributeSeedTestDB(t)

	require.NoError(t, testDB.Create(&models.ProductAttributeCategory{
		BaseModel: models.BaseModel{ID: "cat-version"},
		Key:       "versionLevel",
		NameZh:    "版本等级",
		NameEn:    "Version Level",
		SortOrder: 40,
		Active:    true,
		Version:   1,
	}).Error)
	require.NoError(t, testDB.Create(&models.ProductAttributeOption{
		BaseModel:   models.BaseModel{ID: "opt-version"},
		CategoryKey: "versionlevel",
		Value:       "matte-black",
		LabelZh:     "哑黑",
		LabelEn:     "Matte Black",
		SortOrder:   10,
		Active:      true,
		Version:     1,
	}).Error)

	items, err := ListProductAttributeOptions(ProductAttributeOptionListQuery{CategoryKey: "versionLevel"})
	require.NoError(t, err)
	require.Len(t, items, 1)
	require.Equal(t, "versionLevel", items[0].CategoryKey)
	require.Equal(t, "matte-black", items[0].Value)
}
