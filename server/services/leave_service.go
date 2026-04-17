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
	ErrLeaveEmployeeRequired   = errors.New("请选择请假员工")
	ErrLeaveEmployeeNotFound   = errors.New("所选员工档案不存在")
	ErrLeaveInvalidTimeRange   = errors.New("请假时间范围无效")
	ErrLeaveInvalidLeaveType   = errors.New("请假类型不能为空")
	ErrLeaveReasonRequired     = errors.New("请假事由不能为空")
	ErrLeaveRequestNotFound    = errors.New("请假申请不存在")
	ErrLeaveCancelForbidden    = errors.New("只能撤销当前账号代提交的请假申请")
	ErrLeaveCancelInvalidState = errors.New("当前请假申请状态不允许撤销")
)

type LeavePreviewInput struct {
	EmployeeID string    `json:"employeeId"`
	LeaveType  string    `json:"leaveType"`
	StartTime  time.Time `json:"startTime"`
	EndTime    time.Time `json:"endTime"`
}

type CreateLeaveInput struct {
	EmployeeID string    `json:"employeeId"`
	LeaveType  string    `json:"leaveType"`
	StartTime  time.Time `json:"startTime"`
	EndTime    time.Time `json:"endTime"`
	Reason     string    `json:"reason"`
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

type leaveEmployeeContext struct {
	EmployeeID   string
	EmployeeName string
}

func resolveCurrentUserID(userID string) (string, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return "", ErrLeaveUnauthorized
	}
	if db.DB == nil {
		return "", gorm.ErrInvalidDB
	}

	if err := db.DB.Table("users").Select("id").Where("id = ?", normalizedUserID).Take(&struct{ ID string }{}).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", ErrLeaveUnauthorized
		}
		return "", err
	}

	return normalizedUserID, nil
}

func resolveLeaveEmployeeContext(employeeID string) (*leaveEmployeeContext, error) {
	normalizedEmployeeID := strings.TrimSpace(employeeID)
	if normalizedEmployeeID == "" {
		return nil, ErrLeaveEmployeeRequired
	}

	var employee models.Employee
	if err := db.DB.Select("id", "name").Where("id = ?", normalizedEmployeeID).Take(&employee).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLeaveEmployeeNotFound
		}
		return nil, err
	}

	return &leaveEmployeeContext{
		EmployeeID:   employee.ID,
		EmployeeName: strings.TrimSpace(employee.Name),
	}, nil
}

