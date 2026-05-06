package services

import (
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestListShipmentDemandsReturnsEmptyStockBreakdownArrayWhenNoInventoryExists(t *testing.T) {
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
		INSERT INTO sales_orders (id, order_no, order_name, customer_name, customer_id, type, currency, classification, status, amount, quantity, order_date, delivery_date, created_at, updated_at, updated_by, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "so-demand-service-1", "SO-D-SVC-001", "Demand Order", "Customer", "cust-demand-svc-1", "standard", "CNY", "GENERAL", "Pending", 100.0, 10.0, "2026-05-06", "2026-05-12", now, now, "alice", false, 1).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO sales_order_lines (id, sales_order_id, line_no, product_id, product_model, product_code, description, qty, uom, price, amount, delivered_qty, order_date, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, 1, "so-demand-service-1", 1, materialID, "Demand Product", "MAT-D-001", "Demand Product Desc", 10.0, "PCS", 10.0, 100.0, 2.0, "2026-05-06", "Pending").Error)

	response, err := ListShipmentDemands()
	require.NoError(t, err)
	require.Len(t, response.Items, 1)
	require.NotNil(t, response.Items[0].StockBreakdown)
	require.Empty(t, response.Items[0].StockBreakdown)
}
