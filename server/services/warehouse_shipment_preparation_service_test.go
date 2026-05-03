package services

import (
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestPrepareVirtualShipmentUsesContextOperatorFallback(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryCommandTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	now := time.Now()
	materialID := uuid.NewString()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, material_name, material_code, material_spec, quantity, total_value, average_unit_cost, category_code, batch_no, uom)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), now, now, materialID, "Virtual Material", "MAT-V-001", "Spec-V", 10.0, 50.0, 5.0, "WH_A", "B-V-001", "PCS").Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO sales_orders (id, order_no, order_name, customer_name, customer_id, type, currency, classification, status, amount, quantity, order_date, delivery_date, created_at, updated_at, updated_by, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "so-virtual-service-1", "SO-V-SVC-001", "Virtual Order", "Customer", "cust-virtual-svc-1", "standard", "CNY", "GENERAL", "Pending", 100.0, 10.0, "2026-04-05", "2026-04-12", now, now, "alice", false, 1).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO sales_order_lines (id, sales_order_id, line_no, product_id, product_model, product_code, description, qty, uom, price, amount, delivered_qty, order_date, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, 1, "so-virtual-service-1", 1, materialID, "Virtual Product", "MAT-V-001", "Virtual Product Desc", 10.0, "PCS", 10.0, 100.0, 2.0, "2026-04-05", "Pending").Error)

	ctx := inventoryAuditTestContext("service-virtual-preparer", "service-virtual-preparer-id", "10.10.10.20")
	response, err := PrepareVirtualShipment(ctx, PrepareVirtualShipmentRequest{
		SalesOrderID:     "so-virtual-service-1",
		SalesOrderLineID: 1,
		Quantity:         3,
		SourceCategory:   "WH_A",
		BatchNo:          "B-V-001",
		Remarks:          "prep",
	})
	require.NoError(t, err)
	require.Equal(t, ShippingVirtualCategoryCode, response.SourceCategory)
	require.Equal(t, "service-virtual-preparer", response.Operator)
	require.InDelta(t, 3.0, response.Quantity, 0.000001)

	var shipment models.ShipmentRecord
	require.NoError(t, db.DB.Where("sales_order_id = ? AND sales_order_line_id = ?", "so-virtual-service-1", 1).First(&shipment).Error)
	require.Equal(t, ShippingVirtualCategoryCode, shipment.SourceCategory)
	require.Equal(t, "service-virtual-preparer", shipment.Operator)
	require.InDelta(t, 3.0, shipment.Quantity, 0.000001)

	var fromInventory models.Inventory
	require.NoError(t, db.DB.Where("material_id = ? AND category_code = ? AND batch_no = ?", materialID, "WH_A", "B-V-001").First(&fromInventory).Error)
	require.InDelta(t, 7.0, fromInventory.Quantity, 0.000001)

	var virtualInventory models.Inventory
	require.NoError(t, db.DB.Where("material_id = ? AND category_code = ? AND batch_no = ?", materialID, ShippingVirtualCategoryCode, "B-V-001").First(&virtualInventory).Error)
	require.InDelta(t, 3.0, virtualInventory.Quantity, 0.000001)
}
