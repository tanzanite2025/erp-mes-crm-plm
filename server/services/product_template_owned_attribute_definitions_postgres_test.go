package services

import (
	"context"
	"sync"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func createTemplateOwnedAttributeServiceTestDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	database, _ := createIsolatedProductAttributeCatalogReferenceConcurrencyFixture(t)
	require.NoError(t, database.AutoMigrate(&models.ProductTemplate{}, &models.ProductType{}, &models.AuditLog{}))
	require.NoError(t, database.Exec("ALTER TABLE products ADD COLUMN type_id uuid").Error)
	return database
}

func TestTemplateAttributeEditsAndConcurrentProductWritesCannotLeaveBrokenReferences(t *testing.T) {
	for _, productWritesFirst := range []bool{true, false} {
		name := "template_removal_commits_first"
		if productWritesFirst {
			name = "product_value_commits_first"
		}
		t.Run(name, func(t *testing.T) {
			database := createTemplateOwnedAttributeServiceTestDatabase(t)
			template := createTemplateWithIndependentBrakeOptionsForTest(t, "rim", "碟刹", "disc")
			productType := models.ProductType{Name: "R50", Code: "r50", TemplateID: &template.ID}
			require.NoError(t, database.Create(&productType).Error)
			productID := uuid.NewString()
			require.NoError(t, database.Exec("INSERT INTO products (id, type_id) VALUES (?, ?)", productID, productType.ID).Error)
			writeProduct := func(tx *gorm.DB) error {
				return replaceProductAttributeValues(tx, productID, []models.ProductAttributeValue{{CategoryKey: "brakeType", OptionValue: "disc"}})
			}
			removeOption := func(tx *gorm.DB) error {
				template.AttributeBindings[0].Options = nil
				_, err := saveProductTemplateWithinTransaction(tx, SaveProductTemplateInput(template))
				return err
			}
			firstOperation, secondOperation := removeOption, writeProduct
			if productWritesFirst {
				firstOperation, secondOperation = writeProduct, removeOption
			}
			firstReady, allowCommit := make(chan struct{}), make(chan struct{})
			var release sync.Once
			t.Cleanup(func() { release.Do(func() { close(allowCommit) }) })
			firstResult := make(chan error, 1)
			go func() {
				firstResult <- database.Transaction(func(tx *gorm.DB) error {
					if err := firstOperation(tx); err != nil {
						return err
					}
					close(firstReady)
					<-allowCommit
					return nil
				})
			}()
			select {
			case <-firstReady:
			case err := <-firstResult:
				t.Fatalf("first attribute operation ended before obtaining its transaction lock: %v", err)
			case <-time.After(10 * time.Second):
				t.Fatal("timed out waiting for the first attribute operation to obtain its transaction lock")
			}
			secondResult := make(chan error, 1)
			go func() { secondResult <- database.Transaction(secondOperation) }()
			var applicationName string
			require.NoError(t, database.Raw("SELECT current_setting('application_name')").Scan(&applicationName).Error)
			waitForProductAttributeCatalogTransactionLock(t, database, applicationName)
			release.Do(func() { close(allowCommit) })
			require.NoError(t, receiveProductAttributeCatalogTransactionResult(t, firstResult))
			require.Error(t, receiveProductAttributeCatalogTransactionResult(t, secondResult))
			var values []models.ProductAttributeValue
			require.NoError(t, database.Where("product_id = ?", productID).Find(&values).Error)
			if productWritesFirst {
				require.Len(t, values, 1)
			} else {
				require.Empty(t, values)
			}
		})
	}
}

func createTemplateWithIndependentBrakeOptionsForTest(t *testing.T, code, label, value string) models.ProductTemplate {
	t.Helper()
	template, err := SaveProductTemplate(context.Background(), SaveProductTemplateInput(models.ProductTemplate{
		Name: code, Code: code, ComponentKey: "RIM", Active: true,
		AttributeBindings: []models.ProductTemplateAttributeBinding{{
			CategoryKey: "brakeType", NameZh: "制动类型", NameEn: "Brake Type", Active: true,
			Options: []models.ProductTemplateAttributeOptionDefinition{{Value: value, LabelZh: label, Active: true}},
		}},
	}))
	require.NoError(t, err)
	return template
}

