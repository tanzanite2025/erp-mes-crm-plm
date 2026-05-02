package models

import (
	"time"
)

// --- 计件工资 (Piecework & Payroll) ---

// PieceworkRate 工价标准模型 (用于支持基于 产品+工序 的多维定价)
type PieceworkRate struct {
	BaseModel
	ProductID   string   `gorm:"type:uuid;index;not null" json:"productId"`
	Product     *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	ProcessCode string   `gorm:"size:50;index;not null" json:"processCode"`
	ProcessName string   `gorm:"size:100" json:"processName"`
	UnitPrice   float64  `gorm:"type:decimal(10,4);default:0" json:"unitPrice"` // 精确到 4 位小数
	Currency    string   `gorm:"size:10;default:'CNY'" json:"currency"`
	EffectiveAt time.Time `gorm:"default:now()" json:"effectiveAt"`
	Status      string   `gorm:"size:20;default:'active'" json:"status"` // active, historical
	Operator    string   `gorm:"size:100" json:"operator"`               // 操作人
}

// PieceworkRecord 计件采集明细 (报工产生的持久化记录)
type PieceworkRecord struct {
	BaseModel
	WorkDate    time.Time `gorm:"index;not null" json:"workDate"`
	EmployeeID  string    `gorm:"type:uuid;index" json:"employeeId"`
	Employee    *Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	TeamID      string    `gorm:"type:uuid;index" json:"teamId"`
	Team        *Team     `gorm:"foreignKey:TeamID" json:"team,omitempty"`
	ProductID   string    `gorm:"type:uuid;index" json:"productId"`
	ProductName string    `gorm:"size:255" json:"productName"`
	ProcessCode string    `gorm:"size:50;index" json:"processCode"`
	Quantity    float64   `gorm:"default:0" json:"quantity"`
	UnitPrice   float64   `gorm:"type:decimal(10,4)" json:"unitPrice"` // 快照当日工价
	TotalAmount float64   `gorm:"type:decimal(12,2)" json:"totalAmount"` // 自动计算结算金额
	IsSettled   bool      `gorm:"default:false" json:"isSettled"`        // 是否已结算发放工资
}
