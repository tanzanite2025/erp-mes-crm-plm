package models

import "time"

type LinearBarcodeInventoryItem struct {
	BaseModel
	BatchID          string      `gorm:"type:uuid;not null;index" json:"batchId"`
	Batch            *PrintBatch `gorm:"foreignKey:BatchID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	ProductID        string      `gorm:"type:uuid;not null;index" json:"productId"`
	SalesOrderID     string      `gorm:"type:uuid;not null;index" json:"salesOrderId"`
	SalesOrderLineNo int         `gorm:"not null;index" json:"salesOrderLineNo"`
	Code             string      `gorm:"size:15;not null;uniqueIndex" json:"code"`
	SerialNumber     string      `gorm:"size:4;not null;index" json:"serialNumber"`
	Status           string      `gorm:"size:24;not null;default:'AVAILABLE';index" json:"status"`
	ExpiresAt        time.Time   `gorm:"not null;index" json:"expiresAt"`
	BoundAt          *time.Time  `json:"boundAt,omitempty"`
	Version          int         `gorm:"not null;default:1" json:"version"`
}

func (LinearBarcodeInventoryItem) TableName() string {
	return "linear_barcode_inventory_items"
}
