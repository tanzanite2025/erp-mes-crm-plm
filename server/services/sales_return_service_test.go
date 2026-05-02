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
			exchange_rate_snapshot REAL,
			classification TEXT,
			status TEXT,
			amount REAL,
			quantity REAL,
			order_date TEXT,
			delivery_date TEXT,
			evidences BLOB DEFAULT X'5B5D',
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
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
			model_code_snapshot TEXT,
			hole_prefix_snapshot TEXT,
			appearance_id TEXT,
			appearance_name_snapshot TEXT,
			appearance_barcode_code_snapshot TEXT,
			appearance_description_snapshot TEXT,
			appearance_image_url_snapshot TEXT,
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
			tracking_no TEXT,
			carrier TEXT,
			shipped_at DATETIME,
			tracking_filled_at DATETIME,
			tracking_filled_by TEXT,
			logistics_note TEXT,
			return_date DATETIME,
			issue_category TEXT,
			reason TEXT,
			remarks TEXT,
			actual_return_amount REAL DEFAULT 0,
			actual_return_amount_note TEXT,
			actual_return_amount_evidences BLOB DEFAULT X'5B5D',
			actual_return_amount_recorded_at DATETIME,
			actual_return_amount_recorded_by TEXT,
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
	`, "so-return-1", "SO-RETURN-001", "Returnable Order", "Customer A", "cust-1", "NORMAL", "CNY", "GENERAL", "InProgress", 200.0, 10.0, "2026-04-18", "2026-04-20", now, now, "tester", false, 1).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_order_lines (sales_order_id, line_no, product_id, product_model, product_code, specification, description, qty, uom, price, amount, delivered_qty, customer_part_no, job_no, order_date, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "so-return-1", 1, "prod-1", "PM-1", "PC-1", "Spec", "Desc", 10.0, "PCS", 12.5, 125.0, 6.0, "CP-1", "JOB-1", "2026-04-18", "InProgress").Error)

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

func TestCreateSalesReturnRejectsPendingOrder(t *testing.T) {
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
	`, "so-pending-return", "SO-PENDING-RETURN", "Pending Order", "Customer A", "cust-1", "NORMAL", "CNY", "GENERAL", "Pending", 200.0, 10.0, "2026-04-18", "2026-04-20", now, now, "tester", false, 1).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_order_lines (sales_order_id, line_no, product_id, product_model, product_code, specification, description, qty, uom, price, amount, delivered_qty, customer_part_no, job_no, order_date, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "so-pending-return", 1, "prod-1", "PM-1", "PC-1", "Spec", "Desc", 10.0, "PCS", 12.5, 125.0, 0.0, "CP-1", "JOB-1", "2026-04-18", "Pending").Error)

	_, err := CreateSalesReturn(CreateSalesReturnInput{
		SalesOrderID: "so-pending-return",
		Operator:     "tester",
		ReturnDate:   time.Date(2026, 4, 19, 0, 0, 0, 0, time.UTC),
		Lines: []CreateSalesReturnLineInput{
			{
				SalesOrderLineID: 1,
				Quantity:         1,
				Price:            12.5,
			},
		},
	})

	require.ErrorContains(t, err, "sales order status does not allow return")

	var returnCount int64
	require.NoError(t, testDB.Raw(`SELECT COUNT(*) FROM sales_returns`).Scan(&returnCount).Error)
	require.Equal(t, int64(0), returnCount)
}

func TestListSalesReturnsTreatsCompletedAsClosed(t *testing.T) {
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
		INSERT INTO sales_returns (id, created_at, updated_at, deleted_at, return_no, sales_order_id, sales_order_no, customer_id, customer_name, status, return_date, issue_category, reason, remarks, evidences, operator, total_quantity, total_amount)
		VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D', ?, ?, ?)
	`, "sr-status-completed", now, now, "SR-STATUS-001", "so-status-1", "SO-STATUS-001", "cust-1", "Customer A", "Completed", now, "Damage", "legacy", "legacy-batch", "tester", 2.0, 25.0).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_returns (id, created_at, updated_at, deleted_at, return_no, sales_order_id, sales_order_no, customer_id, customer_name, status, return_date, issue_category, reason, remarks, evidences, operator, total_quantity, total_amount)
		VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D', ?, ?, ?)
	`, "sr-status-closed", now, now, "SR-STATUS-002", "so-status-2", "SO-STATUS-002", "cust-1", "Customer A", "Closed", now, "Damage", "new", "new-batch", "tester", 1.0, 12.5).Error)

	response, err := ListSalesReturns(SalesReturnListQuery{
		Page:            1,
		PageSize:        20,
		StatusFilterRaw: SalesReturnStatusClosed,
	})
	require.NoError(t, err)
	require.Len(t, response.Items, 2)
	for _, item := range response.Items {
		require.Equal(t, SalesReturnStatusClosed, item.Status)
	}
}

