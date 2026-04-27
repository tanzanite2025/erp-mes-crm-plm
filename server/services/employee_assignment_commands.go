package services

import (
	"errors"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrEmployeeOrgUnitRequired        = errors.New("org unit id is required")
	ErrEmployeePositionRequired       = errors.New("position id is required")
	ErrEmployeeOrgUnitNotFound        = errors.New("org unit not found")
	ErrEmployeePositionNotFound       = errors.New("position not found")
	ErrEmployeeAssignmentsUnavailable = errors.New("employee assignments table unavailable")
)

type ChangeEmployeeOrgUnitRequest struct {
	EmployeeID      string `json:"employeeId"`
	OrgUnitID       string `json:"orgUnitId"`
	ExpectedVersion int    `json:"expectedVersion"`
	Remarks         string `json:"remarks"`
}

type ChangeEmployeePositionRequest struct {
	EmployeeID      string `json:"employeeId"`
	PositionID      string `json:"positionId"`
	ExpectedVersion int    `json:"expectedVersion"`
	Remarks         string `json:"remarks"`
}

type ClearEmployeePositionRequest struct {
	EmployeeID      string `json:"employeeId"`
	ExpectedVersion int    `json:"expectedVersion"`
	Remarks         string `json:"remarks"`
}

type EmployeeAssignmentSnapshotResponse struct {
	AssignmentID     string     `json:"assignmentId"`
	EmployeeID       string     `json:"employeeId"`
	OrgUnitID        *string    `json:"orgUnitId,omitempty"`
	PositionID       *string    `json:"positionId,omitempty"`
	ProductionUnitID *string    `json:"productionUnitId,omitempty"`
	AssignmentType   string     `json:"assignmentType"`
	IsPrimary        bool       `json:"isPrimary"`
	StartDate        time.Time  `json:"startDate"`
	EndDate          *time.Time `json:"endDate,omitempty"`
	Status           string     `json:"status"`
	Source           string     `json:"source"`
	Remarks          string     `json:"remarks,omitempty"`
}

type EmployeeAssignmentCommandResponse struct {
	Employee   EmployeeListItemResponse           `json:"employee"`
	Assignment EmployeeAssignmentSnapshotResponse `json:"assignment"`
}

func ChangeEmployeeOrgUnit(input ChangeEmployeeOrgUnitRequest) (EmployeeAssignmentCommandResponse, error) {
	return defaultOrganizationService.ChangeEmployeeOrgUnit(input)
}

func ChangeEmployeePosition(input ChangeEmployeePositionRequest) (EmployeeAssignmentCommandResponse, error) {
	return defaultOrganizationService.ChangeEmployeePosition(input)
}

func ClearEmployeePosition(input ClearEmployeePositionRequest) (EmployeeAssignmentCommandResponse, error) {
	return defaultOrganizationService.ClearEmployeePosition(input)
}

func (s *OrganizationService) ChangeEmployeeOrgUnit(input ChangeEmployeeOrgUnitRequest) (EmployeeAssignmentCommandResponse, error) {
	employeeID := strings.TrimSpace(input.EmployeeID)
	orgUnitID := strings.TrimSpace(input.OrgUnitID)
	if employeeID == "" {
		return EmployeeAssignmentCommandResponse{}, gorm.ErrRecordNotFound
	}
	if orgUnitID == "" {
		return EmployeeAssignmentCommandResponse{}, ErrEmployeeOrgUnitRequired
	}

	var refreshed models.Employee
	var assignment models.EmployeeAssignment

	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if tx == nil {
			return gorm.ErrInvalidDB
		}

		var current models.Employee
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", employeeID).
			First(&current).Error; err != nil {
			return err
		}

		if input.ExpectedVersion != 0 && input.ExpectedVersion != optimisticVersionFromTimestamps(current.UpdatedAt, current.CreatedAt) {
			return ErrEmployeePatchVersionConflict
		}

		if err := ensureOrgUnitExistsWhenAvailable(tx, orgUnitID); err != nil {
			return err
		}

		current.DeptID = orgUnitID
		if err := s.repository.SaveEmployee(tx, &current); err != nil {
			return err
		}

		var err error
		assignment, err = syncPrimaryAssignmentProjectionFromEmployee(tx, current, "employee_change_org_unit", strings.TrimSpace(input.Remarks))
		if err != nil {
			return err
		}

		if err := recordAuditEventTx(tx, audit.NewAuditEvent(
			audit.AuditEntityEmployee,
			current.ID,
			audit.AuditAction("CHANGE_ORG_UNIT"),
			audit.AuditActor{},
		).Normalize()); err != nil {
			return err
		}

		refreshed, err = loadEmployeeAggregate(tx, current.ID)
		return err
	})
	if err != nil {
		return EmployeeAssignmentCommandResponse{}, err
	}

	return EmployeeAssignmentCommandResponse{
		Employee:   MapEmployeeToListItemResponse(refreshed),
		Assignment: mapEmployeeAssignmentToResponse(assignment),
	}, nil
}

