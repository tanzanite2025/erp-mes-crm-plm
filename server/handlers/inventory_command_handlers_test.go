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

func setupInventoryCommandHandlerTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)

	schemaStatements := []string{
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
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
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
		`CREATE TABLE shipment_records (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			material_id TEXT NOT NULL,
			material_name TEXT,
			material_code TEXT,
			sales_order_id TEXT,
			sales_order_line_id INTEGER,
			quantity REAL NOT NULL,
			source_category TEXT NOT NULL,
			batch_no TEXT,
			order_no TEXT,
			status TEXT,
			cogs REAL DEFAULT 0,
			shipment_date DATETIME,
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
		`CREATE TABLE materials (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
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
			status TEXT
		)`,
		`CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			order_name TEXT,
			customer_name TEXT,
			customer_id TEXT,
			type TEXT,
			currency TEXT,
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
	}

	for _, stmt := range schemaStatements {
		require.NoError(t, db.DB.Exec(stmt).Error)
	}
}

func TestRecordInboundHandlerBindsPurchaseReceiptAssociationAndUpdatesStatus(t *testing.T) {
	setupInventoryCommandHandlerTestDB(t)

	materialID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`INSERT INTO materials (id, created_at, updated_at) VALUES (?, ?, ?)`, materialID, now, now).Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO purchase_orders (id, order_no, status, currency, amount, exchange_rate, created_at, updated_at, is_deleted, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, "po-handler-1", "PO-H-001", "Sent", "CNY", 30.0, 1.0, now, now, false, 1).Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO purchase_order_lines (id, purchase_order_id, line_no, material_id, qty, uom, price, amount, received_qty, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 1, "po-handler-1", 1, materialID, 10.0, "PCS", 3.0, 30.0, 2.0, "Open").Error)

	payload := `{"materialId":"` + materialID + `","purchaseOrderId":"po-handler-1","purchaseOrderLineId":1,"quantity":3,"purchasePrice":3,"targetCategory":"WH_A","batchNo":"B-001","inboundDate":"2026-04-05T00:00:00Z","operator":"tester","remarks":"ok"}`
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/inventory/inbound", strings.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	RecordInboundHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var receivedQty float64
	require.NoError(t, db.DB.Raw(`SELECT received_qty FROM purchase_order_lines WHERE id = ?`, 1).Scan(&receivedQty).Error)
	require.InDelta(t, 5.0, receivedQty, 0.000001)

	var status string
	require.NoError(t, db.DB.Raw(`SELECT status FROM purchase_orders WHERE id = ?`, "po-handler-1").Scan(&status).Error)
	require.Equal(t, "Awaiting", status)
}

func TestRecordShipmentAndCommitHandlersBindSalesFulfillmentAssociationAndUpdateStatus(t *testing.T) {
	setupInventoryCommandHandlerTestDB(t)

	materialID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`INSERT INTO materials (id, created_at, updated_at) VALUES (?, ?, ?)`, materialID, now, now).Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO inventory (id, created_at, updated_at, material_id, quantity, total_value, average_unit_cost, category_code, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, uuid.NewString(), now, now, materialID, 20.0, 100.0, 5.0, "WH_A", "B-001").Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO sales_orders (id, order_no, order_name, customer_name, customer_id, type, currency, classification, status, amount, quantity, order_date, delivery_date, created_at, updated_at, updated_by, is_deleted, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, "so-handler-1", "SO-H-001", "Order", "Customer", "cust-1", "standard", "CNY", "GENERAL", "Pending", 100.0, 10.0, "2026-04-05", "2026-04-12", now, now, "alice", false, 1).Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO sales_order_lines (id, sales_order_id, line_no, product_id, product_model, qty, uom, price, amount, delivered_qty, order_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 1, "so-handler-1", 1, materialID, "MODEL-1", 10.0, "PCS", 10.0, 100.0, 2.0, "2026-04-05", "Pending").Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	payload := `{"materialId":"` + materialID + `","salesOrderId":"so-handler-1","salesOrderLineId":1,"quantity":3,"sourceCategory":"WH_A","batchNo":"B-001","orderNo":"SO-H-001","status":"DRAFT","shipmentDate":"2026-04-05T00:00:00Z","operator":"tester","remarks":"ok"}`
	request := httptest.NewRequest(http.MethodPost, "/api/v1/inventory/shipment", strings.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	RecordShipmentHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var shipmentID string
	require.NoError(t, db.DB.Raw(`SELECT id FROM shipment_records WHERE sales_order_id = ? AND sales_order_line_id = ?`, "so-handler-1", 1).Scan(&shipmentID).Error)
	require.NotEmpty(t, shipmentID)

	commitRecorder := httptest.NewRecorder()
	commitCtx, _ := gin.CreateTestContext(commitRecorder)
	commitCtx.Params = gin.Params{{Key: "id", Value: shipmentID}}
	commitCtx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/inventory/shipment/"+shipmentID+"/commit", nil)

	CommitShipmentHandler(commitCtx)
	require.Equal(t, http.StatusOK, commitRecorder.Code, commitRecorder.Body.String())

	var deliveredQty float64
	require.NoError(t, db.DB.Raw(`SELECT delivered_qty FROM sales_order_lines WHERE id = ?`, 1).Scan(&deliveredQty).Error)
	require.InDelta(t, 5.0, deliveredQty, 0.000001)

	var status string
	require.NoError(t, db.DB.Raw(`SELECT status FROM sales_orders WHERE id = ?`, "so-handler-1").Scan(&status).Error)
	require.Equal(t, "InProgress", status)
}

