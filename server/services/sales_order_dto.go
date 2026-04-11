package services

import "time"

type SalesOrderLineRequest struct {
	ID             uint    `json:"id"`
	LineNo         int     `json:"lineNo"`
	ProductID      string  `json:"productId"`
	ProductModel   string  `json:"productModel"`
	ProductCode    string  `json:"productCode"`
	Specification  string  `json:"specification"`
	Description    string  `json:"description"`
	Qty            float64 `json:"qty"`
	UOM            string  `json:"uom"`
	Price          float64 `json:"price"`
	Amount         float64 `json:"amount"`
	DeliveredQty   float64 `json:"deliveredQty"`
	CustomerPartNo string  `json:"customerPartNo"`
	JobNo          string  `json:"jobNo"`
	Note           string  `json:"note"`
	DrillingPlanID string  `json:"drillingPlanId"`
	LabelingPlanID string  `json:"labelingPlanId"`
	HoleCount      int     `json:"holeCount"`
	Route          string  `json:"route"`
	OrderDate      string  `json:"orderDate"`
	Status         string  `json:"status"`
	ClaimedBy      string  `json:"claimedBy"`
	ClaimedAt      string  `json:"claimedAt"`
}

type SaveSalesOrderRequest struct {
	ID                 string                  `json:"id"`
	OrderNo            string                  `json:"orderNo"`
	OrderName          string                  `json:"orderName"`
	CustomerName       string                  `json:"customerName"`
	CustomerID         string                  `json:"customerId"`
	Type               string                  `json:"type"`
	Currency           string                  `json:"currency"`
	PaymentMethod      string                  `json:"paymentMethod"`
	PaymentMethodName  string                  `json:"paymentMethodName"`
	PaymentTerm        string                  `json:"paymentTerm"`
	PaymentTermName    string                  `json:"paymentTermName"`
	Classification     string                  `json:"classification"`
	Status             string                  `json:"status"`
	StatusNote         string                  `json:"statusNote"`
	Amount             float64                 `json:"amount"`
	Quantity           float64                 `json:"quantity"`
	OrderDate          string                  `json:"orderDate"`
	DeliveryDate       string                  `json:"deliveryDate"`
	PurchaseOrderNo    string                  `json:"purchaseOrderNo"`
	Barcode            string                  `json:"barcode"`
	Requirements       string                  `json:"requirements"`
	Evidences          []OrderEvidencePayload  `json:"evidences"`
	WorkflowInstanceID string                  `json:"workflowInstanceId"`
	UpdatedBy          string                  `json:"updatedBy"`
	IsDeleted          bool                    `json:"isDeleted"`
	Version            int                     `json:"version"`
	Lines              []SalesOrderLineRequest `json:"lines"`
}

type SalesOrderSnapshotRequest struct {
	ID                 string                  `json:"id"`
	OrderNo            string                  `json:"orderNo"`
	OrderName          string                  `json:"orderName"`
	CustomerName       string                  `json:"customerName"`
	CustomerID         string                  `json:"customerId"`
	Type               string                  `json:"type"`
	Currency           string                  `json:"currency"`
	PaymentMethod      string                  `json:"paymentMethod"`
	PaymentMethodName  string                  `json:"paymentMethodName"`
	PaymentTerm        string                  `json:"paymentTerm"`
	PaymentTermName    string                  `json:"paymentTermName"`
	Classification     string                  `json:"classification"`
	Status             string                  `json:"status"`
	StatusNote         string                  `json:"statusNote"`
	Amount             float64                 `json:"amount"`
	Quantity           float64                 `json:"quantity"`
	OrderDate          string                  `json:"orderDate"`
	DeliveryDate       string                  `json:"deliveryDate"`
	PurchaseOrderNo    string                  `json:"purchaseOrderNo"`
	Barcode            string                  `json:"barcode"`
	Requirements       string                  `json:"requirements"`
	Evidences          []OrderEvidencePayload  `json:"evidences"`
	WorkflowInstanceID string                  `json:"workflowInstanceId"`
	UpdatedBy          string                  `json:"updatedBy"`
	IsDeleted          bool                    `json:"isDeleted"`
	Version            int                     `json:"version"`
	Lines              []SalesOrderLineRequest `json:"lines"`
}

