package services

import (
	"encoding/json"
	"errors"
	"testing"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openQuotePatchTestDB(t *testing.T) *gorm.DB {
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
		`CREATE TABLE sales_orders (
			id text PRIMARY KEY,
			order_no text,
			order_name text,
			customer_name text,
			customer_id text,
			type text,
			currency text,
			classification text,
			status text,
			amount real,
			quantity real,
			order_date text,
			delivery_date text,
			payment_method_name text,
			payment_term_name text,
			barcode text,
			requirements text,
			updated_at datetime,
			updated_by text,
			version integer,
			deleted_at datetime
		)`,
		`CREATE TABLE sales_order_lines (id integer PRIMARY KEY, sales_order_id text)`,
	}
	for _, statement := range schemaStatements {
		if err := testDB.Exec(statement).Error; err != nil {
			t.Fatalf("create quote patch schema: %v", err)
		}
	}

	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })
	return testDB
}

func TestPatchQuoteDraftUpdatesAllowedFields(t *testing.T) {
	testDB := openQuotePatchTestDB(t)
	seedQuotePatchOrder(t, testDB, "quote-editable", "quote", "Draft", 100, "old requirements")

	response, err := PatchQuoteDraft("quote-editable", quotePatchRequest(
		100,
		125.5,
		"old requirements",
		"new requirements",
	), "quote-owner")
	if err != nil {
		t.Fatalf("patch quote: %v", err)
	}
	if response.Requirements != "new requirements" {
		t.Fatalf("expected updated requirements, got %q", response.Requirements)
	}

	var quote models.SalesOrder
	if err := testDB.First(&quote, "id = ?", "quote-editable").Error; err != nil {
		t.Fatalf("reload quote: %v", err)
	}
	if quote.Amount != 125.5 || quote.Requirements != "new requirements" {
		t.Fatalf("unexpected patched quote: amount=%v requirements=%q", quote.Amount, quote.Requirements)
	}
	if quote.UpdatedBy != "quote-owner" || quote.Version != 2 {
		t.Fatalf("expected operator and version update, got operator=%q version=%d", quote.UpdatedBy, quote.Version)
	}
}

func TestPatchQuoteDraftRejectsStaleValues(t *testing.T) {
	testDB := openQuotePatchTestDB(t)
	seedQuotePatchOrder(t, testDB, "quote-conflict", "quote", "Draft", 100, "current")

	_, err := PatchQuoteDraft("quote-conflict", quotePatchRequest(90, 110, "current", "next"), "quote-owner")
	if !errors.Is(err, ErrQuotePatchConflict) {
		t.Fatalf("expected quote patch conflict, got %v", err)
	}
	assertQuotePatchValues(t, testDB, "quote-conflict", 100, "current")
}

func TestPatchQuoteDraftRejectsConvertedQuote(t *testing.T) {
	testDB := openQuotePatchTestDB(t)
	seedQuotePatchOrder(t, testDB, "quote-converted", "quote", "Converted", 100, "locked")

	_, err := PatchQuoteDraft("quote-converted", quotePatchRequest(100, 110, "locked", "changed"), "quote-owner")
	if !errors.Is(err, ErrQuotePatchNotEditable) {
		t.Fatalf("expected quote lifecycle guard, got %v", err)
	}
	assertQuotePatchValues(t, testDB, "quote-converted", 100, "locked")
}

func TestPatchQuoteDraftDoesNotPatchSalesOrder(t *testing.T) {
	testDB := openQuotePatchTestDB(t)
	seedQuotePatchOrder(t, testDB, "sales-order", "GENERAL", "Draft", 100, "sales order")

	_, err := PatchQuoteDraft("sales-order", quotePatchRequest(100, 110, "sales order", "changed"), "quote-owner")
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		t.Fatalf("expected non-quote record to be hidden, got %v", err)
	}
	assertQuotePatchValues(t, testDB, "sales-order", 100, "sales order")
}

func quotePatchRequest(oldAmount float64, newAmount float64, oldRequirements string, newRequirements string) SDRTSDeltaHandlerRequest {
	amountDelta, _ := json.Marshal(map[string]any{"o": oldAmount, "n": newAmount})
	requirementsDelta, _ := json.Marshal(map[string]any{"o": oldRequirements, "n": newRequirements})
	return SDRTSDeltaHandlerRequest{
		Op: "PATCH",
		Delta: map[string]json.RawMessage{
			"amount":       amountDelta,
			"requirements": requirementsDelta,
		},
		Metadata: SDRTSDeltaMetadata{ID: ""},
	}
}

func seedQuotePatchOrder(t *testing.T, testDB *gorm.DB, id string, classification string, status string, amount float64, requirements string) {
	t.Helper()
	if err := testDB.Exec(
		`INSERT INTO sales_orders (
			id, order_no, order_name, customer_name, type, currency,
			classification, status, amount, quantity, requirements, version, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
		id,
		id+"-no",
		id,
		"Test Customer",
		"retail",
		"CNY",
		classification,
		status,
		amount,
		0,
		requirements,
		1,
	).Error; err != nil {
		t.Fatalf("seed quote: %v", err)
	}
}

func assertQuotePatchValues(t *testing.T, testDB *gorm.DB, id string, amount float64, requirements string) {
	t.Helper()
	var quote models.SalesOrder
	if err := testDB.First(&quote, "id = ?", id).Error; err != nil {
		t.Fatalf("reload quote: %v", err)
	}
	if quote.Amount != amount || quote.Requirements != requirements {
		t.Fatalf("quote changed unexpectedly: amount=%v requirements=%q", quote.Amount, quote.Requirements)
	}
}
