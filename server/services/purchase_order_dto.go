package services

import (
	"time"
)

type SaveSupplierRequest struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Code          string  `json:"code"`
	Category      string  `json:"category"`
	MainProducts  string  `json:"mainProducts"`
	ContactPerson string  `json:"contactPerson"`
	ContactPhone  string  `json:"contactPhone"`
	Email         string  `json:"email"`
	Address       string  `json:"address"`
	Status        string  `json:"status"`
	Rating        float64 `json:"rating"`
	Version       int     `json:"_v"`
}

type PatchSupplierRequest struct {
	ID            string
	Name          *string
	Code          *string
	Category      *string
	MainProducts  *string
	ContactPerson *string
	ContactPhone  *string
	Email         *string
	Address       *string
	Status        *string
	Rating        *float64
	Version       int
}

type PurchaseOrderLineRequest struct {
	ID            uint    `json:"id"`
	LineNo        int     `json:"lineNo"`
	MaterialID    string  `json:"materialId"`
	MaterialCode  string  `json:"materialCode"`
	MaterialName  string  `json:"materialName"`
	Specification string  `json:"specification"`
	Qty           float64 `json:"qty"`
	UOM           string  `json:"uom"`
	Price         float64 `json:"price"`
	Amount        float64 `json:"amount"`
	ReceivedQty   float64 `json:"receivedQty"`
	Status        string  `json:"status"`
}

type SavePurchaseOrderRequest struct {
	ID                 string                     `json:"id"`
	OrderNo            string                     `json:"orderNo"`
	SupplierID         string                     `json:"supplierId"`
	SupplierName       string                     `json:"supplierName"`
	OrderDate          string                     `json:"orderDate"`
	ExpectedDate       string                     `json:"expectedDate"`
	Status             string                     `json:"status"`
	Currency           string                     `json:"currency"`
	Amount             float64                    `json:"amount"`
	ExchangeRate       float64                    `json:"exchangeRate"`
	Purchaser          string                     `json:"purchaser"`
	PaymentTerm        string                     `json:"paymentTerm"`
	Note               string                     `json:"note"`
	WorkflowInstanceID string                     `json:"workflowInstanceId"`
	IsDeleted          bool                       `json:"isDeleted"`
	Version            int                        `json:"_v"`
	Lines              []PurchaseOrderLineRequest `json:"lines"`
}

type PatchPurchaseOrderRequest struct {
	ID                 string                     `json:"id"`
	OrderNo            string                     `json:"orderNo"`
	SupplierID         string                     `json:"supplierId"`
	SupplierName       string                     `json:"supplierName"`
	OrderDate          string                     `json:"orderDate"`
	ExpectedDate       string                     `json:"expectedDate"`
	Status             string                     `json:"status"`
	Currency           string                     `json:"currency"`
	Amount             float64                    `json:"amount"`
	ExchangeRate       float64                    `json:"exchangeRate"`
	Purchaser          string                     `json:"purchaser"`
	PaymentTerm        string                     `json:"paymentTerm"`
	Note               string                     `json:"note"`
	WorkflowInstanceID string                     `json:"workflowInstanceId"`
	IsDeleted          bool                       `json:"isDeleted"`
	Version            int                        `json:"_v"`
	Lines              []PurchaseOrderLineRequest `json:"lines"`
}

type PurchaseOrderLineResponse struct {
	ID            uint    `json:"id"`
	LineNo        int     `json:"lineNo"`
	MaterialID    string  `json:"materialId"`
	MaterialCode  string  `json:"materialCode"`
	MaterialName  string  `json:"materialName"`
	Specification string  `json:"specification"`
	Qty           float64 `json:"qty"`
	UOM           string  `json:"uom"`
	Price         float64 `json:"price"`
	Amount        float64 `json:"amount"`
	ReceivedQty   float64 `json:"receivedQty"`
	Status        string  `json:"status"`
}

type PurchaseOrderResponse struct {
	ID                 string                      `json:"id"`
	OrderNo            string                      `json:"orderNo"`
	SupplierID         string                      `json:"supplierId"`
	SupplierName       string                      `json:"supplierName"`
	OrderDate          string                      `json:"orderDate"`
	ExpectedDate       string                      `json:"expectedDate"`
	Status             string                      `json:"status"`
	Currency           string                      `json:"currency"`
	Amount             float64                     `json:"amount"`
	ExchangeRate       float64                     `json:"exchangeRate"`
	Purchaser          string                      `json:"purchaser"`
	PaymentTerm        string                      `json:"paymentTerm"`
	Note               string                      `json:"note"`
	WorkflowInstanceID string                      `json:"workflowInstanceId"`
	CreatedAt          time.Time                   `json:"createdAt"`
	UpdatedAt          time.Time                   `json:"updatedAt"`
	IsDeleted          bool                        `json:"isDeleted"`
	Version            int                         `json:"_v"`
	Lines              []PurchaseOrderLineResponse `json:"lines"`
}

type PurchaseOrderListItemResponse struct {
	ID                 string    `json:"id"`
	OrderNo            string    `json:"orderNo"`
	SupplierID         string    `json:"supplierId"`
	SupplierName       string    `json:"supplierName"`
	OrderDate          string    `json:"orderDate"`
	ExpectedDate       string    `json:"expectedDate"`
	Status             string    `json:"status"`
	Currency           string    `json:"currency"`
	Amount             float64   `json:"amount"`
	ExchangeRate       float64   `json:"exchangeRate"`
	Purchaser          string    `json:"purchaser"`
	PaymentTerm        string    `json:"paymentTerm"`
	Note               string    `json:"note"`
	WorkflowInstanceID string    `json:"workflowInstanceId"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
	IsDeleted          bool      `json:"isDeleted"`
	Version            int       `json:"_v"`
}

type PurchaseOrderListResponse struct {
	Items    []PurchaseOrderListItemResponse `json:"items"`
	Total    int64                           `json:"total"`
	Page     int                             `json:"page"`
	PageSize int                             `json:"pageSize"`
}

type InboundRecordResponse struct {
	ID                  string    `json:"id"`
	MaterialID          string    `json:"materialId"`
	MaterialName        string    `json:"materialName"`
	MaterialCode        string    `json:"materialCode"`
	PurchaseOrderID     string    `json:"purchaseOrderId"`
	PurchaseOrderLineID uint      `json:"purchaseOrderLineId"`
	Quantity            float64   `json:"quantity"`
	PurchasePrice       float64   `json:"purchasePrice"`
	TargetCategory      string    `json:"targetCategory"`
	BatchNo             string    `json:"batchNo"`
	InboundDate         time.Time `json:"inboundDate"`
	Operator            string    `json:"operator"`
	Remarks             string    `json:"remarks"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

type ConfirmPurchaseReceiptResponse struct {
	PurchaseOrder         PurchaseOrderResponse   `json:"purchaseOrder"`
	CreatedInboundRecords []InboundRecordResponse `json:"createdInboundRecords"`
}