type SalesOrderLineResponse struct {
	ID             uint    `json:"id"`
	LineNo         int     `json:"lineNo"`
	ProductID      string  `json:"productId"`
	ProductModel   string  `json:"productModel"`
	ProductCode    string  `json:"productCode"`
	Specification  string  `json:"specification"`
	Description    string  `json:"description"`
	Qty            float64 `json:"qty"`
	UOM            string  `json:"uom"`
	Price          float64 `json:"price"`
	Amount         float64 `json:"amount"`
	DeliveredQty   float64 `json:"deliveredQty"`
	CustomerPartNo string  `json:"customerPartNo"`
	JobNo          string  `json:"jobNo"`
	Note           string  `json:"note"`
	DrillingPlanID string  `json:"drillingPlanId"`
	LabelingPlanID string  `json:"labelingPlanId"`
	HoleCount      int     `json:"holeCount"`
	Route          string  `json:"route"`
	OrderDate      string  `json:"orderDate"`
	Status         string  `json:"status"`
	ClaimedBy      string  `json:"claimedBy"`
	ClaimedAt      string  `json:"claimedAt"`
}

type SalesOrderResponse struct {
	ID                 string                   `json:"id"`
	OrderNo            string                   `json:"orderNo"`
	OrderName          string                   `json:"orderName"`
	CustomerName       string                   `json:"customerName"`
	CustomerID         string                   `json:"customerId"`
	Type               string                   `json:"type"`
	Currency           string                   `json:"currency"`
	PaymentMethod      string                   `json:"paymentMethod"`
	PaymentMethodName  string                   `json:"paymentMethodName"`
	PaymentTerm        string                   `json:"paymentTerm"`
	PaymentTermName    string                   `json:"paymentTermName"`
	Classification     string                   `json:"classification"`
	Status             string                   `json:"status"`
	StatusNote         string                   `json:"statusNote"`
	Amount             float64                  `json:"amount"`
	Quantity           float64                  `json:"quantity"`
	OrderDate          string                   `json:"orderDate"`
	DeliveryDate       string                   `json:"deliveryDate"`
	PurchaseOrderNo    string                   `json:"purchaseOrderNo"`
	Barcode            string                   `json:"barcode"`
	Requirements       string                   `json:"requirements"`
	Evidences          []OrderEvidencePayload   `json:"evidences"`
	WorkflowInstanceID string                   `json:"workflowInstanceId"`
	CreatedAt          time.Time                `json:"createdAt"`
	UpdatedAt          time.Time                `json:"updatedAt"`
	UpdatedBy          string                   `json:"updatedBy"`
	IsDeleted          bool                     `json:"isDeleted"`
	Version            int                      `json:"version"`
	Lines              []SalesOrderLineResponse `json:"lines"`
}

type SalesOrderListItemResponse struct {
	ID                 string                   `json:"id"`
	OrderNo            string                   `json:"orderNo"`
	OrderName          string                   `json:"orderName"`
	CustomerName       string                   `json:"customerName"`
	CustomerID         string                   `json:"customerId"`
	Type               string                   `json:"type"`
	Currency           string                   `json:"currency"`
	PaymentMethod      string                   `json:"paymentMethod"`
	PaymentMethodName  string                   `json:"paymentMethodName"`
	PaymentTerm        string                   `json:"paymentTerm"`
	PaymentTermName    string                   `json:"paymentTermName"`
	Classification     string                   `json:"classification"`
	Status             string                   `json:"status"`
	StatusNote         string                   `json:"statusNote"`
	Amount             float64                  `json:"amount"`
	Quantity           float64                  `json:"quantity"`
	OrderDate          string                   `json:"orderDate"`
	DeliveryDate       string                   `json:"deliveryDate"`
	PurchaseOrderNo    string                   `json:"purchaseOrderNo"`
	Barcode            string                   `json:"barcode"`
	Requirements       string                   `json:"requirements"`
	Evidences          []OrderEvidencePayload   `json:"evidences"`
	WorkflowInstanceID string                   `json:"workflowInstanceId"`
	CreatedAt          time.Time                `json:"createdAt"`
	UpdatedAt          time.Time                `json:"updatedAt"`
	UpdatedBy          string                   `json:"updatedBy"`
	IsDeleted          bool                     `json:"isDeleted"`
	Version            int                      `json:"version"`
	Lines              []SalesOrderLineResponse `json:"lines,omitempty"`
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
