package services

import (
	"errors"
	"testing"
	"time"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
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
		`CREATE TABLE sales_orders (id text PRIMARY KEY, order_no text, status text, type text, classification text, evidences blob, created_at datetime, updated_at datetime, deleted_at datetime)`,
		`CREATE TABLE sales_order_lines (id integer PRIMARY KEY AUTOINCREMENT, sales_order_id text, line_no integer, product_id text, model_code_snapshot text, appearance_barcode_code_snapshot text, hole_prefix_snapshot text, hole_count integer, qty real, uom text)`,
		`CREATE TABLE print_batches (id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime, batch_no text UNIQUE, template_name text, product_id text, bom_id text, start_sn text, end_sn text, full_code text, sales_order_id text, sales_order_line_no integer, quantity integer, activated_count integer, status text, expires_at datetime, version integer)`,
		`CREATE TABLE linear_barcode_inventory_items (id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime, batch_id text, product_id text, sales_order_id text, sales_order_line_id integer NOT NULL DEFAULT 0, sales_order_line_no integer, code text UNIQUE, serial_number text, status text, expires_at datetime, bound_at datetime, version integer)`,
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
		"Pending",
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
	for _, status := range []string{"Draft", "Done", "Canceled"} {
		require.NoError(t, testDB.Model(&models.SalesOrder{}).Where("id = ?", orderID).Update("status", status).Error)
		_, err := CreateLinearBarcodeBatch(CreateLinearBarcodeBatchRequest{SalesOrderID: orderID, SalesOrderLineNo: 1, Quantity: 1})
		require.ErrorIs(t, err, ErrLinearBarcodeOrderNotPrintable)
	}
	require.NoError(t, testDB.Model(&models.SalesOrder{}).Where("id = ?", orderID).Updates(map[string]any{"status": "Pending", "classification": " quote "}).Error)
	_, err = CreateLinearBarcodeBatch(CreateLinearBarcodeBatchRequest{SalesOrderID: orderID, SalesOrderLineNo: 1, Quantity: 1})
	require.ErrorIs(t, err, ErrLinearBarcodeSalesOrderNotFound)
	require.NoError(t, testDB.Model(&models.SalesOrder{}).Where("id = ?", orderID).Updates(map[string]any{"classification": "", "type": "QUOTE"}).Error)
	_, err = CreateLinearBarcodeBatch(CreateLinearBarcodeBatchRequest{SalesOrderID: orderID, SalesOrderLineNo: 1, Quantity: 1})
	require.ErrorIs(t, err, ErrLinearBarcodeSalesOrderNotFound)
	require.NoError(t, testDB.Model(&models.SalesOrder{}).Where("id = ?", orderID).Update("type", "").Error)
	var rejectedInventoryCount int64
	require.NoError(t, testDB.Model(&models.LinearBarcodeInventoryItem{}).Count(&rejectedInventoryCount).Error)
	require.Zero(t, rejectedInventoryCount)
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
	legacyCode := "legacy-order-line-code"
	require.NoError(t, testDB.Exec(
		"INSERT INTO linear_barcode_inventory_items (id, batch_id, product_id, sales_order_id, sales_order_line_no, code, serial_number, status, expires_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		"legacy-active-code", "6d2d6e68-957f-4d1a-b019-3fb64e8d5b54", productID, orderID, 1, legacyCode, "0000", LinearBarcodeInventoryStatusAvailable, time.Now().Add(time.Hour), 1,
	).Error)
	require.NoError(t, testDB.Exec(
		"INSERT INTO linear_barcode_inventory_items (id, batch_id, product_id, sales_order_id, sales_order_line_no, code, serial_number, status, expires_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		"another-order-legacy-code", "6d2d6e68-957f-4d1a-b019-3fb64e8d5b54", productID, "different-order", 1, "other-order-legacy", "0001", LinearBarcodeInventoryStatusAvailable, time.Now().Add(time.Hour), 1,
	).Error)
	legacyInventory, err := ListLinearBarcodeInventory(ListLinearBarcodeInventoryRequest{SalesOrderID: orderID})
	require.NoError(t, err)
	require.EqualValues(t, 1, legacyInventory.UnattributedIssuedQuantity)
	_, err = CreateLinearBarcodeBatch(CreateLinearBarcodeBatchRequest{SalesOrderID: orderID, SalesOrderLineNo: 1, Quantity: 1})
	require.ErrorIs(t, err, ErrLinearBarcodeOrderHasUnattributedLegacyInventory)
	require.NoError(t, testDB.Delete(&models.LinearBarcodeInventoryItem{}, "id = ?", "legacy-active-code").Error)

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
		Limit:        1,
	})
	if err != nil {
		t.Fatalf("list inventory: %v", err)
	}
	if listed.Total != 3 || len(listed.Items) != 1 {
		t.Fatalf("unexpected inventory list: total=%d items=%d", listed.Total, len(listed.Items))
	}
	require.Len(t, listed.OrderLineIssuanceSummaries, 1)
	require.Equal(t, float64(50), listed.OrderLineIssuanceSummaries[0].OrderQuantity)
	require.Equal(t, int64(3), listed.OrderLineIssuanceSummaries[0].IssuedQuantity)
	require.Equal(t, float64(47), listed.OrderLineIssuanceSummaries[0].RemainingQuantity)
	var orderLine models.SalesOrderLine
	require.NoError(t, testDB.Where("sales_order_id = ? AND line_no = ?", orderID, 1).First(&orderLine).Error)
	var issuedInventory models.LinearBarcodeInventoryItem
	require.NoError(t, testDB.Where("code = ?", result.Items[0].Code).First(&issuedInventory).Error)
	require.Equal(t, orderLine.ID, issuedInventory.SalesOrderLineID)
	require.NoError(t, testDB.Model(&models.SalesOrderLine{}).Where("id = ?", orderLine.ID).Updates(map[string]any{"line_no": 2, "qty": 3}).Error)
	listed, err = ListLinearBarcodeInventory(ListLinearBarcodeInventoryRequest{
		SalesOrderID: orderID,
		Limit:        1,
	})
	require.NoError(t, err)
	require.Equal(t, 2, listed.OrderLineIssuanceSummaries[0].SalesOrderLineNo)
	require.Equal(t, int64(3), listed.OrderLineIssuanceSummaries[0].IssuedQuantity)
	require.Zero(t, listed.OrderLineIssuanceSummaries[0].RemainingQuantity)
	require.NoError(t, testDB.Model(&models.SalesOrderLine{}).Where("id = ?", orderLine.ID).Update("qty", 3.5).Error)
	_, err = CreateLinearBarcodeBatch(CreateLinearBarcodeBatchRequest{
		SalesOrderID:     orderID,
		SalesOrderLineNo: 2,
		Quantity:         1,
	})
	var validationError *LinearBarcodePrintValidationError
	require.ErrorAs(t, err, &validationError)
	require.Contains(t, validationError.Error(), "订单行数量必须是大于 0 的整数")
	require.NoError(t, testDB.Model(&models.SalesOrderLine{}).Where("id = ?", orderLine.ID).Update("qty", 3).Error)
	_, err = CreateLinearBarcodeBatch(CreateLinearBarcodeBatchRequest{
		SalesOrderID:     orderID,
		SalesOrderLineNo: 2,
		Quantity:         1,
	})
	var issuanceLimitError *LinearBarcodeOrderLineIssuanceLimitError
	require.ErrorAs(t, err, &issuanceLimitError)
	require.Equal(t, int64(3), issuanceLimitError.IssuedQuantity)
	require.Zero(t, issuanceLimitError.RemainingQuantity)
	require.NoError(t, testDB.Model(&models.SalesOrderLine{}).Where("id = ?", orderLine.ID).Update("qty", 50).Error)

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
	expiredInventory, err := ListLinearBarcodeInventory(ListLinearBarcodeInventoryRequest{
		SalesOrderID: orderID,
		Status:       LinearBarcodeInventoryStatusExpired,
	})
	require.NoError(t, err)
	require.EqualValues(t, 1, expiredInventory.Total)
	require.Equal(t, LinearBarcodeInventoryStatusExpired, expiredInventory.Items[0].Status)
	availableInventory, err := ListLinearBarcodeInventory(ListLinearBarcodeInventoryRequest{
		SalesOrderID: orderID,
		Status:       LinearBarcodeInventoryStatusAvailable,
	})
	require.NoError(t, err)
	require.EqualValues(t, 1, availableInventory.Total)
	require.Equal(t, LinearBarcodeInventoryStatusAvailable, availableInventory.Items[0].Status)
	effectiveIssuedCount, err := countEffectiveIssuedLinearBarcodesForSalesOrderLineTx(
		testDB,
		orderID,
		orderLine,
		time.Now(),
	)
	require.NoError(t, err)
	require.Equal(t, int64(2), effectiveIssuedCount)
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
		return ScrapLinearBarcodePrintBatchTx(tx, result.Batch.ID)
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
	effectiveIssuedCount, err = countEffectiveIssuedLinearBarcodesForSalesOrderLineTx(testDB, orderID, orderLine, time.Now())
	require.NoError(t, err)
	require.EqualValues(t, 1, effectiveIssuedCount)
	var scrappedBatch models.PrintBatch
	require.NoError(t, testDB.First(&scrappedBatch, "id = ?", result.Batch.ID).Error)
	require.Equal(t, "Scrapped", scrappedBatch.Status)
	require.Equal(t, 1, scrappedBatch.ActivatedCount)
	require.Equal(t, 3, scrappedBatch.Version)
	replenishment, err := CreateLinearBarcodeBatch(CreateLinearBarcodeBatchRequest{
		SalesOrderID:     orderID,
		SalesOrderLineNo: 2,
		Quantity:         49,
	})
	require.NoError(t, err)
	require.Len(t, replenishment.Items, 49)
	listed, err = ListLinearBarcodeInventory(ListLinearBarcodeInventoryRequest{
		SalesOrderID: orderID,
		Limit:        1,
	})
	require.NoError(t, err)
	require.Equal(t, int64(50), listed.OrderLineIssuanceSummaries[0].IssuedQuantity)
	require.Zero(t, listed.OrderLineIssuanceSummaries[0].RemainingQuantity)
	_, err = CreateLinearBarcodeBatch(CreateLinearBarcodeBatchRequest{
		SalesOrderID:     orderID,
		SalesOrderLineNo: 2,
		Quantity:         1,
	})
	require.ErrorAs(t, err, &issuanceLimitError)
	require.Equal(t, int64(50), issuanceLimitError.IssuedQuantity)
	require.Zero(t, issuanceLimitError.RemainingQuantity)
	require.NoError(t, testDB.Model(&models.SalesOrderLine{}).Where("id = ?", orderLine.ID).Update("qty", 52).Error)
	for _, status := range []string{"Scheduling", "InProgress"} {
		require.NoError(t, testDB.Model(&models.SalesOrder{}).Where("id = ?", orderID).Update("status", status).Error)
		issuedWithStableLineID, err := CreateLinearBarcodeBatch(CreateLinearBarcodeBatchRequest{
			SalesOrderID:     orderID,
			SalesOrderLineID: orderLine.ID,
			SalesOrderLineNo: 1,
			Quantity:         1,
		})
		require.NoError(t, err)
		require.Equal(t, 2, issuedWithStableLineID.Batch.SalesOrderLineNo)
		var order models.SalesOrder
		require.NoError(t, testDB.First(&order, "id = ?", orderID).Error)
		require.Equal(t, status, order.Status)
	}

	staleExpiredCode := replenishment.Items[0].Code
	stillAvailableCode := replenishment.Items[1].Code
	require.NoError(t, testDB.Model(&models.LinearBarcodeInventoryItem{}).
		Where("code = ?", staleExpiredCode).
		Update("expires_at", time.Now().Add(-time.Minute)).Error)
	require.NoError(t, testDB.Transaction(func(tx *gorm.DB) error {
		return ScrapLinearBarcodePrintBatchTx(tx, replenishment.Batch.ID)
	}))
	var staleExpiredItem models.LinearBarcodeInventoryItem
	require.NoError(t, testDB.Where("code = ?", staleExpiredCode).First(&staleExpiredItem).Error)
	require.Equal(t, LinearBarcodeInventoryStatusAvailable, staleExpiredItem.Status)
	require.Equal(t, 1, staleExpiredItem.Version)
	expiredBatchInventory, err := ListLinearBarcodeInventory(ListLinearBarcodeInventoryRequest{
		BatchID: replenishment.Batch.ID,
		Status:  LinearBarcodeInventoryStatusExpired,
	})
	require.NoError(t, err)
	require.EqualValues(t, 1, expiredBatchInventory.Total)
	require.Equal(t, staleExpiredCode, expiredBatchInventory.Items[0].Code)
	var scrappedAvailableItem models.LinearBarcodeInventoryItem
	require.NoError(t, testDB.Where("code = ?", stillAvailableCode).First(&scrappedAvailableItem).Error)
	require.Equal(t, LinearBarcodeInventoryStatusScrapped, scrappedAvailableItem.Status)
}
