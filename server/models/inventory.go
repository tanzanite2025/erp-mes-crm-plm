package models

import (
	"time"
)

// Inventory 库存余额表
type Inventory struct {
	BaseModel
	MaterialID      string  `gorm:"type:uuid;index;not null" json:"materialId"`
	MaterialName    string  `gorm:"size:255" json:"materialName"`
	MaterialCode    string  `gorm:"size:100" json:"materialCode"`
	MaterialSpec    string  `gorm:"type:text" json:"materialSpec"`
	Quantity        float64 `gorm:"default:0" json:"quantity"`
	TotalValue      float64 `gorm:"default:0" json:"totalValue"`
	AverageUnitCost float64 `gorm:"default:0" json:"averageUnitCost"`
	CategoryCode    string  `gorm:"size:50;index;not null" json:"categoryCode"` // 仓库分类识别码
	BatchNo         string  `gorm:"size:100;index" json:"batchNo"`              // [新增] 批次号支持
	UOM             string  `gorm:"size:20" json:"uom"`
}

func (Inventory) TableName() string {
	return "inventory"
}

type Reservation struct {
	BaseModel
	MaterialID   string     `gorm:"type:uuid;index;not null" json:"materialId"`
	CategoryCode string     `gorm:"size:50;index;not null" json:"categoryCode"`
	BatchNo      string     `gorm:"size:100;index" json:"batchNo"`
	Quantity     float64    `gorm:"not null" json:"quantity"`
	Status       string     `gorm:"size:50;index;not null" json:"status"`
	SourceType   string     `gorm:"size:50;index;not null" json:"sourceType"`
	SourceID     string     `gorm:"size:100;index;not null" json:"sourceId"`
	ReservedAt   time.Time  `json:"reservedAt"`
	ReleasedAt   *time.Time `json:"releasedAt,omitempty"`
	ConsumedAt   *time.Time `json:"consumedAt,omitempty"`
	ExpiredAt    *time.Time `json:"expiredAt,omitempty"`
	Remarks      string     `gorm:"type:text" json:"remarks"`
}

func (Reservation) TableName() string {
	return "inventory_reservations"
}

// InboundRecord 入库记录流水
type InboundRecord struct {
	BaseModel
	MaterialID          string    `gorm:"type:uuid;index;not null" json:"materialId"`
	MaterialName        string    `gorm:"size:255" json:"materialName"`
	MaterialCode        string    `gorm:"size:100" json:"materialCode"`
	PurchaseOrderID     string    `gorm:"type:uuid;index" json:"purchaseOrderId"`
	PurchaseOrderLineID uint      `gorm:"index" json:"purchaseOrderLineId"`
	Quantity            float64   `gorm:"not null" json:"quantity"`
	PurchasePrice       float64   `gorm:"default:0" json:"purchasePrice"`
	TargetCategory      string    `gorm:"size:50;not null" json:"targetCategory"`
	BatchNo             string    `gorm:"size:100" json:"batchNo"`
	InboundDate         time.Time `json:"inboundDate"`
	Operator            string    `gorm:"size:100" json:"operator"`
	Remarks             string    `gorm:"type:text" json:"remarks"`
}

func (InboundRecord) TableName() string {
	return "inbound_records"
}

// ShipmentRecord 出库记录流水
type ShipmentRecord struct {
	BaseModel
	MaterialID       string    `gorm:"type:uuid;index;not null" json:"materialId"`
	MaterialName     string    `gorm:"size:255" json:"materialName"`
	MaterialCode     string    `gorm:"size:100" json:"materialCode"`
	SalesOrderID     string    `gorm:"type:uuid;index" json:"salesOrderId"`
	SalesOrderLineID uint      `gorm:"index" json:"salesOrderLineId"`
	Quantity         float64   `gorm:"not null" json:"quantity"`
	SourceCategory   string    `gorm:"size:50;not null" json:"sourceCategory"`
	BatchNo          string    `gorm:"size:100" json:"batchNo"` // [新增] 出库批次
	OrderNo          string    `gorm:"size:100" json:"orderNo"`
	Status           string    `gorm:"size:50;default:'DRAFT'" json:"status"` // DRAFT, COMMITTED, VOID
	COGS             float64   `gorm:"default:0" json:"cogs"`
	ShipmentDate     time.Time `json:"shipmentDate"`
	Operator         string    `gorm:"size:100" json:"operator"`
	Remarks          string    `gorm:"type:text" json:"remarks"`
}

func (ShipmentRecord) TableName() string {
	return "shipment_records"
}
