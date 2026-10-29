package routes

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/authz"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions []string, actorID, endpoint, body string) *httptest.ResponseRecorder {
	router := gin.New()
	api := router.Group("/api/v1")
	api.Use(func(c *gin.Context) {
		c.Set("permissions", permissions)
		c.Set("userId", actorID)
		c.Set("username", "authenticated-operator")
		c.Next()
	})
	registerProductionMaterialIssuanceSourceReviewAndDocumentQueryRoutes(api)
	registerProductionMaterialIssuanceDispatchAndWithdrawalCommandRoutes(api)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/mrp/production-material-issuance"+endpoint, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func createProductionMaterialIssuanceReviewedHTTPDispatchRequest(t *testing.T, database *gorm.DB, source services.ProductionMaterialIssuanceSourceSelection) services.ProductionMaterialIssuanceDispatchRequest {
	t.Helper()
	bases, err := services.ReviewProductionMaterialIssuanceSources(context.Background(), database, []services.ProductionMaterialIssuanceSourceSelection{source})
	require.NoError(t, err)
	return services.ProductionMaterialIssuanceDispatchRequest{CommandID: uuid.NewString(), Sources: []services.ProductionMaterialIssuanceDispatchSourceExpectation{{ProductionMaterialIssuanceSourceSelection: source, ExpectedOrderVersion: bases[0].OrderVersion, ExpectedBOMVersion: bases[0].BOM.Version, BasisFingerprint: bases[0].BasisFingerprint}}}
}

func marshalProductionMaterialIssuanceHTTPCommandTestBody(t *testing.T, value any) string {
	t.Helper()
	body, err := json.Marshal(value)
	require.NoError(t, err)
	return string(body)
}

func TestProductionMaterialIssuanceCommandHTTPRequiresBusinessViewAndSeparateCommandPermissions(t *testing.T) {
	database, source := openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	request := createProductionMaterialIssuanceReviewedHTTPDispatchRequest(t, database, source)
	body := marshalProductionMaterialIssuanceHTTPCommandTestBody(t, request)
	for _, permissions := range [][]string{
		nil,
		{authz.MenuMrp, authz.ActionProductionMaterialIssuanceView},
		{authz.MenuMrp, authz.ActionProductionMaterialIssuanceDispatch, authz.ActionProductionMaterialIssuanceWithdraw},
		{authz.ActionProductionMaterialIssuanceView, authz.ActionProductionMaterialIssuanceDispatch, authz.ActionProductionMaterialIssuanceWithdraw},
		{"tab_mrp_production_material_issuance_guide", authz.ActionProductionMaterialIssuanceView, authz.ActionProductionMaterialIssuanceDispatch, authz.ActionProductionMaterialIssuanceWithdraw},
		{authz.MenuWarehouse, authz.ActionWarehouseShipmentCommit},
	} {
		for _, endpoint := range []string{"/dispatch", "/documents/" + uuid.NewString() + "/withdraw"} {
			response := requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-1", endpoint, body)
			require.Equal(t, http.StatusForbidden, response.Code, response.Body.String())
		}
	}
	for _, action := range []string{authz.ActionProductionMaterialIssuanceDispatch, authz.ActionProductionMaterialIssuanceWithdraw} {
		permissions := []string{authz.MenuMrp, authz.ActionProductionMaterialIssuanceView, action}
		endpoint := "/dispatch"
		if action == authz.ActionProductionMaterialIssuanceWithdraw {
			endpoint = "/documents/" + uuid.NewString() + "/withdraw"
		}
		response := requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "", endpoint, body)
		require.Equal(t, http.StatusUnauthorized, response.Code)
		otherEndpoint := "/dispatch"
		if action == authz.ActionProductionMaterialIssuanceDispatch {
			otherEndpoint = "/documents/" + uuid.NewString() + "/withdraw"
		}
		response = requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-1", otherEndpoint, body)
		require.Equal(t, http.StatusForbidden, response.Code)
	}
	var count int64
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceDocument{}).Count(&count).Error)
	require.Zero(t, count)
}

