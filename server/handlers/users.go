package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/dependencies"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CreateUserRequest struct {
	Username    string `json:"username" binding:"required"`
	Password    string `json:"password" binding:"required"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phoneNumber"`
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	Role        string `json:"role"`
	Status      string `json:"status"`
	EmployeeID  string `json:"employeeId"`
}

var allowedUserStatuses = map[string]struct{}{
	"active":    {},
	"inactive":  {},
	"suspended": {},
}

func isProtectedUserAccount(user models.User) bool {
	return strings.EqualFold(strings.TrimSpace(user.Username), "admin") || strings.EqualFold(strings.TrimSpace(user.Role), "admin")
}

func roleExists(roleID string) (bool, error) {
	normalizedRoleID := strings.TrimSpace(roleID)
	if normalizedRoleID == "" {
		return false, nil
	}

	var count int64
	if err := db.DB.Model(&models.Role{}).Where("LOWER(role_id) = ?", strings.ToLower(normalizedRoleID)).Count(&count).Error; err != nil {
		return false, err
	}

	return count > 0, nil
}

const (
	accountManagedRoleSource = "from_user_account"
)

func hasTable(tx *gorm.DB, tableName string) bool {
	if tx == nil || strings.TrimSpace(tableName) == "" {
		return false
	}
	return tx.Migrator().HasTable(tableName)
}

func resolveEmployeeRecordIDForRoleBinding(tx *gorm.DB, employeeRef string) (string, error) {
	normalized := strings.TrimSpace(employeeRef)
	if tx == nil || normalized == "" {
		return "", nil
	}

	var employee models.Employee
	queryByID := tx.Select("id").Where("id = ?", normalized).First(&employee)
	if queryByID.Error == nil {
		return strings.TrimSpace(employee.ID), nil
	}
	if queryByID.Error != nil && queryByID.Error != gorm.ErrRecordNotFound {
		return "", queryByID.Error
	}

	queryByStaffID := tx.Select("id").Where("LOWER(staff_id) = ?", strings.ToLower(normalized)).First(&employee)
	if queryByStaffID.Error == nil {
		return strings.TrimSpace(employee.ID), nil
	}
	if queryByStaffID.Error != nil && queryByStaffID.Error != gorm.ErrRecordNotFound {
		return "", queryByStaffID.Error
	}

	return "", nil
}

func syncUserRoleBinding(tx *gorm.DB, user models.User) error {
	if tx == nil || !hasTable(tx, "user_roles") {
		return nil
	}

	userID := strings.TrimSpace(user.ID)
	roleID := strings.TrimSpace(user.Role)
	if userID == "" || roleID == "" {
		return nil
	}

	normalizedRoleID := strings.ToLower(roleID)

	if err := tx.Table("user_roles").
		Where("user_id = ? AND deleted_at IS NULL AND is_primary = true AND LOWER(role_id) <> ?", userID, normalizedRoleID).
		Updates(map[string]interface{}{
			"is_primary": false,
			"status":     "inactive",
			"end_date":   gorm.Expr("COALESCE(end_date, CURRENT_DATE)"),
			"updated_at": time.Now(),
		}).Error; err != nil {
		return err
	}

	var existing models.UserRole
	if err := tx.Where("user_id = ? AND LOWER(role_id) = ? AND deleted_at IS NULL", userID, normalizedRoleID).
		Order("updated_at DESC").
		First(&existing).Error; err == nil {
		return tx.Model(&existing).Updates(map[string]interface{}{
			"is_primary": true,
			"status":     "active",
			"end_date":   nil,
			"source":     accountManagedRoleSource,
			"updated_at": time.Now(),
		}).Error
	} else if err != gorm.ErrRecordNotFound {
		return err
	}

	userRole := models.UserRole{
		UserID:    userID,
		RoleID:    roleID,
		IsPrimary: true,
		StartDate: time.Now(),
		Status:    "active",
		Source:    accountManagedRoleSource,
	}
	return tx.Create(&userRole).Error
}

func deactivateAccountManagedEmployeeRoles(tx *gorm.DB, employeeRecordID string) error {
	if tx == nil || !hasTable(tx, "employee_roles") {
		return nil
	}

	normalizedEmployeeID := strings.TrimSpace(employeeRecordID)
	if normalizedEmployeeID == "" {
		return nil
	}

	return tx.Table("employee_roles").
		Where("employee_id = ? AND deleted_at IS NULL AND source = ?", normalizedEmployeeID, accountManagedRoleSource).
		Updates(map[string]interface{}{
			"is_primary": false,
			"status":     "inactive",
			"end_date":   gorm.Expr("COALESCE(end_date, CURRENT_DATE)"),
			"updated_at": time.Now(),
		}).Error
}

