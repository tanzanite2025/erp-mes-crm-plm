package services

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	voucherCurrencyCNY      = "CNY"
	voucherBalanceTolerance = 1e-9

	accountInventoryAsset = "ACC_INVENTORY_ASSET"
	accountAPAccrual      = "ACC_AP_ACCRUAL"
	accountCOGS           = "ACC_COGS"
)

func CreateInboundVoucherTx(tx *gorm.DB, inbound models.InboundRecord) (*models.FinancialVoucher, error) {
	amount := inbound.Quantity * inbound.PurchasePrice
	memo := strings.TrimSpace(inbound.MaterialCode)
	if memo == "" {
		memo = strings.TrimSpace(inbound.MaterialName)
	}
	return createVoucherTx(
		tx,
		models.FinancialVoucherSourceInbound,
		strings.TrimSpace(inbound.ID),
		amount,
		accountInventoryAsset,
		accountAPAccrual,
		memo,
	)
}

func CreateShipmentVoucherTx(tx *gorm.DB, shipment models.ShipmentRecord) (*models.FinancialVoucher, error) {
	memo := strings.TrimSpace(shipment.MaterialCode)
	if memo == "" {
		memo = strings.TrimSpace(shipment.MaterialName)
	}
	return createVoucherTx(
		tx,
		models.FinancialVoucherSourceShipment,
		strings.TrimSpace(shipment.ID),
		shipment.COGS,
		accountCOGS,
		accountInventoryAsset,
		memo,
	)
}

func createVoucherTx(
	tx *gorm.DB,
	sourceType string,
	sourceRefID string,
	amount float64,
	debitAccount string,
	creditAccount string,
	memo string,
) (*models.FinancialVoucher, error) {
	if tx == nil {
		return nil, errors.New("[CRITICAL_VOUCHER] transaction is required")
	}
	sourceType = strings.TrimSpace(sourceType)
	sourceRefID = strings.TrimSpace(sourceRefID)
	debitAccount = strings.TrimSpace(debitAccount)
	creditAccount = strings.TrimSpace(creditAccount)
	memo = strings.TrimSpace(memo)

	if sourceType == "" {
		return nil, errors.New("[CRITICAL_VOUCHER] source type is required")
	}
	if sourceRefID == "" {
		return nil, errors.New("[CRITICAL_VOUCHER] source ref id is required")
	}
	if amount <= 0 {
		return nil, errors.New("[CRITICAL_VOUCHER] amount must be greater than zero")
	}
	if debitAccount == "" || creditAccount == "" {
		return nil, errors.New("[CRITICAL_VOUCHER] account code is required")
	}

	debitAmount := amount
	creditAmount := amount
	if math.Abs(debitAmount-creditAmount) > voucherBalanceTolerance {
		return nil, errors.New("[CRITICAL_VOUCHER] voucher is not balanced")
	}

	now := time.Now().UTC()
	voucher := models.FinancialVoucher{
		BaseModel:   models.BaseModel{ID: uuid.NewString()},
		VoucherNo:   buildVoucherNo(sourceType, now),
		SourceType:  sourceType,
		SourceRefID: sourceRefID,
		Currency:    voucherCurrencyCNY,
		TotalAmount: amount,
		Status:      models.FinancialVoucherStatusPosted,
	}
	if err := tx.Create(&voucher).Error; err != nil {
		return nil, err
	}

	entries := []models.ClearingEntry{
		{
			BaseModel:   models.BaseModel{ID: uuid.NewString()},
			VoucherID:   voucher.ID,
			LineNo:      1,
			EntryType:   models.ClearingEntryTypeDebit,
			AccountCode: debitAccount,
			Amount:      debitAmount,
			Memo:        memo,
		},
		{
			BaseModel:   models.BaseModel{ID: uuid.NewString()},
			VoucherID:   voucher.ID,
			LineNo:      2,
			EntryType:   models.ClearingEntryTypeCredit,
			AccountCode: creditAccount,
			Amount:      creditAmount,
			Memo:        memo,
		},
	}
	if err := tx.Create(&entries).Error; err != nil {
		return nil, err
	}

	return &voucher, nil
}

func buildVoucherNo(sourceType string, now time.Time) string {
	return fmt.Sprintf("FV-%s-%s", sourceType, now.Format("20060102150405.000")) + "-" + uuid.NewString()[:8]
}
