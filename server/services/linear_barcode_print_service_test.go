package services

import (
	"errors"
	"testing"
	"time"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestBuildCanonicalLinearBarcodeCode(t *testing.T) {
	line := models.SalesOrderLine{
		ModelCodeSnapshot:             "01",
		AppearanceBarcodeCodeSnapshot: "1",
		HolePrefixSnapshot:            "R",
		HoleCount:                     14,
	}
	code, err := buildCanonicalLinearBarcodeCode(
		time.Date(2026, 7, 19, 8, 0, 0, 0, linearBarcodePrintLocation),
		line,
		"0023",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if code != "26719011R140023" {
		t.Fatalf("unexpected code: %s", code)
	}
	if len(code) != 15 {
		t.Fatalf("expected 15 characters, got %d", len(code))
	}
}

func TestBuildCanonicalLinearBarcodeCodeRejectsNonNumericSerial(t *testing.T) {
	line := models.SalesOrderLine{
		ModelCodeSnapshot:             "01",
		AppearanceBarcodeCodeSnapshot: "1",
		HolePrefixSnapshot:            "R",
		HoleCount:                     14,
	}
	if _, err := buildCanonicalLinearBarcodeCode(time.Now(), line, "00A1"); err == nil {
		t.Fatal("expected invalid serial to be rejected")
	}
}

func TestCreateLinearBarcodeBatchPersistsUniqueInventoryItems(t *testing.T) {
	testDB, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
		Logger:                                   logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	schemaStatements := []string{
		`CREATE TABLE sales_orders (id text PRIMARY KEY, order_no text, status text, evidences blob, created_at datetime, updated_at datetime, deleted_at datetime)`,
		`CREATE TABLE sales_order_lines (id integer PRIMARY KEY AUTOINCREMENT, sales_order_id text, line_no integer, product_id text, model_code_snapshot text, appearance_barcode_code_snapshot text, hole_prefix_snapshot text, hole_count integer, qty real, uom text)`,
		`CREATE TABLE print_batches (id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime, batch_no text UNIQUE, template_name text, product_id text, bom_id text, start_sn text, end_sn text, full_code text, sales_order_id text, sales_order_line_no integer, quantity integer, activated_count integer, status text, expires_at datetime, version integer)`,
		`CREATE TABLE linear_barcode_inventory_items (id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime, batch_id text, product_id text, sales_order_id text, sales_order_line_no integer, code text UNIQUE, serial_number text, status text, expires_at datetime, bound_at datetime, version integer)`,
		`CREATE TABLE sequences (key text PRIMARY KEY, value integer DEFAULT 0, updated_at datetime)`,
		`CREATE TABLE numbering_rules (id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime, rule_key text UNIQUE, prefix text, pattern text, current_seq integer, padding integer, reset_period text, last_reset text)`,
		`CREATE TABLE system_configs (id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime, key text UNIQUE, value text, label text, description text)`,
	}
	for _, statement := range schemaStatements {
		if err := testDB.Exec(statement).Error; err != nil {
			t.Fatalf("create test schema: %v", err)
		}
	}

	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	orderID := "9ae028c3-6540-4353-9240-d2385cd3b755"
	productID := "8bf75715-c08b-4a99-b192-3cb2d6883e21"
	if err := testDB.Exec(
		"INSERT INTO sales_orders (id, order_no, status, evidences) VALUES (?, ?, ?, ?)",
		orderID,
		"SO-TEST-001",
		"Scheduling",
		[]byte("[]"),
	).Error; err != nil {
		t.Fatalf("create sales order: %v", err)
	}
	if err := testDB.Exec(
		"INSERT INTO sales_order_lines (sales_order_id, line_no, product_id, model_code_snapshot, appearance_barcode_code_snapshot, hole_prefix_snapshot, hole_count, qty, uom) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		orderID,
		1,
		productID,
		"01",
		"1",
		"R",
		14,
		50,
		"PCS",
	).Error; err != nil {
		t.Fatalf("create sales order line: %v", err)
	}
	batchDate := time.Now().Format("20060102")
	existingBatchNo := "P" + batchDate + "-009"
	if err := testDB.Exec(
		"INSERT INTO print_batches (id, batch_no, template_name, quantity, status, version) VALUES (?, ?, ?, ?, ?, ?)",
		"6d2d6e68-957f-4d1a-b019-3fb64e8d5b54",
		existingBatchNo,
		"LEGACY-BATCH",
		1,
		"Printed",
		1,
	).Error; err != nil {
		t.Fatalf("create existing print batch: %v", err)
	}

	result, err := CreateLinearBarcodeBatch(CreateLinearBarcodeBatchRequest{
		SalesOrderID:     orderID,
		SalesOrderLineNo: 1,
		Quantity:         3,
	})
	if err != nil {
		t.Fatalf("create linear barcode batch: %v", err)
	}
	if result.Batch.Quantity != 3 || len(result.Items) != 3 {
		t.Fatalf("unexpected batch result: quantity=%d items=%d", result.Batch.Quantity, len(result.Items))
	}
	if result.Batch.BatchNo != "P"+batchDate+"-010" {
		t.Fatalf("expected batch sequence to continue existing records, got %s", result.Batch.BatchNo)
	}
	codes := map[string]struct{}{}
	for _, item := range result.Items {
		if len(item.Code) != 15 || item.Status != LinearBarcodeInventoryStatusAvailable {
			t.Fatalf("unexpected inventory item: %+v", item)
		}
		codes[item.Code] = struct{}{}
	}
	if len(codes) != 3 {
		t.Fatalf("expected 3 unique codes, got %d", len(codes))
	}

	listed, err := ListLinearBarcodeInventory(ListLinearBarcodeInventoryRequest{
		SalesOrderID: orderID,
		Limit:        10,
	})
	if err != nil {
		t.Fatalf("list inventory: %v", err)
	}
	if listed.Total != 3 || len(listed.Items) != 3 {
		t.Fatalf("unexpected inventory list: total=%d items=%d", listed.Total, len(listed.Items))
	}

	if err := testDB.Transaction(func(tx *gorm.DB) error {
		return bindLinearBarcodeInventoryTx(tx, result.Items[0].Code, time.Now())
	}); err != nil {
		t.Fatalf("bind inventory: %v", err)
	}
	var boundItem models.LinearBarcodeInventoryItem
	if err := testDB.Where("code = ?", result.Items[0].Code).First(&boundItem).Error; err != nil {
		t.Fatalf("load bound inventory: %v", err)
	}
	if boundItem.Status != LinearBarcodeInventoryStatusBound || boundItem.BoundAt == nil || boundItem.Version != 2 {
		t.Fatalf("unexpected bound inventory: %+v", boundItem)
	}
	var activatedBatch models.PrintBatch
	if err := testDB.Where("id = ?", result.Batch.ID).First(&activatedBatch).Error; err != nil {
		t.Fatalf("load activated batch: %v", err)
	}
	if activatedBatch.ActivatedCount != 1 || activatedBatch.Status != "PartiallyActivated" || activatedBatch.Version != 2 {
		t.Fatalf("unexpected activated batch: %+v", activatedBatch)
	}

	if err := testDB.Model(&models.LinearBarcodeInventoryItem{}).
		Where("code = ?", result.Items[1].Code).
		Update("expires_at", time.Now().Add(-time.Minute)).Error; err != nil {
		t.Fatalf("backdate inventory expiry: %v", err)
	}
	refreshed, err := refreshLinearBarcodeInventoryCodeExpiry(result.Items[1].Code, time.Now())
	if err != nil {
		t.Fatalf("refresh scanned inventory expiry: %v", err)
	}
	if !refreshed {
		t.Fatal("expected scanned inventory item to be refreshed as expired")
	}
	if err := testDB.Transaction(func(tx *gorm.DB) error {
		return bindLinearBarcodeInventoryTx(tx, result.Items[1].Code, time.Now())
	}); !errors.Is(err, ErrLinearBarcodeInventoryExpired) {
		t.Fatalf("expected expired inventory error, got %v", err)
	}

	if err := testDB.Transaction(func(tx *gorm.DB) error {
		return ScrapLinearBarcodeInventoryForBatchTx(tx, result.Batch.ID)
	}); err != nil {
		t.Fatalf("scrap inventory: %v", err)
	}
	var scrappedCount int64
	if err := testDB.Model(&models.LinearBarcodeInventoryItem{}).
		Where("batch_id = ? AND status = ?", result.Batch.ID, LinearBarcodeInventoryStatusScrapped).
		Count(&scrappedCount).Error; err != nil {
		t.Fatalf("count scrapped inventory: %v", err)
	}
	if scrappedCount != 1 {
		t.Fatalf("expected 1 scrapped item, got %d", scrappedCount)
	}
}
