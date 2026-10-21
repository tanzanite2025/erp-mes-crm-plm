package services

import (
	"os"
	"strings"
	"sync"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func createIsolatedProductAttributeCatalogReferenceConcurrencyFixture(t *testing.T) (*gorm.DB, string) {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("PRODUCT_ATTRIBUTE_CATALOG_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set PRODUCT_ATTRIBUTE_CATALOG_TEST_POSTGRES_DSN to verify catalog reference transactions")
	}
	adminDatabase, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	adminConnection, err := adminDatabase.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
	schemaName := "attribute_reference_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, adminDatabase.Exec("CREATE SCHEMA "+schemaName).Error)
	t.Cleanup(func() { require.NoError(t, adminDatabase.Exec("DROP SCHEMA "+schemaName+" CASCADE").Error) })
	connectionConfig, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	connectionConfig.RuntimeParams["search_path"] = schemaName
	connectionConfig.RuntimeParams["application_name"] = schemaName
	connectionConfig.RuntimeParams["lock_timeout"] = "5000"
	connectionConfig.RuntimeParams["statement_timeout"] = "10000"
	connection := stdlib.OpenDB(*connectionConfig)
	connection.SetMaxOpenConns(6)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(&models.ProductAttributeCategory{}, &models.ProductAttributeOption{}, &models.ProductAttributeValue{}, &models.ProductTemplateAttributeBinding{}))
	require.NoError(t, database.Exec("CREATE TABLE products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tech_series text, tire_type text, brake_type text, deleted_at timestamptz)").Error)
	require.NoError(t, database.Exec("CREATE TABLE boms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_level text, deleted_at timestamptz)").Error)
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	return database, schemaName
}

type productAttributeCatalogConcurrentReferenceScenario struct {
	name           string
	categoryKey    string
	referenceTable string
	deleteCategory bool
	writeReference func(*gorm.DB, models.ProductAttributeCategory, models.ProductAttributeOption) error
}

func listProductAttributeCatalogConcurrentReferenceScenarios() []productAttributeCatalogConcurrentReferenceScenario {
	return []productAttributeCatalogConcurrentReferenceScenario{
		{
			name: "dynamic_product_value", categoryKey: "color", referenceTable: "product_attribute_values",
			writeReference: func(tx *gorm.DB, category models.ProductAttributeCategory, option models.ProductAttributeOption) error {
				return replaceProductAttributeValues(tx, uuid.NewString(), []models.ProductAttributeValue{{CategoryKey: category.Key, OptionValue: option.Value}})
			},
		},
		{
			name: "template_category_binding", categoryKey: "color", referenceTable: "product_template_attribute_bindings", deleteCategory: true,
			writeReference: func(tx *gorm.DB, category models.ProductAttributeCategory, _ models.ProductAttributeOption) error {
				return syncProductTemplateAttributeBindingsTx(tx, uuid.NewString(), []models.ProductTemplateAttributeBinding{{CategoryKey: category.Key, Active: true}})
			},
		},
		{
			name: "legacy_product_field", categoryKey: "techSeries", referenceTable: "products",
			writeReference: func(tx *gorm.DB, _ models.ProductAttributeCategory, option models.ProductAttributeOption) error {
				product := models.Product{TechSeries: option.Value}
				if err := validateAndLockProductLegacyAttributeFieldReferences(tx, &product); err != nil {
					return err
				}
				return tx.Exec("INSERT INTO products (tech_series) VALUES (?)", product.TechSeries).Error
			},
		},
		{
			name: "bom_version_level", categoryKey: "versionLevel", referenceTable: "boms",
			writeReference: func(tx *gorm.DB, _ models.ProductAttributeCategory, option models.ProductAttributeOption) error {
				bom := models.BOM{VersionLevel: option.Value}
				if err := validateAndLockBOMVersionLevelAttributeReference(tx, &bom); err != nil {
					return err
				}
				return tx.Exec("INSERT INTO boms (version_level) VALUES (?)", bom.VersionLevel).Error
			},
		},
	}
}

func waitForProductAttributeCatalogTransactionLock(t *testing.T, database *gorm.DB, applicationName string) {
	t.Helper()
	require.Eventually(t, func() bool {
		var waitingConnections int64
		err := database.Raw("SELECT count(*) FROM pg_stat_activity WHERE application_name = ? AND wait_event_type = 'Lock'", applicationName).Scan(&waitingConnections).Error
		return err == nil && waitingConnections > 0
	}, 2*time.Second, 10*time.Millisecond, "the competing transaction must wait for the catalog category lock")
}

func receiveProductAttributeCatalogTransactionResult(t *testing.T, result <-chan error) error {
	t.Helper()
	select {
	case err := <-result:
		return err
	case <-time.After(6 * time.Second):
		t.Fatal("catalog transaction did not finish")
		return nil
	}
}

