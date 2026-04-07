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
