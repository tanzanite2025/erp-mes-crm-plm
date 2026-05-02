package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func setupPurchaseReceiptConfirmHandlerTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)

	schemaStatements := []string{
		`CREATE TABLE materials (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE inventory (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			material_id TEXT NOT NULL,
			material_name TEXT,
			material_code TEXT,
			material_spec TEXT,
			quantity REAL DEFAULT 0,
			total_value REAL DEFAULT 0,
			average_unit_cost REAL DEFAULT 0,
			category_code TEXT NOT NULL,
			batch_no TEXT,
			uom TEXT
		)`,
		`CREATE TABLE inbound_records (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			material_id TEXT NOT NULL,
			material_name TEXT,
			material_code TEXT,
			purchase_order_id TEXT,
			purchase_order_line_id INTEGER,
			quantity REAL NOT NULL,
			purchase_price REAL DEFAULT 0,
			target_category TEXT NOT NULL,
			batch_no TEXT,
			inbound_date DATETIME,
			operator TEXT,
			remarks TEXT
		)`,
		`CREATE TABLE financial_vouchers (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			voucher_no TEXT NOT NULL UNIQUE,
			source_type TEXT NOT NULL,
			source_ref_id TEXT NOT NULL,
			currency TEXT NOT NULL,
			total_amount REAL NOT NULL,
			status TEXT NOT NULL
		)`,
		`CREATE TABLE clearing_entries (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			voucher_id TEXT NOT NULL,
			line_no INTEGER NOT NULL,
			entry_type TEXT NOT NULL,
			account_code TEXT NOT NULL,
			amount REAL NOT NULL,
			memo TEXT
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
		`CREATE TABLE purchase_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			status TEXT,
			currency TEXT,
			amount REAL,
			exchange_rate REAL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
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
			returned_qty REAL,
			status TEXT,
			version INTEGER DEFAULT 1
		)`,
	}

	for _, stmt := range schemaStatements {
		require.NoError(t, db.DB.Exec(stmt).Error)
	}
}

func TestConfirmPurchaseReceiptHandlerCreatesInboundAndUpdatesOrder(t *testing.T) {
	setupPurchaseReceiptConfirmHandlerTestDB(t)

	materialID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`INSERT INTO materials (id, created_at, updated_at) VALUES (?, ?, ?)`, materialID, now, now).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO purchase_orders (id, order_no, status, currency, amount, exchange_rate, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "po-handler-1", "PO-H-001", "Awaiting", "CNY", 50.0, 1.0, now, now, false, 1).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO purchase_order_lines (id, purchase_order_id, line_no, material_id, material_code, material_name, specification, qty, uom, price, amount, received_qty, returned_qty, status, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, 1, "po-handler-1", 1, materialID, "MAT-H-001", "Handler Material", "Spec", 5.0, "PCS", 10.0, 50.0, 0.0, 0.0, "Open", 1).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/purchase/orders/po-handler-1/confirm-receipt", strings.NewReader(`{"remarks":"confirmed by handler","lines":[{"purchaseOrderLineId":1,"orderLineVersion":1,"materialId":"`+materialID+`","quantity":5,"purchasePrice":10,"batchNo":"B-H-001","targetCategory":"MATERIAL"}]}`))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Params = gin.Params{{Key: "id", Value: "po-handler-1"}}
	ctx.Set("username", "handler-tester")

	ConfirmPurchaseReceiptHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response services.ConfirmPurchaseReceiptResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, "po-handler-1", response.PurchaseOrder.ID)
	require.Equal(t, "Received", response.PurchaseOrder.Status)
	require.Len(t, response.CreatedInboundRecords, 1)
	require.Equal(t, "MATERIAL", response.CreatedInboundRecords[0].TargetCategory)

	var status string
	require.NoError(t, db.DB.Raw(`SELECT status FROM purchase_orders WHERE id = ?`, "po-handler-1").Scan(&status).Error)
	require.Equal(t, "Received", status)

	var inboundCount int64
	require.NoError(t, db.DB.Raw(`SELECT COUNT(1) FROM inbound_records WHERE purchase_order_id = ?`, "po-handler-1").Scan(&inboundCount).Error)
	require.Equal(t, int64(1), inboundCount)
}

func TestConfirmPurchaseReceiptHandlerReturnsBadRequestWhenReceiptDateInvalid(t *testing.T) {
	setupPurchaseReceiptConfirmHandlerTestDB(t)

	materialID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`INSERT INTO materials (id, created_at, updated_at) VALUES (?, ?, ?)`, materialID, now, now).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO purchase_orders (id, order_no, status, currency, amount, exchange_rate, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "po-handler-invalid-date", "PO-H-002", "Awaiting", "CNY", 50.0, 1.0, now, now, false, 1).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO purchase_order_lines (id, purchase_order_id, line_no, material_id, material_code, material_name, specification, qty, uom, price, amount, received_qty, returned_qty, status, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, 1, "po-handler-invalid-date", 1, materialID, "MAT-H-002", "Handler Material", "Spec", 5.0, "PCS", 10.0, 50.0, 0.0, 0.0, "Open", 1).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/purchase/orders/po-handler-invalid-date/confirm-receipt", strings.NewReader(`{"receiptDate":"not-a-rfc3339","lines":[{"purchaseOrderLineId":1,"orderLineVersion":1,"materialId":"`+materialID+`","quantity":5,"purchasePrice":10,"batchNo":"B-H-002","targetCategory":"MATERIAL"}]}`))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Params = gin.Params{{Key: "id", Value: "po-handler-invalid-date"}}

	ConfirmPurchaseReceiptHandler(ctx)
	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())

	var response purchaseOrderErrorResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Contains(t, response.Error, "receiptDate 格式错误")
}
