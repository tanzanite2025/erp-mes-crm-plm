package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestBuildSalesOrderFromQuoteCreatesIndependentDraft(t *testing.T) {
	quote := models.SalesOrder{
		ID:             "quote-1",
		OrderNo:        "QT-001",
		Barcode:        "QT-001",
		Classification: "quote",
		Type:           "retail",
		Status:         "Pending",
		Amount:         80,
		Quantity:       2,
		Version:        7,
		Lines: []models.SalesOrderLine{{
			ID:           11,
			SalesOrderID: "quote-1",
			Qty:          2,
			Price:        50,
			Amount:       80,
			DeliveredQty: 1,
			Status:       "InProgress",
			ClaimedBy:    "planner",
			ClaimedAt:    "2026-01-01",
		}},
	}

	target := buildSalesOrderFromQuote(quote, "sales-order-1", "SO-001", "operator")
	if target.ID != "sales-order-1" || target.OrderNo != "SO-001" || target.Barcode != "SO-001" {
		t.Fatalf("unexpected target identity: id=%q orderNo=%q barcode=%q", target.ID, target.OrderNo, target.Barcode)
	}
	if target.Classification != "GENERAL" || target.Status != "Draft" || target.Version != 1 {
		t.Fatalf("unexpected target lifecycle: classification=%q status=%q version=%d", target.Classification, target.Status, target.Version)
	}
	if target.Amount != 100 || target.Quantity != 2 {
		t.Fatalf("expected authoritative line totals, got amount=%v quantity=%v", target.Amount, target.Quantity)
	}
	if len(target.Lines) != 1 {
		t.Fatalf("expected one copied line, got %d", len(target.Lines))
	}
	line := target.Lines[0]
	if line.ID != 0 || line.SalesOrderID != target.ID || line.DeliveredQty != 0 || line.Status != "Draft" {
		t.Fatalf("line was not reset for formal order: %+v", line)
	}
	if line.ClaimedBy != "" || line.ClaimedAt != "" {
		t.Fatalf("line claim state leaked from quote: %+v", line)
	}
}

func TestBuildSalesOrderFromSampleQuoteUsesSampleClassification(t *testing.T) {
	target := buildSalesOrderFromQuote(models.SalesOrder{
		Classification: "quote",
		Type:           "sample",
		Amount:         25,
	}, "sales-order-sample", "SO-SAMPLE", "operator")
	if target.Classification != "SAMPLE" {
		t.Fatalf("expected SAMPLE classification, got %q", target.Classification)
	}
	if target.Amount != 25 {
		t.Fatalf("expected header amount to survive a line-less quote, got %v", target.Amount)
	}
}

func TestSalesOrderRecordScopeExcludesQuotes(t *testing.T) {
	testDB, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := testDB.Exec(`CREATE TABLE sales_orders (
		id text PRIMARY KEY,
		classification text,
		type text,
		deleted_at datetime
	)`).Error; err != nil {
		t.Fatalf("create sales order scope schema: %v", err)
	}
	for _, statement := range []string{
		`INSERT INTO sales_orders (id, classification, type) VALUES ('quote-by-classification', 'quote', 'retail')`,
		`INSERT INTO sales_orders (id, classification, type) VALUES ('quote-by-type', 'GENERAL', 'quote')`,
		`INSERT INTO sales_orders (id, classification, type) VALUES ('formal-order', 'GENERAL', 'retail')`,
	} {
		if err := testDB.Exec(statement).Error; err != nil {
			t.Fatalf("seed sales order scope: %v", err)
		}
	}

	var rows []struct{ ID string }
	if err := applySalesOrderRecordScope(testDB.Table("sales_orders")).Select("id").Order("id").Scan(&rows).Error; err != nil {
		t.Fatalf("query formal sales orders: %v", err)
	}
	if len(rows) != 1 || rows[0].ID != "formal-order" {
		t.Fatalf("expected only formal sales order, got %+v", rows)
	}
}
