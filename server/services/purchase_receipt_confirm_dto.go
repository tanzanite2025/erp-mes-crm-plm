package services

type ConfirmPurchaseReceiptRequest struct {
	Operator    string                              `json:"operator"`
	Remarks     string                              `json:"remarks"`
	ReceiptDate string                              `json:"receiptDate"`
	Lines       []ConfirmPurchaseReceiptLineRequest `json:"lines"`
}

type ConfirmPurchaseReceiptLineRequest struct {
	PurchaseOrderLineID uint    `json:"purchaseOrderLineId"`
	MaterialID          string  `json:"materialId"`
	Quantity            float64 `json:"quantity"`
	PurchasePrice       float64 `json:"purchasePrice"`
	BatchNo             string  `json:"batchNo"`
	TargetCategory      string  `json:"targetCategory"`
}
