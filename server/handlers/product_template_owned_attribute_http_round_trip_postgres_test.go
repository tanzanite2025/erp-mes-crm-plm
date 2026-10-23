package handlers

import (
	"encoding/json"
	"net/http"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestTemplateOwnedAttributeHTTPRoundTripKeepsDefinitionsAndCatalogLabelsScoped(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	require.NoError(t, database.AutoMigrate(&models.ProductTemplate{}, &models.ProductType{}, &models.AuditLog{}))
	router.POST("/templates", SaveProductTemplateHandler)
	router.GET("/templates", GetProductTemplatesHandler)
	for _, fixture := range []struct{ code, label string }{{"rim", "车圈碟刹"}, {"fork", "前叉碟刹"}} {
		response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/templates", map[string]any{
			"name": fixture.code, "code": fixture.code, "componentKey": "RIM", "active": true,
			"attributeBindings": []any{map[string]any{"categoryKey": "brakeType", "nameZh": "制动类型", "active": true, "options": []any{map[string]any{"value": "disc", "labelZh": fixture.label, "active": true}}}},
		})
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		var saved ProductTemplateResponseDTO
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &saved))
		require.Equal(t, "制动类型", saved.AttributeBindings[0].NameZh)
		require.Equal(t, fixture.label, saved.AttributeBindings[0].Options[0].LabelZh)
	}
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/templates?options=true", nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var templates []ProductTemplateResponseDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &templates))
	require.Len(t, templates, 2)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/options", nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var options []models.ProductAttributeOption
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &options))
	require.Len(t, options, 2)
	require.NotEmpty(t, options[0].TemplateID)
	require.NotEqual(t, options[0].TemplateID, options[1].TemplateID)
}

func TestTemplateDeletionReturnsAConflictWhileAProductCategoryStillUsesIt(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	require.NoError(t, database.AutoMigrate(&models.ProductTemplate{}, &models.ProductType{}, &models.AuditLog{}))
	router.POST("/templates", SaveProductTemplateHandler)
	router.DELETE("/templates/:id", DeleteProductTemplateHandler)
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/templates", map[string]any{
		"name": "车圈", "code": "rim", "active": true, "attributeBindings": []any{},
	})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var template ProductTemplateResponseDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &template))
	productType := models.ProductType{Name: "车圈分类", Code: "rim", TemplateID: &template.ID}
	require.NoError(t, database.Create(&productType).Error)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodDelete, "/templates/"+template.ID, nil)
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), "分类")
	var retained models.ProductTemplate
	require.NoError(t, database.First(&retained, "id = ?", template.ID).Error)
}
