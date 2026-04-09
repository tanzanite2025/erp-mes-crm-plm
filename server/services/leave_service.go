package services

import (
	"errors"
	"math"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrLeaveUnauthorized       = errors.New("未找到当前登录用户")
	ErrLeaveEmployeeUnbound    = errors.New("当前账号未绑定员工档案，无法发起请假申请")
	ErrLeaveEmployeeNotFound   = errors.New("当前账号绑定的员工档案不存在")
	ErrLeaveInvalidTimeRange   = errors.New("请假时间范围无效")
	ErrLeaveInvalidLeaveType   = errors.New("请假类型不能为空")
	ErrLeaveReasonRequired     = errors.New("请假事由不能为空")
	ErrLeaveRequestNotFound    = errors.New("请假申请不存在")
	ErrLeaveCancelForbidden    = errors.New("只能撤销本人的请假申请")
	ErrLeaveCancelInvalidState = errors.New("当前请假申请状态不允许撤销")
)

type LeavePreviewInput struct {
	LeaveType string    `json:"leaveType"`
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
}

type CreateLeaveInput struct {
	LeaveType string    `json:"leaveType"`
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
	Reason    string    `json:"reason"`
}

type LeavePreviewResult struct {
	EmployeeID   string    `json:"employeeId"`
	EmployeeName string    `json:"employeeName,omitempty"`
	LeaveType    string    `json:"leaveType"`
	StartTime    time.Time `json:"startTime"`
	EndTime      time.Time `json:"endTime"`
	DurationDays float64   `json:"durationDays"`
}

type LeaveStatsResult struct {
	TotalDays     float64 `json:"totalDays"`
	PendingCount  int64   `json:"pendingCount"`
	ApprovedCount int64   `json:"approvedCount"`
	RejectedCount int64   `json:"rejectedCount"`
}

type LeaveRequestView struct {
	models.LeaveRequest
	EmployeeName string `json:"employeeName,omitempty"`
}

type currentEmployeeContext struct {
	UserID       string
	EmployeeID   string
	EmployeeName string
}

func resolveCurrentEmployeeContext(userID string) (*currentEmployeeContext, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return nil, ErrLeaveUnauthorized
	}
	if db.DB == nil {
		return nil, gorm.ErrInvalidDB
	}

	type userRow struct {
		EmployeeID string
	}

	var user userRow
	if err := db.DB.Table("users").Select("employee_id").Where("id = ?", normalizedUserID).Take(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLeaveUnauthorized
		}
		return nil, err
	}

	employeeID := strings.TrimSpace(user.EmployeeID)
	if employeeID == "" {
		return nil, ErrLeaveEmployeeUnbound
	}

	var employee models.Employee
	if err := db.DB.Select("id", "name").Where("id = ?", employeeID).Take(&employee).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLeaveEmployeeNotFound
		}
		return nil, err
	}

	return &currentEmployeeContext{
		UserID:       normalizedUserID,
		EmployeeID:   employee.ID,
		EmployeeName: strings.TrimSpace(employee.Name),
	}, nil
}

