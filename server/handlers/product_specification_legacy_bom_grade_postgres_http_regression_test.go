package handlers

import (
	"encoding/json"
	"net/http"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func createProductSpecificationLegacyBOMGradePostgresHTTPFixture(t *testing.T) (*gorm.DB, *gin.Engine, models.Product) {
	t.Helper()
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	require.NoError(t, database.AutoMigrate(&models.ProductType{}, &models.ProductTemplate{}, &models.Product{}, &models.AuditLog{}))
	template := models.ProductTemplate{Name: "车圈规格模板", Code: "rim-regression", ComponentKey: "RIM", Active: true, Version: 1}
	require.NoError(t, database.Create(&template).Error)
	productType := models.ProductType{Name: "R50", Code: "R50", TemplateID: &template.ID, Active: true, Version: 1}
	require.NoError(t, database.Create(&productType).Error)
	for index, attribute := range []struct{ categoryKey, optionValue string }{
		{"techSeries", "normal"}, {"tireType", "hooked"}, {"brakeType", "disc"},
	} {
		category := models.ProductAttributeCategory{Key: attribute.categoryKey, NameZh: attribute.categoryKey, Active: true, Version: 1}
		require.NoError(t, database.Create(&category).Error)
		option := models.ProductAttributeOption{CategoryKey: category.Key, Value: attribute.optionValue, LabelZh: attribute.optionValue, Active: true, Version: 1}
		require.NoError(t, database.Create(&option).Error)
		binding := models.ProductTemplateAttributeBinding{TemplateID: template.ID, CategoryKey: category.Key, SortOrder: index + 1, Active: true, Version: 1}
		require.NoError(t, database.Create(&binding).Error)
	}
	gradeCategory := models.ProductAttributeCategory{Key: "versionLevel", NameZh: "版本等级", Active: true, Version: 1}
	require.NoError(t, database.Create(&gradeCategory).Error)
	require.NoError(t, database.Delete(&gradeCategory).Error)
	product := models.Product{SKU: "R50-01", Name: "R50 (碟刹)", TypeID: productType.ID, ModelCode: "01", Depth: 50, Status: "Active", Version: 3}
	require.NoError(t, database.Omit("AttributeValues", "EngineeringSpecID").Create(&product).Error)
	product.AttributeValues = []models.ProductAttributeValue{
		{ProductID: product.ID, CategoryKey: "versionLevel", OptionValue: "std", SortOrder: 1, Version: 1},
		{ProductID: product.ID, CategoryKey: "techSeries", OptionValue: "normal", SortOrder: 2, Version: 1},
		{ProductID: product.ID, CategoryKey: "tireType", OptionValue: "hooked", SortOrder: 3, Version: 1},
		{ProductID: product.ID, CategoryKey: "brakeType", OptionValue: "disc", SortOrder: 4, Version: 1},
	}
	require.NoError(t, database.Create(&product.AttributeValues).Error)
	require.NoError(t, db.MigrateProductTemplateOwnedAttributeDefinitions(database))
	require.NoError(t, database.Exec("ALTER TABLE boms ADD COLUMN product_id uuid").Error)
	require.NoError(t, database.Exec("INSERT INTO boms (id, product_id, version_level) VALUES (?, ?, ?)", uuid.NewString(), product.ID, "lightweight").Error)
	router.GET("/products", GetProductsHandler)
	router.GET("/products/:id", GetProductHandler)
	router.POST("/products", SaveProductHandler)
	router.PATCH("/products/:id", PatchProductHandler)
	return database, router, product
}

func TestProductSpecificationLegacyBOMGradeHTTPReadExcludesGradeWithoutDeletingHistoricalData(t *testing.T) {
	database, router, product := createProductSpecificationLegacyBOMGradePostgresHTTPFixture(t)
	for _, path := range []string{"/products/" + product.ID, "/products?options=true", "/products?page=1"} {
		response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, path, nil)
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		require.NotContains(t, response.Body.String(), `"versionLevel"`)
		require.Contains(t, response.Body.String(), `"techSeries"`)
		require.Contains(t, response.Body.String(), `"tireType"`)
		require.Contains(t, response.Body.String(), `"brakeType"`)
	}
	var values []models.ProductAttributeValue
	require.NoError(t, database.Where("product_id = ?", product.ID).Find(&values).Error)
	require.Len(t, values, 4, "reading must preserve historical storage")
}

