package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type UpdateUserRequest struct {
	Username           *string `json:"username"`
	Password           *string `json:"password"`
	Email              *string `json:"email"`
	PhoneNumber        *string `json:"phoneNumber"`
	FirstName          *string `json:"firstName"`
	LastName           *string `json:"lastName"`
	Status             *string `json:"status"`
	PermissionPresetID *string `json:"permissionPresetId"`
	EmployeeID         *string `json:"employeeId"`
	AdminChallenge     string  `json:"adminChallenge"`
}

type ReplaceUserRequest struct {
	Username           string `json:"username" binding:"required"`
	Password           string `json:"password"`
	PhoneNumber        string `json:"phoneNumber"`
	FirstName          string `json:"firstName"`
	LastName           string `json:"lastName"`
	Status             string `json:"status" binding:"required"`
	PermissionPresetID string `json:"permissionPresetId"`
	EmployeeID         string `json:"employeeId"`
	AdminChallenge     string `json:"adminChallenge"`
}

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
	if !canManageTargetUser(c, user.ID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] You can only modify your own account unless you have manage permissions"})
		return
	}
	if isProtectedUserAccount(user) {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Protected account cannot be modified"})
		return
	}

	updates := make(map[string]interface{})
	if input.Username != nil {
		username := strings.TrimSpace(*input.Username)
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] username cannot be empty"})
			return
		}
		if isReservedAdminUsernameChange(user.Username, username) {
			c.JSON(http.StatusConflict, gin.H{"error": "[SECURITY] admin is a reserved system username"})
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
		if !hasContextPermission(c, authz.PermissionManage) {
			c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only permission administrators can change employee bindings"})
			return
		}
		updates["employee_id"] = strings.TrimSpace(*input.EmployeeID)
	}
	if input.PermissionPresetID != nil {
		if !hasContextPermission(c, authz.PermissionManage) {
			c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only admin can manage account permission presets"})
			return
		}
		normalizedPermissionPresetID := strings.ToLower(strings.TrimSpace(*input.PermissionPresetID))
		if isAdminPermissionPresetAssignment(user.PermissionPresetID, normalizedPermissionPresetID) {
			if err := verifyCurrentUserAdminChallenge(c, input.AdminChallenge); err != nil {
				writeAdminChallengeError(c, err)
				return
			}
		}
		updates["permission_preset_id"] = normalizedPermissionPresetID
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

	updated, err := services.PatchUser(auditContextFromGin(c), id, updates)
	if err != nil {
		writeUserMutationError(c, err, "Failed to update user")
		return
	}
	c.JSON(http.StatusOK, mapUserToResponse(updated))
}

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
	if !canManageTargetUser(c, user.ID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] You can only modify your own account unless you have manage permissions"})
		return
	}
	if isProtectedUserAccount(user) {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Protected account cannot be modified"})
		return
	}

	normalizedUsername := strings.TrimSpace(input.Username)
	if normalizedUsername == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] username cannot be empty"})
		return
	}
	if isReservedAdminUsernameChange(user.Username, normalizedUsername) {
		c.JSON(http.StatusConflict, gin.H{"error": "[SECURITY] admin is a reserved system username"})
		return
	}
	normalizedStatus := strings.ToLower(strings.TrimSpace(input.Status))
	if _, ok := allowedUserStatuses[normalizedStatus]; !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid status"})
		return
	}
	normalizedPermissionPresetID := strings.ToLower(strings.TrimSpace(input.PermissionPresetID))
	if strings.TrimSpace(input.EmployeeID) != strings.TrimSpace(user.EmployeeID) && !hasContextPermission(c, authz.PermissionManage) {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only permission administrators can change employee bindings"})
		return
	}
	if normalizedPermissionPresetID != strings.ToLower(strings.TrimSpace(user.PermissionPresetID)) && !hasContextPermission(c, authz.PermissionManage) {
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Only admin can manage account permission presets"})
		return
	}
	if isAdminPermissionPresetAssignment(user.PermissionPresetID, normalizedPermissionPresetID) {
		if err := verifyCurrentUserAdminChallenge(c, input.AdminChallenge); err != nil {
			writeAdminChallengeError(c, err)
			return
		}
	}

	updates := map[string]interface{}{
		"username":             normalizedUsername,
		"phone_number":         strings.TrimSpace(input.PhoneNumber),
		"first_name":           strings.TrimSpace(input.FirstName),
		"last_name":            strings.TrimSpace(input.LastName),
		"status":               normalizedStatus,
		"permission_preset_id": strings.TrimSpace(normalizedPermissionPresetID),
		"employee_id":          strings.TrimSpace(input.EmployeeID),
	}
	if normalizedPassword := strings.TrimSpace(input.Password); normalizedPassword != "" {
		hashedPassword, err := hashUserPassword(normalizedPassword)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] password must be plain text and non-empty"})
			return
		}
		updates["password"] = hashedPassword
	}

	replaced, err := services.ReplaceUser(auditContextFromGin(c), id, updates)
	if err != nil {
		writeUserMutationError(c, err, "Failed to replace user")
		return
	}
	c.JSON(http.StatusOK, mapUserToResponse(replaced))
}

func writeUserMutationError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, services.ErrProtectedUserMutation):
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] Protected account cannot be modified"})
	case errors.Is(err, services.ErrUserEmployeeBindingTargetNotFound):
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] employee does not exist"})
	case errors.Is(err, services.ErrUserEmployeeAlreadyBound):
		c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] employee is already bound to another account"})
	case errors.Is(err, services.ErrUserUsernameConflict):
		c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] username is already in use"})
	case errors.Is(err, services.ErrAccountPermissionPresetNotFound), errors.Is(err, services.ErrAccountPermissionPresetInvalidPayload):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": fallback})
	}
}

func DeleteUserHandler(c *gin.Context) {
	id := c.Param("id")
	currentUserID := strings.TrimSpace(middleware.GetSafeUserID(c))
	if currentUserID != "" && currentUserID == strings.TrimSpace(id) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete yourself"})
		return
	}
	var user models.User
	if err := db.DB.First(&user, "id = ?", id).Error; err == nil {
		if isProtectedUserAccount(user) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete seed admin"})
			return
		}
	}

	if err := services.DeleteUser(auditContextFromGin(c), id); err != nil {
		if errors.Is(err, services.ErrProtectedUserMutation) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete protected account"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
