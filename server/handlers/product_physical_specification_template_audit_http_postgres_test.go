package handlers

import (
	"encoding/json"
	"net/http"
	"testing"
	"xdfc-server/audit"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func findProductTemplateAuditFieldForHTTPVerification(t *testing.T, entry models.AuditLog, field string) audit.DiffItem {
	t.Helper()
	var changes []audit.DiffItem
	require.NoError(t, json.Unmarshal(entry.Diff, &changes))
	for _, change := range changes {
		if change.Field == field {
			return change
		}
	}
	t.Fatalf("missing audit field %q in %s", field, entry.Diff)
	return audit.DiffItem{}
}

func TestProductPhysicalSpecificationTemplateHTTPAuditPreservesActorAndDeletedOptions(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	require.NoError(t, database.AutoMigrate(&models.ProductTemplate{}, &models.ProductType{}, &models.AuditLog{}))
	operator := "template-editor-A"
	permissions := []string{"tab_engineering_templates"}
	router.Use(func(c *gin.Context) {
		c.Set("username", operator)
		c.Set("userId", uuid.NewString())
		c.Set("permissions", permissions)
		c.Next()
	})
	router.POST("/templates", SaveProductTemplateHandler)
	router.PATCH("/templates/:id", PatchProductTemplateHandler)
	router.DELETE("/templates/:id", DeleteProductTemplateHandler)
	router.GET("/audit/timeline", GetDataTimelineHandler)

	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/templates", map[string]any{
		"name": "车圈物理规格模板", "code": "rim-audit", "componentKey": "RIM", "active": true,
		"attributeBindings": []any{map[string]any{
			"categoryKey": "techSeries", "nameZh": "工艺系列", "active": true,
			"options": []any{
				map[string]any{"value": "standard", "labelZh": "常规系列", "active": true},
				map[string]any{"value": "high-tg", "labelZh": "高温系列", "active": true},
			},
		}},
	})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var original ProductTemplateResponseDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &original))
	updated := original
	updated.Name = "新版车圈规格模板"
	updated.AttributeBindings = append([]ProductTemplateAttributeBindingResponseDTO(nil), original.AttributeBindings...)
	updated.AttributeBindings[0].Required = true
	updated.AttributeBindings[0].Options = original.AttributeBindings[0].Options[:1]
	operator = "template-editor-B"
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/templates", updated)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var saved ProductTemplateResponseDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &saved))
	// A stale write must neither alter data nor append a successful change record.
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/templates", original)
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPatch, "/templates/"+saved.ID,
		buildProductAttributeCatalogPatchRequest(saved.ID, saved.Version, map[string]any{"description": map[string]any{"o": "", "n": "验证后维护"}}))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodDelete, "/templates/"+saved.ID, nil)
	require.Equal(t, http.StatusNoContent, response.Code, response.Body.String())

	for _, timelinePath := range []string{
		"/audit/timeline?module=product-template",
		"/audit/timeline?module=product-template&target_id=" + saved.ID,
	} {
		response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, timelinePath, nil)
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		var entries []models.AuditLog
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &entries))
		require.Len(t, entries, 4)
		require.Equal(t, "Delete", entries[0].Action)
		require.Equal(t, "template-editor-B", entries[0].Operator)
		require.NotEmpty(t, entries[0].IP)
		require.Equal(t, "新版车圈规格模板", findProductTemplateAuditFieldForHTTPVerification(t, entries[0], "name").Old)
		require.Equal(t, "Patch", entries[1].Action)
		require.Equal(t, "验证后维护", findProductTemplateAuditFieldForHTTPVerification(t, entries[1], "description").New)
		require.Equal(t, "Update", entries[2].Action)
		nameChange := findProductTemplateAuditFieldForHTTPVerification(t, entries[2], "name")
		require.Equal(t, "车圈物理规格模板", nameChange.Old)
		require.Equal(t, "新版车圈规格模板", nameChange.New)
		definitions := findProductTemplateAuditFieldForHTTPVerification(t, entries[2], "attributeBindings")
		require.Contains(t, string(entries[2].Diff), "高温系列")
		require.Len(t, definitions.Old.([]any)[0].(map[string]any)["options"], 2)
		require.Len(t, definitions.New.([]any)[0].(map[string]any)["options"], 1)
		require.Equal(t, "Create", entries[3].Action)
		require.Equal(t, "template-editor-A", entries[3].Operator)
		for _, entry := range entries {
			require.Equal(t, services.AuditModuleProductTemplate, entry.Module)
			require.Equal(t, saved.ID, entry.TargetID)
			require.False(t, entry.CreatedAt.IsZero())
		}
	}
	permissions = []string{}
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/audit/timeline?module=product-template", nil)
	require.Equal(t, http.StatusForbidden, response.Code)
}
