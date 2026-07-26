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
	ErrInvalidEmployeeStatus = errors.New("invalid employee status")
	ErrEmptyEmployeeIDs      = errors.New("employee ids cannot be empty")
)

type BulkUpdateEmployeeStatusResult struct {
	Updated    int64
	OperatedAt time.Time
}

type employeeCommandRepository interface {
	repositories.EmployeeRepository
	repositories.EmployeeAccountBindingRepository
}

type EmployeeCommandService struct {
	txManager  transactionManager
	repository employeeCommandRepository
}

func NewEmployeeCommandService(
	txManager transactionManager,
	repository employeeCommandRepository,
) *EmployeeCommandService {
	return &EmployeeCommandService{
		txManager:  txManager,
		repository: repository,
	}
}

var defaultEmployeeCommandService = NewEmployeeCommandService(
	defaultOrgPersonnelRuntime.txManager,
	repositories.NewOrgPersonnelRepository(),
)

func BulkUpdateEmployeeStatus(ctx context.Context, ids []string, status string) (BulkUpdateEmployeeStatusResult, error) {
	return defaultEmployeeCommandService.BulkUpdateEmployeeStatus(ctx, ids, status)
}

func SaveEmployee(ctx context.Context, input EmployeeSaveRequest) (EmployeeSaveResponse, error) {
	return defaultEmployeeCommandService.SaveEmployee(ctx, input)
}

func PatchEmployee(ctx context.Context, input PatchEmployeeRequest) (EmployeeListItemResponse, error) {
	return defaultEmployeeCommandService.PatchEmployee(ctx, input)
}

func DeleteEmployees(ctx context.Context, ids []string) error {
	return defaultEmployeeCommandService.DeleteEmployees(ctx, ids)
}

func BulkSyncEmployees(input []BulkSyncEmployeeRequest) (int, error) {
	return defaultEmployeeCommandService.BulkSyncEmployees(input)
}

func (s *EmployeeCommandService) BulkUpdateEmployeeStatus(ctx context.Context, ids []string, status string) (BulkUpdateEmployeeStatusResult, error) {
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

func (s *EmployeeCommandService) SaveEmployee(ctx context.Context, input EmployeeSaveRequest) (EmployeeSaveResponse, error) {
	model := MapEmployeeSaveRequestToModel(input)
	requestedOrgUnitID := nullableStringPointer(model.DeptID)
	model.DeptID = ""
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
		if _, err := applyPrimaryAssignmentOrgUnit(tx, model, requestedOrgUnitID, "employee_save", ""); err != nil {
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

func (s *EmployeeCommandService) DeleteEmployees(ctx context.Context, ids []string) error {
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

func (s *EmployeeCommandService) BulkSyncEmployees(input []BulkSyncEmployeeRequest) (int, error) {
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		for _, item := range input {
			employee := MapBulkSyncEmployeeRequestToModel(item)
			requestedOrgUnitID := nullableStringPointer(employee.DeptID)
			employee.DeptID = ""
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
			if _, err := applyPrimaryAssignmentOrgUnit(tx, employee, requestedOrgUnitID, "employee_bulk_sync", ""); err != nil {
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