func syncEmployeeRoleBinding(tx *gorm.DB, previousUser *models.User, currentUser models.User) error {
	if tx == nil || !hasTable(tx, "employee_roles") {
		return nil
	}

	currentRoleID := strings.TrimSpace(currentUser.Role)
	if currentRoleID == "" {
		return nil
	}
	normalizedCurrentRoleID := strings.ToLower(currentRoleID)

	var previousEmployeeRecordID string
	if previousUser != nil {
		resolvedID, err := resolveEmployeeRecordIDForRoleBinding(tx, previousUser.EmployeeID)
		if err != nil {
			return err
		}
		previousEmployeeRecordID = strings.TrimSpace(resolvedID)
	}

	currentEmployeeRecordID, err := resolveEmployeeRecordIDForRoleBinding(tx, currentUser.EmployeeID)
	if err != nil {
		return err
	}
	currentEmployeeRecordID = strings.TrimSpace(currentEmployeeRecordID)

	if previousEmployeeRecordID != "" && previousEmployeeRecordID != currentEmployeeRecordID {
		if err := deactivateAccountManagedEmployeeRoles(tx, previousEmployeeRecordID); err != nil {
			return err
		}
	}

	if currentEmployeeRecordID == "" {
		return nil
	}

	if err := tx.Table("employee_roles").
		Where("employee_id = ? AND deleted_at IS NULL AND source = ? AND is_primary = true AND LOWER(role_id) <> ?",
			currentEmployeeRecordID, accountManagedRoleSource, normalizedCurrentRoleID).
		Updates(map[string]interface{}{
			"is_primary": false,
			"status":     "inactive",
			"end_date":   gorm.Expr("COALESCE(end_date, CURRENT_DATE)"),
			"updated_at": time.Now(),
		}).Error; err != nil {
		return err
	}

	var existing models.EmployeeRole
	if err := tx.Where("employee_id = ? AND LOWER(role_id) = ? AND deleted_at IS NULL AND source = ?",
		currentEmployeeRecordID, normalizedCurrentRoleID, accountManagedRoleSource).
		Order("updated_at DESC").
		First(&existing).Error; err == nil {
		return tx.Model(&existing).Updates(map[string]interface{}{
			"is_primary": true,
			"status":     "active",
			"end_date":   nil,
			"updated_at": time.Now(),
		}).Error
	} else if err != gorm.ErrRecordNotFound {
		return err
	}

	employeeRole := models.EmployeeRole{
		EmployeeID: currentEmployeeRecordID,
		RoleID:     currentRoleID,
		IsPrimary:  true,
		StartDate:  time.Now(),
		Status:     "active",
		Source:     accountManagedRoleSource,
	}
	return tx.Create(&employeeRole).Error
}

func syncAccountRoleBindings(tx *gorm.DB, previousUser *models.User, currentUser models.User) error {
	if err := syncUserRoleBinding(tx, currentUser); err != nil {
		return err
	}
	if err := syncEmployeeRoleBinding(tx, previousUser, currentUser); err != nil {
		return err
	}
	return nil
}

func isPrimaryRoleUniqueConflict(err error) bool {
	if err == nil {
		return false
	}

	normalized := strings.ToLower(strings.TrimSpace(err.Error()))
	if normalized == "" {
		return false
	}

	return strings.Contains(normalized, "idx_user_roles_user_primary_unique")
}

type UpdateUserRequest struct {
	Username    *string `json:"username"`
	Password    *string `json:"password"`
	Email       *string `json:"email"`
	PhoneNumber *string `json:"phoneNumber"`
	FirstName   *string `json:"firstName"`
	LastName    *string `json:"lastName"`
	Role        *string `json:"role"`
	Status      *string `json:"status"`
	EmployeeID  *string `json:"employeeId"`
}

type ReplaceUserRequest struct {
	Username    string `json:"username" binding:"required"`
	Password    string `json:"password"`
	PhoneNumber string `json:"phoneNumber"`
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	Role        string `json:"role" binding:"required"`
	Status      string `json:"status" binding:"required"`
	EmployeeID  string `json:"employeeId"`
}

type BindUserEmployeeRequest struct {
	EmployeeID string `json:"employeeId" binding:"required"`
}

type SetPrimaryRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

type UserRoleBindingItem struct {
	BindingID string     `json:"bindingId,omitempty"`
	RoleID    string     `json:"roleId"`
	RoleLabel string     `json:"roleLabel,omitempty"`
	RoleColor string     `json:"roleColor,omitempty"`
	IsPrimary bool       `json:"isPrimary"`
	Status    string     `json:"status"`
	Source    string     `json:"source,omitempty"`
	StartDate *time.Time `json:"startDate,omitempty"`
	EndDate   *time.Time `json:"endDate,omitempty"`
}

type GetUserRoleBindingsResponse struct {
	UserID         string                `json:"userId"`
	Username       string                `json:"username"`
	PrimaryRoleID  string                `json:"primaryRoleId"`
	EffectiveRoles []string              `json:"effectiveRoles"`
	RoleBindings   []UserRoleBindingItem `json:"roleBindings"`
}

type UpsertUserRoleBindingRequest struct {
	Role   string `json:"role" binding:"required"`
	Source string `json:"source"`
}

type BulkSyncUserRequest struct {
	ID          string `json:"id" binding:"required"`
	Username    string `json:"username"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phoneNumber"`
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	Role        string `json:"role"`
	Status      string `json:"status"`
	EmployeeID  string `json:"employeeId"`
}

func isLikelyBcryptHash(value string) bool {
	return strings.HasPrefix(value, "$2a$") || strings.HasPrefix(value, "$2b$") || strings.HasPrefix(value, "$2y$")
}

