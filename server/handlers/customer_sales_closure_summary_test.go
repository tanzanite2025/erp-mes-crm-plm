package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type customerSalesClosureSummaryHandlerResponse struct {
	Items    []map[string]any `json:"items"`
	Total    int64            `json:"total"`
	Metadata struct {
		Pagination struct {
			Total    int64 `json:"total"`
			Page     int   `json:"page"`
			PageSize int   `json:"pageSize"`
		} `json:"pagination"`
		Stats struct {
			Total        int64 `json:"total"`
			Active       int64 `json:"active"`
			NewThisMonth int64 `json:"newThisMonth"`
		} `json:"stats"`
	} `json:"metadata"`
}

func setupCustomerSalesClosureSummaryHandlerDB(t *testing.T) {
	t.Helper()

	testDB := setupHandlerSQLiteTestDB(t)
	for _, statement := range []string{
		`CREATE TABLE customers (
			id TEXT PRIMARY KEY,
			name TEXT,
			status TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE
		)`,
		`CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY NOT NULL,
			customer_id TEXT,
			customer_name TEXT,
			status TEXT,
			order_date TEXT,
			deleted_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE
		)`,
	} {
		require.NoError(t, testDB.Exec(statement).Error)
	}
}

func TestGetCustomerSalesClosureSummaryHandlerReturnsFullContractAndAllowsEmptyLastOrderDate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCustomerSalesClosureSummaryHandlerDB(t)

	now := time.Now().UTC()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	lastMonth := startOfMonth.Add(-24 * time.Hour)
	yesterday := now.Add(-24 * time.Hour).Format("2006-01-02")

	require.NoError(t, db.DB.Exec(`
		INSERT INTO customers (id, name, status, created_at, updated_at, deleted_at, is_deleted)
		VALUES
		('cust-1', 'Customer A', 'Active', ?, ?, NULL, FALSE),
		('cust-2', 'Customer B', 'Inactive', ?, ?, NULL, FALSE),
		('cust-3', 'Customer C', 'Active', ?, ?, ?, TRUE)
	`, now, now, lastMonth, lastMonth, now, now, now).Error)

	require.NoError(t, db.DB.Exec(`
		INSERT INTO sales_orders (id, customer_id, customer_name, status, order_date, deleted_at, is_deleted)
		VALUES
		('so-1', 'cust-1', 'Customer A', 'Draft', '', NULL, FALSE),
		('so-2', 'cust-2', 'Customer B', 'Done', ?, NULL, FALSE),
		('so-5', 'cust-2', 'Customer B', 'Scheduling', ?, NULL, FALSE),
		('so-3', 'cust-3', 'Customer C', 'Done', '2026-04-01', ?, TRUE),
		('so-4', 'cust-2', 'Customer B', 'Canceled', ?, NULL, FALSE)
	`, yesterday, yesterday, now, yesterday).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/customers/sales-closure-summary", nil)

	GetCustomerSalesClosureSummaryHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response customerSalesClosureSummaryHandlerResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, int64(2), response.Total)
	require.Len(t, response.Items, 2)
	require.Equal(t, int64(2), response.Metadata.Pagination.Total)
	require.Equal(t, 1, response.Metadata.Pagination.Page)
	require.Equal(t, 2, response.Metadata.Pagination.PageSize)
	require.Equal(t, int64(2), response.Metadata.Stats.Total)
	require.Equal(t, int64(1), response.Metadata.Stats.Active)
	require.Equal(t, int64(1), response.Metadata.Stats.NewThisMonth)

	itemsByCustomerID := make(map[string]map[string]any, len(response.Items))
	for _, item := range response.Items {
		customerID, ok := item["customerId"].(string)
		require.True(t, ok)
		itemsByCustomerID[customerID] = item
	}

	emptyDateItem := itemsByCustomerID["cust-1"]
	require.Equal(t, "", emptyDateItem["lastOrderDate"])
	require.Equal(t, float64(0), emptyDateItem["canceledOrderCount"])
	require.Equal(t, float64(1), emptyDateItem["effectiveOrderCount"])
	require.Equal(t, float64(1), emptyDateItem["totalOrders"])
	require.Equal(t, "Draft", emptyDateItem["primaryStatusCode"])
	require.Equal(t, "draft", emptyDateItem["primaryStatusPhase"])
	statusCounts, ok := emptyDateItem["statusCounts"].([]any)
	require.True(t, ok)
	require.Len(t, statusCounts, 1)
	firstStatus, ok := statusCounts[0].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "Draft", firstStatus["code"])
	require.Equal(t, "draft", firstStatus["phase"])
	require.Equal(t, float64(1), firstStatus["count"])
	_, hasDaysSinceLastOrder := emptyDateItem["daysSinceLastOrder"]
	require.False(t, hasDaysSinceLastOrder)

	validDateItem := itemsByCustomerID["cust-2"]
	require.Equal(t, yesterday, validDateItem["lastOrderDate"])
	require.Equal(t, float64(1), validDateItem["canceledOrderCount"])
	require.Equal(t, float64(2), validDateItem["effectiveOrderCount"])
	require.Equal(t, float64(3), validDateItem["totalOrders"])
	require.Equal(t, "Scheduling", validDateItem["primaryStatusCode"])
	require.Equal(t, "scheduling", validDateItem["primaryStatusPhase"])
	statusCounts, ok = validDateItem["statusCounts"].([]any)
	require.True(t, ok)
	require.Len(t, statusCounts, 3)
	statusCountsByCode := make(map[string]map[string]any, len(statusCounts))
	for _, rawStatus := range statusCounts {
		statusRecord, ok := rawStatus.(map[string]any)
		require.True(t, ok)
		code, ok := statusRecord["code"].(string)
		require.True(t, ok)
		statusCountsByCode[code] = statusRecord
	}
	require.Equal(t, float64(1), statusCountsByCode["Scheduling"]["count"])
	require.Equal(t, "scheduling", statusCountsByCode["Scheduling"]["phase"])
	require.Equal(t, float64(1), statusCountsByCode["Done"]["count"])
	require.Equal(t, "done", statusCountsByCode["Done"]["phase"])
	require.Equal(t, float64(1), statusCountsByCode["Canceled"]["count"])
	require.Equal(t, "cancelled", statusCountsByCode["Canceled"]["phase"])
	_, hasValidDaysSinceLastOrder := validDateItem["daysSinceLastOrder"]
	require.True(t, hasValidDaysSinceLastOrder)
}