func TestReconcileInventoryHandlerReturnsNamedStatusResponse(t *testing.T) {
	setupInventoryCommandHandlerTestDB(t)

	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, quantity, total_value, average_unit_cost, category_code, batch_no)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), now, now, uuid.NewString(), -3.0, -15.0, 5.0, "WH_A", "B-REC-001").Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/inventory/reconcile", nil)

	ReconcileInventoryHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response services.InventoryCommandStatusResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, "success", response.Status)

	var quantity float64
	require.NoError(t, db.DB.Raw(`SELECT quantity FROM inventory WHERE category_code = ? AND batch_no = ?`, "WH_A", "B-REC-001").Scan(&quantity).Error)
	require.Equal(t, 0.0, quantity)
}

func TestBulkSyncInventoryHandlerUsesNamedRequestAndResponseContract(t *testing.T) {
	setupInventoryCommandHandlerTestDB(t)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	payload := `[{"materialId":"mat-bulk-1","materialName":"Bulk Material","materialCode":"MAT-BULK-001","materialSpec":"Spec-B","quantity":8,"totalValue":40,"averageUnitCost":5,"categoryCode":"WH_A","batchNo":"B-BULK-001","uom":"PCS"}]`
	request := httptest.NewRequest(http.MethodPost, "/api/v1/inventory/sync", strings.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Set("username", "admin")
	ctx.Set("role", "admin")

	BulkSyncInventoryHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response services.BulkSyncInventoryResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, "success", response.Status)
	require.Equal(t, 1, response.Count)

	type inventoryRow struct {
		MaterialID   string
		CategoryCode string
		BatchNo      string
		Quantity     float64
	}
	var row inventoryRow
	require.NoError(t, db.DB.Raw(`SELECT material_id, category_code, batch_no, quantity FROM inventory WHERE material_id = ?`, "mat-bulk-1").Scan(&row).Error)
	require.Equal(t, "mat-bulk-1", row.MaterialID)
	require.Equal(t, "WH_A", row.CategoryCode)
	require.Equal(t, "B-BULK-001", row.BatchNo)
	require.Equal(t, 8.0, row.Quantity)
}

func TestTransferInventoryHandlerUsesNamedRequestContract(t *testing.T) {
	setupInventoryCommandHandlerTestDB(t)

	now := time.Now()
	materialID := uuid.NewString()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, quantity, total_value, average_unit_cost, category_code, batch_no)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), now, now, materialID, 10.0, 50.0, 5.0, "WH_A", "B-TR-001").Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	payload := `{"materialId":"` + materialID + `","quantity":4,"fromCategory":"WH_A","toCategory":"WH_B","batchNo":"B-TR-001"}`
	request := httptest.NewRequest(http.MethodPost, "/api/v1/inventory/transfer", strings.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	TransferInventoryHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response services.InventoryCommandStatusResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, "success", response.Status)

	type inventoryRow struct {
		CategoryCode string
		Quantity     float64
	}
	var fromRow inventoryRow
	require.NoError(t, db.DB.Raw(`SELECT category_code, quantity FROM inventory WHERE material_id = ? AND category_code = ? AND batch_no = ?`, materialID, "WH_A", "B-TR-001").Scan(&fromRow).Error)
	require.Equal(t, "WH_A", fromRow.CategoryCode)
	require.Equal(t, 6.0, fromRow.Quantity)

	var toRow inventoryRow
	require.NoError(t, db.DB.Raw(`SELECT category_code, quantity FROM inventory WHERE material_id = ? AND category_code = ? AND batch_no = ?`, materialID, "WH_B", "B-TR-001").Scan(&toRow).Error)
	require.Equal(t, "WH_B", toRow.CategoryCode)
	require.Equal(t, 4.0, toRow.Quantity)
}
