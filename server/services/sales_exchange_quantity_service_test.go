package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openSalesAfterSalesQuantityTestDB(t *testing.T) *gorm.DB {
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
		`CREATE TABLE sales_return_lines (id integer PRIMARY KEY, sales_return_id text, sales_order_line_id integer, quantity real)`,
		`CREATE TABLE sales_exchanges (id text PRIMARY KEY, status text, deleted_at datetime)`,
		`CREATE TABLE sales_exchange_lines (id integer PRIMARY KEY, sales_exchange_id text, sales_order_line_id integer, exchange_quantity real)`,
	}
	for _, statement := range schemaStatements {
		if err := testDB.Exec(statement).Error; err != nil {
			t.Fatalf("create test schema: %v", err)
		}
	}
	return testDB
}

func TestBuildSalesExchangeLinesRejectsQuantityConsumedBySalesReturn(t *testing.T) {
	testDB := openSalesAfterSalesQuantityTestDB(t)
	seedSalesReturnQuantity(t, testDB, "sales-return-1", SalesReturnStatusCreated, 1, 10)

	consumed, err := loadSalesAfterSalesConsumedQuantityMap(testDB, []models.SalesOrderLine{{ID: 1}}, "")
	if err != nil {
		t.Fatalf("load consumed quantity: %v", err)
	}
	assertConsumedQuantity(t, consumed, 1, 10)

	order := salesAfterSalesQuantityTestOrder()
	if _, _, _, err := buildSalesExchangeLines(order, consumed, []CreateSalesExchangeLineInput{{
		SalesOrderLineID: 1,
		ExchangeQuantity: 1,
	}}); err == nil {
		t.Fatal("expected sales exchange creation to reject quantity already consumed by a sales return")
	}
}

func TestBuildSalesReturnLinesRejectsQuantityConsumedBySalesExchange(t *testing.T) {
	testDB := openSalesAfterSalesQuantityTestDB(t)
	seedSalesExchangeQuantity(t, testDB, "sales-exchange-1", SalesExchangeStatusDraft, 1, 10)

	consumed, err := loadSalesAfterSalesConsumedQuantityMap(testDB, []models.SalesOrderLine{{ID: 1}}, "")
	if err != nil {
		t.Fatalf("load consumed quantity: %v", err)
	}
	assertConsumedQuantity(t, consumed, 1, 10)

	order := salesAfterSalesQuantityTestOrder()
	if _, _, _, err := buildSalesReturnLines(order, consumed, []CreateSalesReturnLineInput{{
		SalesOrderLineID: 1,
		Quantity:         1,
	}}); err == nil {
		t.Fatal("expected sales return creation to reject quantity already consumed by a sales exchange")
	}
}

func TestCanceledAfterSalesRecordsReleaseConsumedQuantity(t *testing.T) {
	testDB := openSalesAfterSalesQuantityTestDB(t)
	seedSalesReturnQuantity(t, testDB, "sales-return-canceled", SalesReturnStatusCanceled, 1, 6)
	seedSalesExchangeQuantity(t, testDB, "sales-exchange-canceled", SalesExchangeStatusCanceled, 1, 4)

	consumed, err := loadSalesAfterSalesConsumedQuantityMap(testDB, []models.SalesOrderLine{{ID: 1}}, "")
	if err != nil {
		t.Fatalf("load consumed quantity: %v", err)
	}
	assertConsumedQuantity(t, consumed, 1, 0)
}

func TestEditingSalesReturnExcludesItselfButKeepsSalesExchangeQuantity(t *testing.T) {
	testDB := openSalesAfterSalesQuantityTestDB(t)
	seedSalesReturnQuantity(t, testDB, "sales-return-current", SalesReturnStatusCreated, 1, 6)
	seedSalesExchangeQuantity(t, testDB, "sales-exchange-1", SalesExchangeStatusDraft, 1, 4)

	consumed, err := loadSalesAfterSalesConsumedQuantityMap(
		testDB,
		[]models.SalesOrderLine{{ID: 1}},
		"sales-return-current",
	)
	if err != nil {
		t.Fatalf("load consumed quantity: %v", err)
	}
	assertConsumedQuantity(t, consumed, 1, 4)

	order := salesAfterSalesQuantityTestOrder()
	if _, _, _, err := buildSalesReturnLines(order, consumed, []CreateSalesReturnLineInput{{
		SalesOrderLineID: 1,
		Quantity:         7,
	}}); err == nil {
		t.Fatal("expected sales return edit to keep existing sales exchange quantity in the limit")
	}
}

func salesAfterSalesQuantityTestOrder() models.SalesOrder {
	return models.SalesOrder{
		Status: "Done",
		Lines: []models.SalesOrderLine{{
			ID:           1,
			DeliveredQty: 10,
		}},
	}
}

func seedSalesReturnQuantity(t *testing.T, testDB *gorm.DB, id string, status string, lineID uint, quantity float64) {
	t.Helper()
	if err := testDB.Exec("INSERT INTO sales_returns (id, status) VALUES (?, ?)", id, status).Error; err != nil {
		t.Fatalf("seed sales return: %v", err)
	}
	if err := testDB.Exec(
		"INSERT INTO sales_return_lines (sales_return_id, sales_order_line_id, quantity) VALUES (?, ?, ?)",
		id,
		lineID,
		quantity,
	).Error; err != nil {
		t.Fatalf("seed sales return line: %v", err)
	}
}

func seedSalesExchangeQuantity(t *testing.T, testDB *gorm.DB, id string, status string, lineID uint, quantity float64) {
	t.Helper()
	if err := testDB.Exec("INSERT INTO sales_exchanges (id, status) VALUES (?, ?)", id, status).Error; err != nil {
		t.Fatalf("seed sales exchange: %v", err)
	}
	if err := testDB.Exec(
		"INSERT INTO sales_exchange_lines (sales_exchange_id, sales_order_line_id, exchange_quantity) VALUES (?, ?, ?)",
		id,
		lineID,
		quantity,
	).Error; err != nil {
		t.Fatalf("seed sales exchange line: %v", err)
	}
}

func assertConsumedQuantity(t *testing.T, consumed map[uint]float64, lineID uint, expected float64) {
	t.Helper()
	if actual := consumed[lineID]; actual != expected {
		t.Fatalf("expected consumed quantity %.2f for line %d, got %.2f", expected, lineID, actual)
	}
}
