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

func setupPurchaseReceiptServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE purchase_orders (
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
			created_at DATETIME,
			updated_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE purchase_order_lines (
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
		)
	`).Error)

	return testDB
}

func TestRecalculatePurchaseOrderStatusRules(t *testing.T) {
	order := &models.PurchaseOrder{
		Status: "Draft",
		Lines: []models.PurchaseOrderLine{
			{Qty: 10, ReceivedQty: 0},
		},
	}
	status, err := recalculatePurchaseOrderStatus(order)
	require.NoError(t, err)
	require.Equal(t, "Draft", status)

	order.Status = "Sent"
	status, err = recalculatePurchaseOrderStatus(order)
	require.NoError(t, err)
	require.Equal(t, "Sent", status)

	order.Lines[0].ReceivedQty = 4
	status, err = recalculatePurchaseOrderStatus(order)
	require.NoError(t, err)
	require.Equal(t, "Awaiting", status)

	order.Lines[0].ReceivedQty = 0
	order.Lines[0].ReturnedQty = 3
	status, err = recalculatePurchaseOrderStatus(order)
	require.NoError(t, err)
	require.Equal(t, "Awaiting", status)

	order.Lines[0].ReceivedQty = 10
	order.Lines[0].ReturnedQty = 0
	status, err = recalculatePurchaseOrderStatus(order)
	require.NoError(t, err)
	require.Equal(t, "Received", status)

	order.Status = "Canceled"
	order.Lines[0].ReceivedQty = 4
	status, err = recalculatePurchaseOrderStatus(order)
	require.NoError(t, err)
	require.Equal(t, "Canceled", status)
}

func TestRecalculatePurchaseOrderStatusTxUpdatesPersistedOrder(t *testing.T) {
	originalDB := db.DB
	testDB := setupPurchaseReceiptServiceTestDB(t)
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
		INSERT INTO purchase_orders (id, order_no, status, currency, amount, exchange_rate, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "po-rx-1", "PO-RX-001", "Sent", "CNY", 88.0, 1.0, now, now, false, 1).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO purchase_order_lines (purchase_order_id, line_no, material_id, qty, uom, price, amount, received_qty, returned_qty, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "po-rx-1", 1, "mat-1", 10.0, "PCS", 8.8, 88.0, 3.0, 0.0, "Open").Error)

	var updated models.PurchaseOrder
	require.NoError(t, testDB.Transaction(func(tx *gorm.DB) error {
		result, err := recalculatePurchaseOrderStatusTx(tx, "po-rx-1")
		if err != nil {
			return err
		}
		updated = result
		return nil
	}))
	require.Equal(t, "Awaiting", updated.Status)

	var persisted models.PurchaseOrder
	require.NoError(t, testDB.Where("id = ?", "po-rx-1").First(&persisted).Error)
	require.Equal(t, "Awaiting", persisted.Status)
}
