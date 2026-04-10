package models

import "time"

// OrgDefaultRole maps an org unit to baseline default role scope.
type OrgDefaultRole struct {
	BaseModel
	OrgUnitID string `gorm:"type:uuid;not null;index" json:"orgUnitId"`
	RoleID    string `gorm:"size:100;not null;index" json:"roleId"`
	IsActive  bool   `gorm:"not null;default:true" json:"isActive"`
	Source    string `gorm:"size:30;not null;default:'manual'" json:"source"`
}

func (OrgDefaultRole) TableName() string {
	return "org_default_roles"
}

// PositionRole maps a position to an effective permission role.
type PositionRole struct {
	BaseModel
	PositionID string `gorm:"type:uuid;not null;index" json:"positionId"`
	RoleID     string `gorm:"size:100;not null;index" json:"roleId"`
	IsActive   bool   `gorm:"not null;default:true" json:"isActive"`
}

func (PositionRole) TableName() string {
	return "position_roles"
}

// UserRole maps a user account to explicit roles with time bounds.
type UserRole struct {
	BaseModel
	UserID    string     `gorm:"type:uuid;not null;index" json:"userId"`
	RoleID    string     `gorm:"size:100;not null;index" json:"roleId"`
	IsPrimary bool       `gorm:"not null;default:false" json:"isPrimary"`
	StartDate time.Time  `gorm:"type:date;not null;default:CURRENT_DATE" json:"startDate"`
	EndDate   *time.Time `gorm:"type:date" json:"endDate"`
	Status    string     `gorm:"size:20;not null;default:'active'" json:"status"`
	Source    string     `gorm:"size:30;not null;default:'manual'" json:"source"`
}

func (UserRole) TableName() string {
	return "user_roles"
}

// EmployeeRole maps an employee (or a specific assignment) to explicit roles.
type EmployeeRole struct {
	BaseModel
	EmployeeID   string     `gorm:"type:uuid;not null;index" json:"employeeId"`
	RoleID       string     `gorm:"size:100;not null;index" json:"roleId"`
	AssignmentID *string    `gorm:"type:uuid;index" json:"assignmentId"`
	IsPrimary    bool       `gorm:"not null;default:false" json:"isPrimary"`
	StartDate    time.Time  `gorm:"type:date;not null;default:CURRENT_DATE" json:"startDate"`
	EndDate      *time.Time `gorm:"type:date" json:"endDate"`
	Status       string     `gorm:"size:20;not null;default:'active'" json:"status"`
	Source       string     `gorm:"size:30;not null;default:'manual'" json:"source"`
}

func (EmployeeRole) TableName() string {
	return "employee_roles"
}
