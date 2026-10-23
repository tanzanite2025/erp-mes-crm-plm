package handlers

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestTechnicalSpecificationDocumentMasterLibraryHTTPCreateReadPatchAndReferencedDeletion(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	require.NoError(t, database.AutoMigrate(&models.EngineeringSpec{}, &models.AuditLog{}))
	require.NoError(t, database.Exec("ALTER TABLE products ADD COLUMN engineering_spec_id uuid").Error)
	require.NoError(t, database.Exec("ALTER TABLE boms ADD COLUMN description text").Error)
	router.POST("/specs", SaveEngineeringSpecHandler)
	router.GET("/specs", GetEngineeringSpecsHandler)
	router.GET("/specs/:id", GetEngineeringSpecHandler)
	router.PATCH("/specs/:id", PatchEngineeringSpecHandler)
	router.DELETE("/specs/:id", DeleteEngineeringSpecHandler)
	router.POST("/sync", func(c *gin.Context) { c.Set("permissions", []string{"perm_manage"}); c.Next() }, BulkSyncEngineeringSpecsHandler)

	var saved []EngineeringSpecResponseDTO
	for _, name := range []string{"车圈成型工艺", "车圈质量规范"} {
		response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/specs", map[string]any{
			"name": name, "type": "TECH_SPEC", "code": "", "active": true, "revisionNo": "V2.3",
			"specData": map[string]any{"name": name, "category": "SOP", "fileUrl": "/uploads/shared-process.pdf", "version": 99},
		})
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		var item EngineeringSpecResponseDTO
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &item))
		require.NotEmpty(t, item.ID)
		require.Contains(t, item.Code, "SPEC-")
		require.Equal(t, "V2.3", item.MasterDataControl.RevisionNo)
		require.Equal(t, 1, item.Version)
		saved = append(saved, item)
	}
	require.NotEqual(t, saved[0].Code, saved[1].Code)
	for _, input := range []map[string]any{
		{"name": "不能绕过主库", "code": "BYPASS", "type": " TECH_SPEC "},
		{"id": saved[0].ID, "name": "不能伪装类型", "code": saved[0].Code, "type": "OTHER"},
	} {
		response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/sync", []map[string]any{input})
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/specs?options=true&type=TECH_SPEC", nil)
	require.Equal(t, http.StatusOK, response.Code)
	var listed []EngineeringSpecResponseDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &listed))
	require.Len(t, listed, 2)

	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPatch, "/specs/"+saved[0].ID,
		buildProductAttributeCatalogPatchRequest(saved[0].ID, 1, map[string]any{"name": map[string]any{"o": "车圈成型工艺", "n": "更新工艺"}, "revisionNo": map[string]any{"o": "V2.3", "n": "V3"}}))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var updated EngineeringSpecResponseDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &updated))
	require.Equal(t, "更新工艺", updated.Name)
	require.Contains(t, string(updated.SpecData), "更新工艺")
	require.Equal(t, saved[0].Code, updated.Code)
	require.Equal(t, 2, updated.Version)
	require.Equal(t, "V3", updated.MasterDataControl.RevisionNo)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPatch, "/specs/"+saved[0].ID,
		buildProductAttributeCatalogPatchRequest(saved[0].ID, 1, map[string]any{"name": map[string]any{"o": "车圈成型工艺", "n": "过时更新"}}))
	require.Equal(t, http.StatusConflict, response.Code)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPatch, "/specs/"+saved[0].ID,
		buildProductAttributeCatalogPatchRequest(saved[0].ID, 2, map[string]any{"type": map[string]any{"o": "TECH_SPEC", "n": "DRILLING_PLAN"}}))
	require.Equal(t, http.StatusBadRequest, response.Code)

	productID := uuid.NewString()
	require.NoError(t, database.Exec("INSERT INTO products (id, engineering_spec_id) VALUES (?, ?)", productID, saved[0].ID).Error)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodDelete, "/specs/"+saved[0].ID, nil)
	require.Equal(t, http.StatusForbidden, response.Code)
	require.NoError(t, database.Exec("DELETE FROM products WHERE id = ?", productID).Error)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodDelete, "/specs/"+saved[0].ID, nil)
	require.Equal(t, http.StatusNoContent, response.Code, response.Body.String())
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/specs/"+saved[0].ID, nil)
	require.Equal(t, http.StatusNotFound, response.Code)

	var auditCount int64
	require.NoError(t, database.Model(&models.AuditLog{}).Where("target_id = ?", saved[0].ID).Count(&auditCount).Error)
	require.EqualValues(t, 3, auditCount, "create, successful patch and delete must be audited; rejected writes must not be recorded")
}