func TestPatchSalesReturnRecalculatesRemainingQuantityExcludingCurrentRecord(t *testing.T) {
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
	`, "so-return-edit-1", "SO-RETURN-EDIT-001", "Returnable Order", "Customer A", "cust-1", "NORMAL", "CNY", "GENERAL", "InProgress", 200.0, 10.0, "2026-04-18", "2026-04-20", now, now, "tester", false, 1).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_order_lines (id, sales_order_id, line_no, product_id, product_model, product_code, specification, description, qty, uom, price, amount, delivered_qty, customer_part_no, job_no, order_date, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, 1, "so-return-edit-1", 1, "prod-1", "PM-1", "PC-1", "Spec", "Desc", 10.0, "PCS", 12.5, 125.0, 10.0, "CP-1", "JOB-1", "2026-04-18", "InProgress").Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_returns (id, created_at, updated_at, deleted_at, return_no, sales_order_id, sales_order_no, customer_id, customer_name, status, return_date, issue_category, reason, remarks, evidences, operator, total_quantity, total_amount)
		VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D', ?, ?, ?)
	`, "sr-edit-target", now, now, "SR-EDIT-001", "so-return-edit-1", "SO-RETURN-EDIT-001", "cust-1", "Customer A", "Created", now, "Damage", "initial", "batch-a", "tester", 4.0, 50.0).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_return_lines (sales_return_id, sales_order_line_id, line_no, product_id, product_code, product_model, specification, description, uom, quantity, price, amount, issue_category, reason, evidences)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D')
	`, "sr-edit-target", 1, 1, "prod-1", "PC-1", "PM-1", "Spec", "Desc", "PCS", 4.0, 12.5, 50.0, "Damage", "initial").Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_returns (id, created_at, updated_at, deleted_at, return_no, sales_order_id, sales_order_no, customer_id, customer_name, status, return_date, issue_category, reason, remarks, evidences, operator, total_quantity, total_amount)
		VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D', ?, ?, ?)
	`, "sr-edit-other", now, now, "SR-EDIT-002", "so-return-edit-1", "SO-RETURN-EDIT-001", "cust-1", "Customer A", "Created", now, "Damage", "other", "batch-b", "tester", 1.0, 12.5).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_return_lines (sales_return_id, sales_order_line_id, line_no, product_id, product_code, product_model, specification, description, uom, quantity, price, amount, issue_category, reason, evidences)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D')
	`, "sr-edit-other", 1, 1, "prod-1", "PC-1", "PM-1", "Spec", "Desc", "PCS", 1.0, 12.5, 12.5, "Damage", "other").Error)

	response, err := PatchSalesReturn(PatchSalesReturnInput{
		SalesReturnID: "sr-edit-target",
		Operator:      "tester",
		IssueCategory: "Damage",
		Reason:        "adjusted",
		Remarks:       "batch-adjusted",
		ReturnDate:    now,
		Lines: []CreateSalesReturnLineInput{{
			SalesOrderLineID: 1,
			Quantity:         6,
			Price:            12.5,
		}},
	})

	require.NoError(t, err)
	require.Equal(t, 6.0, response.TotalQuantity)
	require.Equal(t, 75.0, response.TotalAmount)
	require.Len(t, response.Lines, 1)
	require.Equal(t, 6.0, response.Lines[0].Quantity)
	require.Equal(t, "adjusted", response.Reason)

	var totalReturned float64
	require.NoError(t, testDB.Raw(`SELECT COALESCE(SUM(quantity), 0) FROM sales_return_lines WHERE sales_order_line_id = ?`, 1).Scan(&totalReturned).Error)
	require.Equal(t, 7.0, totalReturned)
}

func TestPatchSalesReturnRejectsStatusBeyondEditableWindow(t *testing.T) {
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
	`, "so-return-edit-2", "SO-RETURN-EDIT-002", "Returnable Order", "Customer A", "cust-1", "NORMAL", "CNY", "GENERAL", "Done", 200.0, 10.0, "2026-04-18", "2026-04-20", now, now, "tester", false, 1).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_order_lines (id, sales_order_id, line_no, product_id, product_model, product_code, specification, description, qty, uom, price, amount, delivered_qty, customer_part_no, job_no, order_date, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, 1, "so-return-edit-2", 1, "prod-1", "PM-1", "PC-1", "Spec", "Desc", 10.0, "PCS", 12.5, 125.0, 10.0, "CP-1", "JOB-1", "2026-04-18", "Done").Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_returns (id, created_at, updated_at, deleted_at, return_no, sales_order_id, sales_order_no, customer_id, customer_name, status, return_date, issue_category, reason, remarks, evidences, operator, total_quantity, total_amount)
		VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D', ?, ?, ?)
	`, "sr-edit-locked", now, now, "SR-EDIT-003", "so-return-edit-2", "SO-RETURN-EDIT-002", "cust-1", "Customer A", "Received", now, "Damage", "initial", "batch-a", "tester", 2.0, 25.0).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_return_lines (sales_return_id, sales_order_line_id, line_no, product_id, product_code, product_model, specification, description, uom, quantity, price, amount, issue_category, reason, evidences)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D')
	`, "sr-edit-locked", 1, 1, "prod-1", "PC-1", "PM-1", "Spec", "Desc", "PCS", 2.0, 12.5, 25.0, "Damage", "initial").Error)

	_, err := PatchSalesReturn(PatchSalesReturnInput{
		SalesReturnID: "sr-edit-locked",
		Operator:      "tester",
		IssueCategory: "Damage",
		Reason:        "adjusted",
		Remarks:       "batch-adjusted",
		ReturnDate:    now,
		Lines: []CreateSalesReturnLineInput{{
			SalesOrderLineID: 1,
			Quantity:         3,
			Price:            12.5,
		}},
	})

	require.ErrorContains(t, err, "当前退货单状态不允许修改退货主体")
}

