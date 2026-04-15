package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
)

func TestGetPurchaseOrderHandlerReturnsNamedErrorResponseWhenMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)
	requireNoError := func(err error, t *testing.T) {
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	}
	requireNoError(db.DB.Exec(`CREATE TABLE purchase_orders (
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
	)`).Error, t)
	requireNoError(db.DB.Exec(`CREATE TABLE purchase_order_lines (
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
	)`).Error, t)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: "po-missing"}}
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/purchase-orders/po-missing", nil)

	GetPurchaseOrderHandler(ctx)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var response purchaseOrderErrorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if response.Error != "采购订单不存在" {
		t.Fatalf("unexpected error message: %s", response.Error)
	}
}
