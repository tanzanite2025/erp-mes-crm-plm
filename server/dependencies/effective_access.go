package dependencies

import (
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type EffectiveAccessProfile struct {
	Permissions []string
	EmployeeID  string
}

type EffectiveAccessService struct {
	tx *gorm.DB
}

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

func NewEffectiveAccessServiceWithDB(tx *gorm.DB) *EffectiveAccessService {
	return &EffectiveAccessService{tx: tx}
}

var defaultEffectiveAccessService = NewEffectiveAccessService()

func ResolveEffectiveAccessProfileForUser(user models.User) EffectiveAccessProfile {
	return defaultEffectiveAccessService.ResolveEffectiveAccessProfileForUser(user)
}

func ResolveEffectiveAccessProfileForUserWithDB(tx *gorm.DB, user models.User) EffectiveAccessProfile {
	return NewEffectiveAccessServiceWithDB(tx).ResolveEffectiveAccessProfileForUser(user)
}

func ResolvePermissionsForRole(roleID string) []string {
	return resolvePermissionsForRoleWithDB(db.DB, roleID)
}

func ResolvePermissionsForRoleWithDB(tx *gorm.DB, roleID string) []string {
	return resolvePermissionsForRoleWithDB(tx, roleID)
}

func (s *EffectiveAccessService) database() *gorm.DB {
	if s != nil && s.tx != nil {
		return s.tx
	}
	return db.DB
}

func (s *EffectiveAccessService) ResolveEffectiveAccessProfileForUser(user models.User) EffectiveAccessProfile {
	tx := s.database()
	profile := EffectiveAccessProfile{
		EmployeeID:  strings.TrimSpace(user.EmployeeID),
		Permissions: []string{},
	}

	userID := strings.TrimSpace(user.ID)
	if tx == nil || userID == "" || !hasTable(tx, "user_permissions") {
		return profile
	}

	var rows []models.UserPermission
	if err := tx.Select("permission_id").
		Where("user_id = ?", userID).
		Where("deleted_at IS NULL").
		Order("permission_id asc").
		Find(&rows).Error; err != nil {
		return profile
	}

	permissionIDs := make([]string, 0, len(rows))
	for _, row := range rows {
		permissionIDs = append(permissionIDs, row.PermissionID)
	}
	profile.Permissions = authz.DeduplicatePermissionIDs(permissionIDs)
	return profile
}

func hasTable(tx *gorm.DB, tableName string) bool {
	if tx == nil || strings.TrimSpace(tableName) == "" {
		return false
	}
	return tx.Migrator().HasTable(tableName)
}

func resolveDepartmentRoleIDs(tx *gorm.DB, employeeID string) []string {
	normalizedEmployeeID := strings.TrimSpace(employeeID)
	if tx == nil || normalizedEmployeeID == "" {
		return nil
	}

	deptID, err := resolveEmployeeDeptID(tx, normalizedEmployeeID)
	if err != nil || deptID == "" {
		return nil
	}

	orgRolePrefix := buildOrgRolePrefixFromDeptID(deptID)
	if orgRolePrefix == "" {
		return nil
	}

	roleIDs, err := resolveOrgRoleFamilyIDs(tx, orgRolePrefix)
	if err != nil {
		return nil
	}

	return roleIDs
}

func resolveDepartmentBoundRoleIDWithDB(tx *gorm.DB, employeeID string) (string, error) {
	normalizedEmployeeID := strings.TrimSpace(employeeID)
	if tx == nil || normalizedEmployeeID == "" {
		return "", nil
	}

	deptID, err := resolveEmployeeDeptID(tx, normalizedEmployeeID)
	if err != nil || deptID == "" {
		return "", err
	}

	orgRolePrefix := buildOrgRolePrefixFromDeptID(deptID)
	if orgRolePrefix == "" {
		return "", nil
	}

	roleIDs, err := resolveOrgRoleFamilyIDs(tx, orgRolePrefix)
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
	if tx == nil || !hasTable(tx, "employees") {
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
	if tx == nil || !hasTable(tx, "roles") {
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
	if tx == nil || normalizedRoleID == "" || !hasTable(tx, "roles") {
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

func resolvePermissionsForRoleWithDB(tx *gorm.DB, roleID string) []string {
	normalizedRoleID := strings.TrimSpace(roleID)
	if normalizedRoleID == "" {
		return nil
	}

	orgRolePrefix := getOrgRoleFamilyPrefix(normalizedRoleID)

	if tx != nil {
		if orgRolePrefix != "" {
			if familyPermissions, err := resolveOrgRoleFamilyPermissions(tx, orgRolePrefix); err == nil && len(familyPermissions) > 0 {
				return expandPermissionScope(familyPermissions)
			}
		}

		if hasTable(tx, "roles") {
			var role models.Role
			if err := tx.Select("permissions").Where("LOWER(role_id) = ?", strings.ToLower(normalizedRoleID)).First(&role).Error; err == nil {
				parsedPermissions := authz.ParsePermissionIDs(role.Permissions)
				if len(parsedPermissions) > 0 {
					return expandPermissionScope(parsedPermissions)
				}
			}
		}
	}

	return nil
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
	if tx == nil || !hasTable(tx, "roles") {
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

func appendUniqueStringIDs(existing []string, additions ...string) []string {
	seen := make(map[string]struct{}, len(existing)+len(additions))
	result := make([]string, 0, len(existing)+len(additions))

	for _, item := range existing {
		normalized := strings.TrimSpace(item)
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

	for _, item := range additions {
		normalized := strings.TrimSpace(item)
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
