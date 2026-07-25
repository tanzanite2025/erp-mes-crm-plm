package repositories

import (
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func (GormOrganizationRepository) ListEmployees(database *gorm.DB) ([]models.Employee, error) {
	var employees []models.Employee
	selectClause := "employees.*, organizations.name as dept_name, production_lines.name as line_name, process_steps.name as process_name"
	query := database.Table("employees").
		Select(selectClause).
		Joins("LEFT JOIN organizations ON employees.dept_id = CAST(organizations.id AS TEXT)").
		Joins("LEFT JOIN production_lines ON employees.line_id = CAST(production_lines.id AS TEXT)").
		Joins("LEFT JOIN process_steps ON employees.process_id = CAST(process_steps.id AS TEXT)")

	if database != nil && database.Migrator().HasTable("employee_assignments") {
		query = query.
			Select(selectClause+", employee_assignments.position_id as position_id").
			Joins("LEFT JOIN employee_assignments ON employee_assignments.employee_id = employees.id AND employee_assignments.deleted_at IS NULL AND employee_assignments.is_primary = ?", true)
		if database.Migrator().HasTable("positions") {
			query = query.
				Select(selectClause + ", employee_assignments.position_id as position_id, positions.name as position_name").
				Joins("LEFT JOIN positions ON employee_assignments.position_id = positions.id AND positions.deleted_at IS NULL")
		}
	}

	err := query.
		Where("employees.deleted_at IS NULL").
		Order("employees.created_at desc").
		Find(&employees).Error
	return employees, err
}

func (GormOrganizationRepository) ListExcellentEmployeeInputs(database *gorm.DB) ([]models.Employee, error) {
	var employees []models.Employee
	err := database.Table("employees").
		Select("employees.id, employees.name, employees.joined_date, COALESCE(organizations.name, '') AS dept_name").
		Joins("LEFT JOIN organizations ON employees.dept_id = CAST(organizations.id AS TEXT)").
		Where("employees.deleted_at IS NULL").
		Find(&employees).Error
	return employees, err
}

func (GormOrganizationRepository) BulkUpdateEmployeeStatus(database *gorm.DB, ids []string, status string) (int64, error) {
	result := database.Model(&models.Employee{}).Where("id IN ?", ids).Update("status", status)
	return result.RowsAffected, result.Error
}

func (GormOrganizationRepository) SaveEmployee(database *gorm.DB, employee *models.Employee) error {
	return database.Save(employee).Error
}

func (GormOrganizationRepository) DeleteEmployees(database *gorm.DB, ids []string) error {
	return database.Delete(&models.Employee{}, "id IN ?", ids).Error
}

func (GormOrganizationRepository) FindEmployeeByIDOrStaffID(database *gorm.DB, id string, staffID string) (models.Employee, bool, error) {
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
