package models

import "time"

// Employee stores personnel master-data fields.
type Employee struct {
	BaseModel
	StaffID        string     `gorm:"size:50;uniqueIndex" json:"staffId"`
	Name           string     `gorm:"size:100;not null" json:"name"`
	Gender         string     `gorm:"size:10" json:"gender"`
	Birthday       *time.Time `json:"birthday"`
	IDCard         string     `gorm:"size:20" json:"idCard"`
	Phone          string     `gorm:"size:20" json:"phone"`
	EmergencyPhone string     `gorm:"size:20" json:"emergencyPhone"`
	Address        string     `gorm:"type:text" json:"address"`
	BankCard       string     `gorm:"size:50" json:"bankCard"`
	BankName       string     `gorm:"size:100" json:"bankName"`
	Education      string     `gorm:"size:50" json:"education"`
	Age            int        `json:"age"`
	Status         string     `gorm:"size:20;default:'active'" json:"status"`
	JoinedDate     *time.Time `json:"joinedDate"`
	DeptID         string     `gorm:"size:36" json:"deptId"`
	PositionID     string     `gorm:"->" json:"positionId"`
	DeptName       string     `gorm:"->" json:"deptName"`
	PositionName   string     `gorm:"->" json:"positionName"`
	Operator       string     `gorm:"size:100" json:"operator"` // 操作人
}