func TestTechnicalSpecificationDocumentMasterLibraryRejectsInvalidDocumentAndLocalAttachmentURLs(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	require.NoError(t, database.AutoMigrate(&models.EngineeringSpec{}, &models.AuditLog{}))
	router.POST("/specs", SaveEngineeringSpecHandler)
	for _, fileURL := range []string{"file-local-browser-only", "blob:http://localhost/temporary", "javascript:alert(1)", "/uploads/../private.pdf"} {
		response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/specs", map[string]any{
			"name": "测试工艺", "type": "TECH_SPEC", "active": true, "specData": map[string]any{"fileUrl": fileURL},
		})
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/specs", map[string]any{"name": "  ", "type": "TECH_SPEC"})
	require.Equal(t, http.StatusBadRequest, response.Code)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/specs", map[string]any{
		"id": uuid.NewString(), "name": "已删除的文档不能重新创建", "type": "TECH_SPEC", "active": true,
	})
	require.Equal(t, http.StatusNotFound, response.Code)
}

func TestTechnicalSpecificationDocumentProductHTTPReferenceRoundTripAndUnlink(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	require.NoError(t, database.AutoMigrate(&models.ProductTemplate{}, &models.ProductType{}, &models.Product{}, &models.EngineeringSpec{}, &models.AuditLog{}))
	require.NoError(t, database.Exec("ALTER TABLE boms ADD COLUMN description text").Error)
	template := models.ProductTemplate{Name: "车圈物理规格模板", Code: "rim-specification-reference", ComponentKey: "RIM", Active: true, Version: 1}
	require.NoError(t, database.Create(&template).Error)
	productType := models.ProductType{Name: "R50", Code: "R50", TemplateID: &template.ID, Active: true, Version: 1}
	require.NoError(t, database.Create(&productType).Error)
	router.POST("/specs", SaveEngineeringSpecHandler)
	router.DELETE("/specs/:id", DeleteEngineeringSpecHandler)
	router.POST("/products", SaveProductHandler)
	router.GET("/products/:id", GetProductHandler)
	router.PATCH("/products/:id", PatchProductHandler)
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/specs", map[string]any{"name": "成型工艺规范", "type": "TECH_SPEC", "active": true})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var specification EngineeringSpecResponseDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &specification))
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/products", map[string]any{
		"name": "R50 碟刹", "typeId": productType.ID, "modelCode": "01", "status": "Active", "engineeringSpecId": specification.ID,
	})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var product ProductApiDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &product))
	require.Equal(t, specification.ID, product.EngineeringSpecID)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/products/"+product.ID, nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), specification.ID)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodDelete, "/specs/"+specification.ID, nil)
	require.Equal(t, http.StatusForbidden, response.Code)
	wrongType := models.EngineeringSpec{Name: "其他工程数据", Code: "other-engineering-record", Type: "LABELING_DRAFT", Version: 1}
	require.NoError(t, database.Create(&wrongType).Error)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPatch, "/products/"+product.ID,
		buildProductAttributeCatalogPatchRequest(product.ID, product.Version, map[string]any{"engineeringSpecId": map[string]any{"o": specification.ID, "n": wrongType.ID}}))
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPatch, "/products/"+product.ID,
		buildProductAttributeCatalogPatchRequest(product.ID, product.Version, map[string]any{"engineeringSpecId": map[string]any{"o": specification.ID, "n": ""}}))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var unlinked ProductApiDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &unlinked))
	require.Empty(t, unlinked.EngineeringSpecID)
	var persisted models.Product
	require.NoError(t, database.First(&persisted, "id = ?", product.ID).Error)
	require.Empty(t, persisted.EngineeringSpecID)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodDelete, "/specs/"+specification.ID, nil)
	require.Equal(t, http.StatusNoContent, response.Code, response.Body.String())
}

