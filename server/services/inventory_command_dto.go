package services

import "time"

type RecordInboundRequest struct {
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
}

type RecordShipmentRequest struct {
	MaterialID       string    `json:"materialId"`
	MaterialName     string    `json:"materialName"`
	MaterialCode     string    `json:"materialCode"`
	SalesOrderID     string    `json:"salesOrderId"`
	SalesOrderLineID uint      `json:"salesOrderLineId"`
	Quantity         float64   `json:"quantity"`
	SourceCategory   string    `json:"sourceCategory"`
	BatchNo          string    `json:"batchNo"`
	OrderNo          string    `json:"orderNo"`
	Status           string    `json:"status"`
	ShipmentDate     time.Time `json:"shipmentDate"`
	Operator         string    `json:"operator"`
	Remarks          string    `json:"remarks"`
}

type InventoryInboundRecordResponse struct {
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

type InventoryShipmentRecordResponse struct {
	ID               string    `json:"id"`
	MaterialID       string    `json:"materialId"`
	MaterialName     string    `json:"materialName"`
	MaterialCode     string    `json:"materialCode"`
	SalesOrderID     string    `json:"salesOrderId"`
	SalesOrderLineID uint      `json:"salesOrderLineId"`
	Quantity         float64   `json:"quantity"`
	SourceCategory   string    `json:"sourceCategory"`
	BatchNo          string    `json:"batchNo"`
	OrderNo          string    `json:"orderNo"`
	Status           string    `json:"status"`
	COGS             float64   `json:"cogs"`
	ShipmentDate     time.Time `json:"shipmentDate"`
	Operator         string    `json:"operator"`
	Remarks          string    `json:"remarks"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type VoidShipmentRequest struct {
	ApprovalId string `json:"approvalId"`
}

type InventoryCommandStatusResponse struct {
	Status string `json:"status"`
}