func TestProductSpecificationLegacyBOMGradeHTTPDimensionEditPreservesProductAttributesAndBOMGrade(t *testing.T) {
	database, router, product := createProductSpecificationLegacyBOMGradePostgresHTTPFixture(t)
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPatch, "/products/"+product.ID,
		buildProductAttributeCatalogPatchRequest(product.ID, product.Version, map[string]any{"depth": map[string]any{"o": 50, "n": 51}}))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var saved models.Product
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &saved))
	require.Equal(t, float64(51), saved.Depth)
	require.Equal(t, 4, saved.Version)
	require.Len(t, saved.AttributeValues, 3)
	var persisted models.Product
	require.NoError(t, database.Preload("AttributeValues").First(&persisted, "id = ?", product.ID).Error)
	require.Equal(t, float64(51), persisted.Depth)
	require.Len(t, persisted.AttributeValues, 3)
	var archivedGrade models.ProductAttributeValue
	require.NoError(t, database.Unscoped().First(&archivedGrade, "id = ?", product.AttributeValues[0].ID).Error)
	require.Equal(t, "std", archivedGrade.OptionValue)
	require.True(t, archivedGrade.DeletedAt.Valid, "the retired product grade remains in soft-deleted history")
	var bomGrade string
	require.NoError(t, database.Table("boms").Where("product_id = ?", product.ID).Pluck("version_level", &bomGrade).Error)
	require.Equal(t, "lightweight", bomGrade, "product editing must not overwrite BOM-owned grade")
	var auditCount int64
	require.NoError(t, database.Model(&models.AuditLog{}).Where("target_id = ?", product.ID).Count(&auditCount).Error)
	require.EqualValues(t, 1, auditCount)
}

func TestProductSpecificationLegacyBOMGradeHTTPOldDraftSaveDoesNotRecreateRetiredGrade(t *testing.T) {
	database, router, product := createProductSpecificationLegacyBOMGradePostgresHTTPFixture(t)
	product.AttributeValues[0].CategoryKey = " VERSIONLEVEL "
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/products", product)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var values []models.ProductAttributeValue
	require.NoError(t, database.Where("product_id = ?", product.ID).Find(&values).Error)
	require.Len(t, values, 3)
	for _, value := range values {
		require.NotEqual(t, "versionLevel", value.CategoryKey)
	}
}

func TestProductSpecificationLegacyBOMGradeHTTPInvalidReferenceAndVersionConflictRollback(t *testing.T) {
	for _, scenario := range []struct {
		name, categoryKey, optionValue string
	}{
		{"deleted-category", "deleted-category", "missing"},
		{"deleted-option", "techSeries", "deleted-option"},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			database, router, product := createProductSpecificationLegacyBOMGradePostgresHTTPFixture(t)
			attributes := append([]models.ProductAttributeValue(nil), product.AttributeValues...)
			attributes = append(attributes, models.ProductAttributeValue{CategoryKey: scenario.categoryKey, OptionValue: scenario.optionValue})
			response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPatch, "/products/"+product.ID,
				buildProductAttributeCatalogPatchRequest(product.ID, product.Version, map[string]any{
					"depth": map[string]any{"o": 50, "n": 99}, "attributeValues": map[string]any{"o": product.AttributeValues, "n": attributes},
				}))
			require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
			var persisted models.Product
			require.NoError(t, database.Preload("AttributeValues").First(&persisted, "id = ?", product.ID).Error)
			require.Equal(t, float64(50), persisted.Depth)
			require.Equal(t, 3, persisted.Version)
			require.Len(t, persisted.AttributeValues, 4, "failed edits must not archive or replace any references")
			response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPatch, "/products/"+product.ID,
				buildProductAttributeCatalogPatchRequest(product.ID, product.Version-1, map[string]any{"depth": map[string]any{"o": 50, "n": 99}}))
			require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
			require.NoError(t, database.First(&persisted, "id = ?", product.ID).Error)
			require.Equal(t, float64(50), persisted.Depth)
		})
	}
}