func hashUserPassword(raw string) (string, error) {
	plain := strings.TrimSpace(raw)
	if plain == "" {
		return "", errors.New("password cannot be empty")
	}
	if isLikelyBcryptHash(plain) {
		return "", errors.New("password must be plain text")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(plain), 11)
	if err != nil {
		return "", err
	}
	return string(hashed), nil
}

// GetUsersHandler 鑾峰彇鐢ㄦ埛鍒楄〃 (鏀寔鍒嗛〉涓庣畝鍗曟悳绱?
func GetUsersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))

	isOptions := c.Query("options") == "true"
	username := c.Query("username")
	statuses := c.QueryArray("status")
	roles := c.QueryArray("role")

	normalizedStatuses := make([]string, 0, len(statuses))
	for _, status := range statuses {
		normalized := strings.ToLower(strings.TrimSpace(status))
		if normalized != "" {
			normalizedStatuses = append(normalizedStatuses, normalized)
		}
	}

	normalizedRoles := make([]string, 0, len(roles))
	for _, role := range roles {
		normalized := strings.TrimSpace(role)
		if normalized != "" {
			normalizedRoles = append(normalizedRoles, normalized)
		}
	}

	queryInput := services.UserQuery{
		Page:     page,
		PageSize: pageSize,
		Options:  isOptions,
		Username: username,
		Statuses: normalizedStatuses,
		Roles:    normalizedRoles,
	}

	if isOptions {
		options, err := services.ListUserOptions(queryInput)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch test users"})
			return
		}

		c.JSON(http.StatusOK, options)
		return
	}

	response, err := services.ListUsers(queryInput)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch paginated users"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// BulkSyncUsersHandler 鎵归噺鍚屾鐢ㄦ埛 (鏁版嵁鎶㈡晳)
// GetUserRoleBindingsHandler returns role bindings for a specific user account.
func GetUserRoleBindingsHandler(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("id"))
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] user id is required"})
		return
	}

	var user models.User
	if err := db.DB.Select("id", "username", "role", "status", "employee_id").First(&user, "id = ?", userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user"})
		return
	}

	type bindingRow struct {
		BindingID string     `gorm:"column:id"`
		RoleID    string     `gorm:"column:role_id"`
		IsPrimary bool       `gorm:"column:is_primary"`
		Status    string     `gorm:"column:status"`
		Source    string     `gorm:"column:source"`
		StartDate *time.Time `gorm:"column:start_date"`
		EndDate   *time.Time `gorm:"column:end_date"`
		RoleLabel string     `gorm:"column:role_label"`
		RoleColor string     `gorm:"column:role_color"`
	}

	roleBindings := make([]UserRoleBindingItem, 0, 8)
	seenRoleIDs := make(map[string]struct{})

	if hasTable(db.DB, "user_roles") {
		rows := make([]bindingRow, 0, 8)
		if err := db.DB.Table("user_roles ur").
			Select("ur.id", "ur.role_id", "ur.is_primary", "ur.status", "ur.source", "ur.start_date", "ur.end_date", "r.label AS role_label", "r.color AS role_color").
			Joins("LEFT JOIN roles r ON LOWER(r.role_id) = LOWER(ur.role_id)").
			Where("ur.user_id = ? AND ur.deleted_at IS NULL", userID).
			Order("ur.is_primary DESC").
			Order("ur.updated_at DESC").
			Find(&rows).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user role bindings"})
			return
		}

		for _, row := range rows {
			normalizedRoleID := strings.TrimSpace(row.RoleID)
			if normalizedRoleID == "" {
				continue
			}

			roleKey := strings.ToLower(normalizedRoleID)
			if _, exists := seenRoleIDs[roleKey]; exists {
				continue
			}
			seenRoleIDs[roleKey] = struct{}{}

			normalizedStatus := strings.ToLower(strings.TrimSpace(row.Status))
			if normalizedStatus == "" {
				normalizedStatus = "active"
			}

			roleBindings = append(roleBindings, UserRoleBindingItem{
				BindingID: strings.TrimSpace(row.BindingID),
				RoleID:    normalizedRoleID,
				RoleLabel: strings.TrimSpace(row.RoleLabel),
				RoleColor: strings.TrimSpace(row.RoleColor),
				IsPrimary: row.IsPrimary,
				Status:    normalizedStatus,
				Source:    strings.TrimSpace(row.Source),
				StartDate: row.StartDate,
				EndDate:   row.EndDate,
			})
		}
	}

	legacyRoleID := strings.TrimSpace(user.Role)
	if legacyRoleID != "" {
		legacyRoleKey := strings.ToLower(legacyRoleID)
		if _, exists := seenRoleIDs[legacyRoleKey]; !exists {
			roleMeta := struct {
				Label string
				Color string
			}{}
			_ = db.DB.Model(&models.Role{}).
				Select("label", "color").
				Where("LOWER(role_id) = ?", legacyRoleKey).
				Take(&roleMeta).Error

			status := strings.ToLower(strings.TrimSpace(user.Status))
			if status == "" {
				status = "active"
			}

			roleBindings = append(roleBindings, UserRoleBindingItem{
				RoleID:    legacyRoleID,
				RoleLabel: strings.TrimSpace(roleMeta.Label),
				RoleColor: strings.TrimSpace(roleMeta.Color),
				IsPrimary: false,
				Status:    status,
				Source:    "from_users_role_fallback",
			})
			seenRoleIDs[legacyRoleKey] = struct{}{}
		}
	}

	accessProfile := dependencies.ResolveEffectiveAccessProfileForUser(user)
	primaryRoleID := strings.TrimSpace(accessProfile.PrimaryRoleID)

	effectiveRoles := make([]string, 0, len(accessProfile.EffectiveRoles))
	for _, roleID := range accessProfile.EffectiveRoles {
		normalizedRoleID := strings.TrimSpace(roleID)
		if normalizedRoleID != "" {
			effectiveRoles = append(effectiveRoles, normalizedRoleID)
		}
	}

	selectedPrimaryIndex := -1
	if primaryRoleID != "" {
		for i := range roleBindings {
			if strings.EqualFold(roleBindings[i].RoleID, primaryRoleID) {
				selectedPrimaryIndex = i
				break
			}
		}
	}

	if selectedPrimaryIndex < 0 {
		for i := range roleBindings {
			if roleBindings[i].IsPrimary {
				selectedPrimaryIndex = i
				break
			}
		}
	}
	if selectedPrimaryIndex < 0 && len(roleBindings) > 0 {
		selectedPrimaryIndex = 0
	}

	for i := range roleBindings {
		roleBindings[i].IsPrimary = i == selectedPrimaryIndex
	}
	if selectedPrimaryIndex >= 0 {
		primaryRoleID = roleBindings[selectedPrimaryIndex].RoleID
	}

	c.JSON(http.StatusOK, GetUserRoleBindingsResponse{
		UserID:         user.ID,
		Username:       user.Username,
		PrimaryRoleID:  primaryRoleID,
		EffectiveRoles: effectiveRoles,
		RoleBindings:   roleBindings,
	})
}

