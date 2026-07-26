package services

import (
	"context"
	"errors"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrEmployeePatchVersionConflict = errors.New("employee patch version conflict")

type PatchEmployeeRequest struct {
	ID              string
	ExpectedVersion int
	DeltaKeys       []string
	StaffID         *string
	Name            *string
	Gender          *string
	Birthday        *time.Time
	BirthdaySet     bool
	IDCard          *string
	Phone           *string
	EmergencyPhone  *string
	Address         *string
	BankCard        *string
	BankName        *string
	Education       *string
	Age             *int
	Status          *string
	JoinedDate      *time.Time
	JoinedDateSet   bool
	DeptID          *string
	PositionID      *string
	PositionIDSet   bool
}

func (s *EmployeeCommandService) PatchEmployee(ctx context.Context, input PatchEmployeeRequest) (EmployeeListItemResponse, error) {
	var updated models.Employee

	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var current models.Employee
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", strings.TrimSpace(input.ID)).
			First(&current).Error; err != nil {
			return err
		}

		if input.ExpectedVersion != optimisticVersionFromTimestamps(current.UpdatedAt, current.CreatedAt) {
			return ErrEmployeePatchVersionConflict
		}

		if input.StaffID != nil {
			current.StaffID = strings.TrimSpace(*input.StaffID)
		}
		if input.Name != nil {
			current.Name = strings.TrimSpace(*input.Name)
		}
		if input.Gender != nil {
			current.Gender = strings.TrimSpace(*input.Gender)
		}
		if input.BirthdaySet {
			current.Birthday = input.Birthday
		}
		if input.IDCard != nil {
			current.IDCard = strings.TrimSpace(*input.IDCard)
		}
		if input.Phone != nil {
			current.Phone = strings.TrimSpace(*input.Phone)
		}
		if input.EmergencyPhone != nil {
			current.EmergencyPhone = strings.TrimSpace(*input.EmergencyPhone)
		}
		if input.Address != nil {
			current.Address = strings.TrimSpace(*input.Address)
		}
		if input.BankCard != nil {
			current.BankCard = strings.TrimSpace(*input.BankCard)
		}
		if input.BankName != nil {
			current.BankName = strings.TrimSpace(*input.BankName)
		}
		if input.Education != nil {
			current.Education = strings.TrimSpace(*input.Education)
		}
		if input.Age != nil {
			current.Age = *input.Age
		}
		if input.Status != nil {
			current.Status = strings.TrimSpace(*input.Status)
		}
		if input.JoinedDateSet {
			current.JoinedDate = input.JoinedDate
		}

		orgUnitPatchRequested := false
		var nextOrgUnitID *string
		if input.DeptID != nil {
			orgUnitPatchRequested = true
			nextOrgUnitID = nullableStringPointer(*input.DeptID)
		}

		var nextPositionID *string
		if input.PositionIDSet {
			if input.PositionID != nil && strings.TrimSpace(*input.PositionID) != "" {
				nextPositionID = stringPointer(*input.PositionID)
			}
		}

		actor, _ := audit.ActorFromContext(ctx)
		current.Operator = actor.Username
		if current.Operator == "" {
			current.Operator = actor.UserID
		}
		if current.Operator == "" {
			current.Operator = "system"
		}

		current.DeptID = ""
		if err := s.repository.SaveEmployee(tx, &current); err != nil {
			return err
		}
		if orgUnitPatchRequested {
			if _, err := applyPrimaryAssignmentOrgUnit(tx, current, nextOrgUnitID, "employee_patch", ""); err != nil {
				return err
			}
		}
		if input.PositionIDSet {
			if _, err := applyPrimaryAssignmentPosition(tx, current, nextPositionID, "employee_patch", ""); err != nil {
				return err
			}
		}
		if err := recordLegacyAuditEntryWithContext(ctx, tx, "Employee", current.ID, "PATCH", auditDeltaKeys(input.DeltaKeys)); err != nil {
			return err
		}

		var err error
		updated, err = loadEmployeeAggregate(tx, current.ID)
		return err
	})
	if err != nil {
		return EmployeeListItemResponse{}, err
	}

	return MapEmployeeToListItemResponse(updated), nil
}
