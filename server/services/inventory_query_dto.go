package services

import "time"

type InventoryItemResponse struct {
	ID               string    `json:"id"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
	LastUpdated      time.Time `json:"lastUpdated"`
	MaterialID       string    `json:"materialId"`
	MaterialName     string    `json:"materialName"`
	MaterialCode     string    `json:"materialCode"`
	MaterialCategory string    `json:"materialCategory"`
	MaterialSpec     string    `json:"materialSpec"`
	OnHand           float64   `json:"onHand"`
	Reserved         float64   `json:"reserved"`
	AvailableQty     float64   `json:"availableQty"`
	Quantity         float64   `json:"quantity"`
	TotalValue       float64   `json:"totalValue"`
	AverageUnitCost  float64   `json:"averageUnitCost"`
	CategoryCode     string    `json:"categoryCode"`
	BatchNo          string    `json:"batchNo"`
	UOM              string    `json:"uom"`
	Version          int       `json:"version"`
}

type InventoryListResponse struct {
	Items    []InventoryItemResponse `json:"items"`
	Total    int64                   `json:"total"`
	Page     int                     `json:"page"`
	PageSize int                     `json:"pageSize"`
}

type InventoryInboundHistoryResponse struct {
	Items    []InventoryInboundRecordResponse `json:"items"`
	Total    int64                            `json:"total"`
	Page     int                              `json:"page"`
	PageSize int                              `json:"pageSize"`
}

type InventoryShipmentHistoryResponse struct {
	Items    []InventoryShipmentRecordResponse `json:"items"`
	Total    int64                             `json:"total"`
	Page     int                               `json:"page"`
	PageSize int                               `json:"pageSize"`
}

type ShipmentDemandStockBreakdownResponse struct {
	CategoryCode string  `json:"categoryCode"`
	BatchNo      string  `json:"batchNo"`
	Quantity     float64 `json:"quantity"`
}

type ShipmentDemandResponse struct {
	SalesOrderID       string                                 `json:"salesOrderId"`
	SalesOrderLineID   uint                                   `json:"salesOrderLineId"`
	OrderNo            string                                 `json:"orderNo"`
	CustomerName       string                                 `json:"customerName"`
	DeliveryDate       string                                 `json:"deliveryDate"`
	MaterialID         string                                 `json:"materialId"`
	MaterialName       string                                 `json:"materialName"`
	MaterialCode       string                                 `json:"materialCode"`
	MaterialSpec       string                                 `json:"materialSpec"`
	UOM                string                                 `json:"uom"`
	OrderedQty         float64                                `json:"orderedQty"`
	DeliveredQty       float64                                `json:"deliveredQty"`
	VirtualReadyQty    float64                                `json:"virtualReadyQty"`
	RemainingToPrepare float64                                `json:"remainingToPrepare"`
	AvailableQty       float64                                `json:"availableQty"`
	StockBreakdown     []ShipmentDemandStockBreakdownResponse `json:"stockBreakdown"`
}

type ShipmentDemandListResponse struct {
	Items []ShipmentDemandResponse `json:"items"`
	Total int                      `json:"total"`
}

type InventoryValuationResponse struct {
	TotalValue float64 `json:"totalValue"`
}

type InventoryAlertSummaryResponse struct {
	AlertCount int64 `json:"alertCount"`
}
