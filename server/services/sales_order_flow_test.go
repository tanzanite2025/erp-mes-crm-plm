package services

import (
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupSalesOrderFlowTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	applyTradingTestSchema(t, testDB, tradingTestSchemaOptions{includeSales: true})

	return testDB
}

func TestRecalculateSalesOrderStatusRules(t *testing.T) {
	order := &models.SalesOrder{
		Status: "Pending",
		Lines: []models.SalesOrderLine{
			{Qty: 10, DeliveredQty: 0, ClaimedBy: "alice"},
			{Qty: 5, DeliveredQty: 0, ClaimedBy: "bob"},
		},
	}

	status, err := recalculateSalesOrderStatus(order)
	require.NoError(t, err)
	require.Equal(t, "Scheduling", status)

	order.Status = "Canceled"
	order.Lines[0].DeliveredQty = 10
	order.Lines[1].DeliveredQty = 5
	status, err = recalculateSalesOrderStatus(order)
	require.NoError(t, err)
	require.Equal(t, "Canceled", status)
}

func TestRecalculateSalesOrderStatusTxUpdatesPersistedOrder(t *testing.T) {
	originalDB := db.DB
	testDB := setupSalesOrderFlowTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	now := time.Now()
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_orders (id, order_no, status, currency, amount, quantity, order_date, created_at, updated_at, updated_by, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "so-flow-1", "SO-FLOW-001", "Pending", "CNY", 100.0, 10.0, "2026-04-07", now, now, "tester", false, 1).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_order_lines (sales_order_id, line_no, product_id, qty, uom, price, amount, delivered_qty, order_date, status, claimed_by)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "so-flow-1", 1, "prod-1", 10.0, "PCS", 10.0, 100.0, 0.0, "2026-04-07", "Pending", "alice").Error)

	var updated models.SalesOrder
	require.NoError(t, testDB.Transaction(func(tx *gorm.DB) error {
		result, err := RecalculateSalesOrderStatusTx(tx, "so-flow-1")
		if err != nil {
			return err
		}
		updated = result
		return nil
	}))
	require.Equal(t, "Scheduling", updated.Status)
	require.Len(t, updated.Lines, 1)
	require.Equal(t, "Scheduling", updated.Lines[0].Status)

	var persisted models.SalesOrder
	require.NoError(t, testDB.Where("id = ?", "so-flow-1").First(&persisted).Error)
	require.Equal(t, "Scheduling", persisted.Status)
}