func TestTemplateOwnedAttributesSaveAndReadSameNamesWithoutSharing(t *testing.T) {
	database := createTemplateOwnedAttributeServiceTestDatabase(t)
	first := createTemplateWithIndependentBrakeOptionsForTest(t, "rim", "车圈碟刹", "disc")
	second := createTemplateWithIndependentBrakeOptionsForTest(t, "fork", "前叉碟刹", "disc")
	first.AttributeBindings[0].NameZh = "车圈制动"
	first.AttributeBindings[0].Options[0].LabelZh = "车圈修改后"
	first.Description = ""
	first, err := SaveProductTemplate(context.Background(), SaveProductTemplateInput(first))
	require.NoError(t, err)
	var secondReloaded models.ProductTemplate
	require.NoError(t, database.Preload("AttributeBindings").First(&secondReloaded, "id = ?", second.ID).Error)
	require.Equal(t, "制动类型", secondReloaded.AttributeBindings[0].NameZh)
	require.Equal(t, "前叉碟刹", secondReloaded.AttributeBindings[0].Options[0].LabelZh)
	categories, options, err := loadTemplateOwnedAttributeCatalog(database)
	require.NoError(t, err)
	require.Len(t, categories, 2)
	require.Len(t, options, 2)
	labels := make(map[string]string)
	for _, option := range options {
		labels[option.TemplateID] = option.LabelZh
	}
	require.Equal(t, "车圈修改后", labels[first.ID])
	require.Equal(t, "前叉碟刹", labels[second.ID])
	first.Version--
	_, err = SaveProductTemplate(context.Background(), SaveProductTemplateInput(first))
	require.ErrorContains(t, err, "version conflict")
}

func TestProductAttributeWritesUseOnlyTheResolvedTemplateAndPreserveExistingValuesOnFailure(t *testing.T) {
	database := createTemplateOwnedAttributeServiceTestDatabase(t)
	first := createTemplateWithIndependentBrakeOptionsForTest(t, "rim", "碟刹", "disc")
	second := createTemplateWithIndependentBrakeOptionsForTest(t, "fork", "V刹", "v-brake")
	parent := models.ProductType{Name: "车圈", Code: "rim", TemplateID: &first.ID}
	require.NoError(t, database.Create(&parent).Error)
	child := models.ProductType{Name: "R50", Code: "r50", ParentID: &parent.ID}
	require.NoError(t, database.Create(&child).Error)
	productID := uuid.NewString()
	require.NoError(t, database.Exec("INSERT INTO products (id, type_id) VALUES (?, ?)", productID, child.ID).Error)
	writeValues := func(value string) error {
		return database.Transaction(func(tx *gorm.DB) error {
			return replaceProductAttributeValues(tx, productID, []models.ProductAttributeValue{{CategoryKey: "BRAKETYPE", OptionValue: value}})
		})
	}
	require.NoError(t, writeValues("disc"))
	require.ErrorContains(t, writeValues(second.AttributeBindings[0].Options[0].Value), "不属于当前产品模板")
	var values []models.ProductAttributeValue
	require.NoError(t, database.Where("product_id = ?", productID).Find(&values).Error)
	require.Len(t, values, 1)
	require.Equal(t, "disc", values[0].OptionValue)
	require.Equal(t, "brakeType", values[0].CategoryKey)
}

