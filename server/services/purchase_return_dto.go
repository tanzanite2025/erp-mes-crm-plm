package services

import "time"

type CreatePurchaseReturnRequest struct {
	Operator      string                            `json:"operator"`
	IssueCategory string                            `json:"issueCategory"`
	Reason        string                            `json:"reason"`
	Remarks       string                            `json:"remarks"`
	Evidences     []OrderEvidencePayload            `json:"evidences"`
	ReturnDate    string                            `json:"returnDate"`
	Lines         []CreatePurchaseReturnLineRequest `json:"lines"`
}

type CreatePurchaseReturnLineRequest struct {
	PurchaseOrderLineID uint                   `json:"purchaseOrderLineId"`
	Quantity            float64                `json:"quantity"`
	Price               float64                `json:"price"`
	IssueCategory       string                 `json:"issueCategory"`
	Reason              string                 `json:"reason"`
	Evidences           []OrderEvidencePayload `json:"evidences"`
}

type PurchaseReturnLineResponse struct {
	ID                  uint                   `json:"id"`
	PurchaseOrderLineID uint                   `json:"purchaseOrderLineId"`
	LineNo              int                    `json:"lineNo"`
	MaterialID          string                 `json:"materialId"`
	MaterialCode        string                 `json:"materialCode"`
	MaterialName        string                 `json:"materialName"`
	Specification       string                 `json:"specification"`
	UOM                 string                 `json:"uom"`
	Quantity            float64                `json:"quantity"`
	Price               float64                `json:"price"`
	Amount              float64                `json:"amount"`
	IssueCategory       string                 `json:"issueCategory"`
	Reason              string                 `json:"reason"`
	Evidences           []OrderEvidencePayload `json:"evidences"`
}

type PurchaseReturnResponse struct {
	ID              string                       `json:"id"`
	ReturnNo        string                       `json:"returnNo"`
	PurchaseOrderID string                       `json:"purchaseOrderId"`
	PurchaseOrderNo string                       `json:"purchaseOrderNo"`
	SupplierID      string                       `json:"supplierId"`
	SupplierName    string                       `json:"supplierName"`
	Status          string                       `json:"status"`
	ReturnDate      time.Time                    `json:"returnDate"`
	IssueCategory   string                       `json:"issueCategory"`
	Reason          string                       `json:"reason"`
	Remarks         string                       `json:"remarks"`
	Evidences       []OrderEvidencePayload       `json:"evidences"`
	Operator        string                       `json:"operator"`
	TotalQuantity   float64                      `json:"totalQuantity"`
	TotalAmount     float64                      `json:"totalAmount"`
	CreatedAt       time.Time                    `json:"createdAt"`
	UpdatedAt       time.Time                    `json:"updatedAt"`
	Lines           []PurchaseReturnLineResponse `json:"lines"`
}

type PurchaseReturnListResponse struct {
	Items    []PurchaseReturnResponse `json:"items"`
	Total    int64                    `json:"total"`
	Page     int                      `json:"page"`
	PageSize int                      `json:"pageSize"`
}

type CreatePurchaseReturnResponse struct {
	PurchaseReturn PurchaseReturnResponse `json:"purchaseReturn"`
	PurchaseOrder  PurchaseOrderResponse  `json:"purchaseOrder"`
}
