package salesorderidentity

import (
	"fmt"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupSalesOrderIdentityTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			customer_name TEXT,
			barcode TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE
		)
	`).Error)
	return testDB
}

func TestApplyBlankSalesOrderNoBackfillUpdatesBlankRowsFromBarcode(t *testing.T) {
	testDB := setupSalesOrderIdentityTestDB(t)
	now := time.Now()
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_orders (id, order_no, customer_name, barcode, created_at, updated_at, is_deleted)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, "so-blank-1", "", "客户A", "ZP6AGS26040001", now, now, false).Error)

	plans, err := ApplyBlankSalesOrderNoBackfill(testDB)
	require.NoError(t, err)
	require.Len(t, plans, 1)
	require.Equal(t, "ZP6AGS26040001", plans[0].DerivedOrderNo)

	var persisted struct {
		OrderNo string
	}
	require.NoError(t, testDB.Raw(`SELECT order_no FROM sales_orders WHERE id = ?`, "so-blank-1").Scan(&persisted).Error)
	require.Equal(t, "ZP6AGS26040001", persisted.OrderNo)
}

func TestPlanBlankSalesOrderNoBackfillFailsOnCollision(t *testing.T) {
	testDB := setupSalesOrderIdentityTestDB(t)
	now := time.Now()
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_orders (id, order_no, customer_name, barcode, created_at, updated_at, is_deleted)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, "so-existing", "ZP6AGS26040001", "客户A", "ZP6AGS26030001", now, now, false).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_orders (id, order_no, customer_name, barcode, created_at, updated_at, is_deleted)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, "so-blank", "", "客户B", "ZP6AGS26040001", now, now, false).Error)

	_, err := PlanBlankSalesOrderNoBackfill(testDB)
	require.Error(t, err)
	require.Contains(t, err.Error(), "collision")
}
