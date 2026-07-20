package services

import (
	"context"
	"errors"
	"strings"
	"time"
	"xdfc-server/audit"
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
	txManager  transactionManager
	repository repositories.OrganizationRepository
}

func NewOrganizationService(
	txManager transactionManager,
	repository repositories.OrganizationRepository,
) *OrganizationService {
	return &OrganizationService{
		txManager:  txManager,
		repository: repository,
	}
}

var defaultOrganizationRuntime = defaultServiceRuntime()

var defaultOrganizationService = NewOrganizationService(
	defaultOrganizationRuntime.txManager,
	repositories.NewOrganizationRepository(),
)

func ListOrganizationTree() ([]OrganizationTreeNodeResponse, error) {
	return defaultOrganizationService.ListOrganizationTree()
}

func SaveOrganization(ctx context.Context, input OrganizationSaveRequest) (OrganizationSaveResponse, error) {
	return defaultOrganizationService.SaveOrganization(ctx, input)
}

func DeleteOrganization(ctx context.Context, id string) error {
	return defaultOrganizationService.DeleteOrganization(ctx, id)
}

func ListEmployees() ([]EmployeeListItemResponse, error) {
	return defaultOrganizationService.ListEmployees()
}

func ListPositions() ([]PositionListItemResponse, error) {
	return defaultOrganizationService.ListPositions()
}

func GetEmployeeDetail(id string) (EmployeeDetailResponse, error) {
	return defaultOrganizationService.GetEmployeeDetail(id)
}

type BulkUpdateEmployeeStatusResult struct {
	Updated    int64
	OperatedAt time.Time
}

func BulkUpdateEmployeeStatus(ctx context.Context, ids []string, status string) (BulkUpdateEmployeeStatusResult, error) {
	return defaultOrganizationService.BulkUpdateEmployeeStatus(ctx, ids, status)
}

func SaveEmployee(ctx context.Context, input EmployeeSaveRequest) (EmployeeSaveResponse, error) {
	return defaultOrganizationService.SaveEmployee(ctx, input)
}

func PatchOrganization(ctx context.Context, input PatchOrganizationRequest) (OrganizationTreeNodeResponse, error) {
	return defaultOrganizationService.PatchOrganization(ctx, input)
}

func PatchEmployee(ctx context.Context, input PatchEmployeeRequest) (EmployeeListItemResponse, error) {
	return defaultOrganizationService.PatchEmployee(ctx, input)
}

func DeleteEmployees(ctx context.Context, ids []string) error {
	return defaultOrganizationService.DeleteEmployees(ctx, ids)
}

func BulkSyncOrganizations(ctx context.Context, input []BulkSyncOrganizationRequest) (int, error) {
	return defaultOrganizationService.BulkSyncOrganizations(ctx, input)
}

func BulkSyncEmployees(input []BulkSyncEmployeeRequest) (int, error) {
	return defaultOrganizationService.BulkSyncEmployees(input)
}

func (s *OrganizationService) ListOrganizationTree() ([]OrganizationTreeNodeResponse, error) {
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

	return MapOrganizationTreeToResponse(rootNodes), nil
}

func (s *OrganizationService) SaveOrganization(ctx context.Context, input OrganizationSaveRequest) (OrganizationSaveResponse, error) {
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
		if err := s.repository.SaveOrganization(tx, &model); err != nil {
			return err
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, "Organization", model.ID, "save", nil)
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

func (s *OrganizationService) DeleteOrganization(ctx context.Context, id string) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		childCount, err := s.repository.CountChildOrganizations(tx, id)
		if err != nil {
			return err
		}
		if childCount > 0 {
			return ErrOrganizationHasChildren
		}
		employeeCount, err := s.repository.CountEmployeesByDeptID(tx, id)
		if err != nil {
			return err
		}
		if employeeCount > 0 {
			return ErrOrganizationHasEmployees
		}
		if err := s.repository.DeleteOrganization(tx, id); err != nil {
			return err
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, "Organization", id, "delete", nil)
	})
}

func (s *OrganizationService) ListEmployees() ([]EmployeeListItemResponse, error) {
	employees, err := s.repository.ListEmployees(s.txManager.DB())
	if err != nil {
		return nil, err
	}
	return MapEmployeesToListItemResponse(employees), nil
}

