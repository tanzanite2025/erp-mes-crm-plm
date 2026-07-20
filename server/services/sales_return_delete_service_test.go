package services

import (
	"errors"
	"testing"
	appdb "xdfc-server/db"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openSalesReturnDeleteTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	testDB, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatalf("open sqlite connection: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)

	schemaStatements := []string{
		`CREATE TABLE sales_returns (id text PRIMARY KEY, status text, deleted_at datetime)`,
		`CREATE TABLE sales_return_actual_amount_records (id text PRIMARY KEY, sales_return_id text NOT NULL, deleted_at datetime)`,
	}
	for _, statement := range schemaStatements {
		if err := testDB.Exec(statement).Error; err != nil {
			t.Fatalf("create test schema: %v", err)
		}
	}

	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })
	return testDB
}

func TestDeleteSalesReturnRejectsExecutedReturn(t *testing.T) {
	testDB := openSalesReturnDeleteTestDB(t)
	const returnID = "sales-return-in-transit"
	if err := testDB.Exec(
		"INSERT INTO sales_returns (id, status) VALUES (?, ?)",
		returnID,
		SalesReturnStatusInTransit,
	).Error; err != nil {
		t.Fatalf("seed sales return: %v", err)
	}

	err := DeleteSalesReturn(returnID)
	if !errors.Is(err, ErrSalesReturnDeleteRequiresCreated) {
		t.Fatalf("expected lifecycle delete guard, got %v", err)
	}
	assertSalesReturnStillActive(t, testDB, returnID)
}

func TestDeleteSalesReturnPreservesActualAmountHistory(t *testing.T) {
	testDB := openSalesReturnDeleteTestDB(t)
	const returnID = "sales-return-with-actual-amount"
	if err := testDB.Exec(
		"INSERT INTO sales_returns (id, status) VALUES (?, ?)",
		returnID,
		SalesReturnStatusCreated,
	).Error; err != nil {
		t.Fatalf("seed sales return: %v", err)
	}
	if err := testDB.Exec(
		"INSERT INTO sales_return_actual_amount_records (id, sales_return_id) VALUES (?, ?)",
		"actual-amount-1",
		returnID,
	).Error; err != nil {
		t.Fatalf("seed actual amount record: %v", err)
	}

	err := DeleteSalesReturn(returnID)
	if !errors.Is(err, ErrSalesReturnDeleteHasActualAmountRecords) {
		t.Fatalf("expected actual amount delete guard, got %v", err)
	}
	assertSalesReturnStillActive(t, testDB, returnID)

	var amountRecordCount int64
	if err := testDB.Table("sales_return_actual_amount_records").Where("sales_return_id = ?", returnID).Count(&amountRecordCount).Error; err != nil {
		t.Fatalf("count actual amount records: %v", err)
	}
	if amountRecordCount != 1 {
		t.Fatalf("expected actual amount history to remain, got count %d", amountRecordCount)
	}
}

func TestDeleteSalesReturnAllowsUnexecutedCreatedReturn(t *testing.T) {
	testDB := openSalesReturnDeleteTestDB(t)
	const returnID = "sales-return-created"
	if err := testDB.Exec(
		"INSERT INTO sales_returns (id, status) VALUES (?, ?)",
		returnID,
		SalesReturnStatusCreated,
	).Error; err != nil {
		t.Fatalf("seed sales return: %v", err)
	}

	if err := DeleteSalesReturn(returnID); err != nil {
		t.Fatalf("delete unexecuted sales return: %v", err)
	}

	var remaining int64
	if err := testDB.Table("sales_returns").Where("id = ? AND deleted_at IS NULL", returnID).Count(&remaining).Error; err != nil {
		t.Fatalf("count active returns: %v", err)
	}
	if remaining != 0 {
		t.Fatalf("expected created sales return to be deleted, got count %d", remaining)
	}
}

func assertSalesReturnStillActive(t *testing.T, testDB *gorm.DB, returnID string) {
	t.Helper()
	var remaining int64
	if err := testDB.Table("sales_returns").Where("id = ? AND deleted_at IS NULL", returnID).Count(&remaining).Error; err != nil {
		t.Fatalf("count remaining return: %v", err)
	}
	if remaining != 1 {
		t.Fatalf("expected sales return to remain, got count %d", remaining)
	}
}