func TestTechnicalSpecificationDocumentFullSavePersistsClearedDescriptionAndFalseValues(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	require.NoError(t, database.AutoMigrate(&models.EngineeringSpec{}, &models.AuditLog{}))
	router.POST("/specs", SaveEngineeringSpecHandler)
	router.GET("/specs/:id", GetEngineeringSpecHandler)
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/specs", map[string]any{
		"name": "可清空说明的工艺", "type": "TECH_SPEC", "active": true, "description": "旧说明",
		"specData": map[string]any{"description": "旧说明", "category": "自定义分类"},
	})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var created EngineeringSpecResponseDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &created))
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/specs", map[string]any{
		"id": created.ID, "version": created.Version, "name": created.Name, "type": "TECH_SPEC", "active": false, "description": "",
		"specData": map[string]any{"description": "旧副本不能重新成为权威说明", "category": "自定义分类"},
	})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var updated EngineeringSpecResponseDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &updated))
	require.Empty(t, updated.Description)
	require.False(t, updated.Active)
	require.Equal(t, created.ID, updated.ID)
	require.Equal(t, created.Code, updated.Code)
	require.WithinDuration(t, created.CreatedAt, updated.CreatedAt, time.Microsecond, "PostgreSQL timestamps retain microsecond precision")
	require.Equal(t, 2, updated.Version)
	response = submitProductAttributeCatalogHTTPRequest(t, router, http.MethodGet, "/specs/"+created.ID, nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var persisted EngineeringSpecResponseDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &persisted))
	require.Empty(t, persisted.Description)
	require.False(t, persisted.Active)
	var payload map[string]any
	require.NoError(t, json.Unmarshal(persisted.SpecData, &payload))
	if description, exists := payload["description"]; exists {
		require.Equal(t, "", description, "specData must not resurrect a cleared authoritative description")
	}
	var auditCount int64
	require.NoError(t, database.Model(&models.AuditLog{}).Where("target_id = ?", created.ID).Count(&auditCount).Error)
	require.EqualValues(t, 2, auditCount)
}

func TestTechnicalSpecificationDocumentRejectsUnreadableFieldTypesBeforeCreateAndPatch(t *testing.T) {
	database, router := createIsolatedProductAttributeCatalogPostgresHTTPFixture(t)
	require.NoError(t, database.AutoMigrate(&models.EngineeringSpec{}, &models.AuditLog{}))
	router.POST("/specs", SaveEngineeringSpecHandler)
	router.PATCH("/specs/:id", PatchEngineeringSpecHandler)
	response := submitProductAttributeCatalogHTTPRequest(t, router, http.MethodPost, "/specs", map[string]any{
		"name": "字段校验工艺", "type": "TECH_SPEC", "active": true,
	})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var created EngineeringSpecResponseDTO
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &created))
	for _, field := range []string{"category", "fileUrl", "fileExtension"} {
		for _, invalid := range []any{nil, true, 123, []string{"invalid"}, map[string]any{"invalid": true}} {
			for _, method := range []string{http.MethodPost, http.MethodPatch} {
				endpoint := "/specs"
				var input any = map[string]any{
					"name": "不能污染主库", "type": "TECH_SPEC", "active": true, "specData": map[string]any{field: invalid},
				}
				if method == http.MethodPatch {
					endpoint += "/" + created.ID
					input = buildProductAttributeCatalogPatchRequest(created.ID, 1, map[string]any{"specData." + field: map[string]any{"n": invalid}})
				}
				response := submitProductAttributeCatalogHTTPRequest(t, router, method, endpoint, input)
				require.Equal(t, http.StatusBadRequest, response.Code, "%s %s=%v: %s", method, field, invalid, response.Body.String())
			}
		}
	}
	for _, method := range []string{http.MethodPost, http.MethodPatch} {
		endpoint := "/specs"
		var input any = map[string]any{"name": "无效变更类型", "type": "TECH_SPEC", "active": true, "changeType": "UNKNOWN"}
		if method == http.MethodPatch {
			endpoint += "/" + created.ID
			input = buildProductAttributeCatalogPatchRequest(created.ID, 1, map[string]any{"changeType": map[string]any{"n": "UNKNOWN"}})
		}
		response := submitProductAttributeCatalogHTTPRequest(t, router, method, endpoint, input)
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	var persisted models.EngineeringSpec
	require.NoError(t, database.First(&persisted, "id = ?", created.ID).Error)
	require.Equal(t, 1, persisted.Version, "rejected patches must not change the document or concurrency version")
	var documentCount, auditCount int64
	require.NoError(t, database.Model(&models.EngineeringSpec{}).Count(&documentCount).Error)
	require.NoError(t, database.Model(&models.AuditLog{}).Count(&auditCount).Error)
	require.EqualValues(t, 1, documentCount)
	require.EqualValues(t, 1, auditCount, "rejected writes must not leave audit records")
}