func (s *OrganizationService) ChangeEmployeePosition(input ChangeEmployeePositionRequest) (EmployeeAssignmentCommandResponse, error) {
	employeeID := strings.TrimSpace(input.EmployeeID)
	positionID := strings.TrimSpace(input.PositionID)
	if employeeID == "" {
		return EmployeeAssignmentCommandResponse{}, gorm.ErrRecordNotFound
	}
	if positionID == "" {
		return EmployeeAssignmentCommandResponse{}, ErrEmployeePositionRequired
	}

	var refreshed models.Employee
	var assignment models.EmployeeAssignment

	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if tx == nil {
			return gorm.ErrInvalidDB
		}
		if !serviceHasTable(tx, "employee_assignments") {
			return ErrEmployeeAssignmentsUnavailable
		}

		var current models.Employee
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", employeeID).
			First(&current).Error; err != nil {
			return err
		}

		if input.ExpectedVersion != 0 && input.ExpectedVersion != optimisticVersionFromTimestamps(current.UpdatedAt, current.CreatedAt) {
			return ErrEmployeePatchVersionConflict
		}

		var err error
		assignment, err = applyPrimaryAssignmentPosition(tx, current, stringPointer(positionID), "employee_change_position", strings.TrimSpace(input.Remarks))
		if err != nil {
			return err
		}

		if err := recordAuditEventTx(tx, audit.NewAuditEvent(
			audit.AuditEntityEmployee,
			current.ID,
			audit.AuditAction("CHANGE_POSITION"),
			audit.AuditActor{},
		).Normalize()); err != nil {
			return err
		}

		refreshed, err = loadEmployeeAggregate(tx, current.ID)
		return err
	})
	if err != nil {
		return EmployeeAssignmentCommandResponse{}, err
	}

	return EmployeeAssignmentCommandResponse{
		Employee:   MapEmployeeToListItemResponse(refreshed),
		Assignment: mapEmployeeAssignmentToResponse(assignment),
	}, nil
}

func (s *OrganizationService) ClearEmployeePosition(input ClearEmployeePositionRequest) (EmployeeAssignmentCommandResponse, error) {
	employeeID := strings.TrimSpace(input.EmployeeID)
	if employeeID == "" {
		return EmployeeAssignmentCommandResponse{}, gorm.ErrRecordNotFound
	}

	var refreshed models.Employee
	var assignment models.EmployeeAssignment

	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if tx == nil {
			return gorm.ErrInvalidDB
		}
		if !serviceHasTable(tx, "employee_assignments") {
			return ErrEmployeeAssignmentsUnavailable
		}

		var current models.Employee
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", employeeID).
			First(&current).Error; err != nil {
			return err
		}

		if input.ExpectedVersion != 0 && input.ExpectedVersion != optimisticVersionFromTimestamps(current.UpdatedAt, current.CreatedAt) {
			return ErrEmployeePatchVersionConflict
		}

		var err error
		assignment, err = applyPrimaryAssignmentPosition(tx, current, nil, "employee_clear_position", strings.TrimSpace(input.Remarks))
		if err != nil {
			return err
		}

		if err := recordAuditEventTx(tx, audit.NewAuditEvent(
			audit.AuditEntityEmployee,
			current.ID,
			audit.AuditAction("CLEAR_POSITION"),
			audit.AuditActor{},
		).Normalize()); err != nil {
			return err
		}

		refreshed, err = loadEmployeeAggregate(tx, current.ID)
		return err
	})
	if err != nil {
		return EmployeeAssignmentCommandResponse{}, err
	}

	return EmployeeAssignmentCommandResponse{
		Employee:   MapEmployeeToListItemResponse(refreshed),
		Assignment: mapEmployeeAssignmentToResponse(assignment),
	}, nil
}