func TestProductionMaterialIssuanceCommandHTTPDispatchUsesAuthenticatedActorAndReplaysOriginalDocument(t *testing.T) {
	database, source := openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	request := createProductionMaterialIssuanceReviewedHTTPDispatchRequest(t, database, source)
	permissions := []string{authz.TabMrpRequirements, authz.ActionProductionMaterialIssuanceView, authz.ActionProductionMaterialIssuanceDispatch}
	body := marshalProductionMaterialIssuanceHTTPCommandTestBody(t, request)
	response := requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-1", "/dispatch", body)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.Equal(t, "no-store", response.Header().Get("Cache-Control"))
	var original services.ProductionMaterialIssuanceDocumentDetail
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &original))
	require.Equal(t, "operator-1", original.Document.DispatchedBy)
	require.Equal(t, "DISPATCHED", original.Document.Status)
	require.Equal(t, 420.0, original.Sources[0].BOM.MeasuredWeight)
	response = requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-1", "/dispatch", body)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var replay services.ProductionMaterialIssuanceDocumentDetail
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &replay))
	require.Equal(t, original.Document.ID, replay.Document.ID)
	request.Sources[0].ExpectedOrderVersion++
	response = requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-1", "/dispatch", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, request))
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), "PRODUCTION_MATERIAL_ISSUANCE_COMMAND_REUSED")
	request.CommandID = uuid.NewString()
	response = requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-2", "/dispatch", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, request))
	require.Equal(t, http.StatusConflict, response.Code)
	require.Contains(t, response.Body.String(), "PRODUCTION_MATERIAL_ISSUANCE_SOURCE_COVERED")
	for _, model := range []any{&models.ProductionMaterialIssuanceDocument{}, &models.ProductionMaterialIssuanceActiveSourceCoverage{}, &models.ProductionMaterialIssuanceCommandReceipt{}, &models.AuditLog{}} {
		var count int64
		require.NoError(t, database.Model(model).Count(&count).Error)
		require.EqualValues(t, 1, count, "%T", model)
	}
}

func TestProductionMaterialIssuanceCommandHTTPRejectsMalformedOrStaleDispatchWithoutPartialWrites(t *testing.T) {
	database, source := openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	request := createProductionMaterialIssuanceReviewedHTTPDispatchRequest(t, database, source)
	permissions := []string{authz.MenuMrp, authz.ActionProductionMaterialIssuanceView, authz.ActionProductionMaterialIssuanceDispatch}
	valid := marshalProductionMaterialIssuanceHTTPCommandTestBody(t, request)
	for _, body := range []string{`{}`, `null`, valid + `{}`, `{"actorId":"forged",` + valid[1:], strings.Replace(valid, request.CommandID, "not-a-uuid", 1), strings.Repeat(" ", 256*1024) + valid} {
		response := requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-1", "/dispatch", body)
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	require.NoError(t, database.Exec("UPDATE boms SET measured_weight=430").Error)
	response := requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-1", "/dispatch", valid)
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), "PRODUCTION_MATERIAL_ISSUANCE_BASIS_CHANGED")
	for _, model := range []any{&models.ProductionMaterialIssuanceDocument{}, &models.ProductionMaterialIssuanceSourceSnapshot{}, &models.ProductionMaterialIssuanceActiveSourceCoverage{}, &models.ProductionMaterialIssuanceCommandReceipt{}} {
		var count int64
		require.NoError(t, database.Model(model).Count(&count).Error)
		require.Zero(t, count, "%T", model)
	}
}

