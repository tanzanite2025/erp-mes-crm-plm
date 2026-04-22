package services

import (
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupSalesReturnServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open("file:sales_return_service_test?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	for _, statement := range []string{
		`CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			order_name TEXT,
			customer_name TEXT,
			customer_id TEXT,
			type TEXT,
			currency TEXT,
			classification TEXT,
			status TEXT,
			amount REAL,
			quantity REAL,
			order_date TEXT,
			delivery_date TEXT,
			evidences BLOB DEFAULT X'5B5D',
			created_at DATETIME,
			updated_at DATETIME,
			updated_by TEXT,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)`,
		`CREATE TABLE sales_order_lines (
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
			order_date TEXT,
			status TEXT
		)`,
		`CREATE TABLE sales_returns (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			return_no TEXT,
			sales_order_id TEXT,
			sales_order_no TEXT,
			customer_id TEXT,
			customer_name TEXT,
			status TEXT,
			return_date DATETIME,
			issue_category TEXT,
			reason TEXT,
			remarks TEXT,
			evidences BLOB DEFAULT X'5B5D',
			operator TEXT,
			total_quantity REAL,
			total_amount REAL
		)`,
		`CREATE TABLE sales_return_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sales_return_id TEXT,
			sales_order_line_id INTEGER,
			line_no INTEGER,
			product_id TEXT,
			product_code TEXT,
			product_model TEXT,
			specification TEXT,
			description TEXT,
			uom TEXT,
			quantity REAL,
			price REAL,
			amount REAL,
			issue_category TEXT,
			reason TEXT,
			evidences BLOB DEFAULT X'5B5D'
		)`,
	} {
		require.NoError(t, testDB.Exec(statement).Error)
	}

	sqlDB, err := testDB.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	return testDB
}

func TestCreateSalesReturnCreatesRealReturnRecord(t *testing.T) {
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
	`, "so-return-1", "SO-RETURN-001", "Returnable Order", "Customer A", "cust-1", "NORMAL", "CNY", "GENERAL", "Pending", 200.0, 10.0, "2026-04-18", "2026-04-20", now, now, "tester", false, 1).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_order_lines (sales_order_id, line_no, product_id, product_model, product_code, specification, description, qty, uom, price, amount, delivered_qty, customer_part_no, job_no, order_date, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "so-return-1", 1, "prod-1", "PM-1", "PC-1", "Spec", "Desc", 10.0, "PCS", 12.5, 125.0, 0.0, "CP-1", "JOB-1", "2026-04-18", "Pending").Error)

	response, err := CreateSalesReturn(CreateSalesReturnInput{
		SalesOrderID:  "so-return-1",
		Operator:      "tester",
		IssueCategory: "Damage",
		Reason:        "surface issue",
		Remarks:       "batch-a",
		ReturnDate:    time.Date(2026, 4, 19, 0, 0, 0, 0, time.UTC),
		Lines: []CreateSalesReturnLineInput{
			{
				SalesOrderLineID: 1,
				Quantity:         4,
				Price:            12.5,
				IssueCategory:    "Damage",
				Reason:           "surface issue",
			},
		},
	})
	require.NoError(t, err)
	require.Equal(t, "SO-RETURN-001", response.SalesReturn.SalesOrderNo)
	require.Equal(t, "Customer A", response.SalesReturn.CustomerName)
	require.Equal(t, 4.0, response.SalesReturn.TotalQuantity)
	require.Equal(t, 50.0, response.SalesReturn.TotalAmount)
	require.NotEmpty(t, response.SalesReturn.ReturnNo)
	require.Len(t, response.SalesReturn.Lines, 1)
	require.Equal(t, uint(1), response.SalesReturn.Lines[0].SalesOrderLineID)

	var returnCount int64
	require.NoError(t, testDB.Raw(`SELECT COUNT(*) FROM sales_returns`).Scan(&returnCount).Error)
	require.Equal(t, int64(1), returnCount)
}