var (
	errUserRoleBindingNotFound        = errors.New("user role binding not found")
	errCannotRemovePrimaryRoleBinding = errors.New("cannot remove primary role binding")
	errBindEmployeeTargetNotFound     = errors.New("employee binding target not found")
)

func normalizeRoleBindingSource(source string) string {
	normalized := strings.TrimSpace(source)
	if normalized == "" {
		return "manual"
	}
	return normalized
}

func ensureUserRoleManagementAuthorized(c *gin.Context, user models.User, targetRoleID string) bool {
	currentRole, _ := c.Get("role")
	currentRoleID := strings.TrimSpace(fmt.Sprint(currentRole))
	if (strings.EqualFold(strings.TrimSpace(targetRoleID), "admin") || strings.EqualFold(strings.TrimSpace(user.Role), "admin")) && !strings.EqualFold(currentRoleID, "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only admin can manage admin roles"})
		return false
	}
	return true
}

func addUserSecondaryRoleBinding(tx *gorm.DB, userID string, roleID string, source string) error {
	if tx == nil || !hasTable(tx, "user_roles") {
		return nil
	}

	normalizedRoleID := strings.ToLower(strings.TrimSpace(roleID))
	if strings.TrimSpace(userID) == "" || normalizedRoleID == "" {
		return nil
	}

	now := time.Now()
	var existing models.UserRole
	if err := tx.Where("user_id = ? AND LOWER(role_id) = ? AND deleted_at IS NULL", userID, normalizedRoleID).
		Order("updated_at DESC").
		First(&existing).Error; err == nil {
		updates := map[string]interface{}{
			"status":     "active",
			"end_date":   nil,
			"updated_at": now,
		}
		if !existing.IsPrimary {
			updates["source"] = source
		}
		return tx.Model(&existing).Updates(updates).Error
	} else if err != gorm.ErrRecordNotFound {
		return err
	}

	binding := models.UserRole{
		UserID:    userID,
		RoleID:    strings.TrimSpace(roleID),
		IsPrimary: false,
		StartDate: now,
		Status:    "active",
		Source:    source,
	}
	return tx.Create(&binding).Error
}

