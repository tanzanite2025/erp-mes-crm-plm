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

	require.NoError(t, testDB.Exec(`
		CREATE TABLE sales_orders (
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
		)
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE sales_order_lines (
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
		)
	`).Error)

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
	require.Equal(t, "InProgress", status)

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
	require.Equal(t, "InProgress", updated.Status)
	require.Len(t, updated.Lines, 1)
	require.Equal(t, "Pending", updated.Lines[0].Status)

	var persisted models.SalesOrder
	require.NoError(t, testDB.Where("id = ?", "so-flow-1").First(&persisted).Error)
	require.Equal(t, "InProgress", persisted.Status)
}