func syncPrimaryAssignmentProjectionFromEmployee(tx *gorm.DB, employee models.Employee, source string, remarks string) (models.EmployeeAssignment, error) {
	if tx == nil || !serviceHasTable(tx, "employee_assignments") || strings.TrimSpace(employee.ID) == "" {
		return models.EmployeeAssignment{}, nil
	}

	assignment, err := loadOrCreatePrimaryAssignment(tx, employee)
	if err != nil {
		return models.EmployeeAssignment{}, err
	}

	assignment.OrgUnitID = nullableStringPointer(employee.DeptID)
	assignment.Status = normalizeAssignmentStatus(employee.Status)
	if strings.TrimSpace(source) != "" {
		assignment.Source = strings.TrimSpace(source)
	}
	if strings.TrimSpace(remarks) != "" {
		assignment.Remarks = strings.TrimSpace(remarks)
	}

	if err := saveEmployeeAssignment(tx, &assignment); err != nil {
		return models.EmployeeAssignment{}, err
	}

	return assignment, nil
}

func applyPrimaryAssignmentPosition(
	tx *gorm.DB,
	employee models.Employee,
	positionID *string,
	source string,
	remarks string,
) (models.EmployeeAssignment, error) {
	if tx == nil {
		return models.EmployeeAssignment{}, gorm.ErrInvalidDB
	}
	if strings.TrimSpace(employee.ID) == "" || !serviceHasTable(tx, "employee_assignments") {
		return models.EmployeeAssignment{}, nil
	}

	normalizedPositionID := cloneStringPointer(positionID)
	if normalizedPositionID != nil {
		if err := ensurePositionExistsWhenAvailable(tx, *normalizedPositionID); err != nil {
			return models.EmployeeAssignment{}, err
		}
	}

	assignment, err := loadOrCreatePrimaryAssignment(tx, employee)
	if err != nil {
		return models.EmployeeAssignment{}, err
	}

	assignment.PositionID = normalizedPositionID
	assignment.Status = normalizeAssignmentStatus(employee.Status)
	if strings.TrimSpace(source) != "" {
		assignment.Source = strings.TrimSpace(source)
	}
	if strings.TrimSpace(remarks) != "" {
		assignment.Remarks = strings.TrimSpace(remarks)
	}

	if err := saveEmployeeAssignment(tx, &assignment); err != nil {
		return models.EmployeeAssignment{}, err
	}
	if err := touchEmployeeUpdatedAt(tx, employee.ID); err != nil {
		return models.EmployeeAssignment{}, err
	}

	return assignment, nil
}

func loadEmployeeAggregate(tx *gorm.DB, employeeID string) (models.Employee, error) {
	var employee models.Employee
	if tx == nil {
		return employee, gorm.ErrInvalidDB
	}

	selectClause := "employees.*, organizations.name as dept_name, production_lines.name as line_name, process_steps.name as process_name"
	query := tx.Table("employees").
		Select(selectClause).
		Joins("LEFT JOIN organizations ON employees.dept_id = CAST(organizations.id AS TEXT)").
		Joins("LEFT JOIN production_lines ON employees.line_id = CAST(production_lines.id AS TEXT)").
		Joins("LEFT JOIN process_steps ON employees.process_id = CAST(process_steps.id AS TEXT)")

	if serviceHasTable(tx, "employee_assignments") {
		query = query.
			Select(selectClause+", employee_assignments.position_id as position_id").
			Joins("LEFT JOIN employee_assignments ON employee_assignments.employee_id = employees.id AND employee_assignments.deleted_at IS NULL AND employee_assignments.is_primary = ?", true)
		if serviceHasTable(tx, "positions") {
			query = query.
				Select(selectClause + ", employee_assignments.position_id as position_id, positions.name as position_name").
				Joins("LEFT JOIN positions ON employee_assignments.position_id = positions.id AND positions.deleted_at IS NULL")
		}
	}

	err := query.
		Where("employees.id = ?", strings.TrimSpace(employeeID)).
		First(&employee).Error
	return employee, err
}

func mapEmployeeAssignmentToResponse(model models.EmployeeAssignment) EmployeeAssignmentSnapshotResponse {
	return EmployeeAssignmentSnapshotResponse{
		AssignmentID:     model.ID,
		EmployeeID:       model.EmployeeID,
		OrgUnitID:        cloneStringPointer(model.OrgUnitID),
		PositionID:       cloneStringPointer(model.PositionID),
		ProductionUnitID: cloneStringPointer(model.ProductionUnitID),
		AssignmentType:   model.AssignmentType,
		IsPrimary:        model.IsPrimary,
		StartDate:        model.StartDate,
		EndDate:          model.EndDate,
		Status:           model.Status,
		Source:           model.Source,
		Remarks:          model.Remarks,
	}
}

