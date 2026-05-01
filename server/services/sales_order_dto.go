package services

import "time"

type SalesOrderLineRequest struct {
	ID                            uint    `json:"id"`
	LineNo                        int     `json:"lineNo"`
	ProductID                     string  `json:"productId"`
	ProductModel                  string  `json:"productModel"`
	ProductCode                   string  `json:"productCode"`
	Specification                 string  `json:"specification"`
	ModelCodeSnapshot             string  `json:"modelCodeSnapshot"`
	HolePrefixSnapshot            string  `json:"holePrefixSnapshot"`
	AppearanceID                  string  `json:"appearanceId"`
	AppearanceNameSnapshot        string  `json:"appearanceNameSnapshot"`
	AppearanceBarcodeCodeSnapshot string  `json:"appearanceBarcodeCodeSnapshot"`
	AppearanceDescriptionSnapshot string  `json:"appearanceDescriptionSnapshot"`
	AppearanceImageURLSnapshot    string  `json:"appearanceImageUrlSnapshot"`
	Description                   string  `json:"description"`
	Qty                           float64 `json:"qty"`
	UOM                           string  `json:"uom"`
	Price                         float64 `json:"price"`
	Amount                        float64 `json:"amount"`
	DeliveredQty                  float64 `json:"deliveredQty"`
	CustomerPartNo                string  `json:"customerPartNo"`
	JobNo                         string  `json:"jobNo"`
	Note                          string  `json:"note"`
	DrillingPlanID                string  `json:"drillingPlanId"`
	LabelingPlanID                string  `json:"labelingPlanId"`
	HoleCount                     int     `json:"holeCount"`
	Route                         string  `json:"route"`
	OrderDate                     string  `json:"orderDate"`
	Status                        string  `json:"status"`
	ClaimedBy                     string  `json:"claimedBy"`
	ClaimedAt                     string  `json:"claimedAt"`
	ReturnedQuantity              float64 `json:"returnedQuantity"`
	RemainingReturnableQuantity   float64 `json:"remainingReturnableQuantity"`
}

type SaveSalesOrderRequest struct {
	ID                   string                  `json:"id"`
	OrderNo              string                  `json:"orderNo"`
	OrderName            string                  `json:"orderName"`
	CustomerName         string                  `json:"customerName"`
	CustomerID           string                  `json:"customerId"`
	Type                 string                  `json:"type"`
	Currency             string                  `json:"currency"`
	ExchangeRateSnapshot float64                 `json:"exchangeRateSnapshot"`
	PaymentMethod        string                  `json:"paymentMethod"`
	PaymentMethodName    string                  `json:"paymentMethodName"`
	PaymentTerm          string                  `json:"paymentTerm"`
	PaymentTermName      string                  `json:"paymentTermName"`
	Classification       string                  `json:"classification"`
	Status               string                  `json:"status"`
	StatusNote           string                  `json:"statusNote"`
	Amount               float64                 `json:"amount"`
	Quantity             float64                 `json:"quantity"`
	OrderDate            string                  `json:"orderDate"`
	DeliveryDate         string                  `json:"deliveryDate"`
	PurchaseOrderNo      string                  `json:"purchaseOrderNo"`
	Barcode              string                  `json:"barcode"`
	Requirements         string                  `json:"requirements"`
	Evidences            []OrderEvidencePayload  `json:"evidences"`
	UpdatedBy            string                  `json:"updatedBy"`
	IsDeleted            bool                    `json:"isDeleted"`
	Version              int                     `json:"version"`
	Lines                []SalesOrderLineRequest `json:"lines"`
}

type SalesOrderSnapshotRequest struct {
	ID                   string                  `json:"id"`
	OrderNo              string                  `json:"orderNo"`
	OrderName            string                  `json:"orderName"`
	CustomerName         string                  `json:"customerName"`
	CustomerID           string                  `json:"customerId"`
	Type                 string                  `json:"type"`
	Currency             string                  `json:"currency"`
	ExchangeRateSnapshot float64                 `json:"exchangeRateSnapshot"`
	PaymentMethod        string                  `json:"paymentMethod"`
	PaymentMethodName    string                  `json:"paymentMethodName"`
	PaymentTerm          string                  `json:"paymentTerm"`
	PaymentTermName      string                  `json:"paymentTermName"`
	Classification       string                  `json:"classification"`
	Status               string                  `json:"status"`
	StatusNote           string                  `json:"statusNote"`
	Amount               float64                 `json:"amount"`
	Quantity             float64                 `json:"quantity"`
	OrderDate            string                  `json:"orderDate"`
	DeliveryDate         string                  `json:"deliveryDate"`
	PurchaseOrderNo      string                  `json:"purchaseOrderNo"`
	Barcode              string                  `json:"barcode"`
	Requirements         string                  `json:"requirements"`
	Evidences            []OrderEvidencePayload  `json:"evidences"`
	UpdatedBy            string                  `json:"updatedBy"`
	IsDeleted            bool                    `json:"isDeleted"`
	Version              int                     `json:"version"`
	Lines                []SalesOrderLineRequest `json:"lines"`
}

