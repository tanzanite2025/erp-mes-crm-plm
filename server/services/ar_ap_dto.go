package services

import "time"

type ReceivableLedgerQuery struct {
	Page        int
	PageSize    int
	Status      string
	SourceType  string
	SourceRefID string
}

type PayableLedgerQuery struct {
	Page     int
	PageSize int
	Status   string
}

type ReceivableSummaryResponse struct {
	TotalReceivable     float64 `json:"totalReceivable"`
	OverdueReceivable   float64 `json:"overdueReceivable"`
	PendingReceiptCount int     `json:"pendingReceiptCount"`
}

type PayableSummaryResponse struct {
	TotalPayable        float64 `json:"totalPayable"`
	OverduePayable      float64 `json:"overduePayable"`
	PendingPaymentCount int     `json:"pendingPaymentCount"`
}

type ReceivableLedgerListItemResponse struct {
	ID                string    `json:"id"`
	DocumentNo        string    `json:"documentNo"`
	CustomerName      string    `json:"customerName"`
	Currency          string    `json:"currency"`
	InvoiceAmount     float64   `json:"invoiceAmount"`
	ReceivedAmount    float64   `json:"receivedAmount"`
	OutstandingAmount float64   `json:"outstandingAmount"`
	DueDate           string    `json:"dueDate"`
	AgingBucket       string    `json:"agingBucket"`
	Status            string    `json:"status"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type PayableLedgerListItemResponse struct {
	ID                string    `json:"id"`
	DocumentNo        string    `json:"documentNo"`
	SupplierName      string    `json:"supplierName"`
	Currency          string    `json:"currency"`
	InvoiceAmount     float64   `json:"invoiceAmount"`
	PaidAmount        float64   `json:"paidAmount"`
	OutstandingAmount float64   `json:"outstandingAmount"`
	DueDate           string    `json:"dueDate"`
	AgingBucket       string    `json:"agingBucket"`
	Status            string    `json:"status"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type ReceivableLedgerListResponse struct {
	Items    []ReceivableLedgerListItemResponse `json:"items"`
	Total    int64                              `json:"total"`
	Page     int                                `json:"page"`
	PageSize int                                `json:"pageSize"`
	Summary  ReceivableSummaryResponse          `json:"summary"`
}

type PayableLedgerListResponse struct {
	Items    []PayableLedgerListItemResponse `json:"items"`
	Total    int64                           `json:"total"`
	Page     int                             `json:"page"`
	PageSize int                             `json:"pageSize"`
	Summary  PayableSummaryResponse          `json:"summary"`
}

type LedgerSearchQuery struct {
	Keyword        string
	Page           int
	PageSize       int
	Status         string
	Currency       string
	OutstandingMin float64
	OutstandingMax float64
	SortBy         string
	SortOrder      string
}

type LedgerSearchCandidateResponse struct {
	ID                string  `json:"id"`
	DocumentNo        string  `json:"documentNo"`
	PartnerName       string  `json:"partnerName"`
	OutstandingAmount float64 `json:"outstandingAmount"`
	Status            string  `json:"status"`
	Currency          string  `json:"currency"`
}

type LedgerSearchResponse struct {
	Items    []LedgerSearchCandidateResponse `json:"items"`
	Total    int64                           `json:"total"`
	Page     int                             `json:"page"`
	PageSize int                             `json:"pageSize"`
}

type ReceiptRecordResponse struct {
	ID             string                             `json:"id"`
	RecordNo       string                             `json:"recordNo"`
	LedgerID       string                             `json:"ledgerId"`
	Amount         float64                            `json:"amount"`
	Currency       string                             `json:"currency"`
	PaymentMethod  string                             `json:"paymentMethod"`
	PaymentTerm    string                             `json:"paymentTerm"`
	RecordDate     string                             `json:"recordDate"`
	ReceivedAt     string                             `json:"receivedAt"`
	ReceiptAccount string                             `json:"receiptAccount"`
	Status         string                             `json:"status"`
	ReferenceNo    string                             `json:"referenceNo"`
	CreatedAt      time.Time                          `json:"createdAt"`
	UpdatedAt      time.Time                          `json:"updatedAt"`
	Evidences      []SettlementRecordEvidenceResponse `json:"evidences"`
}

type SettlementAllocationResponse struct {
	ID              string    `json:"id"`
	LedgerID        string    `json:"ledgerId"`
	ReceiptRecordID string    `json:"receiptRecordId"`
	PaymentRecordID string    `json:"paymentRecordId"`
	AllocatedAmount float64   `json:"allocatedAmount"`
	SequenceNo      int       `json:"sequenceNo"`
	Remark          string    `json:"remark"`
	Operator        string    `json:"operator"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type PaymentRecordResponse struct {
	ID            string                             `json:"id"`
	RecordNo      string                             `json:"recordNo"`
	LedgerID      string                             `json:"ledgerId"`
	Amount        float64                            `json:"amount"`
	Currency      string                             `json:"currency"`
	PaymentMethod string                             `json:"paymentMethod"`
	PaymentTerm   string                             `json:"paymentTerm"`
	RecordDate    string                             `json:"recordDate"`
	Status        string                             `json:"status"`
	ReferenceNo   string                             `json:"referenceNo"`
	CreatedAt     time.Time                          `json:"createdAt"`
	UpdatedAt     time.Time                          `json:"updatedAt"`
	Evidences     []SettlementRecordEvidenceResponse `json:"evidences"`
}

type ReceivableLedgerDetailResponse struct {
	ID                string                         `json:"id"`
	DocumentNo        string                         `json:"documentNo"`
	SourceType        string                         `json:"sourceType"`
	SourceRefID       string                         `json:"sourceRefId"`
	CustomerID        string                         `json:"customerId"`
	CustomerName      string                         `json:"customerName"`
	Currency          string                         `json:"currency"`
	InvoiceAmount     float64                        `json:"invoiceAmount"`
	ReceivedAmount    float64                        `json:"receivedAmount"`
	OutstandingAmount float64                        `json:"outstandingAmount"`
	DueDate           string                         `json:"dueDate"`
	AgingBucket       string                         `json:"agingBucket"`
	Status            string                         `json:"status"`
	Version           int                            `json:"version"`
	CreatedAt         time.Time                      `json:"createdAt"`
	UpdatedAt         time.Time                      `json:"updatedAt"`
	ReceiptRecords    []ReceiptRecordResponse        `json:"receiptRecords"`
	Allocations       []SettlementAllocationResponse `json:"allocations"`
}

type PayableLedgerDetailResponse struct {
	ID                string                         `json:"id"`
	DocumentNo        string                         `json:"documentNo"`
	SourceType        string                         `json:"sourceType"`
	SourceRefID       string                         `json:"sourceRefId"`
	SupplierID        string                         `json:"supplierId"`
	SupplierName      string                         `json:"supplierName"`
	Currency          string                         `json:"currency"`
	InvoiceAmount     float64                        `json:"invoiceAmount"`
	PaidAmount        float64                        `json:"paidAmount"`
	OutstandingAmount float64                        `json:"outstandingAmount"`
	DueDate           string                         `json:"dueDate"`
	AgingBucket       string                         `json:"agingBucket"`
	Status            string                         `json:"status"`
	Version           int                            `json:"version"`
	CreatedAt         time.Time                      `json:"createdAt"`
	UpdatedAt         time.Time                      `json:"updatedAt"`
	PaymentRecords    []PaymentRecordResponse        `json:"paymentRecords"`
	Allocations       []SettlementAllocationResponse `json:"allocations"`
}

type CreateReceiptRecordRequest struct {
	Amount         float64                       `json:"amount" binding:"required"`
	Currency       string                        `json:"currency"`
	PaymentMethod  string                        `json:"paymentMethod"`
	PaymentTerm    string                        `json:"paymentTerm"`
	RecordDate     string                        `json:"recordDate"`
	ReceivedAt     string                        `json:"receivedAt"`
	ReceiptAccount string                        `json:"receiptAccount"`
	ReferenceNo    string                        `json:"referenceNo"`
	Allocations    []SettlementAllocationRequest `json:"allocations"`
}

type CreatePaymentRecordRequest struct {
	Amount        float64                       `json:"amount" binding:"required"`
	Currency      string                        `json:"currency"`
	PaymentMethod string                        `json:"paymentMethod"`
	PaymentTerm   string                        `json:"paymentTerm"`
	RecordDate    string                        `json:"recordDate"`
	ReferenceNo   string                        `json:"referenceNo"`
	Allocations   []SettlementAllocationRequest `json:"allocations"`
}

type SettlementAllocationRequest struct {
	LedgerID        string  `json:"ledgerId" binding:"required"`
	AllocatedAmount float64 `json:"allocatedAmount" binding:"required"`
	SequenceNo      int     `json:"sequenceNo"`
	Remark          string  `json:"remark"`
}

type CreateReceiptRecordResponse struct {
	Ledger      ReceivableLedgerDetailResponse `json:"ledger"`
	Record      ReceiptRecordResponse          `json:"record"`
	Allocations []SettlementAllocationResponse `json:"allocations"`
}

type CreatePaymentRecordResponse struct {
	Ledger      PayableLedgerDetailResponse    `json:"ledger"`
	Record      PaymentRecordResponse          `json:"record"`
	Allocations []SettlementAllocationResponse `json:"allocations"`
}