func TestTemplateAttributeRemovalPreservesUsedValuesAndAllowsIndependentUnusedRemoval(t *testing.T) {
	database := createTemplateOwnedAttributeServiceTestDatabase(t)
	first := createTemplateWithIndependentBrakeOptionsForTest(t, "rim", "碟刹", "disc")
	second := createTemplateWithIndependentBrakeOptionsForTest(t, "fork", "碟刹", "disc")
	productType := models.ProductType{Name: "R50", Code: "r50", TemplateID: &first.ID}
	require.NoError(t, database.Create(&productType).Error)
	productID := uuid.NewString()
	require.NoError(t, database.Exec("INSERT INTO products (id, type_id) VALUES (?, ?)", productID, productType.ID).Error)
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		return replaceProductAttributeValues(tx, productID, []models.ProductAttributeValue{{CategoryKey: "brakeType", OptionValue: "disc"}})
	}))
	first.AttributeBindings[0].Options = nil
	first.Name = "不应保存"
	_, err := SaveProductTemplate(context.Background(), SaveProductTemplateInput(first))
	require.ErrorContains(t, err, "已有产品使用")
	var persisted models.ProductTemplate
	require.NoError(t, database.Preload("AttributeBindings").First(&persisted, "id = ?", first.ID).Error)
	require.Equal(t, "rim", persisted.Name)
	require.Len(t, persisted.AttributeBindings[0].Options, 1)
	second.AttributeBindings = nil
	second, err = SaveProductTemplate(context.Background(), SaveProductTemplateInput(second))
	require.NoError(t, err)
	require.Empty(t, second.AttributeBindings)
	persisted.AttributeBindings[0].Options[0].Active = false
	_, err = SaveProductTemplate(context.Background(), SaveProductTemplateInput(persisted))
	require.NoError(t, err)
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		return replaceProductAttributeValues(tx, productID, []models.ProductAttributeValue{{CategoryKey: "brakeType", OptionValue: "disc"}})
	}))
	newProductID := uuid.NewString()
	require.NoError(t, database.Exec("INSERT INTO products (id, type_id) VALUES (?, ?)", newProductID, productType.ID).Error)
	require.ErrorContains(t, database.Transaction(func(tx *gorm.DB) error {
		return replaceProductAttributeValues(tx, newProductID, []models.ProductAttributeValue{{CategoryKey: "brakeType", OptionValue: "disc"}})
	}), "已停用")
}

func TestInvalidTemplateAttributeDefinitionsRollBackTheWholeSave(t *testing.T) {
	database := createTemplateOwnedAttributeServiceTestDatabase(t)
	_, err := SaveProductTemplate(context.Background(), SaveProductTemplateInput(models.ProductTemplate{Name: "不能落库", Code: "invalid", AttributeBindings: []models.ProductTemplateAttributeBinding{{CategoryKey: "color"}}}))
	require.ErrorContains(t, err, "属性名称不能为空")
	var count int64
	require.NoError(t, database.Model(&models.ProductTemplate{}).Count(&count).Error)
	require.Zero(t, count)
	first := createTemplateWithIndependentBrakeOptionsForTest(t, "rim", "碟刹", "disc")
	first.AttributeBindings = append(first.AttributeBindings, first.AttributeBindings[0])
	_, err = SaveProductTemplate(context.Background(), SaveProductTemplateInput(first))
	require.ErrorContains(t, err, "重复")
}

func TestTemplateOwnedAttributeDisabledStateSurvivesCreateAndUpdate(t *testing.T) {
	createTemplateOwnedAttributeServiceTestDatabase(t)
	template, err := SaveProductTemplate(context.Background(), SaveProductTemplateInput(models.ProductTemplate{
		Name: "独立停用属性", Code: "disabled_attribute", Active: true,
		AttributeBindings: []models.ProductTemplateAttributeBinding{{
			CategoryKey: "color", NameZh: "颜色", Active: false,
			Options: []models.ProductTemplateAttributeOptionDefinition{{Value: "blue", LabelZh: "蓝色", Active: false}},
		}},
	}))
	require.NoError(t, err)
	require.False(t, template.AttributeBindings[0].Active, "creating an explicitly disabled definition must preserve false")
	require.False(t, template.AttributeBindings[0].Options[0].Active)
	template.AttributeBindings[0].Active = true
	template, err = SaveProductTemplate(context.Background(), SaveProductTemplateInput(template))
	require.NoError(t, err)
	require.True(t, template.AttributeBindings[0].Active)
	template.AttributeBindings[0].Active = false
	template, err = SaveProductTemplate(context.Background(), SaveProductTemplateInput(template))
	require.NoError(t, err)
	require.False(t, template.AttributeBindings[0].Active, "editing a definition must not restore its database default")
}

