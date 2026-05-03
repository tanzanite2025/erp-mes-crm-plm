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

func TestGetDataTimelineHandlerReturnsLegacyShipmentLogsForCanonicalShipmentQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.AuditLog{})

	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-shipment-1",
		Module:    "Shipment",
		TargetID:  "shipment-1",
		Action:    "SHIPMENT_SAVE",
		Operator:  "warehouse-user",
		CreatedAt: time.Date(2026, 5, 3, 10, 30, 0, 0, time.UTC),
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/audit/timeline?module=shipment&target_id=shipment-1", nil)
	ctx.Set("permissions", []string{authz.MenuWarehouse})

	GetDataTimelineHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.AuditLog
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 1)
	require.Equal(t, "log-shipment-1", response[0].ID)
	require.Equal(t, "Shipment", response[0].Module)
	require.Equal(t, "SHIPMENT_SAVE", response[0].Action)
}

func TestGetDataTimelineHandlerAllowsModuleLevelQueryForShipment(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.AuditLog{})

	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-shipment-module-1",
		Module:    "Shipment",
		TargetID:  "shipment-1",
		Action:    "SHIPMENT_SAVE",
		Operator:  "warehouse-user",
		CreatedAt: time.Date(2026, 5, 3, 10, 30, 0, 0, time.UTC),
	}).Error)
	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-shipment-module-2",
		Module:    "Shipment",
		TargetID:  "shipment-2",
		Action:    "SHIPMENT_COMMIT",
		Operator:  "warehouse-user",
		CreatedAt: time.Date(2026, 5, 3, 11, 30, 0, 0, time.UTC),
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/audit/timeline?module=shipment", nil)
	ctx.Set("permissions", []string{authz.MenuWarehouse})

	GetDataTimelineHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.AuditLog
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 2)
	require.Equal(t, "log-shipment-module-2", response[0].ID)
	require.Equal(t, "log-shipment-module-1", response[1].ID)
}

func TestGetDataTimelineHandlerReturnsLegacyPackagingAssemblyLogsForCanonicalPackagingAssemblyQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.AuditLog{})

	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-packaging-1",
		Module:    "packaging-assembly",
		TargetID:  "assembly-1",
		Action:    "SUBMIT",
		Operator:  "warehouse-user",
		CreatedAt: time.Date(2026, 5, 4, 0, 10, 0, 0, time.UTC),
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/audit/timeline?module=packaging-assembly&target_id=assembly-1", nil)
	ctx.Set("permissions", []string{authz.MenuWarehouse})

	GetDataTimelineHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.AuditLog
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 1)
	require.Equal(t, "log-packaging-1", response[0].ID)
	require.Equal(t, "packaging-assembly", response[0].Module)
	require.Equal(t, "SUBMIT", response[0].Action)
}

func TestGetDataTimelineHandlerAllowsModuleLevelQueryForPackagingAssembly(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.AuditLog{})

	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-packaging-module-1",
		Module:    "packaging-assembly",
		TargetID:  "assembly-1",
		Action:    "SUBMIT",
		Operator:  "warehouse-user",
		CreatedAt: time.Date(2026, 5, 4, 0, 10, 0, 0, time.UTC),
	}).Error)
	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-packaging-module-2",
		Module:    "packaging-assembly",
		TargetID:  "assembly-2",
		Action:    "CAPTURE_SESSION_CREATE",
		Operator:  "warehouse-user",
		CreatedAt: time.Date(2026, 5, 4, 0, 20, 0, 0, time.UTC),
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/audit/timeline?module=packaging-assembly", nil)
	ctx.Set("permissions", []string{authz.MenuWarehouse})

	GetDataTimelineHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.AuditLog
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 2)
	require.Equal(t, "log-packaging-module-2", response[0].ID)
	require.Equal(t, "log-packaging-module-1", response[1].ID)
}

func TestGetDataTimelineHandlerReturnsLegacyLogisticsLogsForCanonicalLogisticsQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.AuditLog{})

	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-logistics-1",
		Module:    "Logistics",
		TargetID:  "logistics-record-1",
		Action:    "STATUS_CHANGE",
		Operator:  "trading-user",
		CreatedAt: time.Date(2026, 5, 4, 0, 40, 0, 0, time.UTC),
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/audit/timeline?module=logistics&target_id=logistics-record-1", nil)
	ctx.Set("permissions", []string{authz.MenuTrading})

	GetDataTimelineHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.AuditLog
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 1)
	require.Equal(t, "log-logistics-1", response[0].ID)
	require.Equal(t, "Logistics", response[0].Module)
	require.Equal(t, "STATUS_CHANGE", response[0].Action)
}

func TestGetDataTimelineHandlerAllowsModuleLevelQueryForLogistics(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.AuditLog{})

	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-logistics-module-1",
		Module:    "logistics",
		TargetID:  "logistics-record-1",
		Action:    "CREATE",
		Operator:  "trading-user",
		CreatedAt: time.Date(2026, 5, 4, 0, 41, 0, 0, time.UTC),
	}).Error)
	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-logistics-module-2",
		Module:    "Logistics",
		TargetID:  "logistics-record-2",
		Action:    "STATUS_CHANGE",
		Operator:  "purchase-user",
		CreatedAt: time.Date(2026, 5, 4, 0, 42, 0, 0, time.UTC),
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/audit/timeline?module=logistics", nil)
	ctx.Set("permissions", []string{authz.MenuTrading})

	GetDataTimelineHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.AuditLog
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 2)
	require.Equal(t, "log-logistics-module-2", response[0].ID)
	require.Equal(t, "log-logistics-module-1", response[1].ID)
}

func TestGetDataTimelineHandlerAllowsModuleLevelQueryForSupplier(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.AuditLog{})

	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-supplier-module-1",
		Module:    "supplier",
		TargetID:  "supplier-1",
		Action:    "CREATE",
		Operator:  "purchase-user",
		CreatedAt: time.Date(2026, 5, 4, 1, 5, 0, 0, time.UTC),
	}).Error)
	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-supplier-module-2",
		Module:    "Supplier",
		TargetID:  "supplier-2",
		Action:    "STATUS_CHANGE",
		Operator:  "trading-user",
		CreatedAt: time.Date(2026, 5, 4, 1, 6, 0, 0, time.UTC),
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/audit/timeline?module=supplier", nil)
	ctx.Set("permissions", []string{authz.MenuPurchase})

	GetDataTimelineHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.AuditLog
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 2)
	require.Equal(t, "log-supplier-module-2", response[0].ID)
	require.Equal(t, "log-supplier-module-1", response[1].ID)
}

func TestGetDataTimelineHandlerAllowsModuleLevelQueryForPurchaseOrder(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.AuditLog{})

	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-po-module-1",
		Module:    "purchase-order",
		TargetID:  "po-1",
		Action:    "CREATE",
		Operator:  "purchase-user",
		CreatedAt: time.Date(2026, 5, 4, 1, 15, 0, 0, time.UTC),
	}).Error)
	require.NoError(t, db.DB.Create(&models.AuditLog{
		ID:        "log-po-module-2",
		Module:    "PurchaseOrder",
		TargetID:  "po-2",
		Action:    "STATUS_CHANGE",
		Operator:  "trading-user",
		CreatedAt: time.Date(2026, 5, 4, 1, 16, 0, 0, time.UTC),
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/audit/timeline?module=purchase-order", nil)
	ctx.Set("permissions", []string{authz.MenuPurchase})

	GetDataTimelineHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.AuditLog
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 2)
	require.Equal(t, "log-po-module-2", response[0].ID)
	require.Equal(t, "log-po-module-1", response[1].ID)
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
