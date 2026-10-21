package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func createIsolatedProductAttributeCatalogPostgresHTTPFixture(t *testing.T) (*gorm.DB, *gin.Engine) {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("PRODUCT_ATTRIBUTE_CATALOG_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set PRODUCT_ATTRIBUTE_CATALOG_TEST_POSTGRES_DSN to verify product attribute HTTP persistence")
	}
	adminDatabase, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	adminConnection, err := adminDatabase.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
	schemaName := "product_attribute_catalog_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, adminDatabase.Exec("CREATE SCHEMA "+schemaName).Error)
	t.Cleanup(func() { require.NoError(t, adminDatabase.Exec("DROP SCHEMA "+schemaName+" CASCADE").Error) })
	connectionConfig, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	connectionConfig.RuntimeParams["search_path"] = schemaName
	connectionConfig.RuntimeParams["lock_timeout"] = "2000"
	connectionConfig.RuntimeParams["statement_timeout"] = "5000"
	connection := stdlib.OpenDB(*connectionConfig)
	connection.SetMaxOpenConns(5)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(&models.ProductAttributeCategory{}, &models.ProductAttributeOption{}, &models.ProductAttributeValue{}, &models.ProductTemplateAttributeBinding{}))
	require.NoError(t, database.Exec("CREATE TABLE products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tech_series text, tire_type text, brake_type text, deleted_at timestamptz)").Error)
	require.NoError(t, database.Exec("CREATE TABLE boms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_level text, deleted_at timestamptz)").Error)
	require.NoError(t, database.Exec("CREATE UNIQUE INDEX product_attribute_test_category_key ON product_attribute_categories (LOWER(key)) WHERE deleted_at IS NULL").Error)
	require.NoError(t, database.Exec("CREATE UNIQUE INDEX product_attribute_test_option_value ON product_attribute_options (category, LOWER(value)) WHERE deleted_at IS NULL").Error)
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/categories", GetProductAttributeCategoriesHandler)
	router.POST("/categories", SaveProductAttributeCategoryHandler)
	router.POST("/categories/reorder", ReorderProductAttributeCategoriesHandler)
	router.DELETE("/categories/:id", DeleteProductAttributeCategoryHandler)
	router.GET("/options", GetProductAttributeOptionsHandler)
	router.POST("/options", SaveProductAttributeOptionHandler)
	router.POST("/options/reorder", ReorderProductAttributeOptionsHandler)
	router.DELETE("/options/:id", DeleteProductAttributeOptionHandler)
	return database, router
}

func submitProductAttributeCatalogHTTPRequest(t *testing.T, router *gin.Engine, method, path string, payload any) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(payload)
	require.NoError(t, err)
	request := httptest.NewRequest(method, path, bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func buildProductAttributeCatalogPatchRequest(id string, version int, delta map[string]any) map[string]any {
	return map[string]any{"op": "PATCH", "delta": delta, "metadata": map[string]any{"id": id, "version": version}}
}

func TestProductAttributeCatalogHTTPCreatePreservesInactiveState(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/categories", map[string]any{
		"key": "color", "nameZh": "颜色", "active": false, "siteCode": "SZ", "isDefaultSite": false,
	})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var category models.ProductAttributeCategory
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &category))
	require.False(t, category.Active, "the response must retain the submitted disabled state")
	require.False(t, category.IsDefaultSite)
	require.NoError(t, database.First(&category, "id = ?", category.ID).Error)
	require.False(t, category.Active)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/options", map[string]any{
		"categoryKey": "COLOR", "value": "option-blue", "labelZh": "蓝色", "active": false,
		"siteCode": "SZ", "isDefaultSite": false, "effectiveFrom": "2026-10-21T00:00:00Z",
	})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var option models.ProductAttributeOption
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &option))
	require.False(t, option.Active)
	require.False(t, option.IsDefaultSite)
	require.NotNil(t, option.EffectiveFrom)
	require.Equal(t, "color", option.CategoryKey)
	require.NoError(t, database.First(&option, "id = ?", option.ID).Error)
	require.False(t, option.Active)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/options?activeOnly=true", nil)
	require.JSONEq(t, "[]", response.Body.String())
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/options", map[string]any{
		"categoryKey": "color", "value": "option-default-active", "labelZh": "默认启用项",
	})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var defaultActiveOption models.ProductAttributeOption
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &defaultActiveOption))
	require.True(t, defaultActiveOption.Active, "omitting active must retain the API's default enabled state")
}

