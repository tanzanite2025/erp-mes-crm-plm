package services

import (
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openSalesExchangeReversalTestDB(t *testing.T) *gorm.DB {
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
		`CREATE TABLE sales_exchanges (
			id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime,
			exchange_no text, sales_order_id text, sales_order_no text, customer_id text,
			customer_name text, status text, exchange_date datetime, expected_replacement_date datetime,
			received_old_item_tracking_no text, replacement_tracking_no text, exchange_reason text,
			exchange_remarks text, operator text, total_exchange_quantity real,
			old_item_inbound_confirmed_at datetime, old_item_inbound_confirmed_by text,
			old_item_inbound_target text, old_item_inbound_batch_no text,
			old_item_inbound_remarks text, replacement_shipped_at datetime,
			replacement_shipped_by text, replacement_source_category text,
			replacement_batch_no text, replacement_shipment_remarks text
		)`,
		`CREATE TABLE sales_exchange_lines (
			id integer PRIMARY KEY, sales_exchange_id text, sales_order_line_id integer,
			line_no integer, product_id text, product_code text, product_model text,
			specification text, product_display_title_snapshot text,
			product_display_subtitle_snapshot text, product_display_code_snapshot text,
			product_display_full_label_snapshot text, product_display_strategy_version_snapshot text,
			description text, uom text, original_order_quantity real, delivered_quantity real,
			exchange_quantity real, old_item_received_quantity real,
			replacement_shipped_quantity real, status text, replacement_mode text,
			replacement_product_code text, replacement_product_model text,
			issue_category text, issue_description text
		)`,
		`CREATE TABLE sales_exchange_label_codes (
			id integer PRIMARY KEY, sales_exchange_id text, sales_exchange_line_id integer,
			sales_order_line_id integer, side text, raw_label_code text,
			normalized_label_code text, recognition_source text, recognized_at datetime,
			status text, unmatched_reason text
		)`,
		`CREATE TABLE inventory (
			id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime,
			material_id text, material_name text, material_code text, material_spec text,
			quantity real, total_value real, average_unit_cost real, category_code text,
			batch_no text, uom text
		)`,
		`CREATE TABLE shipment_records (
			id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime,
			material_id text, material_name text, material_code text, source_type text,
			source_id text, source_line_id integer, execution_key text,
			execution_fingerprint text, sales_order_id text, sales_order_line_id integer,
			quantity real, source_category text, batch_no text, order_no text,
			tracking_no text, status text, cogs real, shipment_date datetime,
			operator text, remarks text
		)`,
		`CREATE TABLE audit_logs (
			id text PRIMARY KEY, module text, target_id text, action text, diff text,
			operator text, ip text, created_at datetime
		)`,
	}
	for _, statement := range schemaStatements {
		if err := testDB.Exec(statement).Error; err != nil {
			t.Fatalf("migrate reversal schema: %v", err)
		}
	}

	previousDB := db.DB
	db.DB = testDB
	t.Cleanup(func() { db.DB = previousDB })
	return testDB
}

func TestVoidSalesExchangeReplacementShipmentRollsBackOnlyAfterSalesFacts(t *testing.T) {
	testDB := openSalesExchangeReversalTestDB(t)
	exchangeID := "sales-exchange-void-1"
	lineID := uint(501)
	shipmentID := "sales-exchange-shipment-void-1"

	exchange := models.SalesExchange{
		BaseModel:    models.BaseModel{ID: exchangeID},
		ExchangeNo:   "SE-VOID-001",
		SalesOrderID: "sales-order-void-1",
		Status:       SalesExchangeStatusReplacementShipped,
	}
	if err := testDB.Create(&exchange).Error; err != nil {
		t.Fatalf("create exchange: %v", err)
	}
	line := models.SalesExchangeLine{
		ID:                         lineID,
		SalesExchangeID:            exchangeID,
		SalesOrderLineID:           601,
		ExchangeQuantity:           2,
		OldItemReceivedQuantity:    2,
		ReplacementShippedQuantity: 2,
		Status:                     SalesExchangeStatusReplacementShipped,
		ProductCode:                "REPLACEMENT-001",
		ReplacementProductCode:     "REPLACEMENT-001",
	}
	if err := testDB.Create(&line).Error; err != nil {
		t.Fatalf("create exchange line: %v", err)
	}
	if err := testDB.Create(&models.Inventory{
		BaseModel:       models.BaseModel{ID: "inventory-void-1"},
		MaterialID:      "material-void-1",
		MaterialName:    "Replacement",
		MaterialCode:    "REPLACEMENT-001",
		Quantity:        3,
		TotalValue:      30,
		AverageUnitCost: 10,
		CategoryCode:    "FINISHED",
		BatchNo:         exchangeID,
	}).Error; err != nil {
		t.Fatalf("create inventory: %v", err)
	}
	if err := testDB.Create(&models.ShipmentRecord{
		BaseModel:        models.BaseModel{ID: shipmentID},
		MaterialID:       "material-void-1",
		MaterialName:     "Replacement",
		MaterialCode:     "REPLACEMENT-001",
		SourceType:       AfterSalesSourceSalesExchangeReplacement,
		SourceID:         exchangeID,
		SourceLineID:     lineID,
		SalesOrderID:     "sales-order-void-1",
		SalesOrderLineID: 601,
		Quantity:         2,
		SourceCategory:   "FINISHED",
		BatchNo:          exchangeID,
		TrackingNo:       "TRACK-VOID-001",
		OrderNo:          "SE-VOID-001",
		Status:           "COMMITTED",
		COGS:             20,
	}).Error; err != nil {
		t.Fatalf("create shipment: %v", err)
	}

	result, err := VoidSalesExchangeReplacementShipment(
		VoidSalesExchangeReplacementShipmentInput{
			SalesExchangeID: exchangeID,
			ShipmentID:      shipmentID,
			Operator:        "warehouse-user",
			Reason:          "补发产品扫描错误",
		},
	)
	if err != nil {
		t.Fatalf("void replacement shipment: %v", err)
	}
	if result.Shipment.Status != "VOID" {
		t.Fatalf("expected shipment to be VOID, got %q", result.Shipment.Status)
	}
	if result.SalesExchange.Status != SalesExchangeStatusOldItemReceived {
		t.Fatalf("expected exchange to return to old-item-received, got %q", result.SalesExchange.Status)
	}

	var inventory models.Inventory
	if err := testDB.First(&inventory, "id = ?", "inventory-void-1").Error; err != nil {
		t.Fatalf("load inventory: %v", err)
	}
	if inventory.Quantity != 5 || inventory.TotalValue != 50 || inventory.AverageUnitCost != 10 {
		t.Fatalf("unexpected inventory after void: %+v", inventory)
	}

	var updatedLine models.SalesExchangeLine
	if err := testDB.First(&updatedLine, "id = ?", lineID).Error; err != nil {
		t.Fatalf("load exchange line: %v", err)
	}
	if updatedLine.ReplacementShippedQuantity != 0 ||
		updatedLine.Status != SalesExchangeStatusOldItemReceived {
		t.Fatalf("unexpected exchange line after void: %+v", updatedLine)
	}

	var auditCount int64
	if err := testDB.Model(&models.AuditLog{}).
		Where("target_id = ? AND action = ?", shipmentID, "SALES_EXCHANGE_REPLACEMENT_SHIPMENT_VOID").
		Count(&auditCount).Error; err != nil {
		t.Fatalf("count reversal audit: %v", err)
	}
	if auditCount != 1 {
		t.Fatalf("expected one reversal audit, got %d", auditCount)
	}
}
