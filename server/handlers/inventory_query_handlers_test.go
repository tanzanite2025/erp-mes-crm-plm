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
		INSERT INTO materials (id, created_at, updated_at, category)
		VALUES (?, ?, ?, ?)
	`, materialID, now, now, "RAW").Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, material_name, material_code, material_spec, quantity, total_value, average_unit_cost, category_code, batch_no, uom)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), now, now, materialID, "Copper Wire", "MAT-I-001", "Spec-A", 12.5, 100.0, 8.0, "WH_A", "B-INV-001", "KG").Error)

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
	require.Equal(t, 1, response.Items[0].Version)
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
