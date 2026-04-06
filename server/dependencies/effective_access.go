package dependencies

import (
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type EffectiveAccessProfile struct {
	PrimaryRoleID  string
	EffectiveRoles []string
	Permissions    []string
	EmployeeID     string
}

type EffectiveAccessService struct{}

var menuPermissionByScopePrefix = []struct {
	prefix string
	menuID string
}{
	{prefix: "finance_management", menuID: authz.MenuSettings},
	{prefix: "system_management", menuID: authz.MenuSystem},
	{prefix: "equipment_tooling", menuID: authz.MenuEquipment},
	{prefix: "terminal_config", menuID: authz.MenuSettings},
	{prefix: "basic_settings", menuID: authz.MenuSettings},
	{prefix: "engineering_db", menuID: authz.MenuEngineering},
	{prefix: "wheel_trace", menuID: authz.MenuProdConfig},
	{prefix: "pda_shell", menuID: authz.MenuPDA},
	{prefix: "print_mgmt", menuID: authz.MenuSettings},
	{prefix: "production", menuID: authz.MenuProdConfig},
	{prefix: "piecework", menuID: authz.MenuPiecework},
	{prefix: "warehouse", menuID: authz.MenuWarehouse},
	{prefix: "trading", menuID: authz.MenuTrading},
	{prefix: "purchase", menuID: authz.MenuTrading},
	{prefix: "quality", menuID: authz.MenuQuality},
	{prefix: "approval", menuID: authz.MenuApproval},
	{prefix: "furnaces", menuID: authz.MenuEquipment},
	{prefix: "materials", menuID: authz.MenuEngineering},
	{prefix: "personnel", menuID: authz.MenuOrg},
	{prefix: "dashboard", menuID: authz.MenuDashboard},
	{prefix: "engineering", menuID: authz.MenuEngineering},
	{prefix: "experimental", menuID: authz.MenuQuality},
}

func NewEffectiveAccessService() *EffectiveAccessService {
	return &EffectiveAccessService{}
}

var defaultEffectiveAccessService = NewEffectiveAccessService()

func ResolveEffectiveAccessProfileForUser(user models.User) EffectiveAccessProfile {
	return defaultEffectiveAccessService.ResolveEffectiveAccessProfileForUser(user)
}

func ResolvePermissionsForRole(roleID string) []string {
	return resolvePermissionsForRole(roleID)
}

func ResolveDepartmentBoundRoleID(employeeID string) (string, error) {
	return resolveDepartmentBoundRoleID(employeeID)
}

func (s *EffectiveAccessService) ResolveEffectiveAccessProfileForUser(user models.User) EffectiveAccessProfile {
	explicitRoleID := strings.TrimSpace(user.Role)
	employeeID := strings.TrimSpace(user.EmployeeID)
	profile := EffectiveAccessProfile{
		PrimaryRoleID: explicitRoleID,
		EmployeeID:    employeeID,
	}

	if explicitRoleID != "" {
		profile.EffectiveRoles = appendUniqueRoleIDs(profile.EffectiveRoles, explicitRoleID)
	}

	if len(profile.EffectiveRoles) == 0 && employeeID != "" {
		profile.PrimaryRoleID = ""
	}

	profile.EffectiveRoles = appendUniqueRoleIDs(profile.EffectiveRoles, resolveDepartmentRoleIDs(employeeID)...)

	for _, roleID := range profile.EffectiveRoles {
		profile.Permissions = appendUniquePermissionIDs(profile.Permissions, resolvePermissionsForRole(roleID))
	}

	return profile
}

func resolveDepartmentRoleIDs(employeeID string) []string {
	normalizedEmployeeID := strings.TrimSpace(employeeID)
	if db.DB == nil || normalizedEmployeeID == "" {
		return nil
	}

	deptID, err := resolveEmployeeDeptID(db.DB, normalizedEmployeeID)
	if err != nil || deptID == "" {
		return nil
	}

	orgRolePrefix := buildOrgRolePrefixFromDeptID(deptID)
	if orgRolePrefix == "" {
		return nil
	}

	roleIDs, err := resolveOrgRoleFamilyIDs(db.DB, orgRolePrefix)
	if err != nil {
		return nil
	}

	return roleIDs
}

func resolveDepartmentBoundRoleID(employeeID string) (string, error) {
	normalizedEmployeeID := strings.TrimSpace(employeeID)
	if db.DB == nil || normalizedEmployeeID == "" {
		return "", nil
	}

	deptID, err := resolveEmployeeDeptID(db.DB, normalizedEmployeeID)
	if err != nil || deptID == "" {
		return "", err
	}

	orgRolePrefix := buildOrgRolePrefixFromDeptID(deptID)
	if orgRolePrefix == "" {
		return "", nil
	}

	roleIDs, err := resolveOrgRoleFamilyIDs(db.DB, orgRolePrefix)
	if err != nil {
		return "", err
	}

	for _, roleID := range roleIDs {
		if strings.EqualFold(strings.TrimSpace(roleID), orgRolePrefix) {
			return roleID, nil
		}
	}

	if len(roleIDs) > 0 {
		return roleIDs[0], nil
	}

	return "", nil
}

func resolveEmployeeDeptID(tx *gorm.DB, employeeID string) (string, error) {
	if tx == nil {
		return "", nil
	}

	var employee models.Employee
	queryByID := tx.Select("dept_id").Where("id = ?", employeeID).First(&employee)
	if queryByID.Error == nil {
		return strings.TrimSpace(employee.DeptID), nil
	}

	if queryByID.Error != nil && queryByID.Error != gorm.ErrRecordNotFound {
		return "", queryByID.Error
	}

	queryByStaffID := tx.Select("dept_id").Where("LOWER(staff_id) = ?", strings.ToLower(employeeID)).First(&employee)
	if queryByStaffID.Error == nil {
		return strings.TrimSpace(employee.DeptID), nil
	}

	if queryByStaffID.Error != nil && queryByStaffID.Error != gorm.ErrRecordNotFound {
		return "", queryByStaffID.Error
	}

	return "", nil
}

func buildOrgRolePrefixFromDeptID(deptID string) string {
	normalizedDeptID := strings.ToLower(strings.TrimSpace(deptID))
	if normalizedDeptID == "" {
		return ""
	}

	return "org_" + normalizedDeptID
}

func resolveOrgRoleFamilyIDs(tx *gorm.DB, familyPrefix string) ([]string, error) {
	if tx == nil {
		return nil, nil
	}

	normalizedPrefix := strings.ToLower(strings.TrimSpace(familyPrefix))
	if normalizedPrefix == "" {
		return nil, nil
	}

	var roles []models.Role
	if err := tx.Select("role_id").
		Where("LOWER(role_id) = ? OR LOWER(role_id) LIKE ?", normalizedPrefix, normalizedPrefix+"|%").
		Order("updated_at desc").
		Find(&roles).Error; err != nil {
		return nil, err
	}

	resolved := make([]string, 0, len(roles))
	for _, role := range roles {
		resolved = appendUniqueRoleIDs(resolved, role.RoleID)
	}

	return resolved, nil
}

func resolveRoleRecordByID(tx *gorm.DB, roleID string) (*models.Role, error) {
	normalizedRoleID := strings.TrimSpace(roleID)
	if tx == nil || normalizedRoleID == "" {
		return nil, nil
	}

	var role models.Role
	if err := tx.Where("LOWER(role_id) = ?", strings.ToLower(normalizedRoleID)).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return &role, nil
}

func resolvePermissionsForRole(roleID string) []string {
	normalizedRoleID := strings.TrimSpace(roleID)
	if normalizedRoleID == "" {
		return nil
	}

	orgRolePrefix := getOrgRoleFamilyPrefix(normalizedRoleID)

	if db.DB != nil {
		if orgRolePrefix != "" {
			if familyPermissions, err := resolveOrgRoleFamilyPermissions(db.DB, orgRolePrefix); err == nil && len(familyPermissions) > 0 {
				return expandPermissionScope(familyPermissions)
			}
		}

		var role models.Role
		if err := db.DB.Select("permissions").Where("LOWER(role_id) = ?", strings.ToLower(normalizedRoleID)).First(&role).Error; err == nil {
			parsedPermissions := authz.ParsePermissionIDs(role.Permissions)
			if len(parsedPermissions) > 0 {
				return expandPermissionScope(parsedPermissions)
			}
		}
	}

	return expandPermissionScope(fallbackPermissionsForRole(normalizedRoleID))
}

func getOrgRoleFamilyPrefix(roleID string) string {
	normalizedRoleID := strings.ToLower(strings.TrimSpace(roleID))
	if !strings.HasPrefix(normalizedRoleID, "org_") {
		return ""
	}

	if separatorIndex := strings.Index(normalizedRoleID, "|"); separatorIndex >= 0 {
		return normalizedRoleID[:separatorIndex]
	}

	return normalizedRoleID
}

func resolveOrgRoleFamilyPermissions(tx *gorm.DB, familyPrefix string) ([]string, error) {
	if tx == nil {
		return nil, nil
	}

	normalizedPrefix := strings.ToLower(strings.TrimSpace(familyPrefix))
	if normalizedPrefix == "" {
		return nil, nil
	}

	var roles []models.Role
	if err := tx.Select("permissions").
		Where("LOWER(role_id) = ? OR LOWER(role_id) LIKE ?", normalizedPrefix, normalizedPrefix+"|%").
		Order("updated_at desc").
		Find(&roles).Error; err != nil {
		return nil, err
	}

	aggregated := make([]string, 0, len(roles)*2)
	for _, role := range roles {
		aggregated = appendUniquePermissionIDs(aggregated, authz.ParsePermissionIDs(role.Permissions))
	}

	return aggregated, nil
}

func expandPermissionScope(permissionIDs []string) []string {
	expanded := appendUniquePermissionIDs(nil, permissionIDs)
	for _, permissionID := range permissionIDs {
		menuPermissionID := inferMenuPermissionFromPermissionID(permissionID)
		if menuPermissionID == "" {
			continue
		}
		expanded = appendUniquePermissionIDs(expanded, []string{menuPermissionID})
	}

	return expanded
}

func inferMenuPermissionFromPermissionID(permissionID string) string {
	normalizedPermissionID := strings.ToLower(strings.TrimSpace(permissionID))
	if normalizedPermissionID == "" {
		return ""
	}

	if strings.HasPrefix(normalizedPermissionID, "menu_") {
		return normalizedPermissionID
	}

	if strings.HasPrefix(normalizedPermissionID, "user_") || strings.HasPrefix(normalizedPermissionID, "perm_") {
		return authz.MenuSystem
	}

	resolveFromScopedID := func(scopedID string) string {
		for _, mapping := range menuPermissionByScopePrefix {
			if scopedID == mapping.prefix || strings.HasPrefix(scopedID, mapping.prefix+"_") {
				return mapping.menuID
			}
		}
		return ""
	}

	if strings.HasPrefix(normalizedPermissionID, "action_") {
		return resolveFromScopedID(strings.TrimPrefix(normalizedPermissionID, "action_"))
	}

	if strings.HasPrefix(normalizedPermissionID, "page_") {
		return resolveFromScopedID(strings.TrimPrefix(normalizedPermissionID, "page_"))
	}

	if strings.HasPrefix(normalizedPermissionID, "tab_") {
		return resolveFromScopedID(strings.TrimPrefix(normalizedPermissionID, "tab_"))
	}

	return ""
}

func fallbackPermissionsForRole(roleID string) []string {
	if strings.EqualFold(roleID, "admin") || strings.EqualFold(roleID, "superadmin") {
		return authz.AdminFallbackPermissions
	}
	return nil
}

func appendUniqueRoleIDs(existing []string, additions ...string) []string {
	seen := make(map[string]struct{}, len(existing)+len(additions))
	result := make([]string, 0, len(existing)+len(additions))

	for _, roleID := range existing {
		normalized := strings.TrimSpace(roleID)
		if normalized == "" {
			continue
		}
		key := strings.ToLower(normalized)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, normalized)
	}

	for _, roleID := range additions {
		normalized := strings.TrimSpace(roleID)
		if normalized == "" {
			continue
		}
		key := strings.ToLower(normalized)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, normalized)
	}

	return result
}

func appendUniquePermissionIDs(existing []string, additions []string) []string {
	seen := make(map[string]struct{}, len(existing)+len(additions))
	result := make([]string, 0, len(existing)+len(additions))

	appendPermission := func(permission string) {
		normalized := strings.ToLower(strings.TrimSpace(permission))
		if normalized == "" {
			return
		}
		if _, exists := seen[normalized]; exists {
			return
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}

	for _, permission := range existing {
		appendPermission(permission)
	}
	for _, permission := range additions {
		appendPermission(permission)
	}

	return result
}
