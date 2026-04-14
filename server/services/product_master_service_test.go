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

func TestApplyDerivedTemplateKeysDerivesFromAncestorProductTypeTemplate(t *testing.T) {
	testDB := setupProductMasterServiceTestDB(t)
	templateID := "template-ancestor"
	parentTypeID := "type-parent"
	childTypeID := "type-child"
	productID := "product-child"

	require.NoError(t, testDB.Create(&models.ProductTemplate{
		BaseModel:    models.BaseModel{ID: templateID},
		Name:         "Rim Template",
		Code:         "RIM_STD",
		ComponentKey: "RIM",
		Active:       true,
		Version:      1,
	}).Error)

	require.NoError(t, testDB.Create(&models.ProductType{
		ID:         parentTypeID,
		Name:       "Parent Type",
		Code:       "PARENT",
		TemplateID: &templateID,
		Active:     true,
		Version:    1,
	}).Error)

	require.NoError(t, testDB.Create(&models.ProductType{
		ID:       childTypeID,
		ParentID: &parentTypeID,
		Name:     "Child Type",
		Code:     "CHILD",
		Active:   true,
		Version:  1,
	}).Error)

	require.NoError(t, testDB.Create(&models.Product{
		BaseModel: models.BaseModel{ID: productID},
		SKU:       "PRD-CHILD-001",
		Name:      "Child Product",
		ModelCode: "01",
		TypeID:    childTypeID,
		Status:    "Active",
		Version:   1,
	}).Error)

	product, err := GetProductByID(productID)
	require.NoError(t, err)
	require.Equal(t, "RIM", product.TemplateKey)
}

func TestApplyDerivedTemplateKeysReturnsEmptyTemplateKeyWhenNoBindingExists(t *testing.T) {
	testDB := setupProductMasterServiceTestDB(t)
	typeID := "type-no-template"
	productID := "product-no-template"

	require.NoError(t, testDB.Create(&models.ProductType{
		ID:      typeID,
		Name:    "No Template Type",
		Code:    "NO_TEMPLATE",
		Active:  true,
		Version: 1,
	}).Error)

	require.NoError(t, testDB.Create(&models.Product{
		BaseModel: models.BaseModel{ID: productID},
		SKU:       "PRD-NO-TPL-001",
		Name:      "No Template Product",
		ModelCode: "01",
		TypeID:    typeID,
		Status:    "Active",
		Version:   1,
	}).Error)

	product, err := GetProductByID(productID)
	require.NoError(t, err)
	require.Equal(t, "", product.TemplateKey)
}

func TestIssueProductIdentityIssuesSKUFromTypeAndModelCode(t *testing.T) {
	testDB := setupProductMasterServiceTestDB(t)

	require.NoError(t, testDB.Create(&models.ProductType{
		ID:      "type-1",
		Name:    "MTB Fork",
		Code:    "MTB",
		Active:  true,
		Version: 1,
	}).Error)

	issued, err := issueProductIdentity(testDB, normalizeProductWriteInput(ProductWriteInput{
		ID:        "product-new",
		SKU:       "   ",
		Name:      "R50",
		ModelCode: "01",
		TypeID:    "type-1",
		Status:    "Active",
	}))

	require.NoError(t, err)
	require.Equal(t, "MTB-01", issued.SKU)
	require.Equal(t, "01", issued.ModelCode)
}