func removeUserSecondaryRoleBinding(tx *gorm.DB, userID string, roleID string) error {
	if tx == nil || !hasTable(tx, "user_roles") {
		return errUserRoleBindingNotFound
	}

	normalizedUserID := strings.TrimSpace(userID)
	normalizedRoleID := strings.ToLower(strings.TrimSpace(roleID))
	if normalizedUserID == "" || normalizedRoleID == "" {
		return errUserRoleBindingNotFound
	}

	var primaryCount int64
	if err := tx.Table("user_roles").
		Where("user_id = ? AND deleted_at IS NULL AND LOWER(role_id) = ? AND is_primary = true", normalizedUserID, normalizedRoleID).
		Count(&primaryCount).Error; err != nil {
		return err
	}
	if primaryCount > 0 {
		return errCannotRemovePrimaryRoleBinding
	}

	result := tx.Table("user_roles").
		Where("user_id = ? AND deleted_at IS NULL AND LOWER(role_id) = ? AND is_primary = false", normalizedUserID, normalizedRoleID).
		Updates(map[string]interface{}{
			"status":     "inactive",
			"end_date":   gorm.Expr("COALESCE(end_date, CURRENT_DATE)"),
			"updated_at": time.Now(),
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errUserRoleBindingNotFound
	}
	return nil
}

func loadUserRoleBindingsResponse(userID string) (GetUserRoleBindingsResponse, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return GetUserRoleBindingsResponse{}, gorm.ErrRecordNotFound
	}

	var user models.User
	if err := db.DB.Select("id", "username", "role", "status", "employee_id").First(&user, "id = ?", normalizedUserID).Error; err != nil {
		return GetUserRoleBindingsResponse{}, err
	}

	type bindingRow struct {
		BindingID string     `gorm:"column:id"`
		RoleID    string     `gorm:"column:role_id"`
		IsPrimary bool       `gorm:"column:is_primary"`
		Status    string     `gorm:"column:status"`
		Source    string     `gorm:"column:source"`
		StartDate *time.Time `gorm:"column:start_date"`
		EndDate   *time.Time `gorm:"column:end_date"`
		RoleLabel string     `gorm:"column:role_label"`
		RoleColor string     `gorm:"column:role_color"`
	}

	roleBindings := make([]UserRoleBindingItem, 0, 8)
	seenRoleIDs := make(map[string]struct{})

	if hasTable(db.DB, "user_roles") {
		rows := make([]bindingRow, 0, 8)
		if err := db.DB.Table("user_roles ur").
			Select("ur.id", "ur.role_id", "ur.is_primary", "ur.status", "ur.source", "ur.start_date", "ur.end_date", "r.label AS role_label", "r.color AS role_color").
			Joins("LEFT JOIN roles r ON LOWER(r.role_id) = LOWER(ur.role_id)").
			Where("ur.user_id = ? AND ur.deleted_at IS NULL", normalizedUserID).
			Order("ur.is_primary DESC").
			Order("ur.updated_at DESC").
			Find(&rows).Error; err != nil {
			return GetUserRoleBindingsResponse{}, err
		}

		for _, row := range rows {
			normalizedRoleID := strings.TrimSpace(row.RoleID)
			if normalizedRoleID == "" {
				continue
			}

			roleKey := strings.ToLower(normalizedRoleID)
			if _, exists := seenRoleIDs[roleKey]; exists {
				continue
			}
			seenRoleIDs[roleKey] = struct{}{}

			normalizedStatus := strings.ToLower(strings.TrimSpace(row.Status))
			if normalizedStatus == "" {
				normalizedStatus = "active"
			}

			roleBindings = append(roleBindings, UserRoleBindingItem{
				BindingID: strings.TrimSpace(row.BindingID),
				RoleID:    normalizedRoleID,
				RoleLabel: strings.TrimSpace(row.RoleLabel),
				RoleColor: strings.TrimSpace(row.RoleColor),
				IsPrimary: row.IsPrimary,
				Status:    normalizedStatus,
				Source:    strings.TrimSpace(row.Source),
				StartDate: row.StartDate,
				EndDate:   row.EndDate,
			})
		}
	}

	legacyRoleID := strings.TrimSpace(user.Role)
	if legacyRoleID != "" {
		legacyRoleKey := strings.ToLower(legacyRoleID)
		if _, exists := seenRoleIDs[legacyRoleKey]; !exists {
			roleMeta := struct {
				Label string
				Color string
			}{}
			_ = db.DB.Model(&models.Role{}).
				Select("label", "color").
				Where("LOWER(role_id) = ?", legacyRoleKey).
				Take(&roleMeta).Error

			status := strings.ToLower(strings.TrimSpace(user.Status))
			if status == "" {
				status = "active"
			}

			roleBindings = append(roleBindings, UserRoleBindingItem{
				RoleID:    legacyRoleID,
				RoleLabel: strings.TrimSpace(roleMeta.Label),
				RoleColor: strings.TrimSpace(roleMeta.Color),
				IsPrimary: false,
				Status:    status,
				Source:    "from_users_role_fallback",
			})
			seenRoleIDs[legacyRoleKey] = struct{}{}
		}
	}

	accessProfile := dependencies.ResolveEffectiveAccessProfileForUser(user)
	primaryRoleID := strings.TrimSpace(accessProfile.PrimaryRoleID)

	effectiveRoles := make([]string, 0, len(accessProfile.EffectiveRoles))
	for _, roleID := range accessProfile.EffectiveRoles {
		normalizedRoleID := strings.TrimSpace(roleID)
		if normalizedRoleID != "" {
			effectiveRoles = append(effectiveRoles, normalizedRoleID)
		}
	}

	selectedPrimaryIndex := -1
	if primaryRoleID != "" {
		for i := range roleBindings {
			if strings.EqualFold(roleBindings[i].RoleID, primaryRoleID) {
				selectedPrimaryIndex = i
				break
			}
		}
	}

	if selectedPrimaryIndex < 0 {
		for i := range roleBindings {
			if roleBindings[i].IsPrimary {
				selectedPrimaryIndex = i
				break
			}
		}
	}
	if selectedPrimaryIndex < 0 && len(roleBindings) > 0 {
		selectedPrimaryIndex = 0
	}

	for i := range roleBindings {
		roleBindings[i].IsPrimary = i == selectedPrimaryIndex
	}
	if selectedPrimaryIndex >= 0 {
		primaryRoleID = roleBindings[selectedPrimaryIndex].RoleID
	}

	return GetUserRoleBindingsResponse{
		UserID:         user.ID,
		Username:       user.Username,
		PrimaryRoleID:  primaryRoleID,
		EffectiveRoles: effectiveRoles,
		RoleBindings:   roleBindings,
	}, nil
}

