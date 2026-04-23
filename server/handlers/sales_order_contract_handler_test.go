package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupSalesOrderContractHandlerDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB := setupHandlerSQLiteTestDB(t)
	for _, statement := range []string{
		`CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			order_name TEXT,
			customer_name TEXT,
			customer_id TEXT,
			type TEXT,
			currency TEXT,
			payment_method TEXT,
			payment_method_name TEXT,
			payment_term TEXT,
			payment_term_name TEXT,
			classification TEXT,
			status TEXT,
			status_note TEXT,
			amount REAL,
			quantity REAL,
			order_date TEXT,
			delivery_date TEXT,
			purchase_order_no TEXT,
			barcode TEXT,
			requirements TEXT,
			evidences BLOB DEFAULT X'5B5D',
			workflow_instance_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			updated_by TEXT,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)`,
		`CREATE TABLE sales_order_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sales_order_id TEXT,
			line_no INTEGER,
			product_id TEXT,
			product_model TEXT,
			product_code TEXT,
			specification TEXT,
			description TEXT,
			qty REAL,
			uom TEXT,
			price REAL,
			amount REAL,
			delivered_qty REAL,
			customer_part_no TEXT,
			job_no TEXT,
			note TEXT,
			drilling_plan_id TEXT,
			labeling_plan_id TEXT,
			hole_count INTEGER,
			route TEXT,
			order_date TEXT,
			status TEXT,
			claimed_by TEXT,
			claimed_at TEXT
		)`,
		`CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY NOT NULL,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)`,
		`CREATE TABLE workflow_definitions (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT,
			name TEXT,
			version INTEGER,
			module TEXT,
			definition_json TEXT,
			description TEXT,
			is_active BOOLEAN
		)`,
	} {
		require.NoError(t, testDB.Exec(statement).Error)
	}
	return testDB
}

func seedSalesOrderContractHandlerFixture(t *testing.T, testDB *gorm.DB) models.SalesOrder {
	t.Helper()

	order := models.SalesOrder{
		ID:             "22222222-2222-4222-8222-222222222222",
		OrderNo:        "SO-HANDLER-001",
		OrderName:      "Handler Order",
		CustomerName:   "Acme",
		CustomerID:     "customer-1",
		Type:           "NORMAL",
		Currency:       "CNY",
		Classification: "GENERAL",
		Status:         "Pending",
		OrderDate:      "2026-04-18",
		DeliveryDate:   "2026-04-20",
		Barcode:        "SO-HANDLER-001",
		Evidences:      json.RawMessage(`[]`),
		Version:        1,
		Lines: []models.SalesOrderLine{
			{
				LineNo:         1,
				ProductModel:   "PM-001",
				ProductCode:    "PC-001",
				Specification:  "spec",
				Description:    "desc",
				Qty:            2,
				UOM:            "PCS",
				Price:          10,
				Amount:         20,
				DeliveredQty:   0,
				CustomerPartNo: "CP-001",
				JobNo:          "JOB-001",
				OrderDate:      "2026-04-18",
				Status:         "Pending",
			},
		},
	}

	require.NoError(t, testDB.Create(&order).Error)
	return order
}

func decodeJSONBody(t *testing.T, recorder *httptest.ResponseRecorder) map[string]any {
	t.Helper()

	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	return payload
}

func firstJSONItem(t *testing.T, payload map[string]any) map[string]any {
	t.Helper()

	items, ok := payload["items"].([]any)
	require.True(t, ok)
	require.NotEmpty(t, items)
	item, ok := items[0].(map[string]any)
	require.True(t, ok)
	return item
}

func TestGetSalesOrdersHandlerContractOmitsLinesWithoutWithLines(t *testing.T) {
	testDB := setupSalesOrderContractHandlerDB(t)
	seedSalesOrderContractHandlerFixture(t, testDB)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/sales-orders?page=1&pageSize=20", nil)

	GetSalesOrdersHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	item := firstJSONItem(t, payload)
	_, hasLines := item["lines"]
	require.False(t, hasLines)
}

func TestGetSalesOrdersHandlerContractIncludesLinesWhenRequested(t *testing.T) {
	testDB := setupSalesOrderContractHandlerDB(t)
	seedSalesOrderContractHandlerFixture(t, testDB)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/sales-orders?page=1&pageSize=20&withLines=true", nil)

	GetSalesOrdersHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	item := firstJSONItem(t, payload)
	lines, ok := item["lines"].([]any)
	require.True(t, ok)
	require.Len(t, lines, 1)
}

func TestGetSalesOrdersHandlerContractIncludesEmptyLinesArrayWhenRequested(t *testing.T) {
	testDB := setupSalesOrderContractHandlerDB(t)
	order := seedSalesOrderContractHandlerFixture(t, testDB)
	require.NoError(t, testDB.Where("sales_order_id = ?", order.ID).Delete(&models.SalesOrderLine{}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/sales-orders?page=1&pageSize=20&withLines=true", nil)

	GetSalesOrdersHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	item := firstJSONItem(t, payload)
	lines, ok := item["lines"].([]any)
	require.True(t, ok)
	require.Empty(t, lines)
}

func TestGetSalesOrderHandlerContractIncludesLines(t *testing.T) {
	testDB := setupSalesOrderContractHandlerDB(t)
	order := seedSalesOrderContractHandlerFixture(t, testDB)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: order.ID}}
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/sales-orders/"+order.ID, nil)

	GetSalesOrderHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	lines, ok := payload["lines"].([]any)
	require.True(t, ok)
	require.Len(t, lines, 1)
}