func TestPatchProductReissuesSKUFromUpdatedTypeAndModelCode(t *testing.T) {
	testDB := setupProductMasterServiceTestDB(t)
	productID := "product-1"

	require.NoError(t, testDB.Create(&models.ProductType{
		ID:      "type-1",
		Name:    "MTB Fork",
		Code:    "MTB",
		Active:  true,
		Version: 1,
	}).Error)
	require.NoError(t, testDB.Create(&models.ProductType{
		ID:      "type-2",
		Name:    "Road Fork",
		Code:    "RD",
		Active:  true,
		Version: 1,
	}).Error)

	require.NoError(t, testDB.Create(&models.Product{
		BaseModel: models.BaseModel{ID: productID},
		SKU:       "R50-01",
		Name:      "R50",
		ModelCode: "01",
		TypeID:    "type-1",
		Status:    "Active",
		Version:   1,
	}).Error)

	saved, err := PatchProduct(productID, 1, map[string]json.RawMessage{
		"typeId":    json.RawMessage(`{"o":"type-1","n":"type-2"}`),
		"modelCode": json.RawMessage(`{"o":"01","n":" 7 "}`),
	})

	require.NoError(t, err)
	require.Equal(t, "RD-7", saved.SKU)
	require.Equal(t, "7", saved.ModelCode)
}

func TestIssueProductIdentityIssuesVersionedSKUFromVariantAttribute(t *testing.T) {
	testDB := setupProductMasterServiceTestDB(t)

	require.NoError(t, testDB.Create(&models.ProductType{
		ID:      "type-1",
		Name:    "MTB Fork",
		Code:    "MTB",
		Active:  true,
		Version: 1,
	}).Error)

	issued, err := issueProductIdentity(testDB, normalizeProductWriteInput(ProductWriteInput{
		ID:        "product-variant",
		SKU:       "",
		Name:      "R50 Lightweight",
		ModelCode: "09",
		TypeID:    "type-1",
		Status:    "Active",
		AttributeValues: []ProductAttributeValueAPIRequest{
			{
				CategoryKey: "versionLevel",
				OptionValue: "lightweight",
				SortOrder:   1,
				Version:     1,
			},
		},
	}))

	require.NoError(t, err)
	require.Equal(t, "MTB-09-LIGHTWEIGHT", issued.SKU)
	require.Equal(t, "LIGHTWEIGHT", issued.VersionLevel)
}

func TestCleanupDuplicateProductAttributeOptionsMigratesHistoricalProductAttributeValues(t *testing.T) {
	testDB := setupProductMasterServiceTestDB(t)

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
			category TEXT,
			value TEXT,
			label TEXT,
			label_en TEXT,
			description TEXT,
			sort_order INTEGER,
			active NUMERIC,
			version INTEGER
		)
	`).Error)

	require.NoError(t, testDB.Create(&models.ProductAttributeOption{
		BaseModel:   models.BaseModel{ID: "opt-upper"},
		CategoryKey: "tireType",
		Value:       "Hooked",
		LabelZh:     "有钩",
		LabelEn:     "Hooked",
		SortOrder:   20,
		Active:      true,
		Version:     1,
	}).Error)
	require.NoError(t, testDB.Create(&models.ProductAttributeOption{
		BaseModel:   models.BaseModel{ID: "opt-lower"},
		CategoryKey: "tireType",
		Value:       "hooked",
		LabelZh:     "有钩",
		LabelEn:     "Hooked",
		SortOrder:   10,
		Active:      true,
		Version:     1,
	}).Error)
	require.NoError(t, testDB.Create(&models.ProductAttributeValue{
		BaseModel:   models.BaseModel{ID: "attr-1"},
		ProductID:   "product-1",
		CategoryKey: "tireType",
		OptionValue: "Hooked",
		SortOrder:   1,
		Version:     1,
	}).Error)

	cleanups, err := CleanupDuplicateProductAttributeOptions()
	require.NoError(t, err)
	require.Len(t, cleanups, 1)
	require.Equal(t, "tireType", cleanups[0].CategoryKey)
	require.Equal(t, "hooked", cleanups[0].NormalizedValue)

	var options []models.ProductAttributeOption
	require.NoError(t, testDB.Order("id asc").Find(&options).Error)
	require.Len(t, options, 1)
	require.Equal(t, "opt-lower", options[0].ID)
	require.Equal(t, "hooked", options[0].Value)

	var attr models.ProductAttributeValue
	require.NoError(t, testDB.First(&attr, "id = ?", "attr-1").Error)
	require.Equal(t, "hooked", attr.OptionValue)
}