// AddUserRoleBindingHandler adds or re-activates a non-primary role binding for user.
func AddUserRoleBindingHandler(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("id"))
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] user id is required"})
		return
	}

	var input UpsertUserRoleBindingRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	normalizedRoleID := strings.TrimSpace(input.Role)
	if normalizedRoleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] role cannot be empty"})
		return
	}

	var user models.User
	if err := db.DB.Select("id", "username", "role", "status", "employee_id").First(&user, "id = ?", userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user"})
		return
	}

	if !ensureUserRoleManagementAuthorized(c, user, normalizedRoleID) {
		return
	}

	exists, err := roleExists(normalizedRoleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to validate role"})
		return
	}
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] role does not exist"})
		return
	}

	source := normalizeRoleBindingSource(input.Source)
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		var lockedUser models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Select("id").First(&lockedUser, "id = ?", userID).Error; err != nil {
			return err
		}
		return addUserSecondaryRoleBinding(tx, lockedUser.ID, normalizedRoleID, source)
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add user role binding"})
		return
	}

	response, err := loadUserRoleBindingsResponse(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user role bindings"})
		return
	}
	c.JSON(http.StatusOK, response)
}

// RemoveUserRoleBindingHandler deactivates a non-primary role binding.
func RemoveUserRoleBindingHandler(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("id"))
	roleID := strings.TrimSpace(c.Param("roleId"))
	if userID == "" || roleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] user id and role id are required"})
		return
	}

	var user models.User
	if err := db.DB.Select("id", "username", "role", "status", "employee_id").First(&user, "id = ?", userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user"})
		return
	}

	if !ensureUserRoleManagementAuthorized(c, user, roleID) {
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var lockedUser models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Select("id").First(&lockedUser, "id = ?", userID).Error; err != nil {
			return err
		}
		return removeUserSecondaryRoleBinding(tx, lockedUser.ID, roleID)
	})
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		case errors.Is(err, errCannotRemovePrimaryRoleBinding):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] cannot remove primary role binding"})
			return
		case errors.Is(err, errUserRoleBindingNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "User role binding not found"})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove user role binding"})
			return
		}
	}

	response, err := loadUserRoleBindingsResponse(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user role bindings"})
		return
	}
	c.JSON(http.StatusOK, response)
}

// BindUserEmployeeHandler binds an account to an employee identity and synchronizes mirrored role bindings.
func BindUserEmployeeHandler(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("id"))
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] user id is required"})
		return
	}

	var input BindUserEmployeeRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employeeRef := strings.TrimSpace(input.EmployeeID)
	if employeeRef == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] employeeId cannot be empty"})
		return
	}

	var updatedUser models.User
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, "id = ?", userID).Error; err != nil {
			return err
		}

		resolvedEmployeeID, err := resolveEmployeeRecordIDForRoleBinding(tx, employeeRef)
		if err != nil {
			return err
		}
		if strings.TrimSpace(resolvedEmployeeID) == "" {
			return errBindEmployeeTargetNotFound
		}

		previousUser := user
		if err := tx.Model(&user).Update("employee_id", employeeRef).Error; err != nil {
			return err
		}
		if err := tx.First(&updatedUser, "id = ?", userID).Error; err != nil {
			return err
		}

		return syncAccountRoleBindings(tx, &previousUser, updatedUser)
	})
	if err != nil {
		switch {
		case errors.Is(err, errBindEmployeeTargetNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] employee does not exist"})
			return
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to bind employee"})
			return
		}
	}

	c.JSON(http.StatusOK, mapUserToResponse(updatedUser))
}

// UnbindUserEmployeeHandler unbinds an account from an employee identity and deactivates mirrored employee bindings.
func UnbindUserEmployeeHandler(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("id"))
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] user id is required"})
		return
	}

	var updatedUser models.User
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, "id = ?", userID).Error; err != nil {
			return err
		}

		previousUser := user
		if err := tx.Model(&user).Update("employee_id", "").Error; err != nil {
			return err
		}
		if err := tx.First(&updatedUser, "id = ?", userID).Error; err != nil {
			return err
		}

		return syncAccountRoleBindings(tx, &previousUser, updatedUser)
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unbind employee"})
		return
	}

	c.JSON(http.StatusOK, mapUserToResponse(updatedUser))
}

func BulkSyncUsersHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var input []BulkSyncUserRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid bulk sync payload: " + err.Error()})
		return
	}

	roleChanged := 0
	statusChanged := 0
	roleSamples := make([]string, 0, 5)
	statusSamples := make([]string, 0, 5)

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, u := range input {
			var existing models.User
			if err := tx.First(&existing, "id = ?", u.ID).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					return fmt.Errorf("user not found: %s", u.ID)
				}
				return err
			}

			if isProtectedUserAccount(existing) {
				continue
			}
			if existing.Status != u.Status {
				statusChanged++
				if len(statusSamples) < 5 {
					statusSamples = append(statusSamples, fmt.Sprintf("%s:%s->%s", existing.ID, existing.Status, u.Status))
				}
			}

			resolvedRoleID := strings.TrimSpace(u.Role)
			if existing.Role != resolvedRoleID {
				roleChanged++
				if len(roleSamples) < 5 {
					roleSamples = append(roleSamples, fmt.Sprintf("%s:%s->%s", existing.ID, existing.Role, resolvedRoleID))
				}
			}

			updates := map[string]interface{}{
				"username":     u.Username,
				"email":        u.Email,
				"phone_number": u.PhoneNumber,
				"first_name":   u.FirstName,
				"last_name":    u.LastName,
				"role":         resolvedRoleID,
				"status":       u.Status,
				"employee_id":  strings.TrimSpace(u.EmployeeID),
			}

			if err := tx.Model(&existing).Updates(updates).Error; err != nil {
				return err
			}

			var refreshed models.User
			if err := tx.First(&refreshed, "id = ?", existing.ID).Error; err != nil {
				return err
			}
			if err := syncAccountRoleBindings(tx, &existing, refreshed); err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_SYNC_FAILED] bulk sync users failed, rolled back: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(input)})
}
func CreateUserHandler(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "账户标识不能为空"})
		return
	}

	normalizedRoleID := strings.TrimSpace(req.Role)
	normalizedEmployeeID := strings.TrimSpace(req.EmployeeID)
	req.EmployeeID = normalizedEmployeeID

	// V2 behavior:
	// 1) Explicit role is the source of truth and must be valid.
	// 2) When explicit role is absent and employee is bound, fallback to department default role.
	// 3) Keep hard validation that a persisted account role cannot be blank.
	if normalizedRoleID != "" {
		exists, err := roleExists(normalizedRoleID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to validate role"})
			return
		}
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] role does not exist"})
			return
		}
	} else if normalizedEmployeeID != "" {
		resolvedDepartmentRoleID, err := dependencies.ResolveDepartmentBoundRoleID(normalizedEmployeeID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to resolve employee department role"})
			return
		}
		normalizedRoleID = strings.TrimSpace(resolvedDepartmentRoleID)
	}

	if normalizedRoleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] role cannot be empty"})
		return
	}

	req.Role = normalizedRoleID

	// 权限保护：非管理员禁止创建管理员
	currentRole, _ := c.Get("role")
	if req.Role == "admin" && currentRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only admin can create admin accounts"})
		return
	}

	// --- [23505_FIX] 唯一键冲突预处理 ---
	var existing models.User
	if err := db.DB.Unscoped().Where("LOWER(username) = ?", strings.ToLower(req.Username)).First(&existing).Error; err == nil {
		if existing.DeletedAt.Valid {
			if err := db.DB.Unscoped().Delete(&existing).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "[DB_CLEANUP_FAILED] 无法清理冲突的存档账户数据"})
				return
			}
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("账户标识 '%s' 已被占用", req.Username)})
			return
		}
	}

	hashedPassword, err := hashUserPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] password must be plain text and non-empty"})
		return
	}

	user := models.User{
		Username:    req.Username,
		Password:    hashedPassword,
		Email:       req.Email,
		PhoneNumber: req.PhoneNumber,
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		Role:        req.Role,
		Status:      req.Status,
		EmployeeID:  req.EmployeeID,
	}
	if strings.TrimSpace(user.ID) == "" {
		user.ID = uuid.NewString()
	}

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		return syncAccountRoleBindings(tx, nil, user)
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, mapUserToResponse(user))
}

// PatchUserHandler 鏇存柊鐢ㄦ埛淇℃伅
func PatchUserHandler(c *gin.Context) {
	id := c.Param("id")
	var input UpdateUserRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// 安全保护：非管理员禁止管理 admin 角色账户
	currentRole, _ := c.Get("role")
	targetRole := strings.TrimSpace(user.Role)
	if input.Role != nil {
		targetRole = strings.TrimSpace(*input.Role)
	}
	if (strings.EqualFold(targetRole, "admin") || strings.EqualFold(strings.TrimSpace(user.Role), "admin")) && currentRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only admin can manage admin roles"})
		return
	}

	updates := make(map[string]interface{})

	if input.Username != nil {
		username := strings.TrimSpace(*input.Username)
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] username cannot be empty"})
			return
		}
		updates["username"] = username
	}

	if input.Email != nil {
		updates["email"] = strings.TrimSpace(*input.Email)
	}

	if input.PhoneNumber != nil {
		updates["phone_number"] = strings.TrimSpace(*input.PhoneNumber)
	}

	if input.FirstName != nil {
		updates["first_name"] = strings.TrimSpace(*input.FirstName)
	}

	if input.LastName != nil {
		updates["last_name"] = strings.TrimSpace(*input.LastName)
	}

	if input.EmployeeID != nil {
		updates["employee_id"] = strings.TrimSpace(*input.EmployeeID)
	}

	if input.Role != nil {
		normalizedRoleID := strings.TrimSpace(*input.Role)
		if normalizedRoleID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] role cannot be empty"})
			return
		}

		if strings.EqualFold(user.Username, "admin") && !strings.EqualFold(normalizedRoleID, "admin") {
			c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Seed admin role cannot be changed"})
			return
		}

		exists, err := roleExists(normalizedRoleID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to validate role"})
			return
		}
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] role does not exist"})
			return
		}

		updates["role"] = normalizedRoleID
	}

	if input.Status != nil {
		normalizedStatus := strings.ToLower(strings.TrimSpace(*input.Status))
		if _, ok := allowedUserStatuses[normalizedStatus]; !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid status"})
			return
		}
		updates["status"] = normalizedStatus
	}

	if input.Password != nil {
		normalizedPassword := strings.TrimSpace(*input.Password)
		if normalizedPassword != "" {
			hashedPassword, err := hashUserPassword(normalizedPassword)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] password must be plain text and non-empty"})
				return
			}
			updates["password"] = hashedPassword
		}
	}

	if len(updates) == 0 {
		c.JSON(http.StatusOK, mapUserToResponse(user))
		return
	}

	previousUser := user
	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&user).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.First(&user, "id = ?", id).Error; err != nil {
			return err
		}
		return syncAccountRoleBindings(tx, &previousUser, user)
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	if err := db.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated user"})
		return
	}

	c.JSON(http.StatusOK, mapUserToResponse(user))
}