func loadOrCreatePrimaryAssignment(tx *gorm.DB, employee models.Employee) (models.EmployeeAssignment, error) {
	if tx == nil {
		return models.EmployeeAssignment{}, gorm.ErrInvalidDB
	}
	if !serviceHasTable(tx, "employee_assignments") {
		return models.EmployeeAssignment{}, ErrEmployeeAssignmentsUnavailable
	}

	var assignment models.EmployeeAssignment
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("employee_id = ? AND deleted_at IS NULL AND is_primary = ?", strings.TrimSpace(employee.ID), true).
		Order("updated_at DESC").
		First(&assignment).Error
	if err == nil {
		assignment.EmployeeID = employee.ID
		assignment.IsPrimary = true
		return assignment, nil
	}
	if err != gorm.ErrRecordNotFound {
		return models.EmployeeAssignment{}, err
	}

	now := time.Now()
	return models.EmployeeAssignment{
		BaseModel:      models.BaseModel{},
		EmployeeID:     employee.ID,
		OrgUnitID:      nullableStringPointer(employee.DeptID),
		AssignmentType: "regular",
		IsPrimary:      true,
		StartDate:      now,
		Status:         normalizeAssignmentStatus(employee.Status),
		Source:         "legacy_employee_sync",
	}, nil
}

func saveEmployeeAssignment(tx *gorm.DB, assignment *models.EmployeeAssignment) error {
	if tx == nil || assignment == nil {
		return gorm.ErrInvalidDB
	}
	if strings.TrimSpace(assignment.AssignmentType) == "" {
		assignment.AssignmentType = "regular"
	}
	if assignment.StartDate.IsZero() {
		assignment.StartDate = time.Now()
	}
	if strings.TrimSpace(assignment.Status) == "" {
		assignment.Status = "active"
	}
	if strings.TrimSpace(assignment.Source) == "" {
		assignment.Source = "manual"
	}
	if strings.TrimSpace(assignment.ID) == "" {
		assignment.ID = uuid.NewString()
		return tx.Create(assignment).Error
	}
	return tx.Save(assignment).Error
}

func touchEmployeeUpdatedAt(tx *gorm.DB, employeeID string) error {
	if tx == nil {
		return gorm.ErrInvalidDB
	}

	normalizedEmployeeID := strings.TrimSpace(employeeID)
	if normalizedEmployeeID == "" {
		return nil
	}

	return tx.Model(&models.Employee{}).
		Where("id = ?", normalizedEmployeeID).
		Update("updated_at", time.Now()).Error
}

func ensureOrgUnitExistsWhenAvailable(tx *gorm.DB, orgUnitID string) error {
	if tx == nil || !serviceHasTable(tx, "org_units") {
		return nil
	}
	var count int64
	if err := tx.Model(&models.OrgUnit{}).Where("id = ?", strings.TrimSpace(orgUnitID)).Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return ErrEmployeeOrgUnitNotFound
	}
	return nil
}

func ensurePositionExistsWhenAvailable(tx *gorm.DB, positionID string) error {
	if tx == nil || !serviceHasTable(tx, "positions") {
		return nil
	}
	var count int64
	if err := tx.Model(&models.Position{}).Where("id = ?", strings.TrimSpace(positionID)).Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return ErrEmployeePositionNotFound
	}
	return nil
}

func normalizeAssignmentStatus(employeeStatus string) string {
	switch strings.ToLower(strings.TrimSpace(employeeStatus)) {
	case "active":
		return "active"
	case "on-leave", "on_leave":
		return "on_leave"
	default:
		return "inactive"
	}
}

func serviceHasTable(tx *gorm.DB, tableName string) bool {
	if tx == nil || strings.TrimSpace(tableName) == "" {
		return false
	}
	return tx.Migrator().HasTable(tableName)
}

func nullableStringPointer(value string) *string {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return nil
	}
	return &normalized
}

func stringPointer(value string) *string {
	normalized := strings.TrimSpace(value)
	return &normalized
}

func cloneStringPointer(value *string) *string {
	if value == nil {
		return nil
	}
	cloned := strings.TrimSpace(*value)
	return &cloned
}
