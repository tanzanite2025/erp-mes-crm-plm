package repositories

import (
	"xdfc-server/models"
	"gorm.io/gorm"
)

type LeaveRepository interface {
	ListLeaves(db *gorm.DB) ([]models.LeaveRequest, error)
	FindLeavesByEmployeeID(db *gorm.DB, employeeID string) ([]models.LeaveRequest, error)
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

func (r *gormLeaveRepository) SaveLeave(db *gorm.DB, leave *models.LeaveRequest) error {
	return db.Save(leave).Error
}
