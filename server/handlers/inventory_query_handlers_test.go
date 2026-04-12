package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestGetInventoryHandlerReturnsNamedPagedResponse(t *testing.T) {
	setupInventoryCommandHandlerTestDB(t)

	now := time.Now()
	materialID := uuid.NewString()
	require.NoError(t, db.DB.Exec(`
		CREATE TABLE IF NOT EXISTS inventory_reservations (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			material_id TEXT NOT NULL,
			category_code TEXT NOT NULL,
			batch_no TEXT,
			quantity REAL NOT NULL,
			status TEXT NOT NULL,
			source_type TEXT NOT NULL,
			source_id TEXT NOT NULL,
			reserved_at DATETIME,
			released_at DATETIME,
			consumed_at DATETIME,
			expired_at DATETIME,
			remarks TEXT
		)
	`).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, created_at, updated_at, category)
		VALUES (?, ?, ?, ?)
	`, materialID, now, now, "RAW").Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, material_name, material_code, material_spec, quantity, total_value, average_unit_cost, category_code, batch_no, uom)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), now, now, materialID, "Copper Wire", "MAT-I-001", "Spec-A", 12.5, 100.0, 8.0, "WH_A", "B-INV-001", "KG").Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory_reservations (id, created_at, updated_at, material_id, category_code, batch_no, quantity, status, source_type, source_id, reserved_at, remarks)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), now, now, materialID, "WH_A", "B-INV-001", 2.5, "RESERVED", "SALES_ORDER", "so-line-1", now, "hold").Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/inventory?page=1&pageSize=10", nil)

	GetInventoryHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response services.InventoryListResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, int64(1), response.Total)
	require.Equal(t, 1, response.Page)
	require.Equal(t, 10, response.PageSize)
	require.Len(t, response.Items, 1)
	require.Equal(t, materialID, response.Items[0].MaterialID)
	require.Equal(t, "RAW", response.Items[0].MaterialCategory)
	require.Equal(t, "WH_A", response.Items[0].CategoryCode)
	require.Equal(t, "KG", response.Items[0].UOM)
	require.Equal(t, 12.5, response.Items[0].OnHand)
	require.Equal(t, 2.5, response.Items[0].Reserved)
	require.Equal(t, 10.0, response.Items[0].AvailableQty)
	expectedVersion := int(response.Items[0].LastUpdated.UnixMilli())
	if expectedVersion < 1 {
		expectedVersion = 1
	}
	require.Equal(t, expectedVersion, response.Items[0].Version)
	require.WithinDuration(t, now, response.Items[0].LastUpdated, time.Second)
}

func TestGetInboundHistoryHandlerReturnsNamedPagedResponse(t *testing.T) {
	setupInventoryCommandHandlerTestDB(t)

	now := time.Now()
	materialID := uuid.NewString()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO inbound_records (id, created_at, updated_at, material_id, material_name, material_code, purchase_order_id, purchase_order_line_id, quantity, purchase_price, target_category, batch_no, inbound_date, operator, remarks)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), now, now, materialID, "Inbound Material", "MAT-IN-001", "po-1", 1, 6.0, 3.5, "MATERIAL", "B-IN-001", now, "tester", "ok").Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/inventory/inbound-history?page=1&pageSize=10", nil)

	GetInboundHistoryHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response services.InventoryInboundHistoryResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, int64(1), response.Total)
	require.Len(t, response.Items, 1)
	require.Equal(t, materialID, response.Items[0].MaterialID)
	require.Equal(t, "MATERIAL", response.Items[0].TargetCategory)
	require.Equal(t, "po-1", response.Items[0].PurchaseOrderID)
}

func TestGetShipmentHistoryHandlerReturnsNamedPagedResponse(t *testing.T) {
	setupInventoryCommandHandlerTestDB(t)

	now := time.Now()
	materialID := uuid.NewString()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO shipment_records (id, created_at, updated_at, material_id, material_name, material_code, sales_order_id, sales_order_line_id, quantity, source_category, batch_no, order_no, status, cogs, shipment_date, operator, remarks)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), now, now, materialID, "Shipment Material", "MAT-SH-001", "so-1", 1, 4.0, "WH_A", "B-SH-001", "SO-001", "COMMITTED", 20.0, now, "tester", "ok").Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/inventory/shipment-history?page=1&pageSize=10", nil)

	GetShipmentHistoryHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response services.InventoryShipmentHistoryResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, int64(1), response.Total)
	require.Len(t, response.Items, 1)
	require.Equal(t, materialID, response.Items[0].MaterialID)
	require.Equal(t, "WH_A", response.Items[0].SourceCategory)
	require.Equal(t, "COMMITTED", response.Items[0].Status)
}

func TestGetInventoryValuationHandlerReturnsAggregatedValue(t *testing.T) {
	setupInventoryCommandHandlerTestDB(t)

	now := time.Now()
	materialID := uuid.NewString()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, created_at, updated_at, category, min_stock)
		VALUES (?, ?, ?, ?, ?)
	`, materialID, now, now, "RAW", 0).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, material_name, material_code, quantity, total_value, average_unit_cost, category_code, batch_no, uom)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
		       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		uuid.NewString(), now, now, materialID, "Copper Wire", "MAT-VAL-001", 10.0, 100.0, 10.0, "WH_A", "B-VAL-001", "KG",
		uuid.NewString(), now, now, materialID, "Copper Wire", "MAT-VAL-001", 5.0, 55.5, 11.1, "WH_B", "B-VAL-002", "KG",
	).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/inventory/valuation", nil)

	GetInventoryValuationHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response services.InventoryValuationResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, 155.5, response.TotalValue)
}

func TestGetInventoryAlertSummaryHandlerReturnsLowStockCount(t *testing.T) {
	setupInventoryCommandHandlerTestDB(t)

	now := time.Now()
	materialLow := uuid.NewString()
	materialHealthy := uuid.NewString()
	materialNoStock := uuid.NewString()

	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, created_at, updated_at, category, min_stock)
		VALUES (?, ?, ?, ?, ?),
		       (?, ?, ?, ?, ?),
		       (?, ?, ?, ?, ?)
	`,
		materialLow, now, now, "RAW", 10.0,
		materialHealthy, now, now, "RAW", 2.0,
		materialNoStock, now, now, "RAW", 4.0,
	).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, material_name, material_code, quantity, total_value, average_unit_cost, category_code, batch_no, uom)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
		       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		uuid.NewString(), now, now, materialLow, "Low Stock", "MAT-LOW-001", 7.0, 70.0, 10.0, "WH_A", "B-LOW-001", "KG",
		uuid.NewString(), now, now, materialHealthy, "Healthy Stock", "MAT-OK-001", 5.0, 50.0, 10.0, "WH_A", "B-OK-001", "KG",
	).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/inventory/alerts/summary", nil)

	GetInventoryAlertSummaryHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response services.InventoryAlertSummaryResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.EqualValues(t, 2, response.AlertCount)
}
