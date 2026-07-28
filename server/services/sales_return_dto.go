package services

import "time"

type CreateSalesReturnRequest struct {
	Operator      string                         `json:"operator"`
	TrackingNo    string                         `json:"trackingNo"`
	Carrier       string                         `json:"carrier"`
	ShippedAt     string                         `json:"shippedAt"`
	LogisticsNote string                         `json:"logisticsNote"`
	IssueCategory string                         `json:"issueCategory"`
	Reason        string                         `json:"reason"`
	Remarks       string                         `json:"remarks"`
	Evidences     []OrderEvidencePayload         `json:"evidences"`
	ReturnDate    string                         `json:"returnDate"`
	Lines         []CreateSalesReturnLineRequest `json:"lines"`
}

type PatchSalesReturnRequest struct {
	Operator      string                         `json:"operator"`
	IssueCategory string                         `json:"issueCategory"`
	Reason        string                         `json:"reason"`
	Remarks       string                         `json:"remarks"`
	Evidences     []OrderEvidencePayload         `json:"evidences"`
	ReturnDate    string                         `json:"returnDate"`
	Lines         []CreateSalesReturnLineRequest `json:"lines"`
}

type PatchSalesReturnLogisticsRequest struct {
	Operator      string `json:"operator"`
	TrackingNo    string `json:"trackingNo"`
	Carrier       string `json:"carrier"`
	ShippedAt     string `json:"shippedAt"`
	LogisticsNote string `json:"logisticsNote"`
	Status        string `json:"status"`
}

type PatchSalesReturnActualAmountEntryRequest struct {
	Operator                    string                 `json:"operator"`
	ActualReturnAmount          float64                `json:"actualReturnAmount"`
	ActualReturnAmountNote      string                 `json:"actualReturnAmountNote"`
	ActualReturnAmountEvidences []OrderEvidencePayload `json:"actualReturnAmountEvidences"`
}

type SalesReturnLineBarcodeRequest struct {
	SalesReturnLineID  uint   `json:"salesReturnLineId"`
	RawCode            string `json:"rawCode"`
	NormalizedCode     string `json:"normalizedCode"`
	BindSource         string `json:"bindSource"`
	VerificationStatus string `json:"verificationStatus"`
}

type BindSalesReturnLineBarcodesRequest struct {
	Operator string                          `json:"operator"`
	Barcodes []SalesReturnLineBarcodeRequest `json:"barcodes"`
}

type ConfirmSalesReturnInboundLineRequest struct {
	SalesReturnLineID uint                            `json:"salesReturnLineId"`
	Quantity          float64                         `json:"quantity"`
	Barcodes          []SalesReturnLineBarcodeRequest `json:"barcodes"`
}

type ConfirmSalesReturnInboundRequest struct {
	ClientRequestID string                                 `json:"clientRequestId"`
	Operator        string                                 `json:"operator"`
	TargetCategory  string                                 `json:"targetCategory"`
	BatchNo         string                                 `json:"batchNo"`
	InboundDate     string                                 `json:"inboundDate"`
	Remarks         string                                 `json:"remarks"`
	Lines           []ConfirmSalesReturnInboundLineRequest `json:"lines"`
}

type SalesReturnActualAmountRecordResponse struct {
	ID                            string                 `json:"id"`
	SalesReturnID                 string                 `json:"salesReturnId"`
	SalesOrderID                  string                 `json:"salesOrderId"`
	SalesOrderNo                  string                 `json:"salesOrderNo"`
	ReturnNo                      string                 `json:"returnNo"`
	CustomerID                    string                 `json:"customerId"`
	CustomerName                  string                 `json:"customerName"`
	Amount                        float64                `json:"amount"`
	Note                          string                 `json:"note"`
	Evidences                     []OrderEvidencePayload `json:"evidences"`
	EstimatedReturnAmountSnapshot float64                `json:"estimatedReturnAmountSnapshot"`
	RecordedAt                    time.Time              `json:"recordedAt"`
	RecordedBy                    string                 `json:"recordedBy"`
	CreatedAt                     time.Time              `json:"createdAt"`
	UpdatedAt                     time.Time              `json:"updatedAt"`
}

type CreateSalesReturnLineRequest struct {
	SalesOrderLineID uint                   `json:"salesOrderLineId"`
	Quantity         float64                `json:"quantity"`
	Price            float64                `json:"price"`
	IssueCategory    string                 `json:"issueCategory"`
	Reason           string                 `json:"reason"`
	Evidences        []OrderEvidencePayload `json:"evidences"`
	Barcodes         []string               `json:"barcodes"`
}