func TestPatchSalesReturnActualAmountEntryPersistsFields(t *testing.T) {
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
		INSERT INTO sales_returns (id, created_at, updated_at, deleted_at, return_no, sales_order_id, sales_order_no, customer_id, customer_name, status, return_date, issue_category, reason, remarks, evidences, operator, total_quantity, total_amount)
		VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D', ?, ?, ?)
	`, "sr-actual-amount-target", now, now, "SR-ACTUAL-001", "so-actual-amount-1", "SO-ACTUAL-001", "cust-1", "Customer A", "Received", now, "Damage", "initial", "batch-a", "tester", 2.0, 25.0).Error)

	response, err := PatchSalesReturnActualAmountEntry(PatchSalesReturnActualAmountEntryInput{
		SalesReturnID:          "sr-actual-amount-target",
		Operator:               "finance-user",
		ActualReturnAmount:     38.756,
		ActualReturnAmountNote: "customer confirmed and finance approved",
		ActualReturnAmountEvidences: []OrderEvidencePayload{{
			ID:         "evidence-1",
			URL:        "/uploads/return-amount-proof-1.png",
			Name:       "return-amount-proof-1.png",
			UploadedAt: now.Format(time.RFC3339),
		}},
	})

	require.NoError(t, err)
	require.Equal(t, 38.76, response.ActualReturnAmount)
	require.Equal(t, "customer confirmed and finance approved", response.ActualReturnAmountNote)
	require.Equal(t, "finance-user", response.ActualReturnAmountRecordedBy)
	require.NotNil(t, response.ActualReturnAmountRecordedAt)
	require.Len(t, response.ActualReturnAmountEvidences, 1)
	require.Equal(t, "evidence-1", response.ActualReturnAmountEvidences[0].ID)

	var storedAmount float64
	require.NoError(t, testDB.Raw(`SELECT actual_return_amount FROM sales_returns WHERE id = ?`, "sr-actual-amount-target").Scan(&storedAmount).Error)
	require.Equal(t, 38.76, storedAmount)

	var storedBy string
	require.NoError(t, testDB.Raw(`SELECT actual_return_amount_recorded_by FROM sales_returns WHERE id = ?`, "sr-actual-amount-target").Scan(&storedBy).Error)
	require.Equal(t, "finance-user", storedBy)
}

func TestPatchSalesReturnActualAmountEntryRejectsCanceledReturn(t *testing.T) {
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
		INSERT INTO sales_returns (id, created_at, updated_at, deleted_at, return_no, sales_order_id, sales_order_no, customer_id, customer_name, status, return_date, issue_category, reason, remarks, evidences, operator, total_quantity, total_amount)
		VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D', ?, ?, ?)
	`, "sr-actual-amount-canceled", now, now, "SR-ACTUAL-002", "so-actual-amount-2", "SO-ACTUAL-002", "cust-1", "Customer A", "Canceled", now, "Damage", "initial", "batch-a", "tester", 2.0, 25.0).Error)

	_, err := PatchSalesReturnActualAmountEntry(PatchSalesReturnActualAmountEntryInput{
		SalesReturnID:      "sr-actual-amount-canceled",
		Operator:           "finance-user",
		ActualReturnAmount: 20,
	})

	require.ErrorContains(t, err, "已取消退货单不允许登记退货金额")
}

