package services

import (
	"testing"
	"time"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openSalesOrderAfterSalesSummaryTestDB(t *testing.T) *gorm.DB {
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
		`CREATE TABLE sales_order_lines (id integer PRIMARY KEY, sales_order_id text, line_no integer, product_code text, delivered_qty real)`,
		`CREATE TABLE sales_returns (id text PRIMARY KEY, return_no text, sales_order_id text, status text, tracking_no text, total_quantity real, total_amount real, return_date datetime, created_at datetime, deleted_at datetime)`,
		`CREATE TABLE sales_return_lines (id integer PRIMARY KEY, sales_return_id text, sales_order_line_id integer, quantity real, received_quantity real)`,
		`CREATE TABLE sales_return_line_barcodes (id integer PRIMARY KEY, sales_return_id text, sales_return_line_id integer, sales_order_line_id integer, raw_code text, normalized_code text, product_code_snapshot text, bind_source text, verification_status text, bound_at datetime, bound_by text)`,
		`CREATE TABLE sales_exchanges (id text PRIMARY KEY, exchange_no text, sales_order_id text, status text, exchange_date datetime, total_exchange_quantity real, received_old_item_tracking_no text, replacement_tracking_no text, created_at datetime, deleted_at datetime)`,
		`CREATE TABLE sales_exchange_lines (id integer PRIMARY KEY, sales_exchange_id text, sales_order_line_id integer, exchange_quantity real, old_item_received_quantity real, replacement_shipped_quantity real, replacement_product_code text)`,
		`CREATE TABLE sales_exchange_label_codes (id integer PRIMARY KEY, sales_exchange_id text, sales_exchange_line_id integer, sales_order_line_id integer, side text, raw_label_code text, normalized_label_code text, recognition_source text, recognized_at datetime, status text, unmatched_reason text)`,
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

func TestListSalesOrderAfterSalesSummariesBuildsLineFacts(t *testing.T) {
	testDB := openSalesOrderAfterSalesSummaryTestDB(t)
	orderID := "sales-order-summary-1"

	if err := testDB.Exec(
		`INSERT INTO sales_order_lines (id, sales_order_id, line_no, product_code, delivered_qty)
		 VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
		101, orderID, 1, "PRODUCT-SAME", 10,
		102, orderID, 2, "PRODUCT-SAME", 8,
	).Error; err != nil {
		t.Fatalf("seed sales order lines: %v", err)
	}
	if err := testDB.Exec(
		`INSERT INTO sales_returns
			(id, return_no, sales_order_id, status, tracking_no, total_quantity, total_amount, return_date, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"sales-return-summary-active", "SR-SUMMARY-1", orderID, SalesReturnStatusCreated, "TRACK-1", 3, 30,
		time.Date(2026, 7, 2, 0, 0, 0, 0, time.UTC), time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC),
		"sales-return-summary-canceled", "SR-SUMMARY-CANCELED", orderID, SalesReturnStatusCanceled, "", 99, 0,
		time.Date(2026, 7, 4, 0, 0, 0, 0, time.UTC), time.Date(2026, 7, 3, 0, 0, 0, 0, time.UTC),
	).Error; err != nil {
		t.Fatalf("seed sales returns: %v", err)
	}
	if err := testDB.Exec(
		`INSERT INTO sales_return_lines (id, sales_return_id, sales_order_line_id, quantity, received_quantity)
		 VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
		201, "sales-return-summary-active", 101, 3, 1,
		202, "sales-return-summary-canceled", 101, 99, 99,
	).Error; err != nil {
		t.Fatalf("seed sales return lines: %v", err)
	}
	if err := testDB.Exec(
		`INSERT INTO sales_exchanges
			(id, exchange_no, sales_order_id, status, exchange_date, total_exchange_quantity, received_old_item_tracking_no, replacement_tracking_no, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"sales-exchange-summary-active", "SE-SUMMARY-1", orderID, SalesExchangeStatusReplacementShipped,
		time.Date(2026, 7, 6, 0, 0, 0, 0, time.UTC), 4, "OLD-TRACK-1", "NEW-TRACK-1",
		time.Date(2026, 7, 5, 0, 0, 0, 0, time.UTC),
		"sales-exchange-summary-canceled", "SE-SUMMARY-CANCELED", orderID, SalesExchangeStatusCanceled,
		time.Date(2026, 7, 8, 0, 0, 0, 0, time.UTC), 88, "", "",
		time.Date(2026, 7, 7, 0, 0, 0, 0, time.UTC),
	).Error; err != nil {
		t.Fatalf("seed sales exchanges: %v", err)
	}
	if err := testDB.Exec(
		`INSERT INTO sales_exchange_lines
			(id, sales_exchange_id, sales_order_line_id, exchange_quantity, old_item_received_quantity, replacement_shipped_quantity, replacement_product_code)
		 VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
		301, "sales-exchange-summary-active", 101, 4, 2, 1, "PRODUCT-REPLACEMENT",
		302, "sales-exchange-summary-canceled", 102, 88, 0, 0, "PRODUCT-CANCELED",
	).Error; err != nil {
		t.Fatalf("seed sales exchange lines: %v", err)
	}

	items, err := ListSalesOrderAfterSalesSummaries([]string{orderID})
	if err != nil {
		t.Fatalf("list after-sales summaries: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected one order summary, got %d", len(items))
	}
	if len(items[0].Lines) != 2 {
		t.Fatalf("expected two line summaries, got %d", len(items[0].Lines))
	}

	line := items[0].Lines[0]
	if line.SalesOrderLineID != 101 || line.LineNo != 1 {
		t.Fatalf("unexpected first line identity: %+v", line)
	}
	if line.ProductCode != "PRODUCT-SAME" || line.DeliveredQuantity != 10 {
		t.Fatalf("unexpected first line snapshot: %+v", line)
	}
	if line.ReturnRequestedQuantity != 3 || line.ReturnReceivedQuantity != 1 {
		t.Fatalf("unexpected return quantities: %+v", line)
	}
	if line.ExchangeRequestedQuantity != 4 ||
		line.OldItemReceivedQuantity != 2 ||
		line.ReplacementShippedQuantity != 1 {
		t.Fatalf("unexpected exchange quantities: %+v", line)
	}
	if line.RelatedExchanges[0].ReplacementProductCode != "PRODUCT-REPLACEMENT" {
		t.Fatalf("unexpected replacement product code: %+v", line.RelatedExchanges[0])
	}
	if line.LatestReturnStatus != SalesReturnStatusCreated {
		t.Fatalf("expected latest return status %q, got %q", SalesReturnStatusCreated, line.LatestReturnStatus)
	}
	if line.LatestExchangeStatus != SalesExchangeStatusReplacementShipped {
		t.Fatalf("expected latest exchange status %q, got %q", SalesExchangeStatusReplacementShipped, line.LatestExchangeStatus)
	}
	if len(line.RelatedReturns) != 1 || line.RelatedReturns[0].ID != "sales-return-summary-active" {
		t.Fatalf("expected only active related return, got %+v", line.RelatedReturns)
	}
	if len(line.RelatedExchanges) != 1 || line.RelatedExchanges[0].ID != "sales-exchange-summary-active" {
		t.Fatalf("expected only active related exchange, got %+v", line.RelatedExchanges)
	}
	if items[0].Lines[1].ReturnRequestedQuantity != 0 ||
		items[0].Lines[1].ExchangeRequestedQuantity != 0 {
		t.Fatalf("canceled records leaked into second line summary: %+v", items[0].Lines[1])
	}
}

func TestBindSalesExchangeExecutionBarcodesRejectsCrossLineReuse(t *testing.T) {
	testDB := openSalesOrderAfterSalesSummaryTestDB(t)
	record := models.SalesExchange{BaseModel: models.BaseModel{ID: "sales-exchange-barcode-1"}}
	lineOne := models.SalesExchangeLine{
		ID:               401,
		SalesExchangeID:  record.ID,
		SalesOrderLineID: 501,
		ProductCode:      "PRODUCT-SAME",
	}
	lineTwo := models.SalesExchangeLine{
		ID:               402,
		SalesExchangeID:  record.ID,
		SalesOrderLineID: 502,
		ProductCode:      "PRODUCT-SAME",
	}

	if err := testDB.Transaction(func(tx *gorm.DB) error {
		return bindSalesExchangeExecutionBarcodesTx(
			tx,
			record,
			lineOne,
			[]SalesExchangeExecutionBarcodeInput{{
				RawLabelCode:        "abc-001",
				NormalizedLabelCode: "ABC-001",
			}},
			SalesExchangeLabelSideOldItem,
		)
	}); err != nil {
		t.Fatalf("seed first exchange barcode: %v", err)
	}

	err := testDB.Transaction(func(tx *gorm.DB) error {
		return bindSalesExchangeExecutionBarcodesTx(
			tx,
			record,
			lineTwo,
			[]SalesExchangeExecutionBarcodeInput{{
				RawLabelCode:        "abc-001",
				NormalizedLabelCode: "ABC-001",
			}},
			SalesExchangeLabelSideOldItem,
		)
	})
	if err == nil || err.Error() != "duplicate sales exchange label code" {
		t.Fatalf("expected cross-line barcode reuse to be rejected, got %v", err)
	}

	var count int64
	if err := testDB.Model(&models.SalesExchangeLabelCode{}).
		Where("sales_exchange_id = ?", record.ID).
		Count(&count).Error; err != nil {
		t.Fatalf("count exchange barcodes: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one persisted barcode after rejected reuse, got %d", count)
	}
}

func TestCreateSalesReturnLineBarcodesRejectsCrossLineReuse(t *testing.T) {
	testDB := openSalesOrderAfterSalesSummaryTestDB(t)
	record := models.SalesReturn{
		BaseModel: models.BaseModel{ID: "sales-return-barcode-1"},
		Lines: []models.SalesReturnLine{
			{ID: 601, SalesReturnID: "sales-return-barcode-1", SalesOrderLineID: 701, ProductCode: "PRODUCT-SAME"},
			{ID: 602, SalesReturnID: "sales-return-barcode-1", SalesOrderLineID: 702, ProductCode: "PRODUCT-SAME"},
		},
	}

	if err := testDB.Transaction(func(tx *gorm.DB) error {
		return createSalesReturnLineBarcodesTx(
			tx,
			record,
			[]SalesReturnLineBarcodeInput{{
				SalesReturnLineID: 601,
				RawCode:           "return-001",
				NormalizedCode:    "RETURN-001",
			}},
			"warehouse-user",
			time.Now(),
		)
	}); err != nil {
		t.Fatalf("seed first return barcode: %v", err)
	}

	err := testDB.Transaction(func(tx *gorm.DB) error {
		return createSalesReturnLineBarcodesTx(
			tx,
			record,
			[]SalesReturnLineBarcodeInput{{
				SalesReturnLineID: 602,
				RawCode:           "return-001",
				NormalizedCode:    "RETURN-001",
			}},
			"warehouse-user",
			time.Now(),
		)
	})
	if err == nil || err.Error() != "duplicate sales return line barcode" {
		t.Fatalf("expected cross-line return barcode reuse to be rejected, got %v", err)
	}

	var count int64
	if err := testDB.Model(&models.SalesReturnLineBarcode{}).
		Where("sales_return_id = ?", record.ID).
		Count(&count).Error; err != nil {
		t.Fatalf("count return barcodes: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one persisted return barcode after rejected reuse, got %d", count)
	}
}

func TestCreateSalesReturnLineBarcodesIsIdempotentForSameLine(t *testing.T) {
	testDB := openSalesOrderAfterSalesSummaryTestDB(t)
	record := models.SalesReturn{
		BaseModel: models.BaseModel{ID: "sales-return-barcode-idempotent"},
		Lines: []models.SalesReturnLine{
			{
				ID:               603,
				SalesReturnID:    "sales-return-barcode-idempotent",
				SalesOrderLineID: 703,
				ProductCode:      "PRODUCT-SAME",
			},
		},
	}
	input := []SalesReturnLineBarcodeInput{{
		SalesReturnLineID: 603,
		RawCode:           " return-002 ",
		NormalizedCode:    "return-002",
	}}

	for attempt := 0; attempt < 2; attempt++ {
		if err := testDB.Transaction(func(tx *gorm.DB) error {
			return createSalesReturnLineBarcodesTx(
				tx,
				record,
				input,
				"warehouse-user",
				time.Now(),
			)
		}); err != nil {
			t.Fatalf("idempotent barcode bind attempt %d: %v", attempt+1, err)
		}
	}

	var count int64
	if err := testDB.Model(&models.SalesReturnLineBarcode{}).
		Where("sales_return_id = ?", record.ID).
		Count(&count).Error; err != nil {
		t.Fatalf("count idempotent return barcodes: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one persisted barcode after replay, got %d", count)
	}
}

func TestBindSalesExchangeExecutionBarcodesPromotesUnmatchedLabel(t *testing.T) {
	testDB := openSalesOrderAfterSalesSummaryTestDB(t)
	record := models.SalesExchange{
		BaseModel: models.BaseModel{ID: "sales-exchange-barcode-promote"},
	}
	line := models.SalesExchangeLine{
		ID:               404,
		SalesExchangeID:  record.ID,
		SalesOrderLineID: 504,
		ProductCode:      "PRODUCT-SAME",
	}

	if err := testDB.Exec(
		`INSERT INTO sales_exchange_label_codes
			(id, sales_exchange_id, sales_exchange_line_id, sales_order_line_id, side, raw_label_code, normalized_label_code, recognition_source, recognized_at, status, unmatched_reason)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		405,
		record.ID,
		0,
		0,
		SalesExchangeLabelSideOldItem,
		"scan-001",
		"SCAN-001",
		"warehouseScan",
		time.Now(),
		"Unmatched",
		"等待人工确认",
	).Error; err != nil {
		t.Fatalf("seed unmatched exchange label: %v", err)
	}

	if err := testDB.Transaction(func(tx *gorm.DB) error {
		return bindSalesExchangeExecutionBarcodesTx(
			tx,
			record,
			line,
			[]SalesExchangeExecutionBarcodeInput{{
				RawLabelCode:        "scan-001",
				NormalizedLabelCode: "SCAN-001",
				RecognitionSource:   "warehouseScan",
			}},
			SalesExchangeLabelSideOldItem,
		)
	}); err != nil {
		t.Fatalf("promote unmatched exchange label: %v", err)
	}

	var label models.SalesExchangeLabelCode
	if err := testDB.First(&label, "id = ?", 405).Error; err != nil {
		t.Fatalf("load promoted exchange label: %v", err)
	}
	if label.SalesExchangeLineID != line.ID ||
		label.SalesOrderLineID != line.SalesOrderLineID ||
		label.Status != "Matched" ||
		label.UnmatchedReason != "" {
		t.Fatalf("unexpected promoted exchange label: %+v", label)
	}
}

func TestAfterSalesExecutionHelpersNormalizeAndValidateReplay(t *testing.T) {
	if got := canonicalAfterSalesCode("  ab-001 ", ""); got != "AB-001" {
		t.Fatalf("unexpected canonical after-sales code: %q", got)
	}
	if got := canonicalAfterSalesCode("raw-code", " normalized-code "); got != "NORMALIZED-CODE" {
		t.Fatalf("expected normalized value to win: %q", got)
	}
	if key, err := normalizeAfterSalesExecutionKey("  request-1 "); err != nil || key != "request-1" {
		t.Fatalf("unexpected normalized execution key: %q, %v", key, err)
	}
	if err := validateExecutionReplayCount(2, 1); err == nil {
		t.Fatal("expected partial execution replay to be rejected")
	}
	if err := validateExecutionReplayCount(2, 2); err != nil {
		t.Fatalf("expected complete execution replay to be accepted: %v", err)
	}

	fingerprint, err := salesReturnInboundExecutionFingerprint(ConfirmSalesReturnInboundInput{
		TargetCategory: "RETURNED",
		BatchNo:        "SR-001",
		InboundDate:    time.Date(2026, 7, 28, 10, 0, 0, 0, time.UTC),
		Lines: []ConfirmSalesReturnInboundLineInput{{
			SalesReturnLineID: 1,
			Quantity:          2,
			Barcodes: []SalesReturnLineBarcodeInput{{
				RawCode: " return-001 ",
			}},
		}},
	})
	if err != nil {
		t.Fatalf("build execution fingerprint: %v", err)
	}
	if err := validateExecutionReplayFingerprint(
		[]models.InboundRecord{{ExecutionFingerprint: fingerprint}},
		fingerprint,
	); err != nil {
		t.Fatalf("expected same request fingerprint to replay: %v", err)
	}
	if err := validateExecutionReplayFingerprint(
		[]models.InboundRecord{{ExecutionFingerprint: fingerprint}},
		"another-fingerprint",
	); err == nil {
		t.Fatal("expected a different request fingerprint to be rejected")
	}

	firstDefaultDateFingerprint, err := salesReturnInboundExecutionFingerprint(
		ConfirmSalesReturnInboundInput{
			TargetCategory: "RETURNED",
			BatchNo:        "SR-001",
			InboundDate:    time.Date(2026, 7, 28, 10, 0, 0, 0, time.UTC),
			Lines: []ConfirmSalesReturnInboundLineInput{{
				SalesReturnLineID: 1,
				Quantity:          2,
			}},
		},
	)
	if err != nil {
		t.Fatalf("build first default-date fingerprint: %v", err)
	}
	secondDefaultDateFingerprint, err := salesReturnInboundExecutionFingerprint(
		ConfirmSalesReturnInboundInput{
			TargetCategory: "RETURNED",
			BatchNo:        "SR-001",
			InboundDate:    time.Date(2026, 7, 28, 10, 0, 1, 0, time.UTC),
			Lines: []ConfirmSalesReturnInboundLineInput{{
				SalesReturnLineID: 1,
				Quantity:          2,
			}},
		},
	)
	if err != nil {
		t.Fatalf("build second default-date fingerprint: %v", err)
	}
	if firstDefaultDateFingerprint != secondDefaultDateFingerprint {
		t.Fatal("server-generated default dates must not change replay fingerprints")
	}

	if !isAfterSalesExecutionSourceType("SALES_RETURN") {
		t.Fatal("sales return source type must use its dedicated inventory path")
	}
}

func TestAfterSalesExecutionSourceTypesUseDedicatedInventoryPaths(t *testing.T) {
	for _, sourceType := range []string{
		AfterSalesSourceSalesReturn,
		AfterSalesSourceSalesExchangeOldItem,
		AfterSalesSourceSalesExchangeReplacement,
		" sales_return ",
	} {
		if !isAfterSalesExecutionSourceType(sourceType) {
			t.Fatalf("expected source type %q to be reserved", sourceType)
		}
		if !isDedicatedInventoryExecutionSourceType(sourceType) {
			t.Fatalf("expected source type %q to use a dedicated inventory path", sourceType)
		}
	}
	if isAfterSalesExecutionSourceType("PURCHASE_RECEIPT") {
		t.Fatal("purchase receipt source type must remain available to generic inventory flow")
	}
	if isDedicatedInventoryExecutionSourceType("PURCHASE_RECEIPT") {
		t.Fatal("purchase receipt source type must remain available to generic inventory flow")
	}
}

func TestNormalizeSalesExchangeStatusFiltersAcceptsMultipleValues(t *testing.T) {
	statuses := normalizeSalesExchangeStatusFilters(
		"Draft, olditempartiallyreceived, Draft, all",
	)
	if len(statuses) != 2 {
		t.Fatalf("expected two normalized statuses, got %+v", statuses)
	}
	if statuses[0] != SalesExchangeStatusDraft ||
		statuses[1] != SalesExchangeStatusOldItemPartiallyReceived {
		t.Fatalf("unexpected normalized statuses: %+v", statuses)
	}
}

func TestSalesExchangeExecutionStatusDistinguishesPartialReplacementShipment(t *testing.T) {
	if status := deriveSalesExchangeLineExecutionStatus(1, 0, 2); status != SalesExchangeStatusOldItemPartiallyReceived {
		t.Fatalf("expected partial old item status, got %q", status)
	}
	if status := deriveSalesExchangeLineExecutionStatus(2, 0, 2); status != SalesExchangeStatusOldItemReceived {
		t.Fatalf("expected old item received status, got %q", status)
	}
	if status := deriveSalesExchangeLineExecutionStatus(2, 1, 2); status != SalesExchangeStatusReplacementPartiallyShipped {
		t.Fatalf("expected partial replacement shipment status, got %q", status)
	}
	if status := deriveSalesExchangeLineExecutionStatus(2, 2, 2); status != SalesExchangeStatusReplacementShipped {
		t.Fatalf("expected completed replacement shipment status, got %q", status)
	}

	record := models.SalesExchange{
		Lines: []models.SalesExchangeLine{
			{
				ExchangeQuantity:           2,
				OldItemReceivedQuantity:    2,
				ReplacementShippedQuantity: 1,
			},
		},
	}
	if status := deriveSalesExchangeExecutionStatus(record); status != SalesExchangeStatusReplacementPartiallyShipped {
		t.Fatalf("expected partial exchange status, got %q", status)
	}

	partialOldItemRecord := models.SalesExchange{
		Lines: []models.SalesExchangeLine{
			{
				ExchangeQuantity:        2,
				OldItemReceivedQuantity: 1,
			},
		},
	}
	if status := deriveSalesExchangeExecutionStatus(partialOldItemRecord); status != SalesExchangeStatusOldItemPartiallyReceived {
		t.Fatalf("expected partial old item exchange status, got %q", status)
	}
}
