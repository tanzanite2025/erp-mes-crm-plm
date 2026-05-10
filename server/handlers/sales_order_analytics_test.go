package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupSalesOrderAnalyticsHandlerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB := setupHandlerSQLiteTestDB(t)
	for _, statement := range []string{
		`CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY NOT NULL,
			customer_id TEXT,
			customer_name TEXT,
			amount REAL,
			deleted_at DATETIME
		)`,
		`CREATE TABLE sales_order_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sales_order_id TEXT,
			product_id TEXT,
			qty REAL,
			amount REAL
		)`,
		`CREATE TABLE products (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			sku TEXT,
			name TEXT,
			model_code TEXT,
			tech_series TEXT,
			brake_type TEXT,
			version_level TEXT
		)`,
	} {
		require.NoError(t, testDB.Exec(statement).Error)
	}

	return testDB
}

func TestGetSalesOrderCustomerProductStatsHandlerReturnsProductDisplayProjection(t *testing.T) {
	gin.SetMode(gin.TestMode)
	testDB := setupSalesOrderAnalyticsHandlerTestDB(t)
	now := time.Now().UTC()

	require.NoError(t, testDB.Exec(
		`INSERT INTO sales_orders (id, customer_id, customer_name, amount, deleted_at) VALUES (?, ?, ?, ?, NULL)`,
		"order-1",
		"customer-1",
		"Acme",
		180.0,
	).Error)
	require.NoError(t, testDB.Exec(
		`INSERT INTO sales_order_lines (sales_order_id, product_id, qty, amount) VALUES (?, ?, ?, ?)`,
		"order-1",
		"product-1",
		12.0,
		180.0,
	).Error)
	require.NoError(t, testDB.Exec(
		`INSERT INTO products (id, created_at, updated_at, deleted_at, sku, name, model_code, tech_series, brake_type, version_level) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
		"product-1",
		now,
		now,
		"RF-01",
		"Road Fork",
		"01",
		"trail",
		"disc",
		"v2",
	).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/sales-orders/analytics/customer-product-stats?customerId=customer-1", nil)

	GetSalesOrderCustomerProductStatsHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	item := firstJSONItem(t, payload)
	products, ok := item["products"].([]any)
	require.True(t, ok)
	require.Len(t, products, 1)
	product, ok := products[0].(map[string]any)
	require.True(t, ok)
	display, ok := product["productDisplay"].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "Road Fork", display["title"])
	require.Equal(t, "trail/disc/v2", display["subtitle"])
	require.Equal(t, "RF-01", display["code"])
	require.Equal(t, "Road Fork (trail/disc/v2)", display["fullLabel"])
	require.Equal(t, "product-display-v1", display["strategyVersion"])
	_, hasProductModel := product["productModel"]
	require.False(t, hasProductModel)
	_, hasProductCode := product["productCode"]
	require.False(t, hasProductCode)
}

func TestGetSalesOrderGlobalProductRankingHandlerReturnsPlaceholderProjectionWhenProductMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	testDB := setupSalesOrderAnalyticsHandlerTestDB(t)

	require.NoError(t, testDB.Exec(
		`INSERT INTO sales_orders (id, customer_id, customer_name, amount, deleted_at) VALUES (?, ?, ?, ?, NULL)`,
		"order-1",
		"customer-1",
		"Acme",
		60.0,
	).Error)
	require.NoError(t, testDB.Exec(
		`INSERT INTO sales_order_lines (sales_order_id, product_id, qty, amount) VALUES (?, ?, ?, ?)`,
		"order-1",
		"missing-product",
		6.0,
		60.0,
	).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/sales-orders/analytics/global-product-ranking?limit=5", nil)

	GetSalesOrderGlobalProductRankingHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	payload := decodeJSONBody(t, recorder)
	item := firstJSONItem(t, payload)
	display, ok := item["productDisplay"].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "UNNAMED", display["title"])
	require.Equal(t, "", display["subtitle"])
	require.Equal(t, "", display["code"])
	require.Equal(t, "UNNAMED", display["fullLabel"])
	require.Equal(t, "product-display-v1", display["strategyVersion"])
	_, hasProductModel := item["productModel"]
	require.False(t, hasProductModel)
	_, hasProductCode := item["productCode"]
	require.False(t, hasProductCode)
}
