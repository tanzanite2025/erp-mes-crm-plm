package services

import "encoding/json"

type ConfirmPurchaseReceiptRequest struct {
	Operator    string                              `json:"operator"`
	Remarks     string                              `json:"remarks"`
	ReceiptDate string                              `json:"receiptDate"`
	Lines       []ConfirmPurchaseReceiptLineRequest `json:"lines"`
}

type ConfirmPurchaseReceiptLineRequest struct {
	PurchaseOrderLineID uint    `json:"purchaseOrderLineId"`
	OrderLineVersion    int     `json:"orderLineVersion"`
	MaterialID          string  `json:"materialId"`
	Quantity            float64 `json:"quantity"`
	PurchasePrice       float64 `json:"purchasePrice"`
	BatchNo             string  `json:"batchNo"`
	TargetCategory      string  `json:"targetCategory"`
}

func MarshalPurchaseOrderReceiptConfirmPayload(request ConfirmPurchaseReceiptRequest, operator string) ([]byte, error) {
	lines := make([]PurchaseOrderReceiptConfirmLinePayload, 0, len(request.Lines))
	for _, line := range request.Lines {
		lines = append(lines, PurchaseOrderReceiptConfirmLinePayload{
			PurchaseOrderLineID: line.PurchaseOrderLineID,
			OrderLineVersion:    line.OrderLineVersion,
			MaterialID:          line.MaterialID,
			Quantity:            line.Quantity,
			PurchasePrice:       line.PurchasePrice,
			BatchNo:             line.BatchNo,
			TargetCategory:      line.TargetCategory,
		})
	}

	return json.Marshal(PurchaseOrderReceiptConfirmPayload{
		Operator:    operator,
		Remarks:     request.Remarks,
		ReceiptDate: request.ReceiptDate,
		Lines:       lines,
	})
}