func (s *OrganizationService) GetEmployeeDetail(id string) (EmployeeDetailResponse, error) {
	employee, err := loadEmployeeAggregate(s.txManager.DB(), id)
	if err != nil {
		return EmployeeDetailResponse{}, err
	}
	return MapEmployeeToDetailResponse(employee), nil
}

func (s *OrganizationService) ListPositions() ([]PositionListItemResponse, error) {
	positions, err := s.repository.ListPositions(s.txManager.DB())
	if err != nil {
		return nil, err
	}
	return MapPositionsToListItemResponse(positions), nil
}

func (s *OrganizationService) BulkUpdateEmployeeStatus(ctx context.Context, ids []string, status string) (BulkUpdateEmployeeStatusResult, error) {
	normalizedIDs := normalizeStringIDs(ids)
	if len(normalizedIDs) == 0 {
		return BulkUpdateEmployeeStatusResult{}, ErrEmptyEmployeeIDs
	}

	normalizedStatus := strings.TrimSpace(status)
	switch normalizedStatus {
	case "active", "resigned", "on-leave":
	default:
		return BulkUpdateEmployeeStatusResult{}, ErrInvalidEmployeeStatus
	}

	var updated int64
	var operatedAt time.Time
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var err error
		updated, err = s.repository.BulkUpdateEmployeeStatus(tx, normalizedIDs, normalizedStatus)
		operatedAt = time.Now().UTC()
		for _, id := range normalizedIDs {
			if err := recordLegacyAuditEntryWithContext(ctx, tx, "Employee", id, "status_change", nil); err != nil {
				return err
			}
		}
		return err
	})
	if err != nil {
		return BulkUpdateEmployeeStatusResult{}, err
	}

	return BulkUpdateEmployeeStatusResult{Updated: updated, OperatedAt: operatedAt}, nil
}

func (s *OrganizationService) SaveEmployee(ctx context.Context, input EmployeeSaveRequest) (EmployeeSaveResponse, error) {
	model := MapEmployeeSaveRequestToModel(input)
	var refreshed models.Employee
	if err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		actor, _ := audit.ActorFromContext(ctx)
		model.Operator = actor.Username
		if model.Operator == "" {
			model.Operator = actor.UserID
		}
		if model.Operator == "" {
			model.Operator = "system"
		}

		if err := s.repository.SaveEmployee(tx, &model); err != nil {
			return err
		}
		if _, err := syncPrimaryAssignmentProjectionFromEmployee(tx, model, "legacy_employee_save", ""); err != nil {
			return err
		}
		if err := recordLegacyAuditEntryWithContext(ctx, tx, "Employee", model.ID, "save", nil); err != nil {
			return err
		}
		var err error
		refreshed, err = loadEmployeeAggregate(tx, model.ID)
		return err
	}); err != nil {
		return EmployeeSaveResponse{}, err
	}

	return MapEmployeeToSaveResponse(refreshed), nil
}

func (s *OrganizationService) DeleteEmployees(ctx context.Context, ids []string) error {
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
		for _, employeeID := range normalizedIDs {
			if err := recordLegacyAuditEntryWithContext(ctx, tx, "Employee", employeeID, "delete", nil); err != nil {
				return err
			}
			if err := recordAuditEventTx(tx, audit.NewAuditEvent(audit.AuditEntityEmployee, employeeID, audit.AuditActionDelete, audit.AuditActor{}).Normalize()); err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *OrganizationService) BulkSyncOrganizations(ctx context.Context, input []BulkSyncOrganizationRequest) (int, error) {
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		for _, item := range input {
			node := MapBulkSyncOrganizationRequestToModel(item)
			if err := s.repository.SaveOrganization(tx, &node); err != nil {
				return err
			}
			if err := recordLegacyAuditEntryWithContext(ctx, tx, "Organization", node.ID, "bulk_sync", nil); err != nil {
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
			if _, err := syncPrimaryAssignmentProjectionFromEmployee(tx, employee, "legacy_employee_bulk_sync", ""); err != nil {
				return err
			}
			action := audit.AuditActionCreate
			if found {
				action = audit.AuditActionUpdate
			}
			if err := recordAuditEventTx(tx, audit.NewAuditEvent(audit.AuditEntityEmployee, employee.ID, action, audit.AuditActor{}).Normalize()); err != nil {
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
