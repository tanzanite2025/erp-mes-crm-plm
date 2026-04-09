package services

import (
	"time"
	"xdfc-server/models"
)

type LogisticsRecordResponse struct {
	ID              string    `json:"id"`
	OrderNo         string    `json:"orderNo"`
	SalesOrderID    string    `json:"salesOrderId"`
	PurchaseOrderID string    `json:"purchaseOrderId"`
	ProductID       string    `json:"productId"`
	ShipmentID      string    `json:"shipmentId"`
	Type            string    `json:"type"`
	Carrier         string    `json:"carrier"`
	TrackingNo      string    `json:"trackingNo"`
	Status          string    `json:"status"`
	LastLocation    string    `json:"lastLocation"`
	Events          []byte    `json:"events"`
	Version         int       `json:"version"`
	IsDeleted       bool      `json:"isDeleted"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type LogisticsRecordListResponse struct {
	Items    []LogisticsRecordResponse `json:"items"`
	Total    int64                     `json:"total"`
	Page     int                       `json:"page"`
	PageSize int                       `json:"pageSize"`
}

func MapLogisticsRecordToResponse(record models.LogisticsRecord) LogisticsRecordResponse {
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
		Events:          record.Events,
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