func normalizeLeaveType(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func calculateLeaveDurationDays(startTime, endTime time.Time) (float64, error) {
	if startTime.IsZero() || endTime.IsZero() || !endTime.After(startTime) {
		return 0, ErrLeaveInvalidTimeRange
	}
	durationHours := endTime.Sub(startTime).Hours()
	if durationHours <= 0 {
		return 0, ErrLeaveInvalidTimeRange
	}
	halfDays := math.Ceil((durationHours / 24.0) * 2)
	days := halfDays / 2
	if days < 0.5 {
		days = 0.5
	}
	return days, nil
}

func PreviewMyLeaveRequest(userID string, input LeavePreviewInput) (*LeavePreviewResult, error) {
	context, err := resolveCurrentEmployeeContext(userID)
	if err != nil {
		return nil, err
	}

	leaveType := normalizeLeaveType(input.LeaveType)
	if leaveType == "" {
		return nil, ErrLeaveInvalidLeaveType
	}

	durationDays, err := calculateLeaveDurationDays(input.StartTime, input.EndTime)
	if err != nil {
		return nil, err
	}

	return &LeavePreviewResult{
		EmployeeID:   context.EmployeeID,
		EmployeeName: context.EmployeeName,
		LeaveType:    leaveType,
		StartTime:    input.StartTime,
		EndTime:      input.EndTime,
		DurationDays: durationDays,
	}, nil
}

func CreateMyLeaveRequest(userID string, input CreateLeaveInput) (*LeaveRequestView, error) {
	preview, err := PreviewMyLeaveRequest(userID, LeavePreviewInput{
		LeaveType: input.LeaveType,
		StartTime: input.StartTime,
		EndTime:   input.EndTime,
	})
	if err != nil {
		return nil, err
	}

	reason := strings.TrimSpace(input.Reason)
	if reason == "" {
		return nil, ErrLeaveReasonRequired
	}

	leave := models.LeaveRequest{
		BaseModel:    models.BaseModel{ID: uuid.NewString()},
		EmployeeID:   preview.EmployeeID,
		LeaveType:    preview.LeaveType,
		StartTime:    preview.StartTime,
		EndTime:      preview.EndTime,
		DurationDays: preview.DurationDays,
		Reason:       reason,
		Status:       "PENDING",
		Version:      1,
	}

	if err := db.DB.Create(&leave).Error; err != nil {
		return nil, err
	}

	return &LeaveRequestView{
		LeaveRequest: leave,
		EmployeeName: preview.EmployeeName,
	}, nil
}

func ListMyLeaveRequests(userID string) ([]LeaveRequestView, error) {
	context, err := resolveCurrentEmployeeContext(userID)
	if err != nil {
		return nil, err
	}

	var leaves []models.LeaveRequest
	if err := db.DB.Where("employee_id = ?", context.EmployeeID).Order("created_at desc").Find(&leaves).Error; err != nil {
		return nil, err
	}

	result := make([]LeaveRequestView, 0, len(leaves))
	for _, leave := range leaves {
		result = append(result, LeaveRequestView{
			LeaveRequest: leave,
			EmployeeName: context.EmployeeName,
		})
	}
	return result, nil
}

func GetMyLeaveStats(userID string) (*LeaveStatsResult, error) {
	context, err := resolveCurrentEmployeeContext(userID)
	if err != nil {
		return nil, err
	}

	stats := &LeaveStatsResult{}
	if err := db.DB.Model(&models.LeaveRequest{}).
		Where("employee_id = ? AND status = ?", context.EmployeeID, "APPROVED").
		Count(&stats.ApprovedCount).Error; err != nil {
		return nil, err
	}
	if err := db.DB.Model(&models.LeaveRequest{}).
		Where("employee_id = ? AND status = ?", context.EmployeeID, "REJECTED").
		Count(&stats.RejectedCount).Error; err != nil {
		return nil, err
	}

	stats.PendingCount = 0
	if err := db.DB.Model(&models.LeaveRequest{}).
		Where("employee_id = ? AND status = ?", context.EmployeeID, "PENDING").
		Count(&stats.PendingCount).Error; err != nil {
		return nil, err
	}

	if err := db.DB.Model(&models.LeaveRequest{}).
		Where("employee_id = ? AND status = ?", context.EmployeeID, "APPROVED").
		Select("COALESCE(SUM(duration_days), 0)").
		Scan(&stats.TotalDays).Error; err != nil {
		return nil, err
	}

	return stats, nil
}

func CancelMyLeaveRequest(userID, leaveID string) error {
	context, err := resolveCurrentEmployeeContext(userID)
	if err != nil {
		return err
	}

	normalizedLeaveID := strings.TrimSpace(leaveID)
	if normalizedLeaveID == "" {
		return ErrLeaveRequestNotFound
	}

	var leave models.LeaveRequest
	if err := db.DB.Where("id = ?", normalizedLeaveID).Take(&leave).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrLeaveRequestNotFound
		}
		return err
	}

	if leave.EmployeeID != context.EmployeeID {
		return ErrLeaveCancelForbidden
	}
	if strings.TrimSpace(leave.Status) != "PENDING" {
		return ErrLeaveCancelInvalidState
	}

	leave.Status = "CANCELED"
	leave.Version += 1
	return db.DB.Save(&leave).Error
}
