package handlers

import (
	"encoding/json"
	"net/http"
	"testing"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestBOMPerformanceVersionHTTPCreateWithoutProductAttributeCategories(t *testing.T) {
	for _, archivedCategory := range []bool{false, true} {
		t.Run(map[bool]string{false: "missing_internal_catalog", true: "archived_legacy_catalog"}[archivedCategory], func(t *testing.T) {
			database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
			if archivedCategory {
				category := models.ProductAttributeCategory{Key: "versionLevel", NameZh: "旧名称", Active: true, Version: 1}
				require.NoError(t, database.Create(&category).Error)
				require.NoError(t, database.Delete(&category).Error)
			}
			response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/options", map[string]any{
				"categoryKey": "versionLevel", "value": "lightweight", "labelZh": "轻量版", "active": true,
			})
			require.Equal(t, http.StatusOK, response.Code, response.Body.String())
			var saved models.ProductAttributeOption
			require.NoError(t, json.Unmarshal(response.Body.Bytes(), &saved))
			require.Equal(t, "versionLevel", saved.CategoryKey)
			require.Equal(t, "lightweight", saved.Value)
			var category models.ProductAttributeCategory
			require.NoError(t, database.Where("key = ?", "versionLevel").First(&category).Error)
			require.Equal(t, "性能版本", category.NameZh)
			response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/options?categoryKey=versionLevel", nil)
			require.Equal(t, http.StatusOK, response.Code, response.Body.String())
			require.Contains(t, response.Body.String(), saved.ID)
			response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/options", buildProductAttributeCatalogPatchRequest(saved.ID, saved.Version, map[string]any{
				"labelZh": map[string]any{"o": "轻量版", "n": "轻量性能版"},
			}))
			require.Equal(t, http.StatusOK, response.Code, response.Body.String())
			require.NoError(t, database.Exec("INSERT INTO boms (id, version_level) VALUES (?, ?)", uuid.NewString(), saved.Value).Error)
			response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodDelete, "/options/"+saved.ID, nil)
			require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
		})
	}
}
