package services

import "time"

type FinancialVoucherQueryRequest struct {
	SourceType     string
	SourceRefID    string
	Status         string
	IncludeEntries bool
}

type ClearingEntryResponse struct {
	ID          string    `json:"id"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	VoucherID   string    `json:"voucherId"`
	LineNo      int       `json:"lineNo"`
	EntryType   string    `json:"entryType"`
	AccountCode string    `json:"accountCode"`
	Amount      float64   `json:"amount"`
	Memo        string    `json:"memo"`
}

type FinancialVoucherResponse struct {
	ID          string                  `json:"id"`
	CreatedAt   time.Time               `json:"createdAt"`
	UpdatedAt   time.Time               `json:"updatedAt"`
	VoucherNo   string                  `json:"voucherNo"`
	SourceType  string                  `json:"sourceType"`
	SourceRefID string                  `json:"sourceRefId"`
	Currency    string                  `json:"currency"`
	TotalAmount float64                 `json:"totalAmount"`
	Status      string                  `json:"status"`
	Entries     []ClearingEntryResponse `json:"entries,omitempty"`
}
