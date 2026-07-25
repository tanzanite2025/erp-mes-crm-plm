package repositories

import (
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type OrganizationRepository interface {
	OrganizationTreeRepository
	EmployeeRepository
	PositionRepository
	EmployeeAccountBindingRepository
}

type OrganizationTreeRepository interface {
	ListOrganizations(database *gorm.DB) ([]models.Organization, error)
	GetOrganizationByID(database *gorm.DB, id string) (models.Organization, bool, error)
	OrganizationNameExists(database *gorm.DB, name string, parentID *string, excludeID string) (bool, error)
	SaveOrganization(database *gorm.DB, organization *models.Organization) error
	CountChildOrganizations(database *gorm.DB, id string) (int64, error)
	CountEmployeesByDeptID(database *gorm.DB, deptID string) (int64, error)
	DeleteOrganization(database *gorm.DB, id string) error
}

type EmployeeRepository interface {
	ListEmployees(database *gorm.DB) ([]models.Employee, error)
	ListExcellentEmployeeInputs(database *gorm.DB) ([]models.Employee, error)
	BulkUpdateEmployeeStatus(database *gorm.DB, ids []string, status string) (int64, error)
	SaveEmployee(database *gorm.DB, employee *models.Employee) error
	DeleteEmployees(database *gorm.DB, ids []string) error
	FindEmployeeByIDOrStaffID(database *gorm.DB, id string, staffID string) (models.Employee, bool, error)
}

type PositionRepository interface {
	ListPositions(database *gorm.DB) ([]models.Position, error)
}

type EmployeeAccountBindingRepository interface {
	DisableUsersByEmployeeIDs(database *gorm.DB, ids []string) error
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