func TestListSalesReturnActualAmountRecordsReturnsEmptyForExistingReturn(t *testing.T) {
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
		INSERT INTO sales_returns (id, created_at, updated_at, deleted_at, return_no, sales_order_id, sales_order_no, customer_id, customer_name, status, return_date, issue_category, reason, remarks, evidences, operator, total_quantity, total_amount)
		VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D', ?, ?, ?)
	`, "sr-actual-amount-empty", now, now, "SR-ACTUAL-EMPTY", "so-actual-empty", "SO-ACTUAL-EMPTY", "cust-1", "Customer A", "Received", now, "Damage", "initial", "batch-a", "tester", 2.0, 25.0).Error)

	records, err := ListSalesReturnActualAmountRecords("sr-actual-amount-empty")
	require.NoError(t, err)
	require.Empty(t, records)
}

func TestListSalesReturnActualAmountRecordsRejectsMissingReturn(t *testing.T) {
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

	_, err := ListSalesReturnActualAmountRecords("sr-missing")
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
}

func TestDeleteSalesReturnSoftDeletesReturnAndActualAmountRecords(t *testing.T) {
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
		INSERT INTO sales_returns (id, created_at, updated_at, deleted_at, return_no, sales_order_id, sales_order_no, customer_id, customer_name, status, return_date, issue_category, reason, remarks, evidences, operator, total_quantity, total_amount)
		VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D', ?, ?, ?)
	`, "sr-delete-target", now, now, "SR-DELETE-001", "so-delete-1", "SO-DELETE-001", "cust-1", "Customer A", "Created", now, "Damage", "initial", "batch-a", "tester", 2.0, 25.0).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_return_actual_amount_records (id, created_at, updated_at, deleted_at, sales_return_id, sales_order_id, sales_order_no, return_no, customer_id, customer_name, amount, note, evidences, estimated_return_amount_snapshot, recorded_at, recorded_by)
		VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, X'5B5D', ?, ?, ?)
	`, "sraar-delete-1", now, now, "sr-delete-target", "so-delete-1", "SO-DELETE-001", "SR-DELETE-001", "cust-1", "Customer A", 15.0, "confirmed", 25.0, now, "finance-user").Error)

	require.NoError(t, DeleteSalesReturn("sr-delete-target"))

	var activeReturnCount int64
	require.NoError(t, testDB.Raw(`SELECT COUNT(*) FROM sales_returns WHERE id = ? AND deleted_at IS NULL`, "sr-delete-target").Scan(&activeReturnCount).Error)
	require.Equal(t, int64(0), activeReturnCount)

	var activeRecordCount int64
	require.NoError(t, testDB.Raw(`SELECT COUNT(*) FROM sales_return_actual_amount_records WHERE sales_return_id = ? AND deleted_at IS NULL`, "sr-delete-target").Scan(&activeRecordCount).Error)
	require.Equal(t, int64(0), activeRecordCount)

	_, err := ListSalesReturnActualAmountRecords("sr-delete-target")
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
}

func TestCreateSalesReturnRejectsQuantityAboveDeliveredQuantity(t *testing.T) {
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
	`, "so-delivered-cap", "SO-DELIVERED-CAP", "Partially Delivered Order", "Customer A", "cust-1", "NORMAL", "CNY", "GENERAL", "InProgress", 200.0, 10.0, "2026-04-18", "2026-04-20", now, now, "tester", false, 1).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO sales_order_lines (sales_order_id, line_no, product_id, product_model, product_code, specification, description, qty, uom, price, amount, delivered_qty, customer_part_no, job_no, order_date, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "so-delivered-cap", 1, "prod-1", "PM-1", "PC-1", "Spec", "Desc", 10.0, "PCS", 12.5, 125.0, 2.0, "CP-1", "JOB-1", "2026-04-18", "InProgress").Error)

	_, err := CreateSalesReturn(CreateSalesReturnInput{
		SalesOrderID: "so-delivered-cap",
		Operator:     "tester",
		ReturnDate:   time.Date(2026, 4, 19, 0, 0, 0, 0, time.UTC),
		Lines: []CreateSalesReturnLineInput{
			{
				SalesOrderLineID: 1,
				Quantity:         3,
				Price:            12.5,
			},
		},
	})

	require.ErrorContains(t, err, "return quantity exceeds remaining returnable quantity")

	var returnCount int64
	require.NoError(t, testDB.Raw(`SELECT COUNT(*) FROM sales_returns`).Scan(&returnCount).Error)
	require.Equal(t, int64(0), returnCount)
}
