package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func setupVoucherHandlerTestDB(t *testing.T) {
	t.Helper()

	testDB := setupHandlerSQLiteTestDB(t)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE financial_vouchers (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			voucher_no TEXT NOT NULL UNIQUE,
			source_type TEXT NOT NULL,
			source_ref_id TEXT NOT NULL,
			currency TEXT NOT NULL,
			total_amount REAL NOT NULL,
			status TEXT NOT NULL
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_financial_vouchers_deleted_at ON financial_vouchers(deleted_at)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE clearing_entries (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			voucher_id TEXT NOT NULL,
			line_no INTEGER NOT NULL,
			entry_type TEXT NOT NULL,
			account_code TEXT NOT NULL,
			amount REAL NOT NULL,
			memo TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_clearing_entries_deleted_at ON clearing_entries(deleted_at)`).Error)
}

func TestGetFinancialVouchersHandlerFiltersAndIncludesEntries(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupVoucherHandlerTestDB(t)

	voucherA := models.FinancialVoucher{
		BaseModel:   models.BaseModel{ID: uuid.NewString()},
		VoucherNo:   "FV-INBOUND-001",
		SourceType:  models.FinancialVoucherSourceInbound,
		SourceRefID: "IN-001",
		Currency:    "CNY",
		TotalAmount: 12,
		Status:      models.FinancialVoucherStatusPosted,
	}
	voucherB := models.FinancialVoucher{
		BaseModel:   models.BaseModel{ID: uuid.NewString()},
		VoucherNo:   "FV-SHIPMENT-001",
		SourceType:  models.FinancialVoucherSourceShipment,
		SourceRefID: "SH-001",
		Currency:    "CNY",
		TotalAmount: 24,
		Status:      models.FinancialVoucherStatusPosted,
	}
	require.NoError(t, db.DB.Create(&voucherA).Error)
	require.NoError(t, db.DB.Create(&voucherB).Error)

	now := time.Now().UTC()
	entries := []models.ClearingEntry{
		{
			BaseModel:   models.BaseModel{ID: uuid.NewString(), CreatedAt: now, UpdatedAt: now},
			VoucherID:   voucherB.ID,
			LineNo:      1,
			EntryType:   models.ClearingEntryTypeDebit,
			AccountCode: "ACC_COGS",
			Amount:      24,
		},
		{
			BaseModel:   models.BaseModel{ID: uuid.NewString(), CreatedAt: now, UpdatedAt: now},
			VoucherID:   voucherB.ID,
			LineNo:      2,
			EntryType:   models.ClearingEntryTypeCredit,
			AccountCode: "ACC_INVENTORY_ASSET",
			Amount:      24,
		},
	}
	require.NoError(t, db.DB.Create(&entries).Error)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/vouchers?sourceType=shipment&status=posted&includeEntries=true", nil)

	GetFinancialVouchersHandler(c)

	require.Equal(t, http.StatusOK, w.Code)
	var vouchers []services.FinancialVoucherResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &vouchers))
	require.Len(t, vouchers, 1)
	require.Equal(t, voucherB.ID, vouchers[0].ID)
	require.Equal(t, models.FinancialVoucherSourceShipment, vouchers[0].SourceType)
	require.Len(t, vouchers[0].Entries, 2)
}

func TestGetFinancialVouchersHandlerReturnsEmptyArrayWhenNoData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupVoucherHandlerTestDB(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/vouchers", nil)

	GetFinancialVouchersHandler(c)

	require.Equal(t, http.StatusOK, w.Code)
	var payload []any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	require.Len(t, payload, 0)
}

func TestGetFinancialVouchersHandlerRejectsInvalidIncludeEntries(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupVoucherHandlerTestDB(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/vouchers?includeEntries=oops", nil)

	GetFinancialVouchersHandler(c)

	require.Equal(t, http.StatusBadRequest, w.Code)
	require.Contains(t, w.Body.String(), "includeEntries 参数非法")
}

func TestGetFinancialVoucherHandlerReturnsDetailWithEntries(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupVoucherHandlerTestDB(t)

	voucher := models.FinancialVoucher{
		BaseModel:   models.BaseModel{ID: uuid.NewString()},
		VoucherNo:   "FV-SHIPMENT-DETAIL",
		SourceType:  models.FinancialVoucherSourceShipment,
		SourceRefID: "SH-DETAIL",
		Currency:    "CNY",
		TotalAmount: 18,
		Status:      models.FinancialVoucherStatusPosted,
	}
	require.NoError(t, db.DB.Create(&voucher).Error)
	require.NoError(t, db.DB.Create(&models.ClearingEntry{
		BaseModel:   models.BaseModel{ID: uuid.NewString()},
		VoucherID:   voucher.ID,
		LineNo:      1,
		EntryType:   models.ClearingEntryTypeDebit,
		AccountCode: "ACC_COGS",
		Amount:      18,
	}).Error)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = []gin.Param{{Key: "id", Value: voucher.ID}}
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/vouchers/"+voucher.ID, nil)

	GetFinancialVoucherHandler(c)

	require.Equal(t, http.StatusOK, w.Code)
	var payload services.FinancialVoucherResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	require.Equal(t, voucher.ID, payload.ID)
	require.Len(t, payload.Entries, 1)
}
