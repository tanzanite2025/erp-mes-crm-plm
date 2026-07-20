package services

import (
	"errors"
	"testing"
	appdb "xdfc-server/db"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestDeleteSalesOrderRejectsOrderWithSalesExchange(t *testing.T) {
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
		`CREATE TABLE sales_orders (id text PRIMARY KEY, classification text, type text, status text, version integer, deleted_at datetime)`,
		`CREATE TABLE sales_order_lines (id integer PRIMARY KEY, sales_order_id text, deleted_at datetime)`,
		`CREATE TABLE sales_returns (id text PRIMARY KEY, sales_order_id text, deleted_at datetime)`,
		`CREATE TABLE sales_exchanges (id text PRIMARY KEY, sales_order_id text NOT NULL, deleted_at datetime)`,
	}
	for _, statement := range schemaStatements {
		if err := testDB.Exec(statement).Error; err != nil {
			t.Fatalf("create test schema: %v", err)
		}
	}

	const orderID = "sales-order-with-exchange"
	if err := testDB.Exec(
		"INSERT INTO sales_orders (id, status, version) VALUES (?, ?, ?)",
		orderID,
		"Canceled",
		3,
	).Error; err != nil {
		t.Fatalf("seed sales order: %v", err)
	}
	if err := testDB.Exec(
		"INSERT INTO sales_exchanges (id, sales_order_id) VALUES (?, ?)",
		"sales-exchange-1",
		orderID,
	).Error; err != nil {
		t.Fatalf("seed sales exchange: %v", err)
	}

	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	err = DeleteSalesOrder(orderID)
	if !errors.Is(err, ErrSalesOrderDeleteHasExchanges) {
		t.Fatalf("expected exchange delete guard, got %v", err)
	}

	var remaining int64
	if err := testDB.Table("sales_orders").Where("id = ? AND deleted_at IS NULL", orderID).Count(&remaining).Error; err != nil {
		t.Fatalf("count remaining order: %v", err)
	}
	if remaining != 1 {
		t.Fatalf("expected sales order to remain, got count %d", remaining)
	}
}
