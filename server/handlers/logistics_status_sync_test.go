package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func setupLogisticsStatusSyncTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)

	schemaStatements := []string{
		`CREATE TABLE logistics_records (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			order_no TEXT,
			sales_order_id TEXT,
			purchase_order_id TEXT,
			product_id TEXT,
			shipment_id TEXT,
			type TEXT,
			carrier TEXT,
			tracking_no TEXT,
			status TEXT,
			last_location TEXT,
			events BLOB,
			version INTEGER DEFAULT 1,
			is_deleted BOOLEAN DEFAULT FALSE
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
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)`,
		`CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			module TEXT,
			action TEXT,
			target_id TEXT,
			content TEXT,
			operator TEXT,
			ip TEXT
		)`,
	}

	for _, stmt := range schemaStatements {
		require.NoError(t, db.DB.Exec(stmt).Error)
	}
}

func TestUpdateLogisticsStatusHandlerMovesPurchaseOrderToAwaitingWhenReceiptInTransit(t *testing.T) {
	setupLogisticsStatusSyncTestDB(t)

	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO purchase_orders (id, order_no, status, currency, amount, exchange_rate, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "po-log-1", "PO-LOG-001", "Sent", "CNY", 88.0, 1.0, now, now, false, 1).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO logistics_records (id, created_at, updated_at, order_no, purchase_order_id, type, carrier, tracking_no, status, version, is_deleted)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "log-1", now, now, "PO-LOG-001", "po-log-1", "Receipt", "SF", "SF-001", "Pending", 1, false).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/logistics/log-1/status", strings.NewReader(`{"status":"InTransit","location":"Shenzhen","description":"departed","events":[],"version":1}`))
	request.Header.Set("Content-Type", "application/json")
	request.RemoteAddr = "127.0.0.1:12345"
	ctx.Request = request
	ctx.Params = gin.Params{{Key: "id", Value: "log-1"}}
	ctx.Set("username", "tester")

	UpdateLogisticsStatusHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var orderStatus string
	require.NoError(t, db.DB.Raw(`SELECT status FROM purchase_orders WHERE id = ?`, "po-log-1").Scan(&orderStatus).Error)
	require.Equal(t, "Awaiting", orderStatus)

	var logisticsStatus string
	require.NoError(t, db.DB.Raw(`SELECT status FROM logistics_records WHERE id = ?`, "log-1").Scan(&logisticsStatus).Error)
	require.Equal(t, "InTransit", logisticsStatus)
}
