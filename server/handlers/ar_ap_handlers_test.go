package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func setupArApHandlerTestDB(t *testing.T) {
	t.Helper()
	testDB := setupHandlerSQLiteTestDB(t)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE receivable_ledgers (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			ledger_no TEXT NOT NULL,
			source_type TEXT NOT NULL,
			source_ref_id TEXT NOT NULL,
			customer_id TEXT,
			customer_name TEXT NOT NULL,
			currency TEXT NOT NULL,
			original_amount REAL NOT NULL,
			settled_amount REAL NOT NULL,
			outstanding_amount REAL NOT NULL,
			due_date TEXT,
			status TEXT NOT NULL,
			version INTEGER NOT NULL
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
			amount REAL NOT NULL,
			currency TEXT NOT NULL,
			payment_method TEXT,
			payment_term TEXT,
			record_date TEXT,
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
			receipt_record_id TEXT,
			payment_record_id TEXT,
			allocated_amount REAL NOT NULL,
			sequence_no INTEGER NOT NULL,
			remark TEXT,
			operator TEXT
		);
	`).Error)
}

func seedReceivableLedger(t *testing.T, outstanding float64, status string) models.ReceivableLedger {
	t.Helper()
	ledger := models.ReceivableLedger{
		BaseModel:         models.BaseModel{ID: uuid.NewString(), CreatedAt: time.Now(), UpdatedAt: time.Now()},
		LedgerNo:          "AR-" + strings.ToUpper(uuid.NewString()[:8]),
		SourceType:        "SALES_ORDER",
		SourceRefID:       "SO-001",
		CustomerID:        "CUST-001",
		CustomerName:      "测试客户",
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