// ReplaceUserHandler 鏇存柊鐢ㄦ埛淇℃伅 (完整替换语义)
func ReplaceUserHandler(c *gin.Context) {
	id := c.Param("id")
	var input ReplaceUserRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	currentRole, _ := c.Get("role")
	normalizedRoleID := strings.TrimSpace(input.Role)
	if normalizedRoleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] role cannot be empty"})
		return
	}
	if (strings.EqualFold(normalizedRoleID, "admin") || strings.EqualFold(strings.TrimSpace(user.Role), "admin")) && currentRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only admin can manage admin roles"})
		return
	}
	if strings.EqualFold(user.Username, "admin") && !strings.EqualFold(normalizedRoleID, "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Seed admin role cannot be changed"})
		return
	}

	exists, err := roleExists(normalizedRoleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to validate role"})
		return
	}
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] role does not exist"})
		return
	}

	normalizedUsername := strings.TrimSpace(input.Username)
	if normalizedUsername == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] username cannot be empty"})
		return
	}

	normalizedStatus := strings.ToLower(strings.TrimSpace(input.Status))
	if _, ok := allowedUserStatuses[normalizedStatus]; !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid status"})
		return
	}

	updates := map[string]interface{}{
		"username":     normalizedUsername,
		"phone_number": strings.TrimSpace(input.PhoneNumber),
		"first_name":   strings.TrimSpace(input.FirstName),
		"last_name":    strings.TrimSpace(input.LastName),
		"role":         normalizedRoleID,
		"status":       normalizedStatus,
		"employee_id":  strings.TrimSpace(input.EmployeeID),
	}

	normalizedPassword := strings.TrimSpace(input.Password)
	if normalizedPassword != "" {
		hashedPassword, err := hashUserPassword(normalizedPassword)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] password must be plain text and non-empty"})
			return
		}
		updates["password"] = hashedPassword
	}

	previousUser := user
	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&user).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.First(&user, "id = ?", id).Error; err != nil {
			return err
		}
		return syncAccountRoleBindings(tx, &previousUser, user)
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to replace user"})
		return
	}

	if err := db.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load replaced user"})
		return
	}

	c.JSON(http.StatusOK, mapUserToResponse(user))
}

// SetUserPrimaryRoleHandler switches user's primary role with transactional role-binding sync.
func SetUserPrimaryRoleHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] user id is required"})
		return
	}

	var input SetPrimaryRoleRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	normalizedRoleID := strings.TrimSpace(input.Role)
	if normalizedRoleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] role cannot be empty"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user"})
		return
	}

	currentRole, _ := c.Get("role")
	currentRoleID := strings.TrimSpace(fmt.Sprint(currentRole))
	if (strings.EqualFold(normalizedRoleID, "admin") || strings.EqualFold(strings.TrimSpace(user.Role), "admin")) && !strings.EqualFold(currentRoleID, "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only admin can manage admin roles"})
		return
	}
	if strings.EqualFold(user.Username, "admin") && !strings.EqualFold(normalizedRoleID, "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Seed admin role cannot be changed"})
		return
	}

	exists, err := roleExists(normalizedRoleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to validate role"})
		return
	}
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] role does not exist"})
		return
	}

	err = db.DB.Transaction(func(tx *gorm.DB) error {
		var lockedUser models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&lockedUser, "id = ?", id).Error; err != nil {
			return err
		}

		previousUser := lockedUser
		if err := tx.Model(&lockedUser).Update("role", normalizedRoleID).Error; err != nil {
			return err
		}
		if err := tx.First(&lockedUser, "id = ?", id).Error; err != nil {
			return err
		}

		return syncAccountRoleBindings(tx, &previousUser, lockedUser)
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		if isPrimaryRoleUniqueConflict(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] user already has a primary role"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to switch primary role"})
		return
	}

	if err := db.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated user"})
		return
	}

	c.JSON(http.StatusOK, mapUserToResponse(user))
}

// DeleteUserHandler 鍒犻櫎鐢ㄦ埛
func DeleteUserHandler(c *gin.Context) {
	id := c.Param("id")

	// 绂佹鍒犻櫎鑷韩 (闇€缁撳悎 Context)
	currentUsername, _ := c.Get("username")
	var user models.User
	if err := db.DB.First(&user, "id = ?", id).Error; err == nil {
		if user.Username == currentUsername {
			c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete yourself"})
			return
		}
		if user.Username == "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete seed admin"})
			return
		}
	}

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		return tx.Delete(&models.User{}, "id = ?", id).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
