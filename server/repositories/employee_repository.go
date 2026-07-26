package repositories

import (
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func (GormOrgPersonnelRepository) ListEmployees(database *gorm.DB) ([]models.Employee, error) {
	var employees []models.Employee
	selectClause := "employees.*, employee_assignments.org_unit_id as dept_id, org_units.name as dept_name"
	query := database.Table("employees").
		Select(selectClause).
		Joins("LEFT JOIN employee_assignments ON employee_assignments.employee_id = employees.id AND employee_assignments.deleted_at IS NULL AND employee_assignments.is_primary = ?", true).
		Joins("LEFT JOIN org_units ON employee_assignments.org_unit_id = org_units.id AND org_units.deleted_at IS NULL")

	query = query.Select(selectClause + ", employee_assignments.position_id as position_id")
	if database != nil && database.Migrator().HasTable("positions") {
		query = query.
			Select(selectClause + ", employee_assignments.position_id as position_id, positions.name as position_name").
			Joins("LEFT JOIN positions ON employee_assignments.position_id = positions.id AND positions.deleted_at IS NULL")
	}

	err := query.
		Where("employees.deleted_at IS NULL").
		Order("employees.created_at desc").
		Find(&employees).Error
	return employees, err
}

func (GormOrgPersonnelRepository) ListExcellentEmployeeInputs(database *gorm.DB) ([]models.Employee, error) {
	var employees []models.Employee
	err := database.Table("employees").
		Select("employees.id, employees.name, employees.joined_date, COALESCE(org_units.name, '') AS dept_name").
		Joins("LEFT JOIN employee_assignments ON employee_assignments.employee_id = employees.id AND employee_assignments.deleted_at IS NULL AND employee_assignments.is_primary = ?", true).
		Joins("LEFT JOIN org_units ON employee_assignments.org_unit_id = org_units.id AND org_units.deleted_at IS NULL").
		Where("employees.deleted_at IS NULL").
		Find(&employees).Error
	return employees, err
}

func (GormOrgPersonnelRepository) BulkUpdateEmployeeStatus(database *gorm.DB, ids []string, status string) (int64, error) {
	result := database.Model(&models.Employee{}).Where("id IN ?", ids).Update("status", status)
	return result.RowsAffected, result.Error
}

func (GormOrgPersonnelRepository) SaveEmployee(database *gorm.DB, employee *models.Employee) error {
	return database.Save(employee).Error
}

func (GormOrgPersonnelRepository) DeleteEmployees(database *gorm.DB, ids []string) error {
	return database.Delete(&models.Employee{}, "id IN ?", ids).Error
}

func (GormOrgPersonnelRepository) FindEmployeeByIDOrStaffID(database *gorm.DB, id string, staffID string) (models.Employee, bool, error) {
	var employee models.Employee
	var err error

	if strings.TrimSpace(id) != "" {
		err = database.Where("id = ?", strings.TrimSpace(id)).First(&employee).Error
	} else if strings.TrimSpace(staffID) != "" {
		err = database.Where("staff_id = ?", strings.TrimSpace(staffID)).First(&employee).Error
	} else {
		return models.Employee{}, false, nil
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Employee{}, false, nil
	}
	return employee, err == nil, err
}