func TestTemplateOwnedAttributeDisplayRetainsExistingValuesWhenTheDefinitionIsDisabled(t *testing.T) {
	definitions := []models.ProductTemplateAttributeBinding{{
		CategoryKey: "color", NameZh: "颜色", Active: false,
		Options: []models.ProductTemplateAttributeOptionDefinition{{Value: "blue", LabelZh: "蓝色", Active: false}},
	}}
	categories, options := projectTemplateOwnedAttributeDefinitionsToCatalog(definitions)
	product := models.Product{AttributeValues: []models.ProductAttributeValue{{CategoryKey: "color", OptionValue: "blue"}}}
	items := resolveProductDisplaySummaryItemsV2(product, definitions, categories, options)
	require.Len(t, items, 1, "disabling a definition must not hide values already recorded by products")
	require.Equal(t, "颜色", items[0].Label)
	require.Equal(t, "蓝色", items[0].Value)
	require.Empty(t, resolveProductDisplaySummaryItemsV2(models.Product{}, definitions, categories, options))
}

func TestTemplatePatchRejectsAnOutdatedVersionAfterWaitingForAnotherTemplateSave(t *testing.T) {
	database := createTemplateOwnedAttributeServiceTestDatabase(t)
	template := createTemplateWithIndependentBrakeOptionsForTest(t, "rim", "碟刹", "disc")
	firstSave := database.Begin()
	require.NoError(t, firstSave.Error)
	t.Cleanup(func() { firstSave.Rollback() })
	var lockedTemplate models.ProductTemplate
	require.NoError(t, firstSave.Clauses(clause.Locking{Strength: "UPDATE"}).First(&lockedTemplate, "id = ?", template.ID).Error)
	patchResult := make(chan error, 1)
	go func() {
		_, err := PatchProductTemplate(context.Background(), template.ID, template.Version, map[string]interface{}{"name": "不应覆盖"})
		patchResult <- err
	}()
	var applicationName string
	require.NoError(t, database.Raw("SELECT current_setting('application_name')").Scan(&applicationName).Error)
	waitForProductAttributeCatalogTransactionLock(t, database, applicationName)
	require.NoError(t, firstSave.Model(&lockedTemplate).Update("version", template.Version+1).Error)
	require.NoError(t, firstSave.Commit().Error)
	require.ErrorContains(t, receiveProductAttributeCatalogTransactionResult(t, patchResult), "version conflict")
	require.NoError(t, database.First(&lockedTemplate, "id = ?", template.ID).Error)
	require.Equal(t, template.Name, lockedTemplate.Name)
	require.Equal(t, template.Version+1, lockedTemplate.Version)
}

func TestTemplateDeletionPreservesCategoryBindingsAndRemovesOnlyUnusedDefinitions(t *testing.T) {
	database := createTemplateOwnedAttributeServiceTestDatabase(t)
	boundTemplate := createTemplateWithIndependentBrakeOptionsForTest(t, "rim", "碟刹", "disc")
	productType := models.ProductType{Name: "R50", Code: "r50", TemplateID: &boundTemplate.ID}
	require.NoError(t, database.Create(&productType).Error)
	require.ErrorContains(t, DeleteProductTemplate(context.Background(), boundTemplate.ID), "分类")
	var retained models.ProductTemplate
	require.NoError(t, database.Preload("AttributeBindings").First(&retained, "id = ?", boundTemplate.ID).Error)
	require.Len(t, retained.AttributeBindings, 1)
	unusedTemplate := createTemplateWithIndependentBrakeOptionsForTest(t, "fork", "前叉碟刹", "disc")
	require.NoError(t, DeleteProductTemplate(context.Background(), unusedTemplate.ID))
	var definitionCount int64
	require.NoError(t, database.Model(&models.ProductTemplateAttributeBinding{}).Where("template_id = ?", unusedTemplate.ID).Count(&definitionCount).Error)
	require.Zero(t, definitionCount)
}