func TestProductAttributeCatalogHTTPEditClearsOptionalFieldsAndMapsMetadataColumns(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	category := models.ProductAttributeCategory{Key: "color", NameZh: "颜色", NameEn: "Color", Description: "old description", Active: true, Version: 1}
	require.NoError(t, database.Create(&category).Error)
	option := models.ProductAttributeOption{CategoryKey: category.Key, Value: "blue", LabelZh: "蓝色", LabelEn: "Blue", Description: "old option description", Active: true, Version: 1}
	require.NoError(t, database.Create(&option).Error)
	for _, item := range []struct{ path, id, englishField string }{{"/categories", category.ID, "nameEn"}, {"/options", option.ID, "labelEn"}} {
		response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, item.path, buildProductAttributeCatalogPatchRequest(item.id, 1, map[string]any{
			item.englishField: map[string]any{"o": "old", "n": ""}, "description": map[string]any{"o": "old", "n": ""},
			"revisionNo": map[string]any{"o": "R1", "n": "R2"}, "changeType": map[string]any{"o": "MANUAL", "n": "ECO"},
			"changeOrderNo": map[string]any{"o": "", "n": "ECO-001"}, "siteCode": map[string]any{"o": "", "n": "SZ"},
			"isDefaultSite": map[string]any{"o": true, "n": false}, "effectiveFrom": map[string]any{"o": nil, "n": "2026-10-21T00:00:00Z"},
		}))
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		var saved map[string]any
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &saved))
		require.Equal(t, "", saved[item.englishField])
		require.Equal(t, "", saved["description"])
		require.Equal(t, "R2", saved["revisionNo"])
		require.Equal(t, "ECO", saved["changeType"])
		require.Equal(t, "ECO-001", saved["changeOrderNo"])
		require.Equal(t, "SZ", saved["siteCode"])
		require.Equal(t, false, saved["isDefaultSite"])
		require.Equal(t, float64(2), saved["version"])
		require.NotNil(t, saved["effectiveFrom"])
	}
	require.NoError(t, database.First(&option, "id = ?", option.ID).Error)
	require.Empty(t, option.LabelEn)
	require.Empty(t, option.Description)
	require.NoError(t, database.First(&category, "id = ?", category.ID).Error)
	require.Empty(t, category.NameEn)
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/options", buildProductAttributeCatalogPatchRequest(option.ID, 2, map[string]any{
		"effectiveFrom": map[string]any{"o": "2026-10-21T00:00:00Z", "n": nil},
	}))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.NoError(t, database.First(&option, "id = ?", option.ID).Error)
	var savedAfterClearingEffectiveDate models.ProductAttributeOption
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &savedAfterClearingEffectiveDate))
	require.Nil(t, savedAfterClearingEffectiveDate.EffectiveFrom)
	var persistedAfterClearingEffectiveDate models.ProductAttributeOption
	require.NoError(t, database.First(&persistedAfterClearingEffectiveDate, "id = ?", option.ID).Error)
	require.Nil(t, persistedAfterClearingEffectiveDate.EffectiveFrom)
}

func TestProductAttributeCatalogHTTPEditPreservesLegacyIdentifiersAndRejectsStaleWrites(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	category := models.ProductAttributeCategory{Key: "techSeries", NameZh: "工艺系列", Active: true, Version: 1}
	require.NoError(t, database.Create(&category).Error)
	option := models.ProductAttributeOption{CategoryKey: category.Key, Value: "Legacy_Value", LabelZh: "旧项", Active: true, Version: 1}
	require.NoError(t, database.Create(&option).Error)
	for _, item := range []struct{ path, id, nameField string }{{"/categories", category.ID, "nameZh"}, {"/options", option.ID, "labelZh"}} {
		payload := buildProductAttributeCatalogPatchRequest(item.id, 1, map[string]any{item.nameField: map[string]any{"o": "旧名称", "n": "新名称"}})
		response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, item.path, payload)
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, item.path, payload)
		require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	}
	require.NoError(t, database.First(&category, "id = ?", category.ID).Error)
	require.Equal(t, "techSeries", category.Key)
	require.NoError(t, database.First(&option, "id = ?", option.ID).Error)
	require.Equal(t, "Legacy_Value", option.Value)
	require.Equal(t, "techSeries", option.CategoryKey)
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/options", buildProductAttributeCatalogPatchRequest(option.ID, 2, map[string]any{
		"value": map[string]any{"o": option.Value, "n": "changed-value"},
	}))
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
}

