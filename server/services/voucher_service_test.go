package services

import (
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestCreateInboundVoucherTxCreatesBalancedEntries(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryCommandTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	inbound := models.InboundRecord{
		BaseModel:     models.BaseModel{ID: uuid.NewString()},
		MaterialCode:  "MAT-001",
		Quantity:      6,
		PurchasePrice: 5.5,
	}

	var created *models.FinancialVoucher
	require.NoError(t, db.DB.Transaction(func(tx *gorm.DB) error {
		voucher, err := CreateInboundVoucherTx(tx, inbound)
		if err != nil {
			return err
		}
		created = voucher
		return nil
	}))
	require.NotNil(t, created)

	type voucherRow struct {
		SourceType  string
		SourceRefID string
		TotalAmount float64
		Status      string
	}
	var voucher voucherRow
	require.NoError(t, db.DB.Raw(`
		SELECT source_type, source_ref_id, total_amount, status
		FROM financial_vouchers
		WHERE id = ?
	`, created.ID).Scan(&voucher).Error)
	require.Equal(t, models.FinancialVoucherSourceInbound, voucher.SourceType)
	require.Equal(t, inbound.ID, voucher.SourceRefID)
	require.Equal(t, models.FinancialVoucherStatusPosted, voucher.Status)
	require.InDelta(t, 33.0, voucher.TotalAmount, 0.000001)

	type aggRow struct {
		DebitTotal  float64
		CreditTotal float64
		EntryCount  int64
	}
	var agg aggRow
	require.NoError(t, db.DB.Raw(`
		SELECT
			SUM(CASE WHEN entry_type = ? THEN amount ELSE 0 END) AS debit_total,
			SUM(CASE WHEN entry_type = ? THEN amount ELSE 0 END) AS credit_total,
			COUNT(*) AS entry_count
		FROM clearing_entries
		WHERE voucher_id = ?
	`, models.ClearingEntryTypeDebit, models.ClearingEntryTypeCredit, created.ID).Scan(&agg).Error)
	require.Equal(t, int64(2), agg.EntryCount)
	require.InDelta(t, 33.0, agg.DebitTotal, 0.000001)
	require.InDelta(t, 33.0, agg.CreditTotal, 0.000001)
}

func TestCreateShipmentVoucherTxRejectsNonPositiveAmount(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryCommandTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	shipment := models.ShipmentRecord{
		BaseModel: models.BaseModel{ID: uuid.NewString()},
		COGS:      0,
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		_, err := CreateShipmentVoucherTx(tx, shipment)
		return err
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "amount must be greater than zero")

	type countRow struct {
		Count int64
	}
	var count countRow
	require.NoError(t, db.DB.Raw(`SELECT COUNT(*) AS count FROM financial_vouchers`).Scan(&count).Error)
	require.Equal(t, int64(0), count.Count)
}