func TestProductAttributeCatalogCommittedReferencePreventsConcurrentDeletion(t *testing.T) {
	for _, scenario := range listProductAttributeCatalogConcurrentReferenceScenarios() {
		t.Run(scenario.name, func(t *testing.T) {
			database, applicationName := createIsolatedProductAttributeCatalogReferenceConcurrencyFixture(t)
			category := models.ProductAttributeCategory{Key: scenario.categoryKey, NameZh: "测试分类", Active: true, Version: 1}
			require.NoError(t, database.Create(&category).Error)
			option := models.ProductAttributeOption{CategoryKey: category.Key, Value: "Legacy_Blue", LabelZh: "蓝色", Active: true, Version: 1}
			require.NoError(t, database.Create(&option).Error)
			writerReady := make(chan struct{})
			allowWriterCommit := make(chan struct{})
			var releaseWriter sync.Once
			defer releaseWriter.Do(func() { close(allowWriterCommit) })
			writerResult := make(chan error, 1)
			go func() {
				writerResult <- database.Transaction(func(tx *gorm.DB) error {
					err := scenario.writeReference(tx, category, option)
					close(writerReady)
					if err != nil {
						return err
					}
					<-allowWriterCommit
					return nil
				})
			}()
			select {
			case <-writerReady:
			case <-time.After(3 * time.Second):
				t.Fatal("reference writer did not start")
			}
			deletionResult := make(chan error, 1)
			go func() {
				if scenario.deleteCategory {
					deletionResult <- DeleteProductAttributeCategory(category.ID)
				} else {
					deletionResult <- DeleteProductAttributeOption(option.ID)
				}
			}()
			waitForProductAttributeCatalogTransactionLock(t, database, applicationName)
			releaseWriter.Do(func() { close(allowWriterCommit) })
			require.NoError(t, receiveProductAttributeCatalogTransactionResult(t, writerResult))
			require.ErrorContains(t, receiveProductAttributeCatalogTransactionResult(t, deletionResult), "使用")
			var referenceCount int64
			require.NoError(t, database.Table(scenario.referenceTable).Where("deleted_at IS NULL").Count(&referenceCount).Error)
			require.EqualValues(t, 1, referenceCount)
			require.NoError(t, database.First(&option, "id = ?", option.ID).Error)
		})
	}
}

func TestProductAttributeCatalogCommittedDeletionRejectsConcurrentNewReference(t *testing.T) {
	for _, scenario := range listProductAttributeCatalogConcurrentReferenceScenarios() {
		t.Run(scenario.name, func(t *testing.T) {
			database, applicationName := createIsolatedProductAttributeCatalogReferenceConcurrencyFixture(t)
			category := models.ProductAttributeCategory{Key: scenario.categoryKey, NameZh: "测试分类", Active: true, Version: 1}
			require.NoError(t, database.Create(&category).Error)
			option := models.ProductAttributeOption{CategoryKey: category.Key, Value: "blue", LabelZh: "蓝色", Active: true, Version: 1}
			require.NoError(t, database.Create(&option).Error)
			deletionReady := make(chan struct{})
			allowDeletionCommit := make(chan struct{})
			var releaseDeletion sync.Once
			defer releaseDeletion.Do(func() { close(allowDeletionCommit) })
			var pauseDeletion sync.Once
			const callbackName = "product_attribute_catalog_test_pause_before_delete"
			require.NoError(t, database.Callback().Delete().Before("gorm:delete").Register(callbackName, func(tx *gorm.DB) {
				if tx.Statement.Table == "product_attribute_options" {
					pauseDeletion.Do(func() {
						close(deletionReady)
						<-allowDeletionCommit
					})
				}
			}))
			t.Cleanup(func() { require.NoError(t, database.Callback().Delete().Remove(callbackName)) })
			deletionResult := make(chan error, 1)
			go func() {
				if scenario.deleteCategory {
					deletionResult <- DeleteProductAttributeCategory(category.ID)
				} else {
					deletionResult <- DeleteProductAttributeOption(option.ID)
				}
			}()
			select {
			case <-deletionReady:
			case <-time.After(3 * time.Second):
				t.Fatal("catalog deletion did not reach the locked mutation")
			}
			writerResult := make(chan error, 1)
			go func() {
				writerResult <- database.Transaction(func(tx *gorm.DB) error { return scenario.writeReference(tx, category, option) })
			}()
			waitForProductAttributeCatalogTransactionLock(t, database, applicationName)
			releaseDeletion.Do(func() { close(allowDeletionCommit) })
			require.NoError(t, receiveProductAttributeCatalogTransactionResult(t, deletionResult))
			require.ErrorContains(t, receiveProductAttributeCatalogTransactionResult(t, writerResult), "删除")
			var referenceCount int64
			require.NoError(t, database.Table(scenario.referenceTable).Count(&referenceCount).Error)
			require.Zero(t, referenceCount, "deletion must never leave an orphan reference")
		})
	}
}

