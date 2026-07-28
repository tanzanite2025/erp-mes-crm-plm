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
	Side                string `json:"side"`
}

type SalesExchangeUnmatchedLabelRequest struct {
	RawLabelCode        string `json:"rawLabelCode"`
	NormalizedLabelCode string `json:"normalizedLabelCode"`
	RecognizedAt        string `json:"recognizedAt"`
	RecognitionSource   string `json:"recognitionSource"`
	UnmatchedReason     string `json:"unmatchedReason"`
	Side                string `json:"side"`
}

type ConfirmSalesExchangeOldItemInboundRequest struct {
	ClientRequestID     string                                 `json:"clientRequestId"`
	Operator            string                                 `json:"operator"`
	SalesExchangeLineID uint                                   `json:"salesExchangeLineId"`
	Quantity            float64                                `json:"quantity"`
	TargetCategory      string                                 `json:"targetCategory"`
	BatchNo             string                                 `json:"batchNo"`
	InboundDate         string                                 `json:"inboundDate"`
	Remarks             string                                 `json:"remarks"`
	Barcodes            []SalesExchangeExecutionBarcodeRequest `json:"barcodes"`
}

type PatchSalesExchangeOldItemLogisticsRequest struct {
	Operator                  string `json:"operator"`
	ReceivedOldItemTrackingNo string `json:"receivedOldItemTrackingNo"`
}

type SalesExchangeExecutionBarcodeRequest struct {
	RawLabelCode        string `json:"rawLabelCode"`
	NormalizedLabelCode string `json:"normalizedLabelCode"`
	RecognizedAt        string `json:"recognizedAt"`
	RecognitionSource   string `json:"recognitionSource"`
	Side                string `json:"side"`
}

type SalesExchangeLabelCodeResponse struct {
	ID                  uint      `json:"id"`
	RawLabelCode        string    `json:"rawLabelCode"`
	NormalizedLabelCode string    `json:"normalizedLabelCode"`
	RecognitionSource   string    `json:"recognitionSource"`
	RecognizedAt        time.Time `json:"recognizedAt"`
	Side                string    `json:"side"`
	UnmatchedReason     string    `json:"unmatchedReason,omitempty"`
}

type SalesExchangeLineResponse struct {
	ID                                    uint                             `json:"id"`
	LineDraftID                           string                           `json:"lineDraftId"`
	SalesOrderLineID                      uint                             `json:"salesOrderLineId"`
	LineNo                                int                              `json:"lineNo"`
	ProductID                             string                           `json:"productId"`
	ProductCode                           string                           `json:"productCode"`
	ProductModel                          string                           `json:"productModel"`
	Specification                         string                           `json:"specification"`
	ProductDisplayTitleSnapshot           string                           `json:"productDisplayTitleSnapshot"`
	ProductDisplaySubtitleSnapshot        string                           `json:"productDisplaySubtitleSnapshot"`
	ProductDisplayCodeSnapshot            string                           `json:"productDisplayCodeSnapshot"`
	ProductDisplayFullLabelSnapshot       string                           `json:"productDisplayFullLabelSnapshot"`
	ProductDisplayStrategyVersionSnapshot string                           `json:"productDisplayStrategyVersionSnapshot"`
	Description                           string                           `json:"description"`
	UOM                                   string                           `json:"uom"`
	OriginalOrderQuantity                 float64                          `json:"originalOrderQuantity"`
	DeliveredQuantity                     float64                          `json:"deliveredQuantity"`
	ExchangeQuantity                      float64                          `json:"exchangeQuantity"`
	OldItemReceivedQuantity               float64                          `json:"oldItemReceivedQuantity"`
	ReplacementShippedQuantity            float64                          `json:"replacementShippedQuantity"`
	Status                                string                           `json:"status"`
	ReplacementMode                       string                           `json:"replacementMode"`
	ReplacementProductCode                string                           `json:"replacementProductCode"`
	ReplacementProductModel               string                           `json:"replacementProductModel"`
	IssueCategory                         string                           `json:"issueCategory"`
	IssueDescription                      string                           `json:"issueDescription"`
	RecognizedLabelCodes                  []SalesExchangeLabelCodeResponse `json:"recognizedLabelCodes"`
}