type SalesOrderLineResponse struct {
	ID                            uint    `json:"id"`
	LineNo                        int     `json:"lineNo"`
	ProductID                     string  `json:"productId"`
	ProductModel                  string  `json:"productModel"`
	ProductCode                   string  `json:"productCode"`
	Specification                 string  `json:"specification"`
	ModelCodeSnapshot             string  `json:"modelCodeSnapshot"`
	HolePrefixSnapshot            string  `json:"holePrefixSnapshot"`
	AppearanceID                  string  `json:"appearanceId"`
	AppearanceNameSnapshot        string  `json:"appearanceNameSnapshot"`
	AppearanceBarcodeCodeSnapshot string  `json:"appearanceBarcodeCodeSnapshot"`
	AppearanceDescriptionSnapshot string  `json:"appearanceDescriptionSnapshot"`
	AppearanceImageURLSnapshot    string  `json:"appearanceImageUrlSnapshot"`
	Description                   string  `json:"description"`
	Qty                           float64 `json:"qty"`
	UOM                           string  `json:"uom"`
	Price                         float64 `json:"price"`
	Amount                        float64 `json:"amount"`
	DeliveredQty                  float64 `json:"deliveredQty"`
	CustomerPartNo                string  `json:"customerPartNo"`
	JobNo                         string  `json:"jobNo"`
	Note                          string  `json:"note"`
	DrillingPlanID                string  `json:"drillingPlanId"`
	LabelingPlanID                string  `json:"labelingPlanId"`
	HoleCount                     int     `json:"holeCount"`
	Route                         string  `json:"route"`
	OrderDate                     string  `json:"orderDate"`
	Status                        string  `json:"status"`
	ClaimedBy                     string  `json:"claimedBy"`
	ClaimedAt                     string  `json:"claimedAt"`
	ReturnedQuantity              float64 `json:"returnedQuantity"`
	RemainingReturnableQuantity   float64 `json:"remainingReturnableQuantity"`
}

type SalesOrderActionAvailabilityResponse struct {
	Action     string `json:"action"`
	Allowed    bool   `json:"allowed"`
	ReasonCode string `json:"reasonCode,omitempty"`
	Reason     string `json:"reason,omitempty"`
}

type SalesOrderResponse struct {
	ID                   string                                 `json:"id"`
	OrderNo              string                                 `json:"orderNo"`
	OrderName            string                                 `json:"orderName"`
	CustomerName         string                                 `json:"customerName"`
	CustomerID           string                                 `json:"customerId"`
	Type                 string                                 `json:"type"`
	Currency             string                                 `json:"currency"`
	ExchangeRateSnapshot float64                                `json:"exchangeRateSnapshot"`
	PaymentMethod        string                                 `json:"paymentMethod"`
	PaymentMethodName    string                                 `json:"paymentMethodName"`
	PaymentTerm          string                                 `json:"paymentTerm"`
	PaymentTermName      string                                 `json:"paymentTermName"`
	Classification       string                                 `json:"classification"`
	Status               string                                 `json:"status"`
	StatusNote           string                                 `json:"statusNote"`
	Amount               float64                                `json:"amount"`
	Quantity             float64                                `json:"quantity"`
	OrderDate            string                                 `json:"orderDate"`
	DeliveryDate         string                                 `json:"deliveryDate"`
	PurchaseOrderNo      string                                 `json:"purchaseOrderNo"`
	Barcode              string                                 `json:"barcode"`
	Requirements         string                                 `json:"requirements"`
	Evidences            []OrderEvidencePayload                 `json:"evidences"`
	CreatedAt            time.Time                              `json:"createdAt"`
	UpdatedAt            time.Time                              `json:"updatedAt"`
	UpdatedBy            string                                 `json:"updatedBy"`
	IsDeleted            bool                                   `json:"isDeleted"`
	Version              int                                    `json:"version"`
	FulfillmentRate      float64                                `json:"fulfillmentRate"`
	AvailableActions     []SalesOrderActionAvailabilityResponse `json:"availableActions"`
	Lines                []SalesOrderLineResponse               `json:"lines"`
}

type SalesOrderListItemResponse struct {
	ID                   string                                 `json:"id"`
	OrderNo              string                                 `json:"orderNo"`
	OrderName            string                                 `json:"orderName"`
	CustomerName         string                                 `json:"customerName"`
	CustomerID           string                                 `json:"customerId"`
	Type                 string                                 `json:"type"`
	Currency             string                                 `json:"currency"`
	ExchangeRateSnapshot float64                                `json:"exchangeRateSnapshot"`
	PaymentMethod        string                                 `json:"paymentMethod"`
	PaymentMethodName    string                                 `json:"paymentMethodName"`
	PaymentTerm          string                                 `json:"paymentTerm"`
	PaymentTermName      string                                 `json:"paymentTermName"`
	Classification       string                                 `json:"classification"`
	Status               string                                 `json:"status"`
	StatusNote           string                                 `json:"statusNote"`
	Amount               float64                                `json:"amount"`
	Quantity             float64                                `json:"quantity"`
	OrderDate            string                                 `json:"orderDate"`
	DeliveryDate         string                                 `json:"deliveryDate"`
	PurchaseOrderNo      string                                 `json:"purchaseOrderNo"`
	Barcode              string                                 `json:"barcode"`
	Requirements         string                                 `json:"requirements"`
	Evidences            []OrderEvidencePayload                 `json:"evidences"`
	CreatedAt            time.Time                              `json:"createdAt"`
	UpdatedAt            time.Time                              `json:"updatedAt"`
	UpdatedBy            string                                 `json:"updatedBy"`
	IsDeleted            bool                                   `json:"isDeleted"`
	Version              int                                    `json:"version"`
	FulfillmentRate      float64                                `json:"fulfillmentRate"`
	AvailableActions     []SalesOrderActionAvailabilityResponse `json:"availableActions"`
	Lines                *[]SalesOrderLineResponse              `json:"lines,omitempty"`
}

type SalesOrderListResponse struct {
	Items    []SalesOrderListItemResponse `json:"items"`
	Total    int64                        `json:"total"`
	Page     int                          `json:"page"`
	PageSize int                          `json:"pageSize"`
}

type BulkSyncSalesOrdersResponse struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}
