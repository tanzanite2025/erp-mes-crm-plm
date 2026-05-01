package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func setupArApHandlerTestDB(t *testing.T) {
	t.Helper()
	testDB := setupHandlerSQLiteTestDB(t)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			order_name TEXT,
			customer_name TEXT,
			customer_id TEXT,
			type TEXT,
			currency TEXT,
			exchange_rate_snapshot REAL,
			payment_method TEXT,
			payment_method_name TEXT,
			payment_term TEXT,
			payment_term_name TEXT,
			classification TEXT,
			status TEXT,
			status_note TEXT,
			amount REAL,
			quantity REAL,
			order_date TEXT,
			delivery_date TEXT,
			purchase_order_no TEXT,
			barcode TEXT,
			requirements TEXT,
			evidences BLOB DEFAULT X'5B5D',
			created_at DATETIME,
			updated_at DATETIME,
			updated_by TEXT,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		);
		CREATE TABLE payable_ledgers (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			ledger_no TEXT NOT NULL,
			source_type TEXT NOT NULL,
			source_ref_id TEXT NOT NULL,
			supplier_id TEXT,
			supplier_name TEXT NOT NULL,
			currency TEXT NOT NULL,
			original_amount REAL NOT NULL,
			settled_amount REAL NOT NULL,
			outstanding_amount REAL NOT NULL,
			due_date TEXT,
			status TEXT NOT NULL,
			version INTEGER NOT NULL
		);
		CREATE TABLE receipt_records (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			record_no TEXT NOT NULL,
			ledger_id TEXT NOT NULL,
			sales_order_id TEXT,
			amount REAL NOT NULL,
			currency TEXT NOT NULL,
			payment_method TEXT,
			payment_term TEXT,
			record_date TEXT,
			received_at TEXT,
			receipt_account TEXT,
			status TEXT NOT NULL,
			reference_no TEXT
		);
		CREATE TABLE payment_records (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			record_no TEXT NOT NULL,
			ledger_id TEXT NOT NULL,
			amount REAL NOT NULL,
			currency TEXT NOT NULL,
			payment_method TEXT,
			payment_term TEXT,
			record_date TEXT,
			status TEXT NOT NULL,
			reference_no TEXT
		);
		CREATE TABLE settlement_allocations (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			ledger_id TEXT NOT NULL,
			sales_order_id TEXT,
			receipt_record_id TEXT,
			payment_record_id TEXT,
			allocated_amount REAL NOT NULL,
			sequence_no INTEGER NOT NULL,
			remark TEXT,
			operator TEXT
		);
		CREATE TABLE settlement_evidence_assets (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			file_name TEXT NOT NULL,
			file_url TEXT NOT NULL,
			mime_type TEXT,
			file_size INTEGER NOT NULL,
			category TEXT NOT NULL,
			uploaded_by TEXT
		);
		CREATE TABLE settlement_record_evidences (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			record_type TEXT NOT NULL,
			record_id TEXT NOT NULL,
			asset_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL,
			note TEXT,
			is_primary BOOLEAN NOT NULL
		);
		CREATE TABLE sales_return_actual_amount_records (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			sales_return_id TEXT,
			sales_order_id TEXT,
			sales_order_no TEXT,
			return_no TEXT,
			customer_id TEXT,
			customer_name TEXT,
			amount REAL,
			note TEXT,
			evidences BLOB DEFAULT X'5B5D',
			estimated_return_amount_snapshot REAL,
			recorded_at DATETIME,
			recorded_by TEXT
		);
	`).Error)
}

type seededReceivableOrder struct {
	ID                string
	DocumentNo        string
	SourceRefID       string
	CustomerName      string
	Currency          string
	OutstandingAmount float64
	Status            string
	DueDate           string
}

func seedReceivableLedger(t *testing.T, outstanding float64, status string) seededReceivableOrder {
	t.Helper()
	ledgerID := uuid.NewString()
	now := time.Now()
	orderAmount := outstanding
	orderStatus := "Pending"
	deliveryDate := "2026-04-30"
	if strings.EqualFold(status, models.LedgerStatusSettled) {
		orderAmount = 0
	}
	if strings.EqualFold(status, models.LedgerStatusOverdue) {
		deliveryDate = "2026-04-01"
	}
	if strings.EqualFold(status, models.LedgerStatusCancelled) {
		orderStatus = "Canceled"
	}
	ledger := seededReceivableOrder{
		ID:                ledgerID,
		DocumentNo:        "AR-" + strings.ToUpper(uuid.NewString()[:8]),
		SourceRefID:       ledgerID,
		CustomerName:      "测试客户",
		Currency:          "CNY",
		OutstandingAmount: outstanding,
		Status:            status,
		DueDate:           deliveryDate,
	}
	require.NoError(t, db.DB.Exec(`
		INSERT INTO sales_orders (id, order_no, customer_name, customer_id, currency, status, amount, quantity, order_date, delivery_date, created_at, updated_at, updated_by, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, ledger.ID, ledger.DocumentNo, ledger.CustomerName, "CUST-001", ledger.Currency, orderStatus, orderAmount, 1.0, "2026-04-13", ledger.DueDate, now, now, "tester", false, 1).Error)
	return ledger
}

