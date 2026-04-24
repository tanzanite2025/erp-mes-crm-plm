package services

import (
	"fmt"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupReceivableDetailServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	for _, statement := range []string{
		`CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			customer_name TEXT,
			customer_id TEXT,
			currency TEXT,
			status TEXT,
			amount REAL,
			order_date TEXT,
			delivery_date TEXT,
			barcode TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			updated_by TEXT,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)`,
		`CREATE TABLE sales_return_actual_amount_records (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			sales_return_id TEXT,
			sales_order_id TEXT,
			sales_order_no TEXT,
			return_no TEXT,
			customer_id TEXT,
			customer_name TEXT,
			amount REAL,
			note TEXT,
			evidences BLOB DEFAULT X'5B5D',
			estimated_return_amount_snapshot REAL,
			recorded_at DATETIME,
			recorded_by TEXT
		)`,
		`CREATE TABLE settlement_allocations (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			ledger_id TEXT,
			sales_order_id TEXT,
			receipt_record_id TEXT,
			payment_record_id TEXT,
			allocated_amount REAL,
			sequence_no INTEGER,
			remark TEXT,
			operator TEXT
		)`,
		`CREATE TABLE receipt_records (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			record_no TEXT,
			ledger_id TEXT,
			sales_order_id TEXT,
			amount REAL,
			currency TEXT,
			payment_method TEXT,
			payment_term TEXT,
			record_date TEXT,
			received_at TEXT,
			receipt_account TEXT,
			status TEXT,
			reference_no TEXT
		)`,
		`CREATE TABLE settlement_record_evidences (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			record_type TEXT,
			record_id TEXT,
			asset_id TEXT,
			note TEXT,
			sequence_no INTEGER
		)`,
		`CREATE TABLE settlement_evidence_assets (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			storage_path TEXT,
			file_name TEXT,
			content_type TEXT,
			size_bytes INTEGER,
			url TEXT,
			uploaded_by TEXT
		)`,
	} {
		require.NoError(t, testDB.Exec(statement).Error)
	}

	return testDB
}

func TestGetReceivableOrderByIDTxIncludesSalesReturnAdjustments(t *testing.T) {
	testDB := setupReceivableDetailServiceTestDB(t)
	sqlDB, err := testDB.DB()
	require.NoError(t, err)
	t.Cleanup(func() {
		_ = sqlDB.Close()
	})

	now := time.Now()
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_orders (id, order_no, customer_name, customer_id, currency, status, amount, order_date, delivery_date, barcode, created_at, updated_at, updated_by, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "so-receivable-1", "SO-RECEIVABLE-001", "Customer A", "cust-1", "USD", "Done", 100.0, "2026-04-18", "2026-04-30", "BC-001", now, now, "tester", false, 3).Error)

	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_return_actual_amount_records (id, created_at, updated_at, deleted_at, sales_return_id, sales_order_id, sales_order_no, return_no, customer_id, customer_name, amount, note, evidences, estimated_return_amount_snapshot, recorded_at, recorded_by)
		VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D', ?, ?, ?)
	`, "sraar-1", now, now, "sr-1", "so-receivable-1", "SO-RECEIVABLE-001", "SR-001", "cust-1", "Customer A", 15.0, "customer confirmed return deduction", 20.0, now, "finance-user").Error)

	require.NoError(t, testDB.Exec(`
		INSERT INTO settlement_allocations (id, created_at, updated_at, deleted_at, ledger_id, sales_order_id, receipt_record_id, payment_record_id, allocated_amount, sequence_no, remark, operator)
		VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "allocation-1", now, now, "so-receivable-1", "so-receivable-1", "", "", 40.0, 1, "receipt", "tester").Error)

	detail, err := getReceivableOrderByIDTx(testDB, "so-receivable-1")
	require.NoError(t, err)
	require.Equal(t, "so-receivable-1", detail.ID)
	require.Equal(t, "so-receivable-1", detail.SourceRefID)
	require.Equal(t, 40.0, detail.ReceivedAmount)
	require.Equal(t, 15.0, detail.ReturnAdjustmentAmount)
	require.Equal(t, 45.0, detail.OutstandingAmount)
	require.Len(t, detail.SalesReturnActualAmountRecords, 1)
	require.Equal(t, "SR-001", detail.SalesReturnActualAmountRecords[0].ReturnNo)
	require.Equal(t, 40.0, detail.Allocations[0].AllocatedAmount)
}
