package models

import (
	"time"
)

// ProductionPlan 生产主计划模型
type ProductionPlan struct {
	BaseModel
	OrderNo     string           `gorm:"size:50;index;not null" json:"orderNo"`
	OrderID     string           `gorm:"type:uuid;index" json:"orderId"`
	SalesOrder  *SalesOrder      `gorm:"foreignKey:OrderID" json:"salesOrder,omitempty"`
	ProductID   string           `gorm:"type:uuid;index" json:"productId"`
	ProductName string           `gorm:"size:255" json:"productName"`
	Quantity    float64          `gorm:"not null" json:"quantity"`
	Status      string           `gorm:"size:20;default:'SCHEDULED'" json:"status"` // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELED
	StartDate   *time.Time       `json:"startDate"`
	EndDate     *time.Time       `json:"endDate"`
	Tasks       []ProductionTask `gorm:"foreignKey:PlanID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"tasks"`
	Notes       string           `gorm:"type:text" json:"notes"`
}

// ProductionTask 生产工单/任务 (明细级)
type ProductionTask struct {
	ID          string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	PlanID      string     `gorm:"type:uuid;index;not null" json:"planId"`
	BatchNo     string     `gorm:"size:50;index" json:"batchNo"`
	ProcessID   string     `gorm:"size:36" json:"processId"`   // 对应 ProcessStep.ID
	ProcessName string     `gorm:"size:100" json:"processName"`
	StationID   string     `gorm:"size:36" json:"stationId"`   // 对应 Station.ID
	StationName string     `gorm:"size:100" json:"stationName"`
	TargetQty   float64    `gorm:"not null" json:"targetQty"`
	ActualQty   float64    `gorm:"default:0" json:"actualQty"`
	Status      string     `gorm:"size:20;default:'PENDING'" json:"status"` // PENDING, RUNNING, DONE, HOLD
	Operator    string     `gorm:"size:100" json:"operator"`
	StartedAt   *time.Time `json:"startedAt"`
	CompletedAt *time.Time `json:"completedAt"`
}

// ProductionStats 生产汇总统计 (用于看板)
type ProductionStats struct {
	TotalPlans     int64   `json:"totalPlans"`
	TotalQuantity  float64 `json:"totalQuantity"`
	ActiveWIP      float64 `json:"activeWIP"`
	CompletedToday float64 `json:"completedToday"`
	DelayedCount   int64   `json:"delayedCount"`
}
