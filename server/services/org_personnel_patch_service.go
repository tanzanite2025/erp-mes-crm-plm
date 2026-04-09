package services

import (
	"encoding/json"
	"errors"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrOrganizationPatchVersionConflict = errors.New("organization patch version conflict")
	ErrEmployeePatchVersionConflict     = errors.New("employee patch version conflict")
)

type PatchOrganizationRequest struct {
	ID                    string
	ExpectedVersion       int
	DeltaKeys             []string
	Name                  *string
	ParentID              *string
	ParentIDSet           bool
	Manager               *string
	Description           *string
	Type                  *string
	LinkedArchitecture    json.RawMessage
	LinkedArchitectureSet bool
}

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
	Station         *string
	Status          *string
	JoinedDate      *time.Time
	JoinedDateSet   bool
	DeptID          *string
	LineID          *string
	ProcessID       *string
}

func (s *OrganizationService) PatchOrganization(input PatchOrganizationRequest) (models.Organization, error) {
	var updated models.Organization

	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var current models.Organization
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", strings.TrimSpace(input.ID)).
			First(&current).Error; err != nil {
			return err
		}

		if input.ExpectedVersion != optimisticVersionFromTimestamps(current.UpdatedAt, current.CreatedAt) {
			return ErrOrganizationPatchVersionConflict
		}

		if input.Name != nil {
			current.Name = strings.TrimSpace(*input.Name)
		}
		if input.ParentIDSet {
			if input.ParentID == nil || strings.TrimSpace(*input.ParentID) == "" {
				current.ParentID = nil
			} else {
				parentID := strings.TrimSpace(*input.ParentID)
				current.ParentID = &parentID
			}
		}
		if input.Manager != nil {
			current.Manager = strings.TrimSpace(*input.Manager)
		}
		if input.Description != nil {
			current.Description = strings.TrimSpace(*input.Description)
		}
		if input.Type != nil {
			current.Type = strings.TrimSpace(*input.Type)
		}
		if input.LinkedArchitectureSet {
			current.LinkedArchitecture = append(json.RawMessage(nil), input.LinkedArchitecture...)
		}

		if err := s.validateOrganizationHierarchyWithDB(tx, &current); err != nil {
			return err
		}

		nameExists, err := s.repository.OrganizationNameExists(tx, current.Name, current.ParentID, current.ID)
		if err != nil {
			return err
		}
		if nameExists {
			return ErrOrganizationNameConflict
		}

		if err := s.repository.SaveOrganization(tx, &current); err != nil {
			return err
		}
		if s.auditLogger != nil {
			if err := s.auditLogger.Write(tx, AuditEntry{
				Module:   "Organization",
				TargetID: current.ID,
				Action:   "PATCH",
				Diff:     auditDeltaKeys(input.DeltaKeys),
			}); err != nil {
				return err
			}
		}

		updated = current
		return nil
	})
	if err != nil {
		return models.Organization{}, err
	}

	return updated, nil
}

func (s *OrganizationService) PatchEmployee(input PatchEmployeeRequest) (models.Employee, error) {
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
		if input.Station != nil {
			current.Station = strings.TrimSpace(*input.Station)
		}
		if input.Status != nil {
			current.Status = strings.TrimSpace(*input.Status)
		}
		if input.JoinedDateSet {
			current.JoinedDate = input.JoinedDate
		}
		if input.DeptID != nil {
			current.DeptID = strings.TrimSpace(*input.DeptID)
		}
		if input.LineID != nil {
			current.LineID = strings.TrimSpace(*input.LineID)
		}
		if input.ProcessID != nil {
			current.ProcessID = strings.TrimSpace(*input.ProcessID)
		}

		if err := s.repository.SaveEmployee(tx, &current); err != nil {
			return err
		}
		if s.auditLogger != nil {
			if err := s.auditLogger.Write(tx, AuditEntry{
				Module:   "Employee",
				TargetID: current.ID,
				Action:   "PATCH",
				Diff:     auditDeltaKeys(input.DeltaKeys),
			}); err != nil {
				return err
			}
		}

		return tx.Table("employees").
			Select("employees.*, organizations.name as dept_name, production_lines.name as line_name, process_steps.name as process_name").
			Joins("LEFT JOIN organizations ON employees.dept_id = CAST(organizations.id AS TEXT)").
			Joins("LEFT JOIN production_lines ON employees.line_id = CAST(production_lines.id AS TEXT)").
			Joins("LEFT JOIN process_steps ON employees.process_id = CAST(process_steps.id AS TEXT)").
			Where("employees.id = ?", current.ID).
			First(&updated).Error
	})
	if err != nil {
		return models.Employee{}, err
	}

	return updated, nil
}