func loadEmployeeNamesByIDs(employeeIDs []string) (map[string]string, error) {
	if len(employeeIDs) == 0 {
		return map[string]string{}, nil
	}

	type employeeRow struct {
		ID   string
		Name string
	}

	rows := make([]employeeRow, 0, len(employeeIDs))
	if err := db.DB.Table("employees").
		Select("id", "name").
		Where("id IN ?", employeeIDs).
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	result := make(map[string]string, len(rows))
	for _, row := range rows {
		result[strings.TrimSpace(row.ID)] = strings.TrimSpace(row.Name)
	}
	return result, nil
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

func PreviewLeaveRequest(userID string, input LeavePreviewInput) (*LeavePreviewResult, error) {
	if _, err := resolveCurrentUserID(userID); err != nil {
		return nil, err
	}

	context, err := resolveLeaveEmployeeContext(input.EmployeeID)
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

func CreateLeaveRequest(userID string, input CreateLeaveInput) (*LeaveRequestView, error) {
	normalizedUserID, err := resolveCurrentUserID(userID)
	if err != nil {
		return nil, err
	}

	preview, err := PreviewLeaveRequest(normalizedUserID, LeavePreviewInput{
		EmployeeID: input.EmployeeID,
		LeaveType:  input.LeaveType,
		StartTime:  input.StartTime,
		EndTime:    input.EndTime,
	})
	if err != nil {
		return nil, err
	}

	reason := strings.TrimSpace(input.Reason)
	if reason == "" {
		return nil, ErrLeaveReasonRequired
	}

	leave := models.LeaveRequest{
		BaseModel:         models.BaseModel{ID: uuid.NewString()},
		EmployeeID:        preview.EmployeeID,
		SubmittedByUserID: &normalizedUserID,
		LeaveType:         preview.LeaveType,
		StartTime:         preview.StartTime,
		EndTime:           preview.EndTime,
		DurationDays:      preview.DurationDays,
		Reason:            reason,
		Status:            "PENDING",
		Version:           1,
	}

	if err := db.DB.Create(&leave).Error; err != nil {
		return nil, err
	}

	return &LeaveRequestView{
		LeaveRequest: leave,
		EmployeeName: preview.EmployeeName,
	}, nil
}

func ListLeaveRequests(userID string) ([]LeaveRequestView, error) {
	normalizedUserID, err := resolveCurrentUserID(userID)
	if err != nil {
		return nil, err
	}

	var leaves []models.LeaveRequest
	if err := db.DB.Where("submitted_by_user_id = ?", normalizedUserID).Order("created_at desc").Find(&leaves).Error; err != nil {
		return nil, err
	}

	employeeIDs := make([]string, 0, len(leaves))
	seen := make(map[string]struct{}, len(leaves))
	for _, leave := range leaves {
		normalizedEmployeeID := strings.TrimSpace(leave.EmployeeID)
		if normalizedEmployeeID == "" {
			continue
		}
		if _, exists := seen[normalizedEmployeeID]; exists {
			continue
		}
		seen[normalizedEmployeeID] = struct{}{}
		employeeIDs = append(employeeIDs, normalizedEmployeeID)
	}

	employeeNames, err := loadEmployeeNamesByIDs(employeeIDs)
	if err != nil {
		return nil, err
	}

	result := make([]LeaveRequestView, 0, len(leaves))
	for _, leave := range leaves {
		result = append(result, LeaveRequestView{
			LeaveRequest: leave,
			EmployeeName: employeeNames[strings.TrimSpace(leave.EmployeeID)],
		})
	}
	return result, nil
}

func GetLeaveStats(userID string) (*LeaveStatsResult, error) {
	normalizedUserID, err := resolveCurrentUserID(userID)
	if err != nil {
		return nil, err
	}

	stats := &LeaveStatsResult{}
	if err := db.DB.Model(&models.LeaveRequest{}).
		Where("submitted_by_user_id = ? AND status = ?", normalizedUserID, "APPROVED").
		Count(&stats.ApprovedCount).Error; err != nil {
		return nil, err
	}
	if err := db.DB.Model(&models.LeaveRequest{}).
		Where("submitted_by_user_id = ? AND status = ?", normalizedUserID, "REJECTED").
		Count(&stats.RejectedCount).Error; err != nil {
		return nil, err
	}

	stats.PendingCount = 0
	if err := db.DB.Model(&models.LeaveRequest{}).
		Where("submitted_by_user_id = ? AND status = ?", normalizedUserID, "PENDING").
		Count(&stats.PendingCount).Error; err != nil {
		return nil, err
	}

	if err := db.DB.Model(&models.LeaveRequest{}).
		Where("submitted_by_user_id = ? AND status = ?", normalizedUserID, "APPROVED").
		Select("COALESCE(SUM(duration_days), 0)").
		Scan(&stats.TotalDays).Error; err != nil {
		return nil, err
	}

	return stats, nil
}

func CancelLeaveRequest(userID, leaveID string) error {
	normalizedUserID, err := resolveCurrentUserID(userID)
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

	if leave.SubmittedByUserID == nil || strings.TrimSpace(*leave.SubmittedByUserID) != normalizedUserID {
		return ErrLeaveCancelForbidden
	}
	if strings.TrimSpace(leave.Status) != "PENDING" {
		return ErrLeaveCancelInvalidState
	}

	leave.Status = "CANCELED"
	leave.Version += 1
	return db.DB.Save(&leave).Error
}
