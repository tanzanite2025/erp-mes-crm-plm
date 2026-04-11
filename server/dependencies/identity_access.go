package dependencies

import (
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type AccessRoleSource string

const (
	AccessRoleSourceUserPrimary       AccessRoleSource = "user_primary"
	AccessRoleSourceUserSecondary     AccessRoleSource = "user_secondary"
	AccessRoleSourceEmployeePrimary   AccessRoleSource = "employee_primary"
	AccessRoleSourceEmployeeSecondary AccessRoleSource = "employee_secondary"
	AccessRoleSourceOrgDefault        AccessRoleSource = "org_default"
	AccessRoleSourcePositionDefault   AccessRoleSource = "position_default"
	AccessRoleSourceLegacyDepartment  AccessRoleSource = "legacy_department"
	AccessRoleSourceLegacyUserRole    AccessRoleSource = "legacy_user_role"
)

type IdentityAccessRoleBinding struct {
	BindingID    string           `json:"bindingId,omitempty"`
	RoleID       string           `json:"roleId"`
	Source       AccessRoleSource `json:"source"`
	IsPrimary    bool             `json:"isPrimary"`
	Status       string           `json:"status,omitempty"`
	EmployeeID   string           `json:"employeeId,omitempty"`
	AssignmentID string           `json:"assignmentId,omitempty"`
	StartDate    *time.Time       `json:"startDate,omitempty"`
	EndDate      *time.Time       `json:"endDate,omitempty"`
}

type IdentityAccessSnapshot struct {
	UserID         string                      `json:"userId"`
	Username       string                      `json:"username"`
	EmployeeID     string                      `json:"employeeId,omitempty"`
	PrimaryRoleID  string                      `json:"primaryRoleId"`
	EffectiveRoles []string                    `json:"effectiveRoles"`
	Permissions    []string                    `json:"permissions"`
	RoleBindings   []IdentityAccessRoleBinding `json:"roleBindings"`
	Diagnostics    []string                    `json:"diagnostics,omitempty"`
}

type IdentityAccessService struct {
	tx              *gorm.DB
	effectiveAccess *EffectiveAccessService
}

func NewIdentityAccessService() *IdentityAccessService {
	return NewIdentityAccessServiceWithDB(db.DB)
}

func NewIdentityAccessServiceWithDB(tx *gorm.DB) *IdentityAccessService {
	return &IdentityAccessService{
		tx:              tx,
		effectiveAccess: NewEffectiveAccessServiceWithDB(tx),
	}
}

func (s *IdentityAccessService) database() *gorm.DB {
	if s != nil && s.tx != nil {
		return s.tx
	}
	return db.DB
}

func (s *IdentityAccessService) ResolveSnapshotByUserID(userID string) (IdentityAccessSnapshot, error) {
	tx := s.database()
	if tx == nil {
		return IdentityAccessSnapshot{}, gorm.ErrInvalidDB
	}

	var user models.User
	if err := tx.Select("id", "username", "role", "status", "employee_id").
		First(&user, "id = ?", strings.TrimSpace(userID)).Error; err != nil {
		return IdentityAccessSnapshot{}, err
	}

	return s.ResolveSnapshotForUser(user)
}

func (s *IdentityAccessService) ResolveSnapshotForUser(user models.User) (IdentityAccessSnapshot, error) {
	tx := s.database()
	profile := s.effectiveAccess.ResolveEffectiveAccessProfileForUser(user)
	roleBindings, err := s.collectRoleBindings(user, profile.PrimaryRoleID)
	if err != nil {
		return IdentityAccessSnapshot{}, err
	}

	snapshot := IdentityAccessSnapshot{
		UserID:         strings.TrimSpace(user.ID),
		Username:       strings.TrimSpace(user.Username),
		EmployeeID:     strings.TrimSpace(profile.EmployeeID),
		PrimaryRoleID:  strings.TrimSpace(profile.PrimaryRoleID),
		EffectiveRoles: append([]string(nil), profile.EffectiveRoles...),
		Permissions:    append([]string(nil), profile.Permissions...),
		RoleBindings:   roleBindings,
	}
	snapshot.Diagnostics = s.collectDiagnostics(tx, user, snapshot)
	return snapshot, nil
}

type accessBindingRow struct {
	BindingID    string     `gorm:"column:id"`
	RoleID       string     `gorm:"column:role_id"`
	IsPrimary    bool       `gorm:"column:is_primary"`
	Status       string     `gorm:"column:status"`
	StartDate    *time.Time `gorm:"column:start_date"`
	EndDate      *time.Time `gorm:"column:end_date"`
	AssignmentID *string    `gorm:"column:assignment_id"`
}

func (s *IdentityAccessService) collectRoleBindings(user models.User, primaryRoleID string) ([]IdentityAccessRoleBinding, error) {
	tx := s.database()
	if tx == nil {
		return nil, nil
	}

	bindings := make([]IdentityAccessRoleBinding, 0, 12)

	appendBinding := func(binding IdentityAccessRoleBinding) {
		if strings.TrimSpace(binding.RoleID) == "" {
			return
		}
		if strings.TrimSpace(binding.Status) == "" {
			binding.Status = "active"
		}
		bindings = append(bindings, binding)
	}

	userID := strings.TrimSpace(user.ID)
	if userID != "" && hasTable(tx, "user_roles") {
		var rows []accessBindingRow
		if err := tx.Table("user_roles").
			Select("id", "role_id", "is_primary", "status", "start_date", "end_date").
			Where("user_id = ?", userID).
			Where("deleted_at IS NULL").
			Where("LOWER(COALESCE(status, 'active')) = ?", "active").
			Where("(start_date IS NULL OR start_date <= CURRENT_DATE)").
			Where("(end_date IS NULL OR end_date >= CURRENT_DATE)").
			Order("is_primary DESC, updated_at DESC").
			Find(&rows).Error; err != nil {
			return nil, err
		}

		for _, row := range rows {
			appendBinding(IdentityAccessRoleBinding{
				BindingID: strings.TrimSpace(row.BindingID),
				RoleID:    strings.TrimSpace(row.RoleID),
				Source:    AccessRoleSourceUserSecondary,
				IsPrimary: row.IsPrimary,
				Status:    normalizeAccessBindingStatus(row.Status),
				StartDate: row.StartDate,
				EndDate:   row.EndDate,
			})
			if row.IsPrimary && len(bindings) > 0 {
				bindings[len(bindings)-1].Source = AccessRoleSourceUserPrimary
			}
		}
	}

	employeeRecordID, err := resolveEmployeeRecordID(tx, strings.TrimSpace(user.EmployeeID))
	if err != nil {
		return nil, err
	}
	if employeeRecordID != "" && hasTable(tx, "employee_roles") {
		var rows []accessBindingRow
		if err := tx.Table("employee_roles").
			Select("id", "role_id", "is_primary", "status", "start_date", "end_date", "assignment_id").
			Where("employee_id = ?", employeeRecordID).
			Where("deleted_at IS NULL").
			Where("LOWER(COALESCE(status, 'active')) = ?", "active").
			Where("(start_date IS NULL OR start_date <= CURRENT_DATE)").
			Where("(end_date IS NULL OR end_date >= CURRENT_DATE)").
			Order("is_primary DESC, updated_at DESC").
			Find(&rows).Error; err != nil {
			return nil, err
		}

		for _, row := range rows {
			assignmentID := ""
			if row.AssignmentID != nil {
				assignmentID = strings.TrimSpace(*row.AssignmentID)
			}
			appendBinding(IdentityAccessRoleBinding{
				BindingID:    strings.TrimSpace(row.BindingID),
				RoleID:       strings.TrimSpace(row.RoleID),
				Source:       AccessRoleSourceEmployeeSecondary,
				IsPrimary:    row.IsPrimary,
				Status:       normalizeAccessBindingStatus(row.Status),
				EmployeeID:   employeeRecordID,
				AssignmentID: assignmentID,
				StartDate:    row.StartDate,
				EndDate:      row.EndDate,
			})
			if row.IsPrimary && len(bindings) > 0 {
				bindings[len(bindings)-1].Source = AccessRoleSourceEmployeePrimary
			}
		}
	}

	if employeeRecordID != "" {
		positionIDs, orgUnitIDs := resolveAssignmentScopeIDs(tx, employeeRecordID)

		if len(positionIDs) > 0 && hasTable(tx, "position_roles") {
			var rows []struct {
				BindingID  string `gorm:"column:id"`
				RoleID     string `gorm:"column:role_id"`
				PositionID string `gorm:"column:position_id"`
			}
			if err := tx.Table("position_roles").
				Select("id", "role_id", "position_id").
				Where("position_id IN ?", positionIDs).
				Where("deleted_at IS NULL").
				Where("COALESCE(is_active, true) = true").
				Order("updated_at DESC").
				Find(&rows).Error; err != nil {
				return nil, err
			}

			for _, row := range rows {
				appendBinding(IdentityAccessRoleBinding{
					BindingID:  strings.TrimSpace(row.BindingID),
					RoleID:     strings.TrimSpace(row.RoleID),
					Source:     AccessRoleSourcePositionDefault,
					Status:     "active",
					EmployeeID: employeeRecordID,
				})
			}
		}

		if len(orgUnitIDs) > 0 && hasTable(tx, "org_default_roles") {
			var rows []struct {
				BindingID string `gorm:"column:id"`
				RoleID    string `gorm:"column:role_id"`
				OrgUnitID string `gorm:"column:org_unit_id"`
			}
			if err := tx.Table("org_default_roles").
				Select("id", "role_id", "org_unit_id").
				Where("org_unit_id IN ?", orgUnitIDs).
				Where("deleted_at IS NULL").
				Where("COALESCE(is_active, true) = true").
				Order("updated_at DESC").
				Find(&rows).Error; err != nil {
				return nil, err
			}

			for _, row := range rows {
				appendBinding(IdentityAccessRoleBinding{
					BindingID:  strings.TrimSpace(row.BindingID),
					RoleID:     strings.TrimSpace(row.RoleID),
					Source:     AccessRoleSourceOrgDefault,
					Status:     "active",
					EmployeeID: employeeRecordID,
				})
			}
		}

		for _, roleID := range resolveDepartmentRoleIDs(tx, employeeRecordID) {
			appendBinding(IdentityAccessRoleBinding{
				RoleID:     strings.TrimSpace(roleID),
				Source:     AccessRoleSourceLegacyDepartment,
				Status:     "active",
				EmployeeID: employeeRecordID,
			})
		}
	}

	legacyRoleID := strings.TrimSpace(user.Role)
	if legacyRoleID != "" {
		appendBinding(IdentityAccessRoleBinding{
			RoleID:    legacyRoleID,
			Source:    AccessRoleSourceLegacyUserRole,
			IsPrimary: false,
			Status:    normalizeAccessBindingStatus(user.Status),
		})
	}

	s.markPrimaryBinding(bindings, primaryRoleID)
	return bindings, nil
}

func (s *IdentityAccessService) markPrimaryBinding(bindings []IdentityAccessRoleBinding, primaryRoleID string) {
	normalizedPrimary := strings.ToLower(strings.TrimSpace(primaryRoleID))
	if normalizedPrimary == "" {
		return
	}

	for i := range bindings {
		if strings.EqualFold(strings.TrimSpace(bindings[i].RoleID), normalizedPrimary) && bindings[i].IsPrimary {
			return
		}
	}

	for i := range bindings {
		if strings.EqualFold(strings.TrimSpace(bindings[i].RoleID), normalizedPrimary) {
			bindings[i].IsPrimary = true
			return
		}
	}
}

func (s *IdentityAccessService) collectDiagnostics(tx *gorm.DB, user models.User, snapshot IdentityAccessSnapshot) []string {
	diagnostics := make([]string, 0, 6)
	appendDiagnostic := func(value string) {
		normalized := strings.TrimSpace(value)
		if normalized == "" {
			return
		}
		for _, existing := range diagnostics {
			if strings.EqualFold(existing, normalized) {
				return
			}
		}
		diagnostics = append(diagnostics, normalized)
	}

	employeeRef := strings.TrimSpace(user.EmployeeID)
	if employeeRef != "" {
		employeeRecordID, err := resolveEmployeeRecordID(tx, employeeRef)
		if err != nil {
			appendDiagnostic("employee_lookup_failed")
			return diagnostics
		}
		if employeeRecordID == "" {
			appendDiagnostic("user_bound_employee_missing")
		} else {
			positionIDs, orgUnitIDs := resolveAssignmentScopeIDs(tx, employeeRecordID)
			if len(positionIDs) == 0 && len(orgUnitIDs) == 0 {
				appendDiagnostic("employee_assignment_missing")
			}

			deptID, err := resolveEmployeeDeptID(tx, employeeRef)
			if err != nil {
				appendDiagnostic("employee_department_lookup_failed")
			} else if strings.TrimSpace(deptID) == "" {
				appendDiagnostic("employee_department_missing")
			}
		}
	}

	if len(snapshot.EffectiveRoles) == 0 {
		appendDiagnostic("effective_roles_empty")
	}
	if len(snapshot.Permissions) == 0 && !strings.EqualFold(strings.TrimSpace(snapshot.PrimaryRoleID), "admin") {
		appendDiagnostic("effective_permissions_empty")
	}

	return diagnostics
}

func normalizeAccessBindingStatus(status string) string {
	normalized := strings.ToLower(strings.TrimSpace(status))
	if normalized == "" {
		return "active"
	}
	return normalized
}
