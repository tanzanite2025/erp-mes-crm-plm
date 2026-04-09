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
	ErrOrganizationNameConflict     = errors.New("organization name conflict")
	ErrOrganizationHasChildren      = errors.New("organization has child departments")
	ErrOrganizationHasEmployees     = errors.New("organization has employees")
	ErrOrganizationParentNotFound   = errors.New("organization parent not found")
	ErrOrganizationHierarchyInvalid = errors.New("organization hierarchy invalid")
	ErrOrganizationDepthExceeded    = errors.New("organization depth exceeded")
	ErrInvalidEmployeeStatus        = errors.New("invalid employee status")
	ErrEmptyEmployeeIDs             = errors.New("employee ids cannot be empty")
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

func SaveOrganization(input OrganizationSaveRequest) (OrganizationSaveResponse, error) {
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

func SaveEmployee(input EmployeeSaveRequest) (EmployeeSaveResponse, error) {
	return defaultOrganizationService.SaveEmployee(input)
}

func PatchOrganization(input PatchOrganizationRequest) (models.Organization, error) {
	return defaultOrganizationService.PatchOrganization(input)
}

func PatchEmployee(input PatchEmployeeRequest) (models.Employee, error) {
	return defaultOrganizationService.PatchEmployee(input)
}

func DeleteEmployees(ids []string) error {
	return defaultOrganizationService.DeleteEmployees(ids)
}

func BulkSyncOrganizations(input []BulkSyncOrganizationRequest) (int, error) {
	return defaultOrganizationService.BulkSyncOrganizations(input)
}

func BulkSyncEmployees(input []BulkSyncEmployeeRequest) (int, error) {
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

func (s *OrganizationService) SaveOrganization(input OrganizationSaveRequest) (OrganizationSaveResponse, error) {
	model := MapOrganizationSaveRequestToModel(input)
	if err := s.validateOrganizationHierarchy(&model); err != nil {
		return OrganizationSaveResponse{}, err
	}

	nameExists, err := s.repository.OrganizationNameExists(s.txManager.DB(), model.Name, model.ParentID, model.ID)
	if err != nil {
		return OrganizationSaveResponse{}, err
	}
	if nameExists {
		return OrganizationSaveResponse{}, ErrOrganizationNameConflict
	}

	if err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		return s.repository.SaveOrganization(tx, &model)
	}); err != nil {
		return OrganizationSaveResponse{}, err
	}

	return MapOrganizationToSaveResponse(model), nil
}

func (s *OrganizationService) validateOrganizationHierarchy(input *models.Organization) error {
	return s.validateOrganizationHierarchyWithDB(s.txManager.DB(), input)
}

func (s *OrganizationService) validateOrganizationHierarchyWithDB(database *gorm.DB, input *models.Organization) error {
	normalizedType := strings.TrimSpace(input.Type)
	normalizedID := strings.TrimSpace(input.ID)

	if input.ParentID == nil || strings.TrimSpace(*input.ParentID) == "" {
		if normalizedType == "" {
			input.Type = "company"
			return nil
		}
		if normalizedType != "company" {
			return ErrOrganizationHierarchyInvalid
		}
		return nil
	}

	parentID := strings.TrimSpace(*input.ParentID)
	if normalizedID != "" && parentID == normalizedID {
		return ErrOrganizationHierarchyInvalid
	}

	parent, found, err := s.repository.GetOrganizationByID(database, parentID)
	if err != nil {
		return err
	}
	if !found {
		return ErrOrganizationParentNotFound
	}

	expectedType := ""
	switch strings.TrimSpace(parent.Type) {
	case "company":
		expectedType = "department"
	case "department":
		expectedType = "team"
	case "team":
		return ErrOrganizationDepthExceeded
	default:
		return ErrOrganizationHierarchyInvalid
	}

	if normalizedType == "" {
		input.Type = expectedType
		return nil
	}

	if normalizedType != expectedType {
		return ErrOrganizationHierarchyInvalid
	}

	return nil
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

func (s *OrganizationService) SaveEmployee(input EmployeeSaveRequest) (EmployeeSaveResponse, error) {
	model := MapEmployeeSaveRequestToModel(input)
	var refreshed models.Employee
	if err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if err := s.repository.SaveEmployee(tx, &model); err != nil {
			return err
		}
		return tx.Table("employees").
			Select("employees.*, organizations.name as dept_name, production_lines.name as line_name, process_steps.name as process_name").
			Joins("LEFT JOIN organizations ON employees.dept_id = CAST(organizations.id AS TEXT)").
			Joins("LEFT JOIN production_lines ON employees.line_id = CAST(production_lines.id AS TEXT)").
			Joins("LEFT JOIN process_steps ON employees.process_id = CAST(process_steps.id AS TEXT)").
			Where("employees.id = ?", model.ID).
			First(&refreshed).Error
	}); err != nil {
		return EmployeeSaveResponse{}, err
	}

	return MapEmployeeToSaveResponse(refreshed), nil
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

func (s *OrganizationService) BulkSyncOrganizations(input []BulkSyncOrganizationRequest) (int, error) {
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		for _, item := range input {
			node := MapBulkSyncOrganizationRequestToModel(item)
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

func (s *OrganizationService) BulkSyncEmployees(input []BulkSyncEmployeeRequest) (int, error) {
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		for _, item := range input {
			employee := MapBulkSyncEmployeeRequestToModel(item)
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
