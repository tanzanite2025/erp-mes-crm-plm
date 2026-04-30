package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func setupCustomerSalesReturnSummaryHandlerDB(t *testing.T) {
	t.Helper()

	testDB := setupHandlerSQLiteTestDB(t)
	for _, statement := range []string{
		`CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY NOT NULL,
			customer_id TEXT,
			customer_name TEXT,
			status TEXT,
			order_date TEXT,
			is_deleted BOOLEAN DEFAULT FALSE
		)`,
		`CREATE TABLE sales_returns (
			id TEXT PRIMARY KEY NOT NULL,
			sales_order_id TEXT,
			customer_id TEXT,
			customer_name TEXT,
			status TEXT,
			return_date DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE sales_return_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sales_return_id TEXT,
			sales_order_line_id INTEGER,
			quantity REAL
		)`,
	} {
		require.NoError(t, testDB.Exec(statement).Error)
	}

	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_orders (id, customer_id, customer_name, status, order_date, is_deleted)
		VALUES
		('so-1', 'cust-1', 'Customer A', 'Done', '2026-04-10', FALSE),
		('so-2', 'cust-1', 'Customer A', 'Done', '2026-04-12', FALSE),
		('so-3', 'cust-2', 'Customer B', 'Done', '2026-04-13', FALSE),
		('so-4', 'cust-2', 'Customer B', 'Canceled', '2026-04-14', FALSE)
	`).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_returns (id, sales_order_id, customer_id, customer_name, status, return_date, deleted_at)
		VALUES
		('sr-1', 'so-1', 'cust-1', 'Customer A', 'Closed', '2026-04-19 00:00:00', NULL),
		('sr-2', 'so-2', 'cust-1', 'Customer A', 'Closed', '2026-04-20 00:00:00', NULL),
		('sr-3', 'so-4', 'cust-2', 'Customer B', 'Closed', '2026-04-21 00:00:00', NULL),
		('sr-4', 'so-3', 'cust-2', 'Customer B', 'Canceled', '2026-04-22 00:00:00', NULL)
	`).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_return_lines (sales_return_id, sales_order_line_id, quantity)
		VALUES
		('sr-1', 1, 2),
		('sr-2', 2, 3),
		('sr-3', 3, 9),
		('sr-4', 4, 7)
	`).Error)
}

func TestGetCustomerSalesReturnSummaryHandlerReturnsAggregatedQuantityAndOrders(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCustomerSalesReturnSummaryHandlerDB(t)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/customers/sales-return-summary", nil)

	GetCustomerSalesReturnSummaryHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	item := firstJSONItem(t, payload)
	require.Equal(t, "cust-1", item["customerId"])
	require.Equal(t, float64(5), item["returnedQuantity"])
	require.Equal(t, float64(2), item["returnedOrderCount"])
	require.Equal(t, float64(0), item["canceledOrderCount"])
	require.Equal(t, float64(2), item["effectiveOrderCount"])
	require.Equal(t, float64(2), item["totalOrders"])
}

func TestGetCustomerSalesReturnSummaryHandlerExcludesCanceledOrdersFromReturnDenominator(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCustomerSalesReturnSummaryHandlerDB(t)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/customers/sales-return-summary", nil)

	GetCustomerSalesReturnSummaryHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	items, ok := payload["items"].([]any)
	require.True(t, ok)

	var customerB map[string]any
	for _, rawItem := range items {
		item, ok := rawItem.(map[string]any)
		require.True(t, ok)
		if item["customerId"] == "cust-2" {
			customerB = item
			break
		}
	}
	require.NotNil(t, customerB)
	require.Equal(t, float64(0), customerB["returnedQuantity"])
	require.Equal(t, float64(0), customerB["returnedOrderCount"])
	require.Equal(t, float64(1), customerB["canceledOrderCount"])
	require.Equal(t, float64(1), customerB["effectiveOrderCount"])
	require.Equal(t, float64(2), customerB["totalOrders"])
}
