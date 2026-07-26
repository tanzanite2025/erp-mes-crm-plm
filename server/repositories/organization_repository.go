package repositories

import (
	"xdfc-server/models"

	"gorm.io/gorm"
)

type OrganizationTreeRepository interface {
	ListOrganizations(database *gorm.DB) ([]models.Organization, error)
	GetOrganizationByID(database *gorm.DB, id string) (models.Organization, bool, error)
	OrganizationNameExists(database *gorm.DB, name string, parentID *string, excludeID string) (bool, error)
	SaveOrganization(database *gorm.DB, organization *models.Organization) error
	CountChildOrganizations(database *gorm.DB, id string) (int64, error)
	CountEmployeesByOrgUnitID(database *gorm.DB, orgUnitID string) (int64, error)
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

type GormOrgPersonnelRepository struct{}

func NewOrgPersonnelRepository() GormOrgPersonnelRepository {
	return GormOrgPersonnelRepository{}
}

func NewOrganizationTreeRepository() OrganizationTreeRepository {
	return NewOrgPersonnelRepository()
}

func NewEmployeeRepository() EmployeeRepository {
	return NewOrgPersonnelRepository()
}

func NewPositionRepository() PositionRepository {
	return NewOrgPersonnelRepository()
}

func NewEmployeeAccountBindingRepository() EmployeeAccountBindingRepository {
	return NewOrgPersonnelRepository()
}
