package services

import (
	"errors"
	"strings"
	"xdfc-server/models"
	"xdfc-server/repositories"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrOrganizationNameConflict = errors.New("organization name conflict")
	ErrOrganizationHasChildren  = errors.New("organization has child departments")
	ErrOrganizationHasEmployees = errors.New("organization has employees")
	ErrInvalidEmployeeStatus    = errors.New("invalid employee status")
	ErrEmptyEmployeeIDs         = errors.New("employee ids cannot be empty")
)

type OrganizationService struct {
	txManager   transactionManager
	auditLogger auditLogger
	repository  repositories.OrganizationRepository
}

func NewOrganizationService(
	txManager transactionManager,
	auditLogger auditLogger,
	repository repositories.OrganizationRepository,
) *OrganizationService {
	return &OrganizationService{
		txManager:   txManager,
		auditLogger: auditLogger,
		repository:  repository,
	}
}

var defaultOrganizationRuntime = defaultServiceRuntime()

var defaultOrganizationService = NewOrganizationService(
	defaultOrganizationRuntime.txManager,
	defaultOrganizationRuntime.auditLogger,
	repositories.NewOrganizationRepository(),
)

func ListOrganizationTree() ([]*models.Organization, error) {
	return defaultOrganizationService.ListOrganizationTree()
}

func SaveOrganization(input models.Organization) (models.Organization, error) {
	return defaultOrganizationService.SaveOrganization(input)
}

func DeleteOrganization(id string) error {
	return defaultOrganizationService.DeleteOrganization(id)
}

func ListEmployees() ([]models.Employee, error) {
	return defaultOrganizationService.ListEmployees()
}

func BulkUpdateEmployeeStatus(ids []string, status string) (int64, error) {
	return defaultOrganizationService.BulkUpdateEmployeeStatus(ids, status)
}

func SaveEmployee(input models.Employee) (models.Employee, error) {
	return defaultOrganizationService.SaveEmployee(input)
}

func DeleteEmployees(ids []string) error {
	return defaultOrganizationService.DeleteEmployees(ids)
}

func BulkSyncOrganizations(input []models.Organization) (int, error) {
	return defaultOrganizationService.BulkSyncOrganizations(input)
}

func BulkSyncEmployees(input []models.Employee) (int, error) {
	return defaultOrganizationService.BulkSyncEmployees(input)
}

func (s *OrganizationService) ListOrganizationTree() ([]*models.Organization, error) {
	allNodes, err := s.repository.ListOrganizations(s.txManager.DB())
	if err != nil {
		return nil, err
	}

	nodeMap := make(map[string]*models.Organization, len(allNodes))
	for i := range allNodes {
		node := &allNodes[i]
		node.Children = []*models.Organization{}
		nodeMap[node.ID] = node
	}

	var rootNodes []*models.Organization
	for i := range allNodes {
		node := &allNodes[i]
		if node.ParentID == nil || strings.TrimSpace(*node.ParentID) == "" {
			rootNodes = append(rootNodes, node)
			continue
		}

		if parent, ok := nodeMap[*node.ParentID]; ok {
			parent.Children = append(parent.Children, node)
			continue
		}

		rootNodes = append(rootNodes, node)
	}

	return rootNodes, nil
}

func (s *OrganizationService) SaveOrganization(input models.Organization) (models.Organization, error) {
	nameExists, err := s.repository.OrganizationNameExists(s.txManager.DB(), input.Name, input.ParentID, input.ID)
	if err != nil {
		return models.Organization{}, err
	}
	if nameExists {
		return models.Organization{}, ErrOrganizationNameConflict
	}

	if err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		return s.repository.SaveOrganization(tx, &input)
	}); err != nil {
		return models.Organization{}, err
	}

	return input, nil
}

func (s *OrganizationService) DeleteOrganization(id string) error {
	childCount, err := s.repository.CountChildOrganizations(s.txManager.DB(), id)
	if err != nil {
		return err
	}
	if childCount > 0 {
		return ErrOrganizationHasChildren
	}

	employeeCount, err := s.repository.CountEmployeesByDeptID(s.txManager.DB(), id)
	if err != nil {
		return err
	}
	if employeeCount > 0 {
		return ErrOrganizationHasEmployees
	}

	return s.repository.DeleteOrganization(s.txManager.DB(), id)
}

func (s *OrganizationService) ListEmployees() ([]models.Employee, error) {
	return s.repository.ListEmployees(s.txManager.DB())
}

func (s *OrganizationService) BulkUpdateEmployeeStatus(ids []string, status string) (int64, error) {
	normalizedIDs := normalizeStringIDs(ids)
	if len(normalizedIDs) == 0 {
		return 0, ErrEmptyEmployeeIDs
	}

	normalizedStatus := strings.TrimSpace(status)
	switch normalizedStatus {
	case "active", "resigned", "on-leave":
	default:
		return 0, ErrInvalidEmployeeStatus
	}

	var updated int64
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var err error
		updated, err = s.repository.BulkUpdateEmployeeStatus(tx, normalizedIDs, normalizedStatus)
		return err
	})
	if err != nil {
		return 0, err
	}

	return updated, nil
}

func (s *OrganizationService) SaveEmployee(input models.Employee) (models.Employee, error) {
	if err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		return s.repository.SaveEmployee(tx, &input)
	}); err != nil {
		return models.Employee{}, err
	}

	return input, nil
}

func (s *OrganizationService) DeleteEmployees(ids []string) error {
	normalizedIDs := normalizeStringIDs(ids)
	if len(normalizedIDs) == 0 {
		return ErrEmptyEmployeeIDs
	}

	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if err := s.repository.DeleteEmployees(tx, normalizedIDs); err != nil {
			return err
		}
		if err := s.repository.DisableUsersByEmployeeIDs(tx, normalizedIDs); err != nil {
			return err
		}
		if s.auditLogger != nil {
			for _, employeeID := range normalizedIDs {
				if err := s.auditLogger.Write(tx, AuditEntry{
					Module:   "Employee",
					TargetID: employeeID,
					Action:   "Delete",
				}); err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func (s *OrganizationService) BulkSyncOrganizations(input []models.Organization) (int, error) {
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		for _, node := range input {
			if err := s.repository.SaveOrganization(tx, &node); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return len(input), nil
}

func (s *OrganizationService) BulkSyncEmployees(input []models.Employee) (int, error) {
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		for _, employee := range input {
			existing, found, err := s.repository.FindEmployeeByIDOrStaffID(tx, employee.ID, employee.StaffID)
			if err != nil {
				return err
			}

			if !found {
				if strings.TrimSpace(employee.ID) == "" {
					employee.ID = uuid.NewString()
				}
			} else {
				employee.ID = existing.ID
			}

			if err := s.repository.SaveEmployee(tx, &employee); err != nil {
				return err
			}
			if s.auditLogger != nil {
				action := "Create"
				if found {
					action = "Update"
				}
				if err := s.auditLogger.Write(tx, AuditEntry{
					Module:   "Employee",
					TargetID: employee.ID,
					Action:   action,
				}); err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return len(input), nil
}

func normalizeStringIDs(ids []string) []string {
	normalizedIDs := make([]string, 0, len(ids))
	for _, id := range ids {
		trimmed := strings.TrimSpace(id)
		if trimmed != "" {
			normalizedIDs = append(normalizedIDs, trimmed)
		}
	}
	return normalizedIDs
}
