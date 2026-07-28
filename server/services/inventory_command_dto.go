package services

import (
	"encoding/json"
	"time"
)

type InventoryPatchMetadata struct {
	ID      string `json:"id"`
	Version int    `json:"version"`
}

type PatchInventoryHandlerRequest struct {
	Op       string                     `json:"op"`
	Delta    map[string]json.RawMessage `json:"delta"`
	Metadata InventoryPatchMetadata     `json:"metadata"`
}

type PatchInventoryRequest struct {
	ID              string
	MaterialID      *string
	MaterialName    *string
	MaterialCode    *string
	MaterialSpec    *string
	Quantity        *float64
	TotalValue      *float64
	AverageUnitCost *float64
	CategoryCode    *string
	BatchNo         *string
	UOM             *string
	Version         int
}

type PatchShipmentRequest struct {
	ID               string
	MaterialID       *string
	MaterialName     *string
	MaterialCode     *string
	SalesOrderID     *string
	SalesOrderLineID *uint
	Quantity         *float64
	SourceCategory   *string
	BatchNo          *string
	OrderNo          *string
	ShipmentDate     *time.Time
	Operator         *string
	Remarks          *string
	Version          int
}

type PatchStocktakeItemRequest struct {
	ID        string
	ActualQty *float64
	ScannerID *string
	ScanTime  *time.Time
	Version   int
}

type RecordInboundRequest struct {
	MaterialID          string    `json:"materialId"`
	MaterialName        string    `json:"materialName"`
	MaterialCode        string    `json:"materialCode"`
	SourceType          string    `json:"sourceType"`
	SourceID            string    `json:"sourceId"`
	SourceLineID        uint      `json:"sourceLineId"`
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
	SourceType       string    `json:"sourceType"`
	SourceID         string    `json:"sourceId"`
	SourceLineID     uint      `json:"sourceLineId"`
	SalesOrderID     string    `json:"salesOrderId"`
	SalesOrderLineID uint      `json:"salesOrderLineId"`
	Quantity         float64   `json:"quantity"`
	SourceCategory   string    `json:"sourceCategory"`
	BatchNo          string    `json:"batchNo"`
	OrderNo          string    `json:"orderNo"`
	TrackingNo       string    `json:"trackingNo"`
	Status           string    `json:"status"`
	ShipmentDate     time.Time `json:"shipmentDate"`
	Operator         string    `json:"operator"`
	Remarks          string    `json:"remarks"`
}

type TransferInventoryRequest struct {
	MaterialID   string  `json:"materialId"`
	Quantity     float64 `json:"quantity"`
	FromCategory string  `json:"fromCategory"`
	ToCategory   string  `json:"toCategory"`
	BatchNo      string  `json:"batchNo"`
}

type PrepareVirtualShipmentRequest struct {
	SalesOrderID     string    `json:"salesOrderId"`
	SalesOrderLineID uint      `json:"salesOrderLineId"`
	Quantity         float64   `json:"quantity"`
	SourceCategory   string    `json:"sourceCategory"`
	BatchNo          string    `json:"batchNo"`
	ShipmentDate     time.Time `json:"shipmentDate"`
	Operator         string    `json:"operator"`
	Remarks          string    `json:"remarks"`
}

type InventoryInboundRecordResponse struct {
	ID                  string    `json:"id"`
	MaterialID          string    `json:"materialId"`
	MaterialName        string    `json:"materialName"`
	MaterialCode        string    `json:"materialCode"`
	SourceType          string    `json:"sourceType"`
	SourceID            string    `json:"sourceId"`
	SourceLineID        uint      `json:"sourceLineId"`
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
	SourceType       string    `json:"sourceType"`
	SourceID         string    `json:"sourceId"`
	SourceLineID     uint      `json:"sourceLineId"`
	SalesOrderID     string    `json:"salesOrderId"`
	SalesOrderLineID uint      `json:"salesOrderLineId"`
	Quantity         float64   `json:"quantity"`
	SourceCategory   string    `json:"sourceCategory"`
	BatchNo          string    `json:"batchNo"`
	OrderNo          string    `json:"orderNo"`
	TrackingNo       string    `json:"trackingNo"`
	Status           string    `json:"status"`
	COGS             float64   `json:"cogs"`
	ShipmentDate     time.Time `json:"shipmentDate"`
	Operator         string    `json:"operator"`
	Remarks          string    `json:"remarks"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
	Version          int       `json:"version"`
}

type BulkSyncInventoryItemRequest struct {
	ID              string  `json:"id"`
	MaterialID      string  `json:"materialId"`
	MaterialName    string  `json:"materialName"`
	MaterialCode    string  `json:"materialCode"`
	MaterialSpec    string  `json:"materialSpec"`
	Quantity        float64 `json:"quantity"`
	TotalValue      float64 `json:"totalValue"`
	AverageUnitCost float64 `json:"averageUnitCost"`
	CategoryCode    string  `json:"categoryCode"`
	BatchNo         string  `json:"batchNo"`
	UOM             string  `json:"uom"`
}

type InventoryCommandStatusResponse struct {
	Status string `json:"status"`
}

type BulkSyncInventoryResponse struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}
