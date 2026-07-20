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

func TestCreateProductBarcodeBindingClaimsIssuedInventoryAtomically(t *testing.T) {
	testDB, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
		Logger:                                   logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}

	schemaStatements := []string{
		`CREATE TABLE print_batches (id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime, batch_no text UNIQUE, template_name text, product_id text, bom_id text, start_sn text, end_sn text, full_code text, sales_order_id text, sales_order_line_no integer, quantity integer, activated_count integer, status text, expires_at datetime, version integer)`,
		`CREATE TABLE linear_barcode_inventory_items (id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime, batch_id text, product_id text, sales_order_id text, sales_order_line_no integer, code text UNIQUE, serial_number text, status text, expires_at datetime, bound_at datetime, version integer)`,
		`CREATE TABLE prepreg_roll_instances (id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime, binding_token text UNIQUE, spec_id text, spec_code text, spec_name text, resin_content_percent text, supplier_batch_no text, width_mm text, length_m text, nominal_area_m2 text, inspector text, box_no text, production_date text, ocr_raw_payload text, activated_at datetime, activated_by text, status text)`,
		`CREATE TABLE prepreg_binding_tokens (id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime, token text UNIQUE, bound_spec_id text, bound_roll_instance_id text, bound_at datetime, expires_at datetime)`,
		`CREATE TABLE product_barcode_bindings (id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime, product_barcode text UNIQUE, prepreg_roll_instance_id text, prepreg_binding_token text, prepreg_qr_code text, barcode_protocol text, barcode_summary text, bound_at datetime, bound_by text, source text, status text)`,
		`CREATE TABLE product_barcode_binding_events (id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime, binding_id text, prepreg_roll_instance_id text, event_type text, product_barcode text, prepreg_binding_token text, payload_snapshot text, operator text, occurred_at datetime)`,
	}
	for _, statement := range schemaStatements {
		if err := testDB.Exec(statement).Error; err != nil {
			t.Fatalf("create test schema: %v", err)
		}
	}

	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	const (
		batchID      = "6d2d6e68-957f-4d1a-b019-3fb64e8d5b54"
		expiredBatch = "d54aa497-b9f5-46e2-90dd-2ac313247181"
		code         = "26719011R140023"
		expiredCode  = "26719011R140024"
		rollID       = "8bf75715-c08b-4a99-b192-3cb2d6883e21"
		token        = "PREPREG-BIND-TOKEN-001"
	)
	expiresAt := time.Now().Add(time.Hour)
	if err := testDB.Exec(
		"INSERT INTO print_batches (id, batch_no, template_name, quantity, activated_count, status, version) VALUES (?, ?, ?, ?, ?, ?, ?)",
		batchID, "P20260719-001", "SO-LINEAR-TEST-L1", 1, 0, "Printed", 1,
	).Error; err != nil {
		t.Fatalf("create print batch: %v", err)
	}
	if err := testDB.Exec(
		"INSERT INTO linear_barcode_inventory_items (id, batch_id, product_id, sales_order_id, sales_order_line_no, code, serial_number, status, expires_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		"9ae028c3-6540-4353-9240-d2385cd3b755", batchID, rollID, "7cf1cb7f-1f13-45c5-b15a-39bc3c8572f6", 1, code, "0023", LinearBarcodeInventoryStatusAvailable, expiresAt, 1,
	).Error; err != nil {
		t.Fatalf("create inventory item: %v", err)
	}
	if err := testDB.Exec(
		"INSERT INTO print_batches (id, batch_no, template_name, quantity, activated_count, status, version) VALUES (?, ?, ?, ?, ?, ?, ?)",
		expiredBatch, "P20260719-002", "SO-LINEAR-TEST-L2", 1, 0, "Printed", 1,
	).Error; err != nil {
		t.Fatalf("create expired print batch: %v", err)
	}
	if err := testDB.Exec(
		"INSERT INTO linear_barcode_inventory_items (id, batch_id, product_id, sales_order_id, sales_order_line_no, code, serial_number, status, expires_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		"6b1cfc45-2ebf-4d02-8743-786cc18e4781", expiredBatch, rollID, "7cf1cb7f-1f13-45c5-b15a-39bc3c8572f6", 2, expiredCode, "0024", LinearBarcodeInventoryStatusAvailable, time.Now().Add(-time.Minute), 1,
	).Error; err != nil {
		t.Fatalf("create expired inventory item: %v", err)
	}
	if err := testDB.Exec(
		"INSERT INTO prepreg_roll_instances (id, binding_token, spec_id, spec_code, spec_name, status) VALUES (?, ?, ?, ?, ?, ?)",
		rollID, token, "spec-1", "CF-200", "Carbon Fabric 200", "ACTIVE",
	).Error; err != nil {
		t.Fatalf("create prepreg roll: %v", err)
	}
	if err := testDB.Exec(
		"INSERT INTO prepreg_binding_tokens (id, token, bound_roll_instance_id, bound_at, expires_at) VALUES (?, ?, ?, ?, ?)",
		"f4ab11ca-46bf-47fb-a8de-c58f8db60b89", token, rollID, time.Now(), expiresAt,
	).Error; err != nil {
		t.Fatalf("create prepreg binding token: %v", err)
	}

	response, err := CreateProductBarcodeBinding(CreateProductBarcodeBindingRequest{
		ProductBarcode: code,
		PrepregQrCode:  token,
	}, "tester")
	if err != nil {
		t.Fatalf("create product barcode binding: %v", err)
	}
	if response.Status != ProductBarcodeBindingStatusBound || response.ProductBarcode != code {
		t.Fatalf("unexpected binding response: %+v", response)
	}
	var unscannedInventory models.LinearBarcodeInventoryItem
	if err := testDB.Where("code = ?", expiredCode).First(&unscannedInventory).Error; err != nil {
		t.Fatalf("load unscanned inventory: %v", err)
	}
	if unscannedInventory.Status != LinearBarcodeInventoryStatusAvailable {
		t.Fatalf("unscanned inventory was refreshed unexpectedly: %+v", unscannedInventory)
	}

	var inventory models.LinearBarcodeInventoryItem
	if err := testDB.Where("code = ?", code).First(&inventory).Error; err != nil {
		t.Fatalf("load inventory: %v", err)
	}
	if inventory.Status != LinearBarcodeInventoryStatusBound || inventory.BoundAt == nil || inventory.Version != 2 {
		t.Fatalf("unexpected bound inventory: %+v", inventory)
	}
	var batch models.PrintBatch
	if err := testDB.Where("id = ?", batchID).First(&batch).Error; err != nil {
		t.Fatalf("load print batch: %v", err)
	}
	if batch.ActivatedCount != 1 || batch.Status != "Activated" || batch.Version != 2 {
		t.Fatalf("unexpected activated batch: %+v", batch)
	}
	var eventCount int64
	if err := testDB.Model(&models.ProductBarcodeBindingEvent{}).Count(&eventCount).Error; err != nil {
		t.Fatalf("count binding events: %v", err)
	}
	if eventCount != 1 {
		t.Fatalf("expected 1 binding event, got %d", eventCount)
	}

	repeated, err := CreateProductBarcodeBinding(CreateProductBarcodeBindingRequest{
		ProductBarcode: code,
		PrepregQrCode:  token,
	}, "tester")
	if err != nil {
		t.Fatalf("repeat product barcode binding: %v", err)
	}
	if repeated.ID != response.ID {
		t.Fatalf("expected idempotent response %s, got %s", response.ID, repeated.ID)
	}
	if err := testDB.Where("id = ?", batchID).First(&batch).Error; err != nil {
		t.Fatalf("reload print batch: %v", err)
	}
	if batch.ActivatedCount != 1 || batch.Version != 2 {
		t.Fatalf("duplicate binding changed batch counters: %+v", batch)
	}

	if _, err := CreateProductBarcodeBinding(CreateProductBarcodeBindingRequest{
		ProductBarcode: expiredCode,
		PrepregQrCode:  token,
	}, "tester"); !errors.Is(err, ErrLinearBarcodeInventoryExpired) {
		t.Fatalf("expected scanned expired inventory error, got %v", err)
	}
	if err := testDB.Where("code = ?", expiredCode).First(&unscannedInventory).Error; err != nil {
		t.Fatalf("reload scanned expired inventory: %v", err)
	}
	if unscannedInventory.Status != LinearBarcodeInventoryStatusExpired || unscannedInventory.Version != 2 {
		t.Fatalf("scanned expired inventory was not refreshed: %+v", unscannedInventory)
	}
}
