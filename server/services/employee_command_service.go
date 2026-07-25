package services

import (
	"context"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

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
