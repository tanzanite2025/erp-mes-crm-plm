package models

import "time"

// PieceworkRecord stores the work-report snapshot used for settlement.
type PieceworkRecord struct {
	BaseModel
	WorkDate          time.Time `gorm:"index;not null" json:"workDate"`
	EmployeeID        string    `gorm:"type:uuid;index" json:"employeeId"`
	Employee          *Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	TeamID            string    `gorm:"type:uuid;index" json:"teamId"`
	Team              *Team     `gorm:"foreignKey:TeamID" json:"team,omitempty"`
	ProductID         string    `gorm:"type:uuid;index" json:"productId"`
	ProductName       string    `gorm:"size:255" json:"productName"`
	RouteID           string    `gorm:"type:uuid;index" json:"routeId"`
	RouteStepID       string    `gorm:"type:uuid;index" json:"routeStepId"`
	ProcessStepID     string    `gorm:"type:uuid;index" json:"processStepId"`
	ProcessCode       string    `gorm:"size:50;index" json:"processCode"` // legacy snapshot
	ProcessName       string    `gorm:"size:255" json:"processName"`      // display snapshot
	RateID            string    `gorm:"type:uuid;index" json:"rateId"`
	RateVersion       int64     `gorm:"index" json:"rateVersion"`
	Quantity          float64   `gorm:"default:0" json:"quantity"`
	Unit              string    `gorm:"size:20" json:"unit"`
	Currency          string    `gorm:"size:10" json:"currency"`
	UnitPrice         float64   `gorm:"type:decimal(10,4)" json:"unitPrice"`   // 快照当日工价
	TotalAmount       float64   `gorm:"type:decimal(12,2)" json:"totalAmount"` // 自动计算结算金额
	SourceExecutionID string    `gorm:"type:uuid;index" json:"sourceExecutionId"`
	IsSettled         bool      `gorm:"default:false" json:"isSettled"` // 是否已结算发放工资
}
