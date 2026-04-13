package models

const (
	LedgerDirectionReceivable = "RECEIVABLE"
	LedgerDirectionPayable    = "PAYABLE"
)

const (
	LedgerStatusOpen      = "OPEN"
	LedgerStatusPartial   = "PARTIAL"
	LedgerStatusSettled   = "SETTLED"
	LedgerStatusOverdue   = "OVERDUE"
	LedgerStatusVoided    = "VOIDED"
	LedgerStatusCancelled = "CANCELLED"
)

const (
	SettlementRecordStatusDraft     = "DRAFT"
	SettlementRecordStatusConfirmed = "CONFIRMED"
	SettlementRecordStatusVoided    = "VOIDED"
)

type ReceivableLedger struct {
	BaseModel
	LedgerNo           string                 `gorm:"size:60;uniqueIndex;not null" json:"ledgerNo"`
	SourceType         string                 `gorm:"size:40;index;not null" json:"sourceType"`
	SourceRefID        string                 `gorm:"size:100;index;not null" json:"sourceRefId"`
	CustomerID         string                 `gorm:"size:100;index" json:"customerId"`
	CustomerName       string                 `gorm:"size:255;index;not null" json:"customerName"`
	Currency           string                 `gorm:"size:20;not null;default:'CNY'" json:"currency"`
	OriginalAmount     float64                `gorm:"not null" json:"originalAmount"`
	SettledAmount      float64                `gorm:"not null;default:0" json:"settledAmount"`
	OutstandingAmount  float64                `gorm:"not null" json:"outstandingAmount"`
	DueDate            string                 `gorm:"size:40;index" json:"dueDate"`
	Status             string                 `gorm:"size:30;index;not null;default:'OPEN'" json:"status"`
	Version            int                    `gorm:"not null;default:1" json:"version"`
	ReceiptRecords     []ReceiptRecord        `gorm:"foreignKey:LedgerID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"receiptRecords,omitempty"`
	SettlementMappings []SettlementAllocation `gorm:"foreignKey:LedgerID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"settlementMappings,omitempty"`
}

func (ReceivableLedger) TableName() string {
	return "receivable_ledgers"
}

type PayableLedger struct {
	BaseModel
	LedgerNo           string                 `gorm:"size:60;uniqueIndex;not null" json:"ledgerNo"`
	SourceType         string                 `gorm:"size:40;index;not null" json:"sourceType"`
	SourceRefID        string                 `gorm:"size:100;index;not null" json:"sourceRefId"`
	SupplierID         string                 `gorm:"size:100;index" json:"supplierId"`
	SupplierName       string                 `gorm:"size:255;index;not null" json:"supplierName"`
	Currency           string                 `gorm:"size:20;not null;default:'CNY'" json:"currency"`
	OriginalAmount     float64                `gorm:"not null" json:"originalAmount"`
	SettledAmount      float64                `gorm:"not null;default:0" json:"settledAmount"`
	OutstandingAmount  float64                `gorm:"not null" json:"outstandingAmount"`
	DueDate            string                 `gorm:"size:40;index" json:"dueDate"`
	Status             string                 `gorm:"size:30;index;not null;default:'OPEN'" json:"status"`
	Version            int                    `gorm:"not null;default:1" json:"version"`
	PaymentRecords     []PaymentRecord        `gorm:"foreignKey:LedgerID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"paymentRecords,omitempty"`
	SettlementMappings []SettlementAllocation `gorm:"foreignKey:LedgerID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"settlementMappings,omitempty"`
}

func (PayableLedger) TableName() string {
	return "payable_ledgers"
}

type ReceiptRecord struct {
	BaseModel
	RecordNo      string                     `gorm:"size:60;uniqueIndex;not null" json:"recordNo"`
	LedgerID      string                     `gorm:"type:uuid;index;not null" json:"ledgerId"`
	Amount        float64                    `gorm:"not null" json:"amount"`
	Currency      string                     `gorm:"size:20;not null;default:'CNY'" json:"currency"`
	PaymentMethod string                     `gorm:"size:50" json:"paymentMethod"`
	PaymentTerm   string                     `gorm:"size:50" json:"paymentTerm"`
	RecordDate    string                     `gorm:"size:40;index" json:"recordDate"`
	Status        string                     `gorm:"size:30;index;not null;default:'DRAFT'" json:"status"`
	ReferenceNo   string                     `gorm:"size:100" json:"referenceNo"`
	Evidences     []SettlementRecordEvidence `gorm:"foreignKey:RecordID;references:ID" json:"evidences,omitempty"`
}

func (ReceiptRecord) TableName() string {
	return "receipt_records"
}

type PaymentRecord struct {
	BaseModel
	RecordNo      string                     `gorm:"size:60;uniqueIndex;not null" json:"recordNo"`
	LedgerID      string                     `gorm:"type:uuid;index;not null" json:"ledgerId"`
	Amount        float64                    `gorm:"not null" json:"amount"`
	Currency      string                     `gorm:"size:20;not null;default:'CNY'" json:"currency"`
	PaymentMethod string                     `gorm:"size:50" json:"paymentMethod"`
	PaymentTerm   string                     `gorm:"size:50" json:"paymentTerm"`
	RecordDate    string                     `gorm:"size:40;index" json:"recordDate"`
	Status        string                     `gorm:"size:30;index;not null;default:'DRAFT'" json:"status"`
	ReferenceNo   string                     `gorm:"size:100" json:"referenceNo"`
	Evidences     []SettlementRecordEvidence `gorm:"foreignKey:RecordID;references:ID" json:"evidences,omitempty"`
}

func (PaymentRecord) TableName() string {
	return "payment_records"
}

type SettlementAllocation struct {
	BaseModel
	LedgerID        string  `gorm:"type:uuid;index;not null" json:"ledgerId"`
	ReceiptRecordID string  `gorm:"type:uuid;index" json:"receiptRecordId"`
	PaymentRecordID string  `gorm:"type:uuid;index" json:"paymentRecordId"`
	AllocatedAmount float64 `gorm:"not null" json:"allocatedAmount"`
	SequenceNo      int     `gorm:"not null;default:1" json:"sequenceNo"`
	Remark          string  `gorm:"type:text" json:"remark"`
	Operator        string  `gorm:"size:100" json:"operator"`
}

func (SettlementAllocation) TableName() string {
	return "settlement_allocations"
}
