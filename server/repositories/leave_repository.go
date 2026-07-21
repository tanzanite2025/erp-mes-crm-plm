package repositories

import (
	"gorm.io/gorm"
	"xdfc-server/models"
)

type LeaveRepository interface {
	ListLeaves(db *gorm.DB) ([]models.LeaveRequest, error)
	FindLeavesByEmployeeID(db *gorm.DB, employeeID string) ([]models.LeaveRequest, error)
	SumApprovedLeaveDaysByEmployeeID(db *gorm.DB) (map[string]float64, error)
	SaveLeave(db *gorm.DB, leave *models.LeaveRequest) error
}

type gormLeaveRepository struct{}

func NewLeaveRepository() LeaveRepository {
	return &gormLeaveRepository{}
}

func (r *gormLeaveRepository) ListLeaves(db *gorm.DB) ([]models.LeaveRequest, error) {
	var leaves []models.LeaveRequest
	err := db.Find(&leaves).Error
	return leaves, err
}

func (r *gormLeaveRepository) FindLeavesByEmployeeID(db *gorm.DB, employeeID string) ([]models.LeaveRequest, error) {
	var leaves []models.LeaveRequest
	err := db.Where("employee_id = ?", employeeID).Find(&leaves).Error
	return leaves, err
}

func (r *gormLeaveRepository) SumApprovedLeaveDaysByEmployeeID(db *gorm.DB) (map[string]float64, error) {
	type row struct {
		EmployeeID   string
		DurationDays float64
	}

	var rows []row
	err := db.
		Model(&models.LeaveRequest{}).
		Select("employee_id, COALESCE(SUM(duration_days), 0) AS duration_days").
		Where("status = ?", "APPROVED").
		Where("deleted_at IS NULL").
		Group("employee_id").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	result := make(map[string]float64, len(rows))
	for _, item := range rows {
		result[item.EmployeeID] = item.DurationDays
	}
	return result, nil
}

func (r *gormLeaveRepository) SaveLeave(db *gorm.DB, leave *models.LeaveRequest) error {
	return db.Save(leave).Error
}
