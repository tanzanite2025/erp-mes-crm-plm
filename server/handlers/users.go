package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/dependencies"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
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

type UserOptionResponse struct {
	ID         string `json:"id"`
	Username   string `json:"username"`
	EmployeeID string `json:"employeeId,omitempty"`
	FirstName  string `json:"firstName,omitempty"`
	LastName   string `json:"lastName,omitempty"`
	Role       string `json:"role,omitempty"`
	Status     string `json:"status,omitempty"`
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
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	username := c.Query("username")
	statuses := c.QueryArray("status")
	roles := c.QueryArray("role")

	query := db.DB.Model(&models.User{})
	if username != "" {
		query = query.Where("username LIKE ?", "%"+username+"%")
	}
	if len(statuses) > 0 {
		normalizedStatuses := make([]string, 0, len(statuses))
		for _, status := range statuses {
			normalized := strings.ToLower(strings.TrimSpace(status))
			if normalized != "" {
				normalizedStatuses = append(normalizedStatuses, normalized)
			}
		}
		if len(normalizedStatuses) > 0 {
			query = query.Where("status IN ?", normalizedStatuses)
		}
	}
	if len(roles) > 0 {
		normalizedRoles := make([]string, 0, len(roles))
		for _, role := range roles {
			normalized := strings.TrimSpace(role)
			if normalized != "" {
				normalizedRoles = append(normalizedRoles, normalized)
			}
		}
		if len(normalizedRoles) > 0 {
			query = query.Where("role IN ?", normalizedRoles)
		}
	}

	if isOptions {
		var users []models.User
		if err := query.Find(&users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch test users"})
			return
		}

		options := make([]UserOptionResponse, 0, len(users))
		for _, user := range users {
			options = append(options, UserOptionResponse{
				ID:         user.ID,
				Username:   user.Username,
				EmployeeID: user.EmployeeID,
				FirstName:  user.FirstName,
				LastName:   user.LastName,
				Role:       user.Role,
				Status:     user.Status,
			})
		}

		c.JSON(http.StatusOK, options)
		return
	}

	var total int64
	query.Count(&total)

	var items []models.User
	if err := query.Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch paginated users"})
		return
	}

	c.JSON(http.StatusOK, UserListResponse{
		Items:    mapUsersToResponse(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// BulkSyncUsersHandler 鎵归噺鍚屾鐢ㄦ埛 (鏁版嵁鎶㈡晳)
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
				"employee_id":  u.EmployeeID,
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

	normalizedRoleID := strings.TrimSpace(req.Role)
	normalizedEmployeeID := strings.TrimSpace(req.EmployeeID)
	if normalizedRoleID == "" && normalizedEmployeeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] role cannot be empty"})
		return
	}

	if normalizedEmployeeID != "" {
		resolvedDepartmentRoleID, err := dependencies.ResolveDepartmentBoundRoleID(normalizedEmployeeID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to resolve employee department role"})
			return
		}
		if strings.TrimSpace(resolvedDepartmentRoleID) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] employee department role does not exist"})
			return
		}
		normalizedRoleID = strings.TrimSpace(resolvedDepartmentRoleID)
		req.EmployeeID = normalizedEmployeeID
	} else {
		exists, err := roleExists(normalizedRoleID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to validate role"})
			return
		}
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] role does not exist"})
			return
		}
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

	if err := db.DB.Create(&user).Error; err != nil {
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

	if err := db.DB.Model(&user).Updates(updates).Error; err != nil {
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

	if err := db.DB.Model(&user).Updates(updates).Error; err != nil {
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
