package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func seedPurchaseOrderContractHandlerFixture(t *testing.T, testDB *gorm.DB) models.PurchaseOrder {
	t.Helper()

	require.NoError(t, testDB.Exec(`
		CREATE TABLE IF NOT EXISTS materials (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT,
			name TEXT,
			status TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		INSERT OR IGNORE INTO materials (id, code, name, status)
		VALUES (?, ?, ?, ?)
	`, "material-1", "MAT-001", "Copper", "Active").Error)

	order := models.PurchaseOrder{
		ID:           "44444444-4444-4444-8444-444444444444",
		OrderNo:      "PO-HANDLER-001",
		SupplierID:   "supplier-1",
		SupplierName: "Supplier A",
		OrderDate:    "2026-04-18",
		ExpectedDate: "2026-04-25",
		Status:       "Draft",
		Currency:     "CNY",
		Amount:       20,
		ExchangeRate: 1,
		Purchaser:    "buyer",
		Note:         "",
		Evidences:    json.RawMessage(`[]`),
		Version:      1,
		Lines: []models.PurchaseOrderLine{
			{
				Version:       1,
				LineNo:        1,
				MaterialID:    "material-1",
				MaterialCode:  "MAT-001",
				MaterialName:  "Copper",
				Specification: "spec",
				Qty:           2,
				UOM:           "PCS",
				Price:         10,
				Amount:        20,
				ReceivedQty:   0,
				ReturnedQty:   0,
				Status:        "Draft",
			},
		},
	}

	require.NoError(t, testDB.Create(&order).Error)
	return order
}

func TestGetPurchaseOrdersHandlerContractOmitsLinesWithoutWithLines(t *testing.T) {
	testDB := setupTradingWorkflowHandlerTestDB(t)
	seedPurchaseOrderContractHandlerFixture(t, testDB)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/purchase/orders?page=1&pageSize=20", nil)

	GetPurchaseOrdersHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	item := firstJSONItem(t, payload)
	_, hasLines := item["lines"]
	require.False(t, hasLines)
}

func TestGetPurchaseOrdersHandlerContractIncludesLinesWhenRequested(t *testing.T) {
	testDB := setupTradingWorkflowHandlerTestDB(t)
	seedPurchaseOrderContractHandlerFixture(t, testDB)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/purchase/orders?page=1&pageSize=20&withLines=true", nil)

	GetPurchaseOrdersHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	item := firstJSONItem(t, payload)
	lines, ok := item["lines"].([]any)
	require.True(t, ok)
	require.Len(t, lines, 1)
	line, ok := lines[0].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "2026-04-25", line["expectedDate"])
}

func TestGetPurchaseOrdersHandlerContractSupportsStatusFilter(t *testing.T) {
	testDB := setupTradingWorkflowHandlerTestDB(t)
	seedPurchaseOrderContractHandlerFixture(t, testDB)
	require.NoError(t, testDB.Create(&models.PurchaseOrder{
		ID:           "44444444-4444-4444-8444-444444444445",
		OrderNo:      "PO-HANDLER-002",
		SupplierID:   "supplier-2",
		SupplierName: "Supplier B",
		OrderDate:    "2026-04-19",
		ExpectedDate: "2026-04-26",
		Status:       "Approved",
		Currency:     "CNY",
		Amount:       30,
		ExchangeRate: 1,
		Purchaser:    "buyer",
		Evidences:    json.RawMessage(`[]`),
		Version:      1,
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/purchase/orders?page=1&pageSize=20&status=Approved", nil)

	GetPurchaseOrdersHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	items, ok := payload["items"].([]any)
	require.True(t, ok)
	require.Len(t, items, 1)
	item, ok := items[0].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "PO-HANDLER-002", item["orderNo"])
}

func TestGetPurchaseOrderHandlerContractIncludesLines(t *testing.T) {
	testDB := setupTradingWorkflowHandlerTestDB(t)
	order := seedPurchaseOrderContractHandlerFixture(t, testDB)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: order.ID}}
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/purchase/orders/"+order.ID, nil)

	GetPurchaseOrderHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	lines, ok := payload["lines"].([]any)
	require.True(t, ok)
	require.Len(t, lines, 1)
	line, ok := lines[0].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "2026-04-25", line["expectedDate"])
}

func TestSavePurchaseOrderHandlerContractIncludesLinesArray(t *testing.T) {
	testDB := setupTradingWorkflowHandlerTestDB(t)
	seedWorkflowDefinition(t, testDB, services.WorkflowModulePurchaseOrder, "PO_CONTRACT_HANDLER_FLOW")

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/purchase/orders",
		strings.NewReader(`{
			"orderNo":"PO-HANDLER-SAVE-001",
			"supplierId":"supplier-1",
			"supplierName":"Supplier A",
			"orderDate":"2026-04-18",
			"expectedDate":"2026-04-25",
			"status":"Draft",
			"currency":"CNY",
			"amount":100,
			"exchangeRate":1,
			"purchaser":"buyer",
			"lines":[]
		}`),
	)
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	SavePurchaseOrderHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	payload := decodeJSONBody(t, recorder)
	lines, ok := payload["lines"].([]any)
	require.True(t, ok)
	require.Empty(t, lines)
}

func TestPatchPurchaseOrderHandlerContractIncludesLinesArray(t *testing.T) {
	testDB := setupTradingWorkflowHandlerTestDB(t)
	order := seedPurchaseOrderContractHandlerFixture(t, testDB)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: order.ID}}
	request := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/purchase/orders/"+order.ID,
		strings.NewReader(`{
			"op":"PATCH",
			"delta":{"expectedDate":{"o":"2026-04-25","n":"2026-04-26"}},
			"metadata":{"id":"`+order.ID+`","version":1}
		}`),
	)
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	PatchPurchaseOrderHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	payload := decodeJSONBody(t, recorder)
	lines, ok := payload["lines"].([]any)
	require.True(t, ok)
	require.Len(t, lines, 1)
	line, ok := lines[0].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "2026-04-26", line["expectedDate"])
}

func TestExecutePurchaseOrderTransactionHandlerContractIncludesLinesArray(t *testing.T) {
	testDB := setupTradingWorkflowHandlerTestDB(t)
	order := seedPurchaseOrderContractHandlerFixture(t, testDB)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: order.ID}}
	request := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/purchase/orders/"+order.ID+"/transactions",
		strings.NewReader(`{
			"intent":"ORDER_DELIVERY_DATE_CHANGE",
			"expectedVersion":1,
			"payload":{"expectedDate":"2026-04-26","operator":"tester"}
		}`),
	)
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	ExecutePurchaseOrderTransactionHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	payload := decodeJSONBody(t, recorder)
	lines, ok := payload["lines"].([]any)
	require.True(t, ok)
	require.Len(t, lines, 1)
	line, ok := lines[0].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "2026-04-26", line["expectedDate"])
}
