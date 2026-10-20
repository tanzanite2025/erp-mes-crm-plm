package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestLogisticsRecordWritesPostgresAcceptJSONArraysEnforceTypeScopeAndRejectStaleEdits(t *testing.T) {
	database := createIsolatedQualityStandardPatchPostgresDatabase(t)
	logisticsDatabase := database.Session(&gorm.Session{})
	logisticsDatabase.Config.IgnoreRelationshipsWhenMigrating = true
	logisticsDatabase.Config.DisableForeignKeyConstraintWhenMigrating = true
	require.NoError(t, logisticsDatabase.AutoMigrate(&models.LogisticsRecord{}, &models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{}))
	permissions := []string{authz.MenuPurchase}
	router := gin.New()
	router.Use(func(c *gin.Context) { c.Set("permissions", permissions); c.Next() })
	router.POST("/logistics", SaveLogisticsRecordHandler)
	router.PATCH("/logistics/:id", PatchLogisticsRecordDetailsHandler)
	router.PATCH("/logistics/:id/status", UpdateLogisticsStatusHandler)
	router.DELETE("/logistics/:id", DeleteLogisticsRecordHandler)
	request := func(method, path string, payload any) *httptest.ResponseRecorder {
		body, err := json.Marshal(payload)
		require.NoError(t, err)
		req := httptest.NewRequest(method, path, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, req)
		return response
	}
	response := request(http.MethodPost, "/logistics", map[string]any{"type": "Receipt", "orderNo": "PO-TEST", "carrier": "test", "trackingNo": uuid.NewString(), "events": []any{}})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var created struct {
		ID      string `json:"id"`
		Version int    `json:"version"`
		Events  []any  `json:"events"`
	}
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &created))
	require.Equal(t, 1, created.Version)
	response = request(http.MethodPost, "/logistics", map[string]any{"id": created.ID, "version": created.Version, "type": "Receipt", "status": "Delivered", "events": []any{}})
	require.Equal(t, http.StatusForbidden, response.Code, "full save cannot bypass the dedicated status action")
	response = request(http.MethodPost, "/logistics", map[string]any{"type": "Receipt", "status": "Delivered", "trackingNo": uuid.NewString(), "events": []any{}})
	require.Equal(t, http.StatusForbidden, response.Code, "creation with a completed status also requires the status action")
	permissions = []string{authz.MenuPurchase, authz.ActionTradingLogisticsStatusUpdate}
	response = request(http.MethodPost, "/logistics", map[string]any{"type": "Receipt", "status": "Delivered", "trackingNo": uuid.NewString(), "events": []any{}})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	permissions = []string{authz.MenuPurchase}
	patch := map[string]any{"op": "PATCH", "metadata": map[string]any{"id": created.ID, "version": created.Version}, "delta": map[string]any{"carrier": map[string]string{"o": "test", "n": "updated"}}}
	response = request(http.MethodPatch, "/logistics/"+created.ID, patch)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.Equal(t, http.StatusConflict, request(http.MethodPatch, "/logistics/"+created.ID, patch).Code)
	response = request(http.MethodPatch, "/logistics/"+created.ID+"/status", map[string]any{"status": "Exception", "events": []any{map[string]string{"status": "Exception", "description": "test"}}, "version": 2})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	permissions = []string{authz.MenuTrading}
	require.Equal(t, http.StatusForbidden, request(http.MethodDelete, "/logistics/"+created.ID, nil).Code)
	require.Equal(t, http.StatusForbidden, request(http.MethodPatch, "/logistics/"+created.ID+"/status", map[string]any{"status": "Delivered", "events": []any{}, "version": 3}).Code)
	permissions = []string{authz.MenuPurchase}
	response = request(http.MethodPatch, "/logistics/"+created.ID+"/status", map[string]any{"status": "Signed", "version": 3, "events": []any{}})
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	response = request(http.MethodDelete, "/logistics/"+created.ID, nil)
	require.Equal(t, http.StatusNoContent, response.Code, response.Body.String())
	response = request(http.MethodPatch, "/logistics/"+created.ID+"/status", map[string]any{"status": "Delivered", "version": 4, "events": []any{}})
	require.Equal(t, http.StatusNotFound, response.Code, response.Body.String())
}
