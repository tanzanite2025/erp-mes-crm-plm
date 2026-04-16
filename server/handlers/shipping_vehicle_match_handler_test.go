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

func setupShippingVehicleMatchHandlerTestDB(t *testing.T) {
	t.Helper()
	setupInventoryCommandHandlerTestDB(t)

	extraStatements := []string{
		`CREATE TABLE warehouse_categories (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT NOT NULL,
			code TEXT NOT NULL,
			description TEXT,
			is_system BOOLEAN DEFAULT FALSE,
			active BOOLEAN DEFAULT TRUE,
			sort_order INTEGER DEFAULT 0,
			allow_inbound BOOLEAN DEFAULT TRUE,
			allow_shipment BOOLEAN DEFAULT TRUE,
			allow_stocktake BOOLEAN DEFAULT TRUE,
			allow_purchase_receipt BOOLEAN DEFAULT FALSE,
			default_for_product_inbound BOOLEAN DEFAULT FALSE,
			default_for_material_inbound BOOLEAN DEFAULT FALSE,
			default_for_purchase_receipt BOOLEAN DEFAULT FALSE
		)`,
		`CREATE TABLE packaging_profiles (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT,
			name TEXT,
			packaging_type TEXT,
			length REAL DEFAULT 0,
			width REAL DEFAULT 0,
			height REAL DEFAULT 0,
			dimension_unit_code TEXT,
			net_weight REAL DEFAULT 0,
			gross_weight REAL DEFAULT 0,
			weight_unit_code TEXT,
			capacity REAL DEFAULT 0,
			capacity_unit_code TEXT,
			assembly_source TEXT,
			is_active BOOLEAN DEFAULT TRUE,
			notes TEXT
		)`,
		`CREATE TABLE packaging_profile_targets (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			packaging_profile_id TEXT NOT NULL,
			entity_type TEXT NOT NULL,
			entity_id TEXT NOT NULL,
			entity_code TEXT,
			entity_name TEXT,
			spec TEXT,
			is_default BOOLEAN DEFAULT FALSE,
			sort_order INTEGER DEFAULT 0
		)`,
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
	}

	for _, stmt := range extraStatements {
		require.NoError(t, db.DB.Exec(stmt).Error)
	}
}

func TestGetShippingVehicleMatchItemsHandlerReturnsRealPayload(t *testing.T) {
	setupShippingVehicleMatchHandlerTestDB(t)

	now := time.Now().UTC()
	materialID := uuid.NewString()
	shipmentID := uuid.NewString()
	profileID := uuid.NewString()
	orderID := "so-match-1"

	require.NoError(t, db.DB.Exec(`INSERT INTO materials (id, created_at, updated_at) VALUES (?, ?, ?)`, materialID, now, now).Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO sales_orders (id, order_no, order_name, customer_name, customer_id, type, currency, classification, status, amount, quantity, order_date, delivery_date, created_at, updated_at, updated_by, is_deleted, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, orderID, "SO-MATCH-001", "Order", "华东科技", "cust-1", "standard", "CNY", "GENERAL", "Pending", 100.0, 24.0, "2026-04-16", "2026-04-20", now, now, "tester", false, 1).Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO shipment_records (id, created_at, updated_at, material_id, material_name, material_code, sales_order_id, sales_order_line_id, quantity, source_category, batch_no, order_no, status, cogs, shipment_date, operator, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, shipmentID, now, now, materialID, "电镀管", "MAT-MATCH-001", orderID, 1, 24.0, "SHIPPING_VIRTUAL", "B-MATCH-001", "SO-MATCH-001", "COMMITTED", 12.0, now, "tester", "ok").Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO warehouse_categories (id, created_at, updated_at, name, code, is_system, active) VALUES (?, ?, ?, ?, ?, ?, ?)`, uuid.NewString(), now, now, "虚拟发货仓", "SHIPPING_VIRTUAL", true, true).Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO packaging_profiles (id, created_at, updated_at, code, name, packaging_type, length, width, height, dimension_unit_code, net_weight, gross_weight, weight_unit_code, capacity, capacity_unit_code, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, profileID, now, now, "PKG-MATCH-001", "标准箱", "BOX", 100, 50, 40, "cm", 0, 12, "kg", 6, "pcs", true).Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO packaging_profile_targets (id, created_at, updated_at, packaging_profile_id, entity_type, entity_id, entity_code, entity_name, is_default, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, uuid.NewString(), now, now, profileID, "material", materialID, "MAT-MATCH-001", "电镀管", true, 0).Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO logistics_records (id, created_at, updated_at, order_no, sales_order_id, shipment_id, type, carrier, tracking_no, status, last_location, version, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, uuid.NewString(), now, now, "SO-MATCH-001", orderID, shipmentID, "Shipment", "顺丰", "SF123", "Booked", "Shanghai", 1, false).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/shipping-management/vehicle-match-items", nil)

	GetShippingVehicleMatchItemsHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []services.ShippingVehicleMatchItemResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 1)
	require.Equal(t, shipmentID, response[0].ShipmentID)
	require.Equal(t, "SO-MATCH-001", response[0].OrderNo)
	require.Equal(t, "华东科技", response[0].CustomerName)
	require.Equal(t, "虚拟发货仓", response[0].WarehouseName)
	require.Equal(t, "电镀管", response[0].MaterialName)
	require.Equal(t, "MAT-MATCH-001", response[0].MaterialCode)
	require.Equal(t, 24.0, response[0].Quantity)
	require.NotNil(t, response[0].BoxCount)
	require.Equal(t, 4, *response[0].BoxCount)
	require.NotNil(t, response[0].VolumeM3)
	require.InDelta(t, 0.8, *response[0].VolumeM3, 0.000001)
	require.NotNil(t, response[0].WeightKg)
	require.InDelta(t, 48.0, *response[0].WeightKg, 0.000001)
	require.Equal(t, "已锁定", response[0].Status)
	require.Equal(t, "COMMITTED", response[0].ShipmentStatus)
	require.Equal(t, "Booked", response[0].LogisticsStatus)
	require.Equal(t, profileID, response[0].PackageProfileID)
	require.Equal(t, "标准箱", response[0].PackageProfileName)
}
