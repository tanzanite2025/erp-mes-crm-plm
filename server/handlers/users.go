package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
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
	Status      string `json:"status"`
	EmployeeID  string `json:"employeeId"`
}

var allowedUserStatuses = map[string]struct{}{
	"active":    {},
	"inactive":  {},
	"suspended": {},
}

func isProtectedUserAccount(user models.User) bool {
	return strings.EqualFold(strings.TrimSpace(user.Username), "admin")
}

func resolveEmployeeRecordIDForBinding(tx *gorm.DB, employeeRef string) (string, error) {
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

type UpdateUserRequest struct {
	Username    *string `json:"username"`
	Password    *string `json:"password"`
	Email       *string `json:"email"`
	PhoneNumber *string `json:"phoneNumber"`
	FirstName   *string `json:"firstName"`
	LastName    *string `json:"lastName"`
	Status      *string `json:"status"`
	EmployeeID  *string `json:"employeeId"`
}

type ReplaceUserRequest struct {
	Username    string `json:"username" binding:"required"`
	Password    string `json:"password"`
	PhoneNumber string `json:"phoneNumber"`
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	Status      string `json:"status" binding:"required"`
	EmployeeID  string `json:"employeeId"`
}

type BindUserEmployeeRequest struct {
	EmployeeID string `json:"employeeId" binding:"required"`
}

type BulkSyncUserRequest struct {
	ID          string `json:"id" binding:"required"`
	Username    string `json:"username"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phoneNumber"`
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
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

	normalizedStatuses := make([]string, 0, len(statuses))
	for _, status := range statuses {
		normalized := strings.ToLower(strings.TrimSpace(status))
		if normalized != "" {
			normalizedStatuses = append(normalizedStatuses, normalized)
		}
	}

	queryInput := services.UserQuery{
		Page:     page,
		PageSize: pageSize,
		Options:  isOptions,
		Username: username,
		Statuses: normalizedStatuses,
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

var errBindEmployeeTargetNotFound = errors.New("employee binding target not found")

func hasContextPermission(c *gin.Context, required string) bool {
	normalizedRequired := authz.NormalizePermissionID(required)
	if normalizedRequired == "" {
		return false
	}

	rawPermissions, exists := c.Get("permissions")
	if !exists {
		return false
	}

	match := func(value string) bool {
		return authz.NormalizePermissionID(value) == normalizedRequired
	}

	switch v := rawPermissions.(type) {
	case []string:
		for _, permissionID := range v {
			if match(permissionID) {
				return true
			}
		}
	case string:
		for _, permissionID := range authz.ParsePermissionIDs(v) {
			if match(permissionID) {
				return true
			}
		}
	case []any:
		for _, item := range v {
			if permissionID, ok := item.(string); ok && match(permissionID) {
				return true
			}
		}
	}

	return false
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

		resolvedEmployeeID, err := resolveEmployeeRecordIDForBinding(tx, employeeRef)
		if err != nil {
			return err
		}
		if strings.TrimSpace(resolvedEmployeeID) == "" {
			return errBindEmployeeTargetNotFound
		}

		if err := tx.Model(&user).Update("employee_id", employeeRef).Error; err != nil {
			return err
		}
		if err := tx.First(&updatedUser, "id = ?", userID).Error; err != nil {
			return err
		}

		return nil
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

		if err := tx.Model(&user).Update("employee_id", "").Error; err != nil {
			return err
		}
		if err := tx.First(&updatedUser, "id = ?", userID).Error; err != nil {
			return err
		}

		return nil
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
	if !enforceBulkSyncPermissions(c) {
		return
	}

	var input []BulkSyncUserRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid bulk sync payload: " + err.Error()})
		return
	}

	statusChanged := 0
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

			updates := map[string]interface{}{
				"username":     u.Username,
				"email":        u.Email,
				"phone_number": u.PhoneNumber,
				"first_name":   u.FirstName,
				"last_name":    u.LastName,
				"status":       u.Status,
				"employee_id":  strings.TrimSpace(u.EmployeeID),
			}

			if err := tx.Model(&existing).Updates(updates).Error; err != nil {
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

	normalizedEmployeeID := strings.TrimSpace(req.EmployeeID)
	req.EmployeeID = normalizedEmployeeID
	if strings.EqualFold(req.Username, "admin") && !hasContextPermission(c, authz.PermissionManage) {
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
		Status:      req.Status,
		EmployeeID:  req.EmployeeID,
	}
	if strings.TrimSpace(user.ID) == "" {
		user.ID = uuid.NewString()
	}

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		return tx.Create(&user).Error
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

	if strings.EqualFold(strings.TrimSpace(user.Username), "admin") && !hasContextPermission(c, authz.PermissionManage) {
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

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&user).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.First(&user, "id = ?", id).Error; err != nil {
			return err
		}
		return nil
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

	if strings.EqualFold(strings.TrimSpace(user.Username), "admin") && !hasContextPermission(c, authz.PermissionManage) {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only admin can manage admin roles"})
		return
	}

	normalizedUsername := strings.TrimSpace(input.Username)
	if normalizedUsername == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] username cannot be empty"})
		return
	}
	if strings.EqualFold(user.Username, "admin") && !strings.EqualFold(normalizedUsername, "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Seed admin role cannot be changed"})
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

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&user).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.First(&user, "id = ?", id).Error; err != nil {
			return err
		}
		return nil
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
