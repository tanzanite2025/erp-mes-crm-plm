package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetDataTimelineHandlerReturnsCanonicalAndAliasLogsForCanonicalQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.AuditLog{})

	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-1",
		Module:    "sales-order",
		TargetID:  "so-1",
		Action:    "Update",
		Operator:  "tester",
		CreatedAt: time.Date(2026, 4, 9, 10, 0, 0, 0, time.UTC),
	}).Error)
	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-2",
		Module:    "SalesOrder",
		TargetID:  "so-1",
		Action:    "Create",
		Operator:  "tester",
		CreatedAt: time.Date(2026, 4, 9, 11, 0, 0, 0, time.UTC),
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/audit/timeline?module=sales-order&target_id=so-1", nil)
	ctx.Set("permissions", []string{authz.MenuTrading})

	GetDataTimelineHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.AuditLog
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 2)
	require.Equal(t, "log-2", response[0].ID)
	require.Equal(t, "SalesOrder", response[0].Module)
	require.Equal(t, "log-1", response[1].ID)
	require.Equal(t, "sales-order", response[1].Module)
}

func TestGetDataTimelineHandlerReturnsStoredLegacyObjectDiffAsIs(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.AuditLog{})

	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-legacy",
		Module:    "customer",
		TargetID:  "cust-1",
		Action:    "CUSTOMER_SAVE",
		Diff:      json.RawMessage(`{"intent":"CUSTOMER_SAVE","payload":{"status":"Inactive","code":"CUST-001"}}`),
		Operator:  "tester",
		CreatedAt: time.Date(2026, 4, 9, 12, 0, 0, 0, time.UTC),
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/audit/timeline?module=customer&target_id=cust-1", nil)
	ctx.Set("permissions", []string{authz.MenuTrading})

	GetDataTimelineHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.AuditLog
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 1)
	require.JSONEq(t, `{"intent":"CUSTOMER_SAVE","payload":{"status":"Inactive","code":"CUST-001"}}`, string(response[0].Diff))
}
