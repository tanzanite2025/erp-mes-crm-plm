package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func sendProductionLineOwnershipHTTPJSONRequest(t *testing.T, router *gin.Engine, method string, path string, payload any) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(payload)
	require.NoError(t, err)
	request := httptest.NewRequest(method, path, bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func TestProductionLinePostgresHTTPL2OwnershipReturnsBadRequestAndDeletedParentReturnsNotFound(t *testing.T) {
	database := createProductionPlanMBOMBranchHTTPPostgresDatabase(t)
	require.NoError(t, database.AutoMigrate(&models.ProductTemplate{}, &models.ProductionLine{}, &models.LineSegment{}, &models.SystemConfig{}))
	require.NoError(t, database.Exec(`CREATE TABLE audit_logs (id uuid PRIMARY KEY, module text, target_id text, action text, diff text, operator text, ip text, created_at timestamptz)`).Error)
	productID := uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO products (id, sku, name, status) VALUES (?, 'HTTP-L2', 'HTTP归属测试产品', 'ACTIVE')`, productID).Error)
	require.NoError(t, database.Exec(`INSERT INTO boms (id, product_id, bom_type, status, owner_type, version_level)
		VALUES (?, ?, 'MBOM', 'RELEASED', 'INTERNAL', 'standard')`, uuid.NewString(), productID).Error)
	template := models.ProductTemplate{Code: "HTTP-L2-TEMPLATE", Name: "HTTP归属测试模板", Active: true}
	require.NoError(t, database.Create(&template).Error)
	previousGinMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(previousGinMode) })
	router := gin.New()
	router.POST("/production/lines", SaveProductionLineHandler)
	router.PATCH("/production/lines/:id", PatchProductionLineHandler)
	router.DELETE("/production/lines/:id", DeleteProductionLineHandler)
	lines := make([]services.ProductionLineDTO, 2)
	for index := range lines {
		input := services.ProductionLineDTO{ID: "temp-http-l1", Code: "HTTP-L1-" + uuid.NewString(), ProductTemplateID: template.ID, IsActive: true,
			Segments: []services.LineSegmentDTO{{ID: "temp-http-l2", LineID: "temp-http-l1", ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard"}}}
		response := sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodPost, "/production/lines", input)
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &lines[index]))
	}
	line, other := lines[0], lines[1]
	foreign := other.Segments[0]
	foreign.LineID = line.ID
	invalid := line
	invalid.Segments = []services.LineSegmentDTO{foreign}
	response := sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodPost, "/production/lines",
		services.SaveProductionLineHandlerRequest{ProductionLineDTO: invalid, AuthCode: "622575"})
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), "属于其他 L1")
	patch := map[string]any{"delta": map[string]any{"segments": map[string]any{"o": line.Segments, "n": invalid.Segments}},
		"metadata": map[string]any{"version": line.Version, "authCode": "622575"}}
	response = sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodPatch, "/production/lines/"+line.ID, patch)
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	var persisted models.ProductionLine
	require.NoError(t, database.Preload("Segments").First(&persisted, "id = ?", line.ID).Error)
	require.EqualValues(t, 1, persisted.Version)
	require.Len(t, persisted.Segments, 1)
	require.Equal(t, line.Segments[0].ID, persisted.Segments[0].ID)
	response = sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodDelete, "/production/lines/"+line.ID, nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var removed models.LineSegment
	require.NoError(t, database.Unscoped().First(&removed, "id = ?", line.Segments[0].ID).Error)
	require.True(t, removed.DeletedAt.Valid)
	for _, method := range []string{http.MethodPost, http.MethodPatch, http.MethodDelete} {
		path, payload := "/production/lines/"+line.ID, any(patch)
		if method == http.MethodPost {
			path, payload = "/production/lines", services.SaveProductionLineHandlerRequest{ProductionLineDTO: line, AuthCode: "622575"}
		}
		response = sendProductionLineOwnershipHTTPJSONRequest(t, router, method, path, payload)
		require.Equal(t, http.StatusNotFound, response.Code, response.Body.String())
	}
	invalid = other
	invalid.Segments = []services.LineSegmentDTO{line.Segments[0]}
	invalid.Segments[0].LineID = other.ID
	response = sendProductionLineOwnershipHTTPJSONRequest(t, router, http.MethodPost, "/production/lines",
		services.SaveProductionLineHandlerRequest{ProductionLineDTO: invalid, AuthCode: "622575"})
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), "已删除")
	var auditCount int64
	require.NoError(t, database.Table("audit_logs").Count(&auditCount).Error)
	require.EqualValues(t, 3, auditCount, "failed writes and repeated deletion must not create audit events")
}