type SalesExchangeResponse struct {
	ID                         string                            `json:"id"`
	ExchangeNo                 string                            `json:"exchangeNo"`
	SourceSalesOrderID         string                            `json:"sourceSalesOrderId"`
	SourceSalesOrderNo         string                            `json:"sourceSalesOrderNo"`
	CustomerID                 string                            `json:"customerId"`
	CustomerName               string                            `json:"customerName"`
	Status                     string                            `json:"status"`
	ExchangeDate               time.Time                         `json:"exchangeDate"`
	ExpectedReplacementDate    *time.Time                        `json:"expectedReplacementDate"`
	ReceivedOldItemTrackingNo  string                            `json:"receivedOldItemTrackingNo"`
	ReplacementTrackingNo      string                            `json:"replacementTrackingNo"`
	ExchangeReason             string                            `json:"exchangeReason"`
	ExchangeRemarks            string                            `json:"exchangeRemarks"`
	Operator                   string                            `json:"operator"`
	TotalExchangeQuantity      float64                           `json:"totalExchangeQuantity"`
	OldItemInboundConfirmedAt  *time.Time                        `json:"oldItemInboundConfirmedAt"`
	OldItemInboundConfirmedBy  string                            `json:"oldItemInboundConfirmedBy"`
	OldItemInboundTarget       string                            `json:"oldItemInboundTarget"`
	OldItemInboundBatchNo      string                            `json:"oldItemInboundBatchNo"`
	OldItemInboundRemarks      string                            `json:"oldItemInboundRemarks"`
	ReplacementShippedAt       *time.Time                        `json:"replacementShippedAt"`
	ReplacementShippedBy       string                            `json:"replacementShippedBy"`
	ReplacementSourceCategory  string                            `json:"replacementSourceCategory"`
	ReplacementBatchNo         string                            `json:"replacementBatchNo"`
	ReplacementShipmentRemarks string                            `json:"replacementShipmentRemarks"`
	CreatedAt                  time.Time                         `json:"createdAt"`
	UpdatedAt                  time.Time                         `json:"updatedAt"`
	Lines                      []SalesExchangeLineResponse       `json:"lines"`
	UnmatchedLabelCodes        []SalesExchangeLabelCodeResponse  `json:"unmatchedLabelCodes"`
	InboundRecords             []InventoryInboundRecordResponse  `json:"inboundRecords"`
	ShipmentRecords            []InventoryShipmentRecordResponse `json:"shipmentRecords"`
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

type ConfirmSalesExchangeReplacementShipmentRequest struct {
	ClientRequestID       string                                               `json:"clientRequestId"`
	Operator              string                                               `json:"operator"`
	SourceCategory        string                                               `json:"sourceCategory"`
	BatchNo               string                                               `json:"batchNo"`
	ShipmentDate          string                                               `json:"shipmentDate"`
	ReplacementTrackingNo string                                               `json:"replacementTrackingNo"`
	Remarks               string                                               `json:"remarks"`
	Lines                 []ConfirmSalesExchangeReplacementShipmentLineRequest `json:"lines"`
}

type ConfirmSalesExchangeReplacementShipmentLineRequest struct {
	SalesExchangeLineID uint                                   `json:"salesExchangeLineId"`
	Quantity            float64                                `json:"quantity"`
	Barcodes            []SalesExchangeExecutionBarcodeRequest `json:"barcodes"`
}

type ConfirmSalesExchangeReplacementShipmentResponse struct {
	SalesExchange          SalesExchangeResponse             `json:"salesExchange"`
	CreatedShipmentRecords []InventoryShipmentRecordResponse `json:"createdShipmentRecords"`
}

type VoidSalesExchangeReplacementShipmentRequest struct {
	Operator string `json:"operator"`
	Reason   string `json:"reason"`
}

type VoidSalesExchangeReplacementShipmentResponse struct {
	SalesExchange SalesExchangeResponse           `json:"salesExchange"`
	Shipment      InventoryShipmentRecordResponse `json:"shipment"`
}
