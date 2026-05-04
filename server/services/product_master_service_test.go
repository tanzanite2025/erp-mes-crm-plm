package services

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"xdfc-server/audit"
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
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
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
	require.NoError(t, testDB.Exec(`CREATE TABLE boms (id TEXT PRIMARY KEY, product_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, testDB.Exec(`CREATE TABLE sales_order_lines (id TEXT PRIMARY KEY, product_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, testDB.Exec(`CREATE TABLE sales_return_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id TEXT)`).Error)
	require.NoError(t, testDB.Exec(`CREATE TABLE sales_exchange_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id TEXT)`).Error)
	require.NoError(t, testDB.Exec(`CREATE TABLE logistics_records (id TEXT PRIMARY KEY, product_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, testDB.Exec(`CREATE TABLE print_batches (id TEXT PRIMARY KEY, product_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, testDB.Exec(`CREATE TABLE product_inventory_material_mappings (id TEXT PRIMARY KEY, product_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, testDB.Exec(`CREATE TABLE production_plans (id TEXT PRIMARY KEY, product_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, testDB.Exec(`CREATE TABLE inspection_tasks (id TEXT PRIMARY KEY, product_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, testDB.Exec(`CREATE TABLE piecework_rates (id TEXT PRIMARY KEY, product_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, testDB.Exec(`CREATE TABLE piecework_records (id TEXT PRIMARY KEY, product_id TEXT, deleted_at DATETIME)`).Error)

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

func productAuditTestContext() context.Context {
	return audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "product-user-1",
		Username: "product-auditor",
		IP:       "203.0.113.71",
		Source:   "http",
	})
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

	saved, err := PatchProduct(productAuditTestContext(), productID, 1, map[string]json.RawMessage{
		"typeId":    json.RawMessage(`{"o":"type-1","n":"type-2"}`),
		"modelCode": json.RawMessage(`{"o":"01","n":" 7 "}`),
	})

	require.NoError(t, err)
	require.Equal(t, "RD-7", saved.SKU)
	require.Equal(t, "7", saved.ModelCode)
}

func TestSaveProductWritesAuditWithActorAndIP(t *testing.T) {
	testDB := setupProductMasterServiceTestDB(t)
	productID := "product-audit-save"

	require.NoError(t, testDB.Create(&models.ProductType{
		ID:      "type-1",
		Name:    "MTB Fork",
		Code:    "MTB",
		Active:  true,
		Version: 1,
	}).Error)
	require.NoError(t, testDB.Create(&models.Product{
		BaseModel: models.BaseModel{ID: productID},
		SKU:       "MTB-01",
		Name:      "Before Save",
		ModelCode: "01",
		TypeID:    "type-1",
		Status:    "Active",
		Version:   1,
	}).Error)

	saved, err := SaveProduct(productAuditTestContext(), SaveProductAPIRequest{
		ID:              productID,
		Name:            "After Save",
		SKU:             "MTB-01",
		ModelCode:       "01",
		TypeID:          "type-1",
		Restrictions:    []string{},
		AttributeValues: []ProductAttributeValueAPIRequest{},
		Status:          "Active",
		Version:         1,
	})

	require.NoError(t, err)
	require.Equal(t, "MTB-01", saved.SKU)
	require.Equal(t, "After Save", saved.Name)

	var logs []models.AuditLog
	require.NoError(t, testDB.Order("created_at asc").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, AuditModuleProduct, logs[0].Module)
	require.Equal(t, productID, logs[0].TargetID)
	require.Equal(t, "SAVE", logs[0].Action)
	require.Equal(t, "product-auditor", logs[0].Operator)
	require.Equal(t, "203.0.113.71", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), `"f":"operation"`)
	require.Contains(t, string(logs[0].Diff), `"n":"update"`)
}

func TestPatchProductWritesAuditWithActorAndIP(t *testing.T) {
	testDB := setupProductMasterServiceTestDB(t)
	productID := "product-audit-patch"

	require.NoError(t, testDB.Create(&models.ProductType{
		ID:      "type-1",
		Name:    "MTB Fork",
		Code:    "MTB",
		Active:  true,
		Version: 1,
	}).Error)
	require.NoError(t, testDB.Create(&models.Product{
		BaseModel: models.BaseModel{ID: productID},
		SKU:       "MTB-01",
		Name:      "Before Patch",
		ModelCode: "01",
		TypeID:    "type-1",
		Status:    "Active",
		Version:   1,
	}).Error)

	updated, err := PatchProduct(productAuditTestContext(), productID, 1, map[string]json.RawMessage{
		"name": json.RawMessage(`{"o":"Before Patch","n":"After Patch"}`),
	})

	require.NoError(t, err)
	require.Equal(t, "After Patch", updated.Name)

	var logs []models.AuditLog
	require.NoError(t, testDB.Order("created_at asc").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, AuditModuleProduct, logs[0].Module)
	require.Equal(t, productID, logs[0].TargetID)
	require.Equal(t, "PATCH", logs[0].Action)
	require.Equal(t, "product-auditor", logs[0].Operator)
	require.Equal(t, "203.0.113.71", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), `"f":"name"`)
	require.Contains(t, string(logs[0].Diff), `"n":"After Patch"`)
}

func TestDeleteProductWritesAuditWithActorAndIP(t *testing.T) {
	testDB := setupProductMasterServiceTestDB(t)
	productID := "product-audit-delete"

	require.NoError(t, testDB.Create(&models.ProductType{
		ID:      "type-1",
		Name:    "MTB Fork",
		Code:    "MTB",
		Active:  true,
		Version: 1,
	}).Error)
	require.NoError(t, testDB.Create(&models.Product{
		BaseModel: models.BaseModel{ID: productID},
		SKU:       "MTB-01",
		Name:      "Delete Me",
		ModelCode: "01",
		TypeID:    "type-1",
		Status:    "Active",
		Version:   1,
	}).Error)

	require.NoError(t, DeleteProduct(productAuditTestContext(), productID))

	var logs []models.AuditLog
	require.NoError(t, testDB.Order("created_at asc").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, AuditModuleProduct, logs[0].Module)
	require.Equal(t, productID, logs[0].TargetID)
	require.Equal(t, "DELETE", logs[0].Action)
	require.Equal(t, "product-auditor", logs[0].Operator)
	require.Equal(t, "203.0.113.71", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), `"f":"name"`)
	require.Contains(t, string(logs[0].Diff), `"n":"Delete Me"`)
}

func TestDeleteProductBlocksAdditionalDownstreamReferences(t *testing.T) {
	testCases := []struct {
		name  string
		setup func(t *testing.T, testDB *gorm.DB, productID string)
	}{
		{
			name: "sales return line",
			setup: func(t *testing.T, testDB *gorm.DB, productID string) {
				require.NoError(t, testDB.Exec(`INSERT INTO sales_return_lines (product_id) VALUES (?)`, productID).Error)
			},
		},
		{
			name: "sales exchange line",
			setup: func(t *testing.T, testDB *gorm.DB, productID string) {
				require.NoError(t, testDB.Exec(`INSERT INTO sales_exchange_lines (product_id) VALUES (?)`, productID).Error)
			},
		},
		{
			name: "print batch",
			setup: func(t *testing.T, testDB *gorm.DB, productID string) {
				require.NoError(t, testDB.Exec(`INSERT INTO print_batches (id, product_id, deleted_at) VALUES (?, ?, NULL)`, "print-batch-1", productID).Error)
			},
		},
		{
			name: "product inventory material mapping",
			setup: func(t *testing.T, testDB *gorm.DB, productID string) {
				require.NoError(t, testDB.Exec(`INSERT INTO product_inventory_material_mappings (id, product_id, deleted_at) VALUES (?, ?, NULL)`, "mapping-1", productID).Error)
			},
		},
		{
			name: "piecework record",
			setup: func(t *testing.T, testDB *gorm.DB, productID string) {
				require.NoError(t, testDB.Exec(`INSERT INTO piecework_records (id, product_id, deleted_at) VALUES (?, ?, NULL)`, "piecework-record-1", productID).Error)
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			testDB := setupProductMasterServiceTestDB(t)
			productID := "product-delete-guard"

			require.NoError(t, testDB.Create(&models.ProductType{
				ID:      "type-1",
				Name:    "MTB Fork",
				Code:    "MTB",
				Active:  true,
				Version: 1,
			}).Error)
			require.NoError(t, testDB.Create(&models.Product{
				BaseModel: models.BaseModel{ID: productID},
				SKU:       "MTB-01",
				Name:      "Delete Guard",
				ModelCode: "01",
				TypeID:    "type-1",
				Status:    "Active",
				Version:   1,
			}).Error)

			tc.setup(t, testDB, productID)

			err := DeleteProduct(productAuditTestContext(), productID)
			require.Error(t, err)
			require.Contains(t, err.Error(), "product still referenced by downstream records")

			var count int64
			require.NoError(t, testDB.Model(&models.Product{}).Where("id = ?", productID).Count(&count).Error)
			require.EqualValues(t, 1, count)

			var logs []models.AuditLog
			require.NoError(t, testDB.Find(&logs).Error)
			require.Len(t, logs, 0)
		})
	}
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