func TestGetSalesOrderByNoHandlerContractIncludesLines(t *testing.T) {
	testDB := setupSalesOrderContractHandlerDB(t)
	order := seedSalesOrderContractHandlerFixture(t, testDB)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "orderNo", Value: order.OrderNo}}
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/sales-orders/by-no/"+order.OrderNo, nil)

	GetSalesOrderByNoHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	lines, ok := payload["lines"].([]any)
	require.True(t, ok)
	require.Len(t, lines, 1)
}

func TestGetSalesOrdersHandlerContractSupportsKeywordFilter(t *testing.T) {
	testDB := setupSalesOrderContractHandlerDB(t)
	seedSalesOrderContractHandlerFixture(t, testDB)
	require.NoError(t, testDB.Create(&models.SalesOrder{
		ID:             "33333333-3333-4333-8333-333333333333",
		OrderNo:        "SO-FILTER-002",
		OrderName:      "Keyword Match Order",
		CustomerName:   "Beta Manufacturing",
		CustomerID:     "customer-2",
		Type:           "NORMAL",
		Currency:       "CNY",
		Classification: "GENERAL",
		Status:         "Pending",
		OrderDate:      "2026-04-19",
		DeliveryDate:   "2026-04-21",
		Barcode:        "SO-FILTER-002",
		Evidences:      json.RawMessage(`[]`),
		Version:        1,
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/sales-orders?page=1&pageSize=20&keyword=Beta", nil)

	GetSalesOrdersHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	items, ok := payload["items"].([]any)
	require.True(t, ok)
	require.Len(t, items, 1)
	item, ok := items[0].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "SO-FILTER-002", item["orderNo"])
}

func TestGetSalesOrdersHandlerContractSupportsCustomerIDFilter(t *testing.T) {
	testDB := setupSalesOrderContractHandlerDB(t)
	seedSalesOrderContractHandlerFixture(t, testDB)
	require.NoError(t, testDB.Create(&models.SalesOrder{
		ID:             "44444444-4444-4444-8444-444444444444",
		OrderNo:        "SO-FILTER-003",
		OrderName:      "Customer Filter Order",
		CustomerName:   "Gamma Electronics",
		CustomerID:     "customer-3",
		Type:           "NORMAL",
		Currency:       "CNY",
		Classification: "GENERAL",
		Status:         "Pending",
		OrderDate:      "2026-04-20",
		DeliveryDate:   "2026-04-23",
		Barcode:        "SO-FILTER-003",
		Evidences:      json.RawMessage(`[]`),
		Version:        1,
	}).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/sales-orders?page=1&pageSize=20&customerId=customer-3", nil)

	GetSalesOrdersHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	items, ok := payload["items"].([]any)
	require.True(t, ok)
	require.Len(t, items, 1)
	item, ok := items[0].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "customer-3", item["customerId"])
}

func TestSaveSalesOrderHandlerContractIncludesLinesArray(t *testing.T) {
	_ = setupSalesOrderContractHandlerDB(t)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/sales-orders",
		strings.NewReader(`{
			"orderNo":"SO-HANDLER-SAVE-001",
			"barcode":"SO-HANDLER-SAVE-001",
			"orderName":"Created Handler Order",
			"customerName":"Acme",
			"customerId":"customer-1",
			"type":"NORMAL",
			"currency":"CNY",
			"classification":"GENERAL",
			"status":"Pending",
			"orderDate":"2026-04-18",
			"deliveryDate":"2026-04-20",
			"lines":[]
		}`),
	)
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	SaveSalesOrderHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	lines, ok := payload["lines"].([]any)
	require.True(t, ok)
	require.Empty(t, lines)
}

func TestPatchSalesOrderHandlerContractIncludesLinesArray(t *testing.T) {
	testDB := setupSalesOrderContractHandlerDB(t)
	order := seedSalesOrderContractHandlerFixture(t, testDB)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: order.ID}}
	request := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/sales-orders/"+order.ID,
		strings.NewReader(`{
			"op":"PATCH",
			"delta":{"orderName":{"o":"Handler Order","n":"Handler Order Updated"}},
			"metadata":{"id":"`+order.ID+`","version":1}
		}`),
	)
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	PatchSalesOrderHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	lines, ok := payload["lines"].([]any)
	require.True(t, ok)
	require.Len(t, lines, 1)
}

func TestExecuteSalesOrderTransactionHandlerContractIncludesLinesArray(t *testing.T) {
	testDB := setupSalesOrderContractHandlerDB(t)
	order := seedSalesOrderContractHandlerFixture(t, testDB)
	require.NoError(t, testDB.Model(&models.SalesOrder{}).
		Where("id = ?", order.ID).
		Update("status", "InProgress").Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: order.ID}}
	request := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/sales-orders/"+order.ID+"/transactions",
		strings.NewReader(`{
			"intent":"ORDER_STATUS_TRANSITION",
			"expectedVersion":1,
			"payload":{"status":"Done","operator":"tester"}
		}`),
	)
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	ExecuteSalesOrderTransactionHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	lines, ok := payload["lines"].([]any)
	require.True(t, ok)
	require.Len(t, lines, 1)
}
