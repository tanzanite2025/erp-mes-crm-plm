package services

import "time"

type CreateSalesExchangeRequest struct {
	Operator                  string                               `json:"operator"`
	ExchangeDate              string                               `json:"exchangeDate"`
	ExpectedReplacementDate   string                               `json:"expectedReplacementDate"`
	ReceivedOldItemTrackingNo string                               `json:"receivedOldItemTrackingNo"`
	ReplacementTrackingNo     string                               `json:"replacementTrackingNo"`
	ExchangeReason            string                               `json:"exchangeReason"`
	ExchangeRemarks           string                               `json:"exchangeRemarks"`
	Lines                     []CreateSalesExchangeLineRequest     `json:"lines"`
	UnmatchedLabelCodes       []SalesExchangeUnmatchedLabelRequest `json:"unmatchedLabelCodes"`
}

type CreateSalesExchangeLineRequest struct {
	SalesOrderLineID        uint                                  `json:"salesOrderLineId"`
	ExchangeQuantity        float64                               `json:"exchangeQuantity"`
	ReplacementMode         string                                `json:"replacementMode"`
	ReplacementProductCode  string                                `json:"replacementProductCode"`
	ReplacementProductModel string                                `json:"replacementProductModel"`
	IssueCategory           string                                `json:"issueCategory"`
	IssueDescription        string                                `json:"issueDescription"`
	LabelCodes              []SalesExchangeRecognizedLabelRequest `json:"recognizedLabelCodes"`
}

type SalesExchangeRecognizedLabelRequest struct {
	RawLabelCode        string `json:"rawLabelCode"`
	NormalizedLabelCode string `json:"normalizedLabelCode"`
	RecognizedAt        string `json:"recognizedAt"`
	RecognitionSource   string `json:"recognitionSource"`
}

type SalesExchangeUnmatchedLabelRequest struct {
	RawLabelCode        string `json:"rawLabelCode"`
	NormalizedLabelCode string `json:"normalizedLabelCode"`
	RecognizedAt        string `json:"recognizedAt"`
	RecognitionSource   string `json:"recognitionSource"`
	UnmatchedReason     string `json:"unmatchedReason"`
}

type ConfirmSalesExchangeOldItemInboundRequest struct {
	Operator       string `json:"operator"`
	TargetCategory string `json:"targetCategory"`
	BatchNo        string `json:"batchNo"`
	InboundDate    string `json:"inboundDate"`
	Remarks        string `json:"remarks"`
}

type SalesExchangeLabelCodeResponse struct {
	ID                  uint      `json:"id"`
	RawLabelCode        string    `json:"rawLabelCode"`
	NormalizedLabelCode string    `json:"normalizedLabelCode"`
	RecognitionSource   string    `json:"recognitionSource"`
	RecognizedAt        time.Time `json:"recognizedAt"`
	UnmatchedReason     string    `json:"unmatchedReason,omitempty"`
}

type SalesExchangeLineResponse struct {
	ID                      uint                             `json:"id"`
	LineDraftID             string                           `json:"lineDraftId"`
	SalesOrderLineID        uint                             `json:"salesOrderLineId"`
	LineNo                  int                              `json:"lineNo"`
	ProductID               string                           `json:"productId"`
	ProductCode             string                           `json:"productCode"`
	ProductModel            string                           `json:"productModel"`
	Specification           string                           `json:"specification"`
	Description             string                           `json:"description"`
	UOM                     string                           `json:"uom"`
	OriginalOrderQuantity   float64                          `json:"originalOrderQuantity"`
	DeliveredQuantity       float64                          `json:"deliveredQuantity"`
	ExchangeQuantity        float64                          `json:"exchangeQuantity"`
	ReplacementMode         string                           `json:"replacementMode"`
	ReplacementProductCode  string                           `json:"replacementProductCode"`
	ReplacementProductModel string                           `json:"replacementProductModel"`
	IssueCategory           string                           `json:"issueCategory"`
	IssueDescription        string                           `json:"issueDescription"`
	RecognizedLabelCodes    []SalesExchangeLabelCodeResponse `json:"recognizedLabelCodes"`
}

type SalesExchangeResponse struct {
	ID                        string                           `json:"id"`
	ExchangeNo                string                           `json:"exchangeNo"`
	SourceSalesOrderID        string                           `json:"sourceSalesOrderId"`
	SourceSalesOrderNo        string                           `json:"sourceSalesOrderNo"`
	CustomerID                string                           `json:"customerId"`
	CustomerName              string                           `json:"customerName"`
	Status                    string                           `json:"status"`
	ExchangeDate              time.Time                        `json:"exchangeDate"`
	ExpectedReplacementDate   *time.Time                       `json:"expectedReplacementDate"`
	ReceivedOldItemTrackingNo string                           `json:"receivedOldItemTrackingNo"`
	ReplacementTrackingNo     string                           `json:"replacementTrackingNo"`
	ExchangeReason            string                           `json:"exchangeReason"`
	ExchangeRemarks           string                           `json:"exchangeRemarks"`
	Operator                  string                           `json:"operator"`
	TotalExchangeQuantity     float64                          `json:"totalExchangeQuantity"`
	OldItemInboundConfirmedAt *time.Time                       `json:"oldItemInboundConfirmedAt"`
	OldItemInboundConfirmedBy string                           `json:"oldItemInboundConfirmedBy"`
	OldItemInboundTarget      string                           `json:"oldItemInboundTarget"`
	OldItemInboundBatchNo     string                           `json:"oldItemInboundBatchNo"`
	OldItemInboundRemarks     string                           `json:"oldItemInboundRemarks"`
	CreatedAt                 time.Time                        `json:"createdAt"`
	UpdatedAt                 time.Time                        `json:"updatedAt"`
	Lines                     []SalesExchangeLineResponse      `json:"lines"`
	UnmatchedLabelCodes       []SalesExchangeLabelCodeResponse `json:"unmatchedLabelCodes"`
}

type SalesExchangeListResponse struct {
	Items    []SalesExchangeResponse `json:"items"`
	Total    int64                   `json:"total"`
	Page     int                     `json:"page"`
	PageSize int                     `json:"pageSize"`
}

type CreateSalesExchangeResponse struct {
	SalesExchange SalesExchangeResponse `json:"salesExchange"`
	SalesOrder    SalesOrderResponse    `json:"salesOrder"`
}

type ConfirmSalesExchangeOldItemInboundResponse struct {
	SalesExchange         SalesExchangeResponse            `json:"salesExchange"`
	CreatedInboundRecords []InventoryInboundRecordResponse `json:"createdInboundRecords"`
}
