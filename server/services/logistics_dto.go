package services

import (
	"encoding/json"
	"time"
	"xdfc-server/models"
)

// LogisticsEventDTO 物流轨迹事件（wire format 结构体）
type LogisticsEventDTO struct {
	ID          string `json:"id"`
	Time        string `json:"time"`
	Location    string `json:"location"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

type LogisticsRecordResponse struct {
	ID              string              `json:"id"`
	OrderNo         string              `json:"orderNo"`
	SalesOrderID    string              `json:"salesOrderId"`
	PurchaseOrderID string              `json:"purchaseOrderId"`
	ProductID       string              `json:"productId"`
	ShipmentID      string              `json:"shipmentId"`
	Type            string              `json:"type"`
	Carrier         string              `json:"carrier"`
	TrackingNo      string              `json:"trackingNo"`
	Status          string              `json:"status"`
	LastLocation    string              `json:"lastLocation"`
	Events          []LogisticsEventDTO `json:"events"`
	Version         int                 `json:"version"`
	IsDeleted       bool                `json:"isDeleted"`
	CreatedAt       time.Time           `json:"createdAt"`
	UpdatedAt       time.Time           `json:"updatedAt"`
}

type LogisticsRecordListResponse struct {
	Items    []LogisticsRecordResponse `json:"items"`
	Total    int64                     `json:"total"`
	Page     int                       `json:"page"`
	PageSize int                       `json:"pageSize"`
}

func MapLogisticsRecordToResponse(record models.LogisticsRecord) LogisticsRecordResponse {
	var events []LogisticsEventDTO
	if len(record.Events) > 0 {
		// jsonb 存储的是 JSON 数组，unmarshal 为结构体切片
		_ = json.Unmarshal(record.Events, &events)
	}
	if events == nil {
		events = []LogisticsEventDTO{}
	}

	return LogisticsRecordResponse{
		ID:              record.ID,
		OrderNo:         record.OrderNo,
		SalesOrderID:    record.SalesOrderID,
		PurchaseOrderID: record.PurchaseOrderID,
		ProductID:       record.ProductID,
		ShipmentID:      record.ShipmentID,
		Type:            record.Type,
		Carrier:         record.Carrier,
		TrackingNo:      record.TrackingNo,
		Status:          record.Status,
		LastLocation:    record.LastLocation,
		Events:          events,
		Version:         record.Version,
		IsDeleted:       record.IsDeleted,
		CreatedAt:       record.CreatedAt,
		UpdatedAt:       record.UpdatedAt,
	}
}

func MapLogisticsRecordsToResponse(items []models.LogisticsRecord) []LogisticsRecordResponse {
	result := make([]LogisticsRecordResponse, 0, len(items))
	for _, item := range items {
		result = append(result, MapLogisticsRecordToResponse(item))
	}
	return result
}
