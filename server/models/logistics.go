package models

// LogisticsRecord 物流跟踪记录模型
type LogisticsRecord struct {
	BaseModel
	OrderNo      string      `gorm:"size:100;index" json:"orderNo"`       // 关联订单号 (冗余)
	SalesOrderID    string         `gorm:"type:uuid;index" json:"salesOrderId"` // 物理外键关联 SalesOrder
	SalesOrder      *SalesOrder    `gorm:"foreignKey:SalesOrderID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"salesOrder,omitempty"`
	PurchaseOrderID string         `gorm:"type:uuid;index" json:"purchaseOrderId"` // 物理外键关联 PurchaseOrder
	PurchaseOrder   *PurchaseOrder `gorm:"foreignKey:PurchaseOrderID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"purchaseOrder,omitempty"`
	ProductID       string         `gorm:"type:uuid;index" json:"productId"`    // 物理外键关联 Product (可选)
	Product         *Product       `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	ShipmentID      string         `gorm:"size:100;index" json:"shipmentId"`    // 关联出库单 ID
	Type            string         `gorm:"size:20;default:'Shipment'" json:"type"` // Shipment (销售), Receipt (采购)
	Carrier      string      `gorm:"size:100;uniqueIndex:idx_carrier_tracking,priority:1" json:"carrier"`             // 承运商
	TrackingNo   string      `gorm:"size:100;uniqueIndex:idx_carrier_tracking,priority:2" json:"trackingNo"`    // 物流单号
	Status       string      `gorm:"size:50;default:'Pending'" json:"status"`
	LastLocation string      `gorm:"size:255" json:"lastLocation"`
	Events       []byte      `gorm:"type:jsonb" json:"events"`            // 物流轨迹事件 (JSONB 数组)
	Version      int         `gorm:"default:1" json:"version"`            // 乐观锁版本
	IsDeleted    bool        `gorm:"default:false" json:"isDeleted"`
}