func TestProductAttributeCatalogHTTPConcurrentEditorsCannotOverwriteEachOther(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	category := models.ProductAttributeCategory{Key: "color", NameZh: "颜色", Active: true, Version: 1}
	require.NoError(t, database.Create(&category).Error)
	option := models.ProductAttributeOption{CategoryKey: category.Key, Value: "blue", LabelZh: "蓝色", Active: true, Version: 1}
	require.NoError(t, database.Create(&option).Error)
	var waitGroup sync.WaitGroup
	responses := make(chan int, 2)
	for _, label := range []string{"深蓝", "浅蓝"} {
		waitGroup.Go(func() {
			response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/options", buildProductAttributeCatalogPatchRequest(option.ID, 1, map[string]any{
				"labelZh": map[string]any{"o": "蓝色", "n": label},
			}))
			responses <- response.Code
		})
	}
	waitGroup.Wait()
	close(responses)
	statuses := make(map[int]int)
	for status := range responses {
		statuses[status]++
	}
	require.Equal(t, map[int]int{http.StatusOK: 1, http.StatusConflict: 1}, statuses)
	require.NoError(t, database.First(&option, "id = ?", option.ID).Error)
	require.Equal(t, 2, option.Version)
}

func TestProductAttributeCatalogHTTPReorderHandlesLegacyCategoryAliasesAndRollsBackInvalidLists(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	category := models.ProductAttributeCategory{Key: "techSeries", NameZh: "工艺系列", Active: true, Version: 1}
	require.NoError(t, database.Create(&category).Error)
	firstOption := models.ProductAttributeOption{CategoryKey: "techseries", Value: "first", LabelZh: "第一项", SortOrder: 10, Active: true}
	secondOption := models.ProductAttributeOption{CategoryKey: "TECHSERIES", Value: "second", LabelZh: "第二项", SortOrder: 20, Active: true}
	require.NoError(t, database.Create(&firstOption).Error)
	require.NoError(t, database.Create(&secondOption).Error)
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/options/reorder", map[string]any{
		"categoryKey": category.Key, "ids": []string{secondOption.ID, secondOption.ID},
	})
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	require.NoError(t, database.First(&secondOption, "id = ?", secondOption.ID).Error)
	require.Equal(t, 20, secondOption.SortOrder, "an invalid second ID must roll back the first update")
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/options/reorder", map[string]any{
		"categoryKey": "TECHSERIES", "ids": []string{secondOption.ID, firstOption.ID},
	})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.NoError(t, database.First(&secondOption, "id = ?", secondOption.ID).Error)
	require.Equal(t, 10, secondOption.SortOrder)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodDelete, "/categories/"+category.ID, nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var remainingOptions int64
	require.NoError(t, database.Model(&models.ProductAttributeOption{}).Count(&remainingOptions).Error)
	require.Zero(t, remainingOptions, "deleting a category must also remove options stored under compatibility spellings")
}

func TestProductAttributeCatalogHTTPDeleteRejectsProductAndTemplateReferences(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	category := models.ProductAttributeCategory{Key: "techSeries", NameZh: "工艺系列", Active: true, Version: 1}
	require.NoError(t, database.Create(&category).Error)
	option := models.ProductAttributeOption{CategoryKey: category.Key, Value: "blue", LabelZh: "蓝色", Active: true}
	require.NoError(t, database.Create(&option).Error)
	reference := models.ProductAttributeValue{ProductID: uuid.NewString(), CategoryKey: "TECHSERIES", OptionValue: "BLUE"}
	require.NoError(t, database.Create(&reference).Error)
	for _, path := range []string{"/categories/" + category.ID, "/options/" + option.ID} {
		response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodDelete, path, nil)
		require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	}
	require.NoError(t, database.Delete(&reference).Error)
	templateBinding := models.ProductTemplateAttributeBinding{TemplateID: uuid.NewString(), CategoryKey: "TECHSERIES"}
	require.NoError(t, database.Create(&templateBinding).Error)
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodDelete, "/categories/"+category.ID, nil)
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	require.NoError(t, database.First(&option, "id = ?", option.ID).Error)
	require.NoError(t, database.Delete(&templateBinding).Error)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodDelete, "/options/"+option.ID, nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
}

func TestProductAttributeCatalogHTTPDeleteRejectsLegacyProductAndBOMFieldReferences(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	for _, field := range []struct{ categoryKey, table, column string }{
		{"techSeries", "products", "tech_series"}, {"tireType", "products", "tire_type"},
		{"brakeType", "products", "brake_type"}, {"versionLevel", "boms", "version_level"},
	} {
		t.Run(field.categoryKey, func(t *testing.T) {
			category := models.ProductAttributeCategory{Key: field.categoryKey, NameZh: "分类", Active: true, Version: 1}
			require.NoError(t, database.Create(&category).Error)
			option := models.ProductAttributeOption{CategoryKey: category.Key, Value: "Legacy_Value", LabelZh: "分类项", Active: true, Version: 1}
			require.NoError(t, database.Create(&option).Error)
			require.NoError(t, database.Exec("INSERT INTO "+field.table+" ("+field.column+") VALUES (?)", "legacy-value").Error)
			for _, path := range []string{"/options/" + option.ID, "/categories/" + category.ID} {
				response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodDelete, path, nil)
				require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
				require.Contains(t, response.Body.String(), "使用")
			}
		})
	}
}
