package services

type QuoteListQuery struct {
	Page               int
	PageSize           int
	CustomerSegmentRaw string
	StatusRaw          string
	TypeRaw            string
	Keyword            string
}

type CustomerQuoteSummaryQuery struct {
	CustomerID string
}

type QuoteSummaryResponse struct {
	ID              string `json:"id"`
	QuoteNo         string `json:"quoteNo"`
	CustomerName    string `json:"customerName"`
	CustomerSegment string `json:"customerSegment"`
	Type            string `json:"type"`
	Status          string `json:"status"`
	UpdatedAt       string `json:"updatedAt"`
	AmountLabel     string `json:"amountLabel"`
	ItemCount       int    `json:"itemCount"`
	OwnerName       string `json:"ownerName"`
	ProductSummary  string `json:"productSummary"`
}

type QuoteListResponse struct {
	Items    []QuoteSummaryResponse `json:"items"`
	Total    int64                  `json:"total"`
	Page     int                    `json:"page"`
	PageSize int                    `json:"pageSize"`
}

type CustomerQuoteSummaryItemResponse struct {
	QuoteID    string `json:"quoteId"`
	QuoteNo    string `json:"quoteNo"`
	Status     string `json:"status"`
	UpdatedAt  string `json:"updatedAt"`
	CustomerID string `json:"customerId"`
}

type CustomerQuoteSummaryResponse struct {
	Items []CustomerQuoteSummaryItemResponse `json:"items"`
	Total int64                              `json:"total"`
}
