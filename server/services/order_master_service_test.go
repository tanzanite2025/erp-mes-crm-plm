package services

import (
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/stretchr/testify/require"
)

func TestDeleteSalesOrderRejectsWhenSalesReturnsExist(t *testing.T) {
	originalDB := db.DB
	testDB := setupSalesReturnServiceTestDB(t)
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
		INSERT INTO sales_orders (id, order_no, order_name, customer_name, customer_id, type, currency, classification, status, amount, quantity, order_date, delivery_date, evidences, created_at, updated_at, updated_by, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D', ?, ?, ?, ?, ?)
	`, "so-delete-locked", "SO-DELETE-001", "Locked Order", "Customer A", "cust-1", "NORMAL", "CNY", "GENERAL", "Canceled", 100.0, 4.0, "2026-04-18", "2026-04-20", now, now, "tester", false, 1).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_returns (id, created_at, updated_at, deleted_at, return_no, sales_order_id, sales_order_no, customer_id, customer_name, status, return_date, issue_category, reason, remarks, evidences, operator, total_quantity, total_amount)
		VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D', ?, ?, ?)
	`, "sr-delete-locked", now, now, "SR-DELETE-001", "so-delete-locked", "SO-DELETE-001", "cust-1", "Customer A", "Created", now, "Damage", "initial", "batch-a", "tester", 2.0, 50.0).Error)

	err := DeleteSalesOrder("so-delete-locked")
	require.ErrorIs(t, err, ErrSalesOrderDeleteHasReturns)

	var isDeleted bool
	require.NoError(t, testDB.Raw(`SELECT is_deleted FROM sales_orders WHERE id = ?`, "so-delete-locked").Scan(&isDeleted).Error)
	require.False(t, isDeleted)
}
