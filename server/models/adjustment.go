package models

import (
	"time"
)

// InventoryAdjustment 库存调账记录头
type InventoryAdjustment struct {
	BaseModel
	TaskID         string    `gorm:"size:100;index" json:"taskId"`     // 关联的盘点任务 (可选)
	AdjustmentNo   string    `gorm:"size:100;uniqueIndex" json:"adjustmentNo"` // 调账单号 (ADJUST-YYYYMMDD-XXX)
	Type           string    `gorm:"size:50" json:"type"`              // STOCKTAKE, MANUAL
	Status         string    `gorm:"size:50;default:'PENDING'" json:"status"` // PENDING, APPROVED, REJECTED, EXECUTED
	Reason         string    `gorm:"type:text" json:"reason"`          // 调账原因 / 备注
	CreatedBy      string    `gorm:"size:100" json:"createdBy"`
	ApprovedBy     string    `gorm:"size:100" json:"approvedBy,omitempty"`
	ApprovedAt     *time.Time `json:"approvedAt,omitempty"`
	TotalItems     int       `gorm:"default:0" json:"totalItems"`      // 涉及物料项数
	
	// 关联明细
	Items []InventoryAdjustmentItem `gorm:"foreignKey:AdjustmentID" json:"items,omitempty"`
}

func (InventoryAdjustment) TableName() string {
	return "inventory_adjustments"
}

// InventoryAdjustmentItem 库存调账记录明细
type InventoryAdjustmentItem struct {
	BaseModel
	AdjustmentID   string  `gorm:"type:uuid;index;not null" json:"adjustmentId"`
	MaterialID     string  `gorm:"size:100;index;not null" json:"materialId"`
	MaterialCode   string  `gorm:"size:100" json:"materialCode"`
	MaterialName   string  `gorm:"size:255" json:"materialName"`
	CategoryCode   string  `gorm:"size:50" json:"categoryCode"`
	BatchNo        string  `gorm:"size:100" json:"batchNo"`
	
	TheoryQty     float64 `json:"theoryQty"`    // 调账前数量 (账面)
	ActualQty     float64 `json:"actualQty"`    // 调账后数量 (实盘)
	DiffQty       float64 `json:"diffQty"`      // 差异数量 (Actual - Theory)
	UOM            string  `gorm:"size:20" json:"uom"`
}

func (InventoryAdjustmentItem) TableName() string {
	return "inventory_adjustment_items"
}
