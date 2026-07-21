package repositories

import (
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type OrganizationRepository interface {
	ListOrganizations(database *gorm.DB) ([]models.Organization, error)
	GetOrganizationByID(database *gorm.DB, id string) (models.Organization, bool, error)
	OrganizationNameExists(database *gorm.DB, name string, parentID *string, excludeID string) (bool, error)
	SaveOrganization(database *gorm.DB, organization *models.Organization) error
	CountChildOrganizations(database *gorm.DB, id string) (int64, error)
	CountEmployeesByDeptID(database *gorm.DB, deptID string) (int64, error)
	DeleteOrganization(database *gorm.DB, id string) error
	ListEmployees(database *gorm.DB) ([]models.Employee, error)
	ListExcellentEmployeeInputs(database *gorm.DB) ([]models.Employee, error)
	ListPositions(database *gorm.DB) ([]models.Position, error)
	BulkUpdateEmployeeStatus(database *gorm.DB, ids []string, status string) (int64, error)
	SaveEmployee(database *gorm.DB, employee *models.Employee) error
	DeleteEmployees(database *gorm.DB, ids []string) error
	DisableUsersByEmployeeIDs(database *gorm.DB, ids []string) error
	FindEmployeeByIDOrStaffID(database *gorm.DB, id string, staffID string) (models.Employee, bool, error)
}

type GormOrganizationRepository struct{}

func NewOrganizationRepository() OrganizationRepository {
	return GormOrganizationRepository{}
}

func (GormOrganizationRepository) ListOrganizations(database *gorm.DB) ([]models.Organization, error) {
	var nodes []models.Organization
	err := database.Order("id asc").Find(&nodes).Error
	return nodes, err
}

func (GormOrganizationRepository) GetOrganizationByID(database *gorm.DB, id string) (models.Organization, bool, error) {
	var organization models.Organization
	err := database.Where("id = ?", id).First(&organization).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Organization{}, false, nil
	}
	return organization, err == nil, err
}

func (GormOrganizationRepository) OrganizationNameExists(database *gorm.DB, name string, parentID *string, excludeID string) (bool, error) {
	query := database.Model(&models.Organization{}).Where("name = ?", name)
	if parentID == nil || strings.TrimSpace(*parentID) == "" {
		query = query.Where("(parent_id IS NULL OR parent_id = '')")
	} else {
		query = query.Where("parent_id = ?", strings.TrimSpace(*parentID))
	}
	if strings.TrimSpace(excludeID) != "" {
		query = query.Where("id <> ?", strings.TrimSpace(excludeID))
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (GormOrganizationRepository) SaveOrganization(database *gorm.DB, organization *models.Organization) error {
	return database.Save(organization).Error
}

func (GormOrganizationRepository) CountChildOrganizations(database *gorm.DB, id string) (int64, error) {
	var count int64
	err := database.Model(&models.Organization{}).Where("parent_id = ?", id).Count(&count).Error
	return count, err
}

func (GormOrganizationRepository) CountEmployeesByDeptID(database *gorm.DB, deptID string) (int64, error) {
	var count int64
	err := database.Model(&models.Employee{}).Where("dept_id = ?", deptID).Count(&count).Error
	return count, err
}

func (GormOrganizationRepository) DeleteOrganization(database *gorm.DB, id string) error {
	return database.Delete(&models.Organization{}, "id = ?", id).Error
}

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

func (GormOrganizationRepository) ListPositions(database *gorm.DB) ([]models.Position, error) {
	if database == nil || !database.Migrator().HasTable("positions") {
		return []models.Position{}, nil
	}

	var positions []models.Position
	selectClause := "positions.*"
	query := database.Table("positions")
	if database.Migrator().HasTable("organizations") {
		selectClause += ", organizations.name as org_unit_name"
		query = query.Joins(positionOrganizationJoinClause())
	} else {
		selectClause += ", '' as org_unit_name"
	}

	err := query.
		Select(selectClause).
		Where("positions.deleted_at IS NULL").
		Order("CASE WHEN positions.status = 'active' THEN 0 ELSE 1 END").
		Order("positions.sort_order asc").
		Order("positions.name asc").
		Find(&positions).Error
	return positions, err
}

func positionOrganizationJoinClause() string {
	return "LEFT JOIN organizations ON positions.org_unit_id = organizations.id"
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

func (GormOrganizationRepository) DisableUsersByEmployeeIDs(database *gorm.DB, ids []string) error {
	return database.Model(&models.User{}).
		Where("employee_id IN ?", ids).
		Where("is_protected = ?", false).
		Where("LOWER(username) <> ?", "admin").
		Update("status", "inactive").Error
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
