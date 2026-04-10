package models

import "time"

// EmployeeAssignment represents where and as what an employee serves during a time window.
type EmployeeAssignment struct {
	BaseModel
	EmployeeID       string     `gorm:"type:uuid;not null;index" json:"employeeId"`
	OrgUnitID        *string    `gorm:"type:uuid;index" json:"orgUnitId"`
	PositionID       *string    `gorm:"type:uuid;index" json:"positionId"`
	ProductionUnitID *string    `gorm:"type:uuid;index" json:"productionUnitId"`
	AssignmentType   string     `gorm:"size:30;not null;default:'regular'" json:"assignmentType"`
	IsPrimary        bool       `gorm:"not null;default:false" json:"isPrimary"`
	StartDate        time.Time  `gorm:"type:date;not null;default:CURRENT_DATE" json:"startDate"`
	EndDate          *time.Time `gorm:"type:date" json:"endDate"`
	Status           string     `gorm:"size:20;not null;default:'active'" json:"status"`
	Source           string     `gorm:"size:30;not null;default:'manual'" json:"source"`
	Remarks          string     `gorm:"type:text" json:"remarks"`
}

func (EmployeeAssignment) TableName() string {
	return "employee_assignments"
}
