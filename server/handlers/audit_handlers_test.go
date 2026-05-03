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

func TestGetDataTimelineHandlerAllowsModuleLevelQueryForUserPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.AuditLog{})

	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-up-1",
		Module:    "user-permission",
		TargetID:  "user-1",
		Action:    "REPLACE",
		Operator:  "tester",
		CreatedAt: time.Date(2026, 5, 3, 8, 0, 0, 0, time.UTC),
	}).Error)
	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-up-2",
		Module:    "UserPermission",
		TargetID:  "user-2",
		Action:    "REPLACE",
		Operator:  "tester",
		CreatedAt: time.Date(2026, 5, 3, 9, 0, 0, 0, time.UTC),
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/audit/timeline?module=user-permission", nil)
	ctx.Set("permissions", []string{authz.MenuOrg})

	GetDataTimelineHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.AuditLog
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 2)
	require.Equal(t, "log-up-2", response[0].ID)
	require.Equal(t, "log-up-1", response[1].ID)
}

func TestGetDataTimelineHandlerReturnsLegacyInventoryLogsForCanonicalInventoryQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.AuditLog{})

	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-inv-1",
		Module:    "Inventory",
		TargetID:  "inbound-1",
		Action:    "INVENTORY_INBOUND",
		Operator:  "warehouse-user",
		CreatedAt: time.Date(2026, 5, 3, 10, 0, 0, 0, time.UTC),
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/audit/timeline?module=inventory&target_id=inbound-1", nil)
	ctx.Set("permissions", []string{authz.MenuWarehouse})

	GetDataTimelineHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.AuditLog
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 1)
	require.Equal(t, "log-inv-1", response[0].ID)
	require.Equal(t, "Inventory", response[0].Module)
	require.Equal(t, "INVENTORY_INBOUND", response[0].Action)
}

func TestGetDataTimelineHandlerAllowsModuleLevelQueryForInventory(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.AuditLog{})

	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-inv-module-1",
		Module:    "Inventory",
		TargetID:  "inbound-1",
		Action:    "INVENTORY_INBOUND",
		Operator:  "warehouse-user",
		CreatedAt: time.Date(2026, 5, 3, 10, 0, 0, 0, time.UTC),
	}).Error)
	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-inv-module-2",
		Module:    "Inventory",
		TargetID:  "inbound-2",
		Action:    "INVENTORY_SAVE",
		Operator:  "warehouse-user",
		CreatedAt: time.Date(2026, 5, 3, 11, 0, 0, 0, time.UTC),
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/audit/timeline?module=inventory", nil)
	ctx.Set("permissions", []string{authz.MenuWarehouse})

	GetDataTimelineHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.AuditLog
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 2)
	require.Equal(t, "log-inv-module-2", response[0].ID)
	require.Equal(t, "log-inv-module-1", response[1].ID)
}
