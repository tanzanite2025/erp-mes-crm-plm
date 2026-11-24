package handlers

import (
	"encoding/json"
	"net/http"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/stretchr/testify/require"
)

func TestQualityDefectConfigurationHTTPPermissionsValidationAndExplicitBindingReplacement(t *testing.T) {
	permissions := []string{authz.MenuQuality}
	router := createQualityInspectionStageHTTPContractRouter(t, &permissions)
	require.NoError(t, db.DB.Exec(`CREATE TABLE quality_defect_types (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, normalized_name TEXT UNIQUE NOT NULL, description TEXT, sort_order INTEGER, active BOOLEAN NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME)`).Error)
	require.NoError(t, db.DB.Exec(`CREATE TABLE quality_inspection_stage_defect_type_bindings (inspection_stage_id TEXT NOT NULL, defect_type_id TEXT NOT NULL, PRIMARY KEY (inspection_stage_id, defect_type_id))`).Error)
	quality := router.Group("/quality", middleware.RequireAnyPermission(authz.MenuQuality))
	manage := middleware.RequireAnyPermission(authz.PermissionManage)
	quality.GET("/defect-types", GetQualityDefectTypesHandler)
	quality.POST("/defect-types", manage, SaveQualityDefectTypeHandler)
	quality.PUT("/defect-types/:id", manage, SaveQualityDefectTypeHandler)
	quality.GET("/inspection-stages/:id/defect-types", GetQualityInspectionStageDefectTypeBindingsHandler)
	quality.PUT("/inspection-stages/:id/defect-types", manage, ReplaceQualityInspectionStageDefectTypeBindingsHandler)
	request := sendQualityInspectionStageHTTPContractRequest
	response := request(router, http.MethodGet, "/quality/defect-types", "")
	require.Equal(t, http.StatusOK, response.Code)
	require.JSONEq(t, "[]", response.Body.String())
	response = request(router, http.MethodPost, "/quality/defect-types", `{"name":"针孔","active":true}`)
	require.Equal(t, http.StatusForbidden, response.Code)
	response = request(router, http.MethodPut, "/quality/inspection-stages/station/defect-types", `{"defectTypeIds":[],"version":1}`)
	require.Equal(t, http.StatusForbidden, response.Code)
	permissions = []string{authz.PermissionManage}
	response = request(router, http.MethodGet, "/quality/defect-types", "")
	require.Equal(t, http.StatusForbidden, response.Code)
	permissions = []string{authz.MenuQuality, authz.PermissionManage}
	for _, body := range []string{`{`, `{"name":"针孔"}`, `{"name":"","active":true}`, `{"name":"针孔","active":true,"sortOrder":-1}`} {
		response = request(router, http.MethodPost, "/quality/defect-types", body)
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	response = request(router, http.MethodPost, "/quality/defect-types", `{"name":"针孔","active":true,"sortOrder":10}`)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var defect models.QualityDefectType
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &defect))
	response = request(router, http.MethodPost, "/quality/inspection-stages", `{"name":"成型检验站","active":true,"sortOrder":10}`)
	require.Equal(t, http.StatusOK, response.Code)
	var stage models.QualityInspectionStage
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &stage))
	path := "/quality/inspection-stages/" + stage.ID + "/defect-types"
	for _, body := range []string{`{`, `{"version":1}`, `{"defectTypeIds":null,"version":1}`, `{"defectTypeIds":["unknown"],"version":1}`, `{"defectTypeIds":[],"version":0}`} {
		response = request(router, http.MethodPut, path, body)
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	response = request(router, http.MethodPut, path, `{"defectTypeIds":["`+defect.ID+`"],"version":1}`)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	response = request(router, http.MethodPut, path, `{"defectTypeIds":[],"version":1}`)
	require.Equal(t, http.StatusConflict, response.Code)
	response = request(router, http.MethodGet, path, "")
	var bindings services.QualityInspectionStageDefectTypeBindings
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &bindings))
	require.Equal(t, []string{defect.ID}, bindings.DefectTypeIDs)
	response = request(router, http.MethodPut, path, `{"defectTypeIds":[],"version":2}`)
	require.Equal(t, http.StatusOK, response.Code)
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &bindings))
	require.Empty(t, bindings.DefectTypeIDs)
}