type SalesReturnLineResponse struct {
	ID                                    uint                             `json:"id"`
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
	Quantity                              float64                          `json:"quantity"`
	ReceivedQuantity                      float64                          `json:"receivedQuantity"`
	Status                                string                           `json:"status"`
	Price                                 float64                          `json:"price"`
	Amount                                float64                          `json:"amount"`
	IssueCategory                         string                           `json:"issueCategory"`
	Reason                                string                           `json:"reason"`
	Evidences                             []OrderEvidencePayload           `json:"evidences"`
	Barcodes                              []SalesReturnLineBarcodeResponse `json:"barcodes"`
}

type SalesReturnLineBarcodeResponse struct {
	ID                  uint      `json:"id"`
	SalesReturnID       string    `json:"salesReturnId"`
	SalesReturnLineID   uint      `json:"salesReturnLineId"`
	SalesOrderLineID    uint      `json:"salesOrderLineId"`
	RawCode             string    `json:"rawCode"`
	NormalizedCode      string    `json:"normalizedCode"`
	ProductCodeSnapshot string    `json:"productCodeSnapshot"`
	BindSource          string    `json:"bindSource"`
	VerificationStatus  string    `json:"verificationStatus"`
	BoundAt             time.Time `json:"boundAt"`
	BoundBy             string    `json:"boundBy"`
}

type SalesReturnResponse struct {
	ID                           string                           `json:"id"`
	ReturnNo                     string                           `json:"returnNo"`
	SalesOrderID                 string                           `json:"salesOrderId"`
	SalesOrderNo                 string                           `json:"salesOrderNo"`
	CustomerID                   string                           `json:"customerId"`
	CustomerName                 string                           `json:"customerName"`
	Status                       string                           `json:"status"`
	TrackingNo                   string                           `json:"trackingNo"`
	Carrier                      string                           `json:"carrier"`
	ShippedAt                    *time.Time                       `json:"shippedAt"`
	TrackingFilledAt             *time.Time                       `json:"trackingFilledAt"`
	TrackingFilledBy             string                           `json:"trackingFilledBy"`
	LogisticsNote                string                           `json:"logisticsNote"`
	PendingTrackingFill          bool                             `json:"pendingTrackingFill"`
	ReturnDate                   time.Time                        `json:"returnDate"`
	IssueCategory                string                           `json:"issueCategory"`
	Reason                       string                           `json:"reason"`
	Remarks                      string                           `json:"remarks"`
	TotalReceivedQuantity        float64                          `json:"totalReceivedQuantity"`
	ActualReturnAmount           float64                          `json:"actualReturnAmount"`
	ActualReturnAmountNote       string                           `json:"actualReturnAmountNote"`
	ActualReturnAmountEvidences  []OrderEvidencePayload           `json:"actualReturnAmountEvidences"`
	ActualReturnAmountRecordedAt *time.Time                       `json:"actualReturnAmountRecordedAt"`
	ActualReturnAmountRecordedBy string                           `json:"actualReturnAmountRecordedBy"`
	Evidences                    []OrderEvidencePayload           `json:"evidences"`
	Operator                     string                           `json:"operator"`
	TotalQuantity                float64                          `json:"totalQuantity"`
	TotalAmount                  float64                          `json:"totalAmount"`
	CreatedAt                    time.Time                        `json:"createdAt"`
	UpdatedAt                    time.Time                        `json:"updatedAt"`
	Lines                        []SalesReturnLineResponse        `json:"lines"`
	InboundRecords               []InventoryInboundRecordResponse `json:"inboundRecords"`
}

type SalesReturnListResponse struct {
	Items    []SalesReturnResponse `json:"items"`
	Total    int64                 `json:"total"`
	Page     int                   `json:"page"`
	PageSize int                   `json:"pageSize"`
}

type CreateSalesReturnResponse struct {
	SalesReturn SalesReturnResponse `json:"salesReturn"`
	SalesOrder  SalesOrderResponse  `json:"salesOrder"`
}

type ConfirmSalesReturnInboundResponse struct {
	SalesReturn           SalesReturnResponse              `json:"salesReturn"`
	CreatedInboundRecords []InventoryInboundRecordResponse `json:"createdInboundRecords"`
}
