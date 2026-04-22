package routes

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupTradingQueryContractRouter(t *testing.T) (*gin.Engine, *gorm.DB) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	originalDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

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
		`CREATE TABLE purchase_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			supplier_id TEXT,
			supplier_name TEXT,
			order_date TEXT,
			expected_date TEXT,
			status TEXT,
			currency TEXT,
			amount REAL,
			exchange_rate REAL,
			purchaser TEXT,
			payment_method TEXT,
			payment_method_name TEXT,
			payment_term TEXT,
			payment_term_name TEXT,
			note TEXT,
			evidences BLOB DEFAULT X'5B5D',
			workflow_instance_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)`,
		`CREATE TABLE purchase_order_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			purchase_order_id TEXT,
			line_no INTEGER,
			material_id TEXT,
			material_code TEXT,
			material_name TEXT,
			specification TEXT,
			qty REAL,
			uom TEXT,
			price REAL,
			amount REAL,
			received_qty REAL,
			returned_qty REAL DEFAULT 0,
			status TEXT,
			version INTEGER DEFAULT 1
		)`,
	} {
		require.NoError(t, testDB.Exec(statement).Error)
	}

	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	router := gin.New()
	api := router.Group("/api/v1")
	authorized := api.Group("")
	authorized.Use(func(c *gin.Context) {
		c.Set("permissions", []string{authz.MenuTrading})
		c.Next()
	})
	registerTradingRoutes(authorized)

	return router, testDB
}

func decodeRouteContractPayload(t *testing.T, recorder *httptest.ResponseRecorder) map[string]any {
	t.Helper()

	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	return payload
}

func firstRouteContractItem(t *testing.T, payload map[string]any) map[string]any {
	t.Helper()

	items, ok := payload["items"].([]any)
	require.True(t, ok)
	require.NotEmpty(t, items)
	item, ok := items[0].(map[string]any)
	require.True(t, ok)
	return item
}

func TestTradingRoutesSalesOrdersWithLinesQueryReturnsEmptyLinesArray(t *testing.T) {
	router, testDB := setupTradingQueryContractRouter(t)
	require.NoError(t, testDB.Create(&models.SalesOrder{
		ID:             "route-sales-1",
		OrderNo:        "SO-ROUTE-001",
		OrderName:      "Route Sales Order",
		CustomerName:   "Acme",
		CustomerID:     "customer-1",
		Type:           "NORMAL",
		Currency:       "CNY",
		Classification: "GENERAL",
		Status:         "Pending",
		OrderDate:      "2026-04-18",
		DeliveryDate:   "2026-04-20",
		Barcode:        "SO-ROUTE-001",
		Version:        1,
	}).Error)

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/v1/sales-orders?page=1&pageSize=20&withLines=true", nil))

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	item := firstRouteContractItem(t, decodeRouteContractPayload(t, recorder))
	lines, ok := item["lines"].([]any)
	require.True(t, ok, "expected route to preserve withLines=true and include lines")
	require.Empty(t, lines)
}

func TestTradingRoutesPurchaseOrdersWithLinesQueryReturnsEmptyLinesArray(t *testing.T) {
	router, testDB := setupTradingQueryContractRouter(t)
	require.NoError(t, testDB.Create(&models.PurchaseOrder{
		ID:           "route-purchase-1",
		OrderNo:      "PO-ROUTE-001",
		SupplierID:   "supplier-1",
		SupplierName: "Supplier A",
		OrderDate:    "2026-04-18",
		ExpectedDate: "2026-04-25",
		Status:       "Draft",
		Currency:     "CNY",
		Amount:       100,
		ExchangeRate: 1,
		Purchaser:    "buyer",
		Version:      1,
	}).Error)

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/v1/purchase/orders?page=1&pageSize=20&withLines=true", nil))

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	item := firstRouteContractItem(t, decodeRouteContractPayload(t, recorder))
	lines, ok := item["lines"].([]any)
	require.True(t, ok, "expected route to preserve withLines=true and include lines")
	require.Empty(t, lines)
}
