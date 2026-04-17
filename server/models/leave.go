package models

import (
	"time"
)

// LeaveRequest 请假申请模型
type LeaveRequest struct {
	BaseModel
	EmployeeID        string    `gorm:"type:uuid;index;not null" json:"employeeId"`
	SubmittedByUserID *string   `gorm:"type:uuid;index" json:"submittedByUserId,omitempty"`
	LeaveType         string    `gorm:"size:20;not null" json:"leaveType"` // annual, sick, personal, etc.
	StartTime         time.Time `gorm:"not null" json:"startTime"`
	EndTime           time.Time `gorm:"not null" json:"endTime"`
	DurationDays      float64   `gorm:"type:decimal(10,1);not null" json:"durationDays"`
	Reason            string    `gorm:"type:text" json:"reason"`
	Status            string    `gorm:"size:20;default:'PENDING'" json:"status"` // PENDING, APPROVED, REJECTED
	ApprovalID        *string   `gorm:"size:36" json:"approvalId"`
	Version           int       `gorm:"default:1" json:"version"`
}

// EmployeeStats 员工统计视图 DTO (用于前端展示)
type EmployeeStats struct {
	EmployeeID     string  `json:"employeeId"`
	Name           string  `json:"name"`
	DeptName       string  `json:"deptName"`
	AttendanceRate float64 `json:"attendanceRate"`
	LeaveDays      float64 `json:"leaveDays"`
	TenureYears    int     `json:"tenureYears"`
	Score          float64 `json:"score"`
}