func seedPayableLedger(t *testing.T, outstanding float64, status string) models.PayableLedger {
	t.Helper()
	ledger := models.PayableLedger{
		BaseModel:         models.BaseModel{ID: uuid.NewString(), CreatedAt: time.Now(), UpdatedAt: time.Now()},
		LedgerNo:          "AP-" + strings.ToUpper(uuid.NewString()[:8]),
		SourceType:        "PURCHASE_ORDER",
		SourceRefID:       "PO-001",
		SupplierID:        "SUP-001",
		SupplierName:      "测试供应商",
		Currency:          "CNY",
		OriginalAmount:    100,
		SettledAmount:     100 - outstanding,
		OutstandingAmount: outstanding,
		DueDate:           "2026-04-30",
		Status:            status,
		Version:           1,
	}
	require.NoError(t, db.DB.Create(&ledger).Error)
	return ledger
}

func seedReceivableLedgerForSearch(t *testing.T, ledgerNo string, customerName string, currency string, outstanding float64, status string) seededReceivableOrder {
	t.Helper()
	ledgerID := uuid.NewString()
	now := time.Now()
	orderAmount := outstanding
	orderStatus := "Pending"
	deliveryDate := "2026-04-30"
	if strings.EqualFold(status, models.LedgerStatusSettled) {
		orderAmount = 0
	}
	if strings.EqualFold(status, models.LedgerStatusOverdue) {
		deliveryDate = "2026-04-01"
	}
	if strings.EqualFold(status, models.LedgerStatusCancelled) {
		orderStatus = "Canceled"
	}
	ledger := seededReceivableOrder{
		ID:                ledgerID,
		DocumentNo:        ledgerNo,
		SourceRefID:       ledgerID,
		CustomerName:      customerName,
		Currency:          currency,
		OutstandingAmount: outstanding,
		Status:            status,
		DueDate:           deliveryDate,
	}
	require.NoError(t, db.DB.Exec(`
		INSERT INTO sales_orders (id, order_no, customer_name, customer_id, currency, status, amount, quantity, order_date, delivery_date, created_at, updated_at, updated_by, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, ledger.ID, ledger.DocumentNo, ledger.CustomerName, "CUST-SEARCH", ledger.Currency, orderStatus, orderAmount, 1.0, "2026-04-13", ledger.DueDate, now, now, "tester", false, 1).Error)
	return ledger
}

func seedPayableLedgerForSearch(t *testing.T, ledgerNo string, supplierName string, currency string, outstanding float64, status string) models.PayableLedger {
	t.Helper()
	ledger := models.PayableLedger{
		BaseModel:         models.BaseModel{ID: uuid.NewString(), CreatedAt: time.Now(), UpdatedAt: time.Now()},
		LedgerNo:          ledgerNo,
		SourceType:        "PURCHASE_ORDER",
		SourceRefID:       "PO-SEARCH",
		SupplierID:        "SUP-SEARCH",
		SupplierName:      supplierName,
		Currency:          currency,
		OriginalAmount:    outstanding,
		SettledAmount:     0,
		OutstandingAmount: outstanding,
		DueDate:           "2026-04-30",
		Status:            status,
		Version:           1,
	}
	require.NoError(t, db.DB.Create(&ledger).Error)
	return ledger
}

func requireLedgerSearchResponseJSONContract(t *testing.T, recorder *httptest.ResponseRecorder, expected services.LedgerSearchCandidateResponse) {
	t.Helper()

	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.ElementsMatch(t, []string{"items", "total", "page", "pageSize"}, mapKeys(payload))
	require.IsType(t, []any{}, payload["items"])
	require.IsType(t, float64(0), payload["total"])
	require.IsType(t, float64(0), payload["page"])
	require.IsType(t, float64(0), payload["pageSize"])

	items := payload["items"].([]any)
	require.Len(t, items, 1)
	item, ok := items[0].(map[string]any)
	require.True(t, ok)
	require.ElementsMatch(t, []string{"id", "documentNo", "partnerName", "outstandingAmount", "status", "currency"}, mapKeys(item))
	require.Equal(t, expected.ID, item["id"])
	require.Equal(t, expected.DocumentNo, item["documentNo"])
	require.Equal(t, expected.PartnerName, item["partnerName"])
	require.Equal(t, expected.OutstandingAmount, item["outstandingAmount"])
	require.Equal(t, expected.Status, item["status"])
	require.Equal(t, expected.Currency, item["currency"])
}

func requirePayableListPageJSONContract(t *testing.T, recorder *httptest.ResponseRecorder) {
	t.Helper()

	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.ElementsMatch(t, []string{"items", "total", "page", "pageSize", "summary"}, mapKeys(payload))
	require.IsType(t, []any{}, payload["items"])
	require.IsType(t, float64(0), payload["total"])
	require.IsType(t, float64(0), payload["page"])
	require.IsType(t, float64(0), payload["pageSize"])

	summary, ok := payload["summary"].(map[string]any)
	require.True(t, ok)
	require.ElementsMatch(t, []string{"totalPayable", "overduePayable", "pendingPaymentCount"}, mapKeys(summary))

	items := payload["items"].([]any)
	require.Len(t, items, 1)
	item, ok := items[0].(map[string]any)
	require.True(t, ok)
	require.ElementsMatch(t, []string{
		"id",
		"documentNo",
		"supplierName",
		"currency",
		"invoiceAmount",
		"paidAmount",
		"outstandingAmount",
		"dueDate",
		"agingBucket",
		"status",
		"createdAt",
		"updatedAt",
	}, mapKeys(item))
}

func requireReceivableListPageJSONContract(t *testing.T, recorder *httptest.ResponseRecorder) {
	t.Helper()

	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.ElementsMatch(t, []string{"items", "total", "page", "pageSize", "summary"}, mapKeys(payload))
	require.IsType(t, []any{}, payload["items"])
	require.IsType(t, float64(0), payload["total"])
	require.IsType(t, float64(0), payload["page"])
	require.IsType(t, float64(0), payload["pageSize"])

	summary, ok := payload["summary"].(map[string]any)
	require.True(t, ok)
	require.ElementsMatch(t, []string{"totalReceivable", "overdueReceivable", "pendingReceiptCount"}, mapKeys(summary))

	items := payload["items"].([]any)
	require.Len(t, items, 1)
	item, ok := items[0].(map[string]any)
	require.True(t, ok)
	require.ElementsMatch(t, []string{
		"id",
		"documentNo",
		"customerName",
		"currency",
		"orderAmount",
		"receivedAmount",
		"outstandingAmount",
		"dueDate",
		"agingBucket",
		"status",
		"createdAt",
		"updatedAt",
	}, mapKeys(item))
}

func requirePayableDetailJSONContract(t *testing.T, payload map[string]any) {
	t.Helper()

	require.ElementsMatch(t, []string{
		"id",
		"documentNo",
		"supplierName",
		"currency",
		"invoiceAmount",
		"paidAmount",
		"outstandingAmount",
		"dueDate",
		"agingBucket",
		"status",
		"createdAt",
		"updatedAt",
		"sourceType",
		"sourceRefId",
		"supplierId",
		"version",
		"paymentRecords",
		"allocations",
	}, mapKeys(payload))
	require.IsType(t, []any{}, payload["paymentRecords"])
	require.IsType(t, []any{}, payload["allocations"])
}

func requireReceivableDetailJSONContract(t *testing.T, payload map[string]any) {
	t.Helper()

	require.ElementsMatch(t, []string{
		"id",
		"documentNo",
		"customerName",
		"currency",
		"orderAmount",
		"receivedAmount",
		"outstandingAmount",
		"dueDate",
		"agingBucket",
		"status",
		"createdAt",
		"updatedAt",
		"sourceType",
		"sourceRefId",
		"customerId",
		"version",
		"receiptRecords",
		"allocations",
		"returnAdjustmentAmount",
		"salesReturnActualAmountRecords",
	}, mapKeys(payload))
	require.IsType(t, []any{}, payload["receiptRecords"])
	require.IsType(t, []any{}, payload["allocations"])
}

func requireReceiptRecordJSONContract(t *testing.T, payload map[string]any) {
	t.Helper()

	require.ElementsMatch(t, []string{
		"id",
		"recordNo",
		"ledgerId",
		"amount",
		"currency",
		"paymentMethod",
		"paymentTerm",
		"recordDate",
		"receivedAt",
		"receiptAccount",
		"status",
		"referenceNo",
		"createdAt",
		"updatedAt",
		"evidences",
	}, mapKeys(payload))
	require.IsType(t, []any{}, payload["evidences"])
}

func requirePaymentRecordJSONContract(t *testing.T, payload map[string]any) {
	t.Helper()

	require.ElementsMatch(t, []string{
		"id",
		"recordNo",
		"ledgerId",
		"amount",
		"currency",
		"paymentMethod",
		"paymentTerm",
		"recordDate",
		"status",
		"referenceNo",
		"createdAt",
		"updatedAt",
		"evidences",
	}, mapKeys(payload))
	require.IsType(t, []any{}, payload["evidences"])
}

func requireSettlementAllocationJSONContract(t *testing.T, payload map[string]any) {
	t.Helper()

	require.ElementsMatch(t, []string{
		"id",
		"ledgerId",
		"receiptRecordId",
		"paymentRecordId",
		"allocatedAmount",
		"sequenceNo",
		"remark",
		"operator",
		"createdAt",
		"updatedAt",
	}, mapKeys(payload))
}

func mapKeys(input map[string]any) []string {
	keys := make([]string, 0, len(input))
	for key := range input {
		keys = append(keys, key)
	}
	return keys
}

func TestGetPayableLedgersHandlerReturnsLockedListPageContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupArApHandlerTestDB(t)
	seedPayableLedger(t, 80, models.LedgerStatusOpen)
	seedPayableLedger(t, 0, models.LedgerStatusSettled)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/payables?page=1&pageSize=1&status=open", nil)

	GetPayableLedgersHandler(c)

	require.Equal(t, http.StatusOK, w.Code)
	requirePayableListPageJSONContract(t, w)
}

func TestGetReceivableLedgersHandlerReturnsLockedListPageContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupArApHandlerTestDB(t)
	seedReceivableLedger(t, 80, models.LedgerStatusOpen)
	seedReceivableLedger(t, 0, models.LedgerStatusSettled)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/receivables?page=1&pageSize=1&status=open", nil)

	GetReceivableLedgersHandler(c)

	require.Equal(t, http.StatusOK, w.Code)
	requireReceivableListPageJSONContract(t, w)
}

func TestGetReceivableLedgersHandlerSupportsSourceFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupArApHandlerTestDB(t)
	matched := seedReceivableLedger(t, 80, models.LedgerStatusOpen)
	seedReceivableLedger(t, 40, models.LedgerStatusOpen)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(
		http.MethodGet,
		"/api/v1/receivables?page=1&pageSize=10&status=open&sourceType=SALES_ORDER&sourceRefId="+matched.SourceRefID,
		nil,
	)

	GetReceivableLedgersHandler(c)

	require.Equal(t, http.StatusOK, w.Code)
	var payload services.ReceivableLedgerListResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	require.Len(t, payload.Items, 1)
	require.Equal(t, matched.ID, payload.Items[0].ID)
}

func TestGetReceivableLedgersHandlerExcludesCanceledOrders(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupArApHandlerTestDB(t)
	seedReceivableLedger(t, 80, models.LedgerStatusOpen)
	seedReceivableLedger(t, 80, models.LedgerStatusCancelled)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/receivables?page=1&pageSize=10", nil)

	GetReceivableLedgersHandler(c)

	require.Equal(t, http.StatusOK, w.Code)
	var payload services.ReceivableLedgerListResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	require.Len(t, payload.Items, 1)
	require.Equal(t, models.LedgerStatusOpen, payload.Items[0].Status)
	require.Equal(t, int64(1), payload.Total)
	for _, item := range payload.Items {
		require.NotEqual(t, models.LedgerStatusCancelled, item.Status)
	}
}

func TestGetPayableLedgerHandlerReturnsLockedDetailContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupArApHandlerTestDB(t)
	ledger := seedPayableLedger(t, 80, models.LedgerStatusOpen)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: ledger.ID}}
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/payables/"+ledger.ID, nil)

	GetPayableLedgerHandler(c)

	require.Equal(t, http.StatusOK, w.Code)
	var payload map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	requirePayableDetailJSONContract(t, payload)
}

func TestGetReceivableLedgerHandlerReturnsLockedDetailContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupArApHandlerTestDB(t)
	ledger := seedReceivableLedger(t, 80, models.LedgerStatusOpen)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: ledger.ID}}
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/receivables/"+ledger.ID, nil)

	GetReceivableLedgerHandler(c)

	require.Equal(t, http.StatusOK, w.Code)
	var payload map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	requireReceivableDetailJSONContract(t, payload)
}

func TestSearchPayableLedgersHandlerUsesLockedQueryParams(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupArApHandlerTestDB(t)
	high := seedPayableLedgerForSearch(t, "AP-CONTRACT-HIGH", "Acme Supplier", "USD", 95, models.LedgerStatusOpen)
	seedPayableLedgerForSearch(t, "AP-CONTRACT-LOW", "Acme Supplier", "USD", 60, models.LedgerStatusOpen)
	seedPayableLedgerForSearch(t, "AP-CONTRACT-STATUS", "Acme Supplier", "USD", 90, models.LedgerStatusSettled)
	seedPayableLedgerForSearch(t, "AP-CONTRACT-CNY", "Acme Supplier", "CNY", 90, models.LedgerStatusOpen)
	seedPayableLedgerForSearch(t, "AP-CONTRACT-RANGE", "Acme Supplier", "USD", 20, models.LedgerStatusOpen)
	seedPayableLedgerForSearch(t, "AP-OTHER", "Other Supplier", "USD", 90, models.LedgerStatusOpen)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(
		http.MethodGet,
		"/api/v1/payables/search?keyword=AP-CONTRACT&page=1&pageSize=1&status=open&currency=usd&outstandingMin=50&outstandingMax=100&sortBy=outstanding_amount&sortOrder=desc",
		nil,
	)

	SearchPayableLedgersHandler(c)

	require.Equal(t, http.StatusOK, w.Code)
	var payload services.LedgerSearchResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	require.EqualValues(t, 2, payload.Total)
	require.Equal(t, 1, payload.Page)
	require.Equal(t, 1, payload.PageSize)
	require.Len(t, payload.Items, 1)
	require.Equal(t, high.LedgerNo, payload.Items[0].DocumentNo)
	requireLedgerSearchResponseJSONContract(t, w, services.LedgerSearchCandidateResponse{
		ID:                high.ID,
		DocumentNo:        high.LedgerNo,
		PartnerName:       high.SupplierName,
		OutstandingAmount: high.OutstandingAmount,
		Status:            high.Status,
		Currency:          high.Currency,
	})
}

func TestSearchReceivableLedgersHandlerUsesLockedQueryParams(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupArApHandlerTestDB(t)
	low := seedReceivableLedgerForSearch(t, "AR-CONTRACT-LOW", "Acme Customer", "USD", 60, models.LedgerStatusOpen)
	seedReceivableLedgerForSearch(t, "AR-CONTRACT-HIGH", "Acme Customer", "USD", 95, models.LedgerStatusOpen)
	seedReceivableLedgerForSearch(t, "AR-CONTRACT-STATUS", "Acme Customer", "USD", 90, models.LedgerStatusSettled)
	seedReceivableLedgerForSearch(t, "AR-CONTRACT-CNY", "Acme Customer", "CNY", 90, models.LedgerStatusOpen)
	seedReceivableLedgerForSearch(t, "AR-CONTRACT-RANGE", "Acme Customer", "USD", 20, models.LedgerStatusOpen)
	seedReceivableLedgerForSearch(t, "AR-OTHER", "Other Customer", "USD", 90, models.LedgerStatusOpen)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(
		http.MethodGet,
		"/api/v1/receivables/search?keyword=AR-CONTRACT&page=1&pageSize=1&status=open&currency=usd&outstandingMin=50&outstandingMax=100&sortBy=outstanding_amount&sortOrder=asc",
		nil,
	)

	SearchReceivableLedgersHandler(c)

	require.Equal(t, http.StatusOK, w.Code)
	var payload services.LedgerSearchResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	require.EqualValues(t, 2, payload.Total)
	require.Equal(t, 1, payload.Page)
	require.Equal(t, 1, payload.PageSize)
	require.Len(t, payload.Items, 1)
	require.Equal(t, low.DocumentNo, payload.Items[0].DocumentNo)
	requireLedgerSearchResponseJSONContract(t, w, services.LedgerSearchCandidateResponse{
		ID:                low.ID,
		DocumentNo:        low.DocumentNo,
		PartnerName:       low.CustomerName,
		OutstandingAmount: low.OutstandingAmount,
		Status:            low.Status,
		Currency:          low.Currency,
	})
}

func TestCreateReceiptRecordHandlerRejectsAllocationSumMismatch(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupArApHandlerTestDB(t)
	ledger := seedReceivableLedger(t, 100, models.LedgerStatusOpen)

	body := `{
		"amount":100,
		"recordDate":"2026-04-13",
		"allocations":[{"ledgerId":"` + ledger.ID + `","allocatedAmount":60,"sequenceNo":1,"remark":"part"}]
	}`

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: ledger.ID}}
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/receivables/"+ledger.ID+"/receipts", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CreateReceiptRecordHandler(c)
	require.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateReceiptRecordHandlerRejectsAllocationOverflow(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupArApHandlerTestDB(t)
	ledger := seedReceivableLedger(t, 40, models.LedgerStatusPartial)

	body := `{
		"amount":50,
		"recordDate":"2026-04-13",
		"allocations":[{"ledgerId":"` + ledger.ID + `","allocatedAmount":50,"sequenceNo":1,"remark":"overflow"}]
	}`

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: ledger.ID}}
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/receivables/"+ledger.ID+"/receipts", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CreateReceiptRecordHandler(c)
	require.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateReceiptRecordHandlerReturnsLockedCreateResponseContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupArApHandlerTestDB(t)
	ledger := seedReceivableLedger(t, 80, models.LedgerStatusOpen)

	body := `{
		"amount":80,
		"currency":"CNY",
		"paymentMethod":"BANK",
		"paymentTerm":"NET30",
		"recordDate":"2026-04-19",
		"receivedAt":"2026-04-19T10:30",
		"receiptAccount":"招商银行-对公户",
		"referenceNo":"REF-RCV-001",
		"allocations":[{"ledgerId":"` + ledger.ID + `","allocatedAmount":80,"sequenceNo":1,"remark":"full"}]
	}`

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: ledger.ID}}
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/receivables/"+ledger.ID+"/receipts", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CreateReceiptRecordHandler(c)

	require.Equal(t, http.StatusOK, w.Code)
	var payload map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	require.ElementsMatch(t, []string{"ledger", "record", "allocations"}, mapKeys(payload))
	ledgerPayload, ok := payload["ledger"].(map[string]any)
	require.True(t, ok)
	requireReceivableDetailJSONContract(t, ledgerPayload)
	recordPayload, ok := payload["record"].(map[string]any)
	require.True(t, ok)
	requireReceiptRecordJSONContract(t, recordPayload)
	allocations, ok := payload["allocations"].([]any)
	require.True(t, ok)
	require.Len(t, allocations, 1)
	allocationPayload, ok := allocations[0].(map[string]any)
	require.True(t, ok)
	requireSettlementAllocationJSONContract(t, allocationPayload)
}

func TestCreatePaymentRecordHandlerRejectsSettledLedgerAllocation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupArApHandlerTestDB(t)
	ledger := seedPayableLedger(t, 0, models.LedgerStatusSettled)

	body := `{
		"amount":10,
		"recordDate":"2026-04-13",
		"allocations":[{"ledgerId":"` + ledger.ID + `","allocatedAmount":10,"sequenceNo":1,"remark":"again"}]
	}`

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: ledger.ID}}
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/payables/"+ledger.ID+"/payments", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CreatePaymentRecordHandler(c)
	require.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreatePaymentRecordHandlerReturnsLockedCreateResponseContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupArApHandlerTestDB(t)
	ledger := seedPayableLedger(t, 80, models.LedgerStatusOpen)

	body := `{
		"amount":80,
		"currency":"CNY",
		"paymentMethod":"BANK",
		"paymentTerm":"NET30",
		"recordDate":"2026-04-19",
		"referenceNo":"REF-PAY-001",
		"allocations":[{"ledgerId":"` + ledger.ID + `","allocatedAmount":80,"sequenceNo":1,"remark":"full"}]
	}`

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: ledger.ID}}
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/payables/"+ledger.ID+"/payments", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CreatePaymentRecordHandler(c)

	require.Equal(t, http.StatusOK, w.Code)
	var payload map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	require.ElementsMatch(t, []string{"ledger", "record", "allocations"}, mapKeys(payload))
	ledgerPayload, ok := payload["ledger"].(map[string]any)
	require.True(t, ok)
	requirePayableDetailJSONContract(t, ledgerPayload)
	recordPayload, ok := payload["record"].(map[string]any)
	require.True(t, ok)
	requirePaymentRecordJSONContract(t, recordPayload)
	allocations, ok := payload["allocations"].([]any)
	require.True(t, ok)
	require.Len(t, allocations, 1)
	allocationPayload, ok := allocations[0].(map[string]any)
	require.True(t, ok)
	requireSettlementAllocationJSONContract(t, allocationPayload)
}