func TestProductionMaterialIssuanceCommandHTTPWithdrawalPreservesHistoryAndReleasesCoverageOnlyOnce(t *testing.T) {
	database, source := openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	request := createProductionMaterialIssuanceReviewedHTTPDispatchRequest(t, database, source)
	permissions := []string{authz.TabMrpProductionMaterialIssuance, authz.ActionProductionMaterialIssuanceView, authz.ActionProductionMaterialIssuanceDispatch, authz.ActionProductionMaterialIssuanceWithdraw}
	response := requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-1", "/dispatch", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, request))
	require.Equal(t, http.StatusOK, response.Code)
	var original services.ProductionMaterialIssuanceDocumentDetail
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &original))
	endpoint := "/documents/" + original.Document.ID + "/withdraw"
	body := map[string]any{"commandId": uuid.NewString(), "expectedVersion": 1, "reason": "重新核对产品重量"}
	for _, invalid := range []map[string]any{
		{"commandId": uuid.NewString(), "expectedVersion": 1, "reason": " "},
		{"commandId": uuid.NewString(), "expectedVersion": 1, "reason": "原因", "documentId": uuid.NewString()},
		{"commandId": "bad", "expectedVersion": 1, "reason": "原因"},
	} {
		response = requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-2", endpoint, marshalProductionMaterialIssuanceHTTPCommandTestBody(t, invalid))
		require.Equal(t, http.StatusBadRequest, response.Code)
	}
	stale := map[string]any{"commandId": uuid.NewString(), "expectedVersion": 2, "reason": "原因"}
	response = requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-2", endpoint, marshalProductionMaterialIssuanceHTTPCommandTestBody(t, stale))
	require.Equal(t, http.StatusConflict, response.Code)
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceDocument{}).Where("id = ?", original.Document.ID).Update("warehouse_execution_at", time.Now()).Error)
	response = requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-2", endpoint, marshalProductionMaterialIssuanceHTTPCommandTestBody(t, body))
	require.Equal(t, http.StatusConflict, response.Code)
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceDocument{}).Where("id = ?", original.Document.ID).Update("warehouse_execution_at", nil).Error)
	for range 2 {
		response = requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-2", endpoint, marshalProductionMaterialIssuanceHTTPCommandTestBody(t, body))
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		var withdrawn services.ProductionMaterialIssuanceDocumentDetail
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &withdrawn))
		require.Equal(t, "WITHDRAWN", withdrawn.Document.Status)
		require.Equal(t, "operator-2", withdrawn.Document.WithdrawnBy)
		require.Equal(t, 2, withdrawn.Document.Version)
		require.Equal(t, original.Sources, withdrawn.Sources)
	}
	response = requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-1", "/dispatch", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, request))
	require.Equal(t, http.StatusOK, response.Code)
	require.Contains(t, response.Body.String(), `"status":"WITHDRAWN"`)
	var count int64
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceActiveSourceCoverage{}).Count(&count).Error)
	require.Zero(t, count)
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceSourceSnapshot{}).Count(&count).Error)
	require.EqualValues(t, 1, count)
	require.NoError(t, database.Model(&models.AuditLog{}).Count(&count).Error)
	require.EqualValues(t, 2, count)
}

func TestProductionMaterialIssuanceCommandHTTPInternalFailureRollsBackAndDoesNotLeakDatabaseErrors(t *testing.T) {
	database, source := openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	request := createProductionMaterialIssuanceReviewedHTTPDispatchRequest(t, database, source)
	require.NoError(t, database.Migrator().DropTable(&models.AuditLog{}))
	permissions := []string{authz.MenuMrp, authz.ActionProductionMaterialIssuanceView, authz.ActionProductionMaterialIssuanceDispatch}
	response := requestProductionMaterialIssuanceDispatchOrWithdrawalHTTP(permissions, "operator-1", "/dispatch", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, request))
	require.Equal(t, http.StatusInternalServerError, response.Code)
	require.Contains(t, response.Body.String(), "PRODUCTION_MATERIAL_ISSUANCE_COMMAND_FAILED")
	require.NotContains(t, response.Body.String(), "audit_logs")
	require.NotContains(t, response.Body.String(), "INSERT")
	for _, model := range []any{&models.ProductionMaterialIssuanceDocument{}, &models.ProductionMaterialIssuanceSourceSnapshot{}, &models.ProductionMaterialIssuanceActiveSourceCoverage{}, &models.ProductionMaterialIssuanceCommandReceipt{}} {
		var count int64
		require.NoError(t, database.Model(model).Count(&count).Error)
		require.Zero(t, count, "%T", model)
	}
}