func TestProductAttributeCatalogRejectedReplacementPreservesExistingReferences(t *testing.T) {
	database, _ := createIsolatedProductAttributeCatalogReferenceConcurrencyFixture(t)
	category := models.ProductAttributeCategory{Key: "techSeries", NameZh: "工艺", Active: true, Version: 1}
	require.NoError(t, database.Create(&category).Error)
	option := models.ProductAttributeOption{CategoryKey: category.Key, Value: "Legacy_Blue", LabelZh: "蓝色", Active: true, Version: 1}
	require.NoError(t, database.Create(&option).Error)
	require.NoError(t, database.Model(&option).Update("active", false).Error)
	productID, templateID := uuid.NewString(), uuid.NewString()
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		return replaceProductAttributeValues(tx, productID, []models.ProductAttributeValue{{CategoryKey: "TECHSERIES", OptionValue: "legacy-blue"}})
	}))
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		return syncProductTemplateAttributeBindingsTx(tx, templateID, []models.ProductTemplateAttributeBinding{{CategoryKey: "TECHSERIES"}})
	}))
	require.ErrorContains(t, database.Transaction(func(tx *gorm.DB) error {
		return replaceProductAttributeValues(tx, productID, []models.ProductAttributeValue{{CategoryKey: category.Key, OptionValue: "missing"}})
	}), "不存在")
	require.ErrorContains(t, database.Transaction(func(tx *gorm.DB) error {
		return syncProductTemplateAttributeBindingsTx(tx, templateID, []models.ProductTemplateAttributeBinding{{CategoryKey: "deleted-category"}})
	}), "不存在")
	var values []models.ProductAttributeValue
	require.NoError(t, database.Find(&values, "product_id = ?", productID).Error)
	require.Len(t, values, 1)
	require.Equal(t, category.Key, values[0].CategoryKey)
	require.Equal(t, option.Value, values[0].OptionValue)
	var bindings []models.ProductTemplateAttributeBinding
	require.NoError(t, database.Find(&bindings, "template_id = ?", templateID).Error)
	require.Len(t, bindings, 1)
	require.Equal(t, category.Key, bindings[0].CategoryKey)
}

func TestProductAttributeCatalogTemplateSaveValidatesBindingsWithoutPartialPersistence(t *testing.T) {
	database, _ := createIsolatedProductAttributeCatalogReferenceConcurrencyFixture(t)
	require.NoError(t, database.AutoMigrate(&models.ProductTemplate{}))
	category := models.ProductAttributeCategory{Key: "techSeries", NameZh: "工艺", Active: true, Version: 1}
	require.NoError(t, database.Create(&category).Error)
	input := models.ProductTemplate{Name: "引用校验模板", Code: "reference-validation", Active: true,
		AttributeBindings: []models.ProductTemplateAttributeBinding{{CategoryKey: "TECHSERIES", Active: true}}}
	saved, err := SaveProductTemplate(SaveProductTemplateInput(input))
	require.NoError(t, err)
	require.Len(t, saved.AttributeBindings, 1)
	require.Equal(t, category.Key, saved.AttributeBindings[0].CategoryKey)
	saved.Name = "编辑后的模板"
	saved, err = SaveProductTemplate(SaveProductTemplateInput(saved))
	require.NoError(t, err)
	require.Len(t, saved.AttributeBindings, 1)
	var historicalBindingCount int64
	require.NoError(t, database.Unscoped().Model(&models.ProductTemplateAttributeBinding{}).Where("template_id = ?", saved.ID).Count(&historicalBindingCount).Error)
	require.EqualValues(t, 2, historicalBindingCount, "only the explicit replacement path may persist bindings")
	saved.Name = "不应落库的名称"
	saved.AttributeBindings = []models.ProductTemplateAttributeBinding{{CategoryKey: "missing-category"}}
	_, err = SaveProductTemplate(SaveProductTemplateInput(saved))
	require.ErrorContains(t, err, "不存在")
	var persisted models.ProductTemplate
	require.NoError(t, database.Preload("AttributeBindings").First(&persisted, "id = ?", saved.ID).Error)
	require.Equal(t, "编辑后的模板", persisted.Name)
	require.Len(t, persisted.AttributeBindings, 1)
	_, err = SaveProductTemplate(SaveProductTemplateInput(models.ProductTemplate{Name: "无效新增", Code: "invalid-new", AttributeBindings: saved.AttributeBindings}))
	require.ErrorContains(t, err, "不存在")
	var invalidTemplateCount int64
	require.NoError(t, database.Model(&models.ProductTemplate{}).Where("code = ?", "invalid-new").Count(&invalidTemplateCount).Error)
	require.Zero(t, invalidTemplateCount)
}
