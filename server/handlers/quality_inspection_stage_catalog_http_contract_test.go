package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func createQualityInspectionStageHTTPContractRouter(t *testing.T, permissions *[]string) *gin.Engine {
	t.Helper()
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	require.NoError(t, database.Exec(`CREATE TABLE quality_inspection_stages (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, normalized_name TEXT UNIQUE NOT NULL, description TEXT, sort_order INTEGER, active BOOLEAN NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME)`).Error)
	require.NoError(t, database.AutoMigrate(&models.AuditLog{}))
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("permissions", *permissions)
		c.Set("username", "quality-stage-http-test")
		c.Next()
	})
	quality := router.Group("/quality", middleware.RequireAnyPermission(authz.MenuQuality))
	quality.GET("/inspection-stages", GetQualityInspectionStagesHandler)
	quality.POST("/inspection-stages", middleware.RequireAnyPermission(authz.PermissionManage), SaveQualityInspectionStageHandler)
	quality.PUT("/inspection-stages/:id", middleware.RequireAnyPermission(authz.PermissionManage), SaveQualityInspectionStageHandler)
	return router
}

func sendQualityInspectionStageHTTPContractRequest(router *gin.Engine, method, path, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func TestQualityInspectionStageHTTPCatalogPermissionsValidationAndVersionConflicts(t *testing.T) {
	permissions := []string{}
	router := createQualityInspectionStageHTTPContractRouter(t, &permissions)
	response := sendQualityInspectionStageHTTPContractRequest(router, http.MethodGet, "/quality/inspection-stages", "")
	require.Equal(t, http.StatusForbidden, response.Code)
	permissions = []string{authz.MenuQuality}
	response = sendQualityInspectionStageHTTPContractRequest(router, http.MethodGet, "/quality/inspection-stages", "")
	require.Equal(t, http.StatusOK, response.Code)
	require.JSONEq(t, "[]", response.Body.String())
	response = sendQualityInspectionStageHTTPContractRequest(router, http.MethodPost, "/quality/inspection-stages", `{"name":"成型检验站","sortOrder":10,"active":true}`)
	require.Equal(t, http.StatusForbidden, response.Code)
	permissions = []string{authz.MenuQuality, authz.PermissionManage}
	for _, invalidBody := range []string{`{`, `{"name":"","sortOrder":10,"active":true}`, `{"name":"成型检验站","sortOrder":-1,"active":true}`, `{"name":"成型检验站","sortOrder":10}`} {
		response = sendQualityInspectionStageHTTPContractRequest(router, http.MethodPost, "/quality/inspection-stages", invalidBody)
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	response = sendQualityInspectionStageHTTPContractRequest(router, http.MethodPost, "/quality/inspection-stages", `{"name":"成型检验站","description":"称重检查","sortOrder":10,"active":true}`)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var created models.QualityInspectionStage
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &created))
	require.NotEmpty(t, created.ID)
	require.EqualValues(t, 1, created.Version)
	response = sendQualityInspectionStageHTTPContractRequest(router, http.MethodPut, "/quality/inspection-stages/"+created.ID, `{"name":"成型复检站","description":"更新说明","sortOrder":0,"active":false,"version":1}`)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	response = sendQualityInspectionStageHTTPContractRequest(router, http.MethodPut, "/quality/inspection-stages/"+created.ID, `{"name":"旧页面覆盖","sortOrder":1,"active":true,"version":1}`)
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	response = sendQualityInspectionStageHTTPContractRequest(router, http.MethodGet, "/quality/inspection-stages", "")
	var stages []models.QualityInspectionStage
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &stages))
	require.Len(t, stages, 1)
	require.Equal(t, "成型复检站", stages[0].Name)
	require.Equal(t, 0, stages[0].SortOrder)
	require.False(t, stages[0].Active)
	require.EqualValues(t, 2, stages[0].Version)
}
