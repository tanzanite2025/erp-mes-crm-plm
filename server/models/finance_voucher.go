package models

const (
	FinancialVoucherSourceInbound  = "INBOUND"
	FinancialVoucherSourceShipment = "SHIPMENT"
)

const (
	FinancialVoucherStatusDraft  = "DRAFT"
	FinancialVoucherStatusPosted = "POSTED"
	FinancialVoucherStatusVoid   = "VOID"
)

const (
	ClearingEntryTypeDebit  = "DEBIT"
	ClearingEntryTypeCredit = "CREDIT"
)

// FinancialVoucher stores the accounting voucher header generated from business events.
type FinancialVoucher struct {
	BaseModel
	VoucherNo   string          `gorm:"size:60;uniqueIndex;not null" json:"voucherNo"`
	SourceType  string          `gorm:"size:40;index;not null" json:"sourceType"`
	SourceRefID string          `gorm:"size:100;index;not null" json:"sourceRefId"`
	Currency    string          `gorm:"size:20;not null;default:'CNY'" json:"currency"`
	TotalAmount float64         `gorm:"not null" json:"totalAmount"`
	Status      string          `gorm:"size:30;index;not null;default:'POSTED'" json:"status"`
	Entries     []ClearingEntry `gorm:"foreignKey:VoucherID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"entries,omitempty"`
}

func (FinancialVoucher) TableName() string {
	return "financial_vouchers"
}

// ClearingEntry stores debit/credit lines under one financial voucher.
type ClearingEntry struct {
	BaseModel
	VoucherID   string            `gorm:"type:uuid;index;not null" json:"voucherId"`
	Voucher     *FinancialVoucher `gorm:"foreignKey:VoucherID" json:"voucher,omitempty"`
	LineNo      int               `gorm:"not null" json:"lineNo"`
	EntryType   string            `gorm:"size:20;index;not null" json:"entryType"`
	AccountCode string            `gorm:"size:80;index;not null" json:"accountCode"`
	Amount      float64           `gorm:"not null" json:"amount"`
	Memo        string            `gorm:"type:text" json:"memo"`
}

func (ClearingEntry) TableName() string {
	return "clearing_entries"
}
