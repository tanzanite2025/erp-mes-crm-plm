package handlers

import (
	"strings"
	"xdfc-server/authz"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/security"

	"github.com/gin-gonic/gin"
)

var allowedUserStatuses = map[string]struct{}{
	"active":    {},
	"inactive":  {},
	"suspended": {},
}

func isProtectedUserAccount(user models.User) bool {
	return user.IsSystemProtected()
}

func hashUserPassword(raw string) (string, error) {
	return security.HashNewUserPasswordWithValidation(raw)
}

func hasContextPermission(c *gin.Context, required string) bool {
	return middleware.HasAnyPermission(c, authz.NormalizePermissionID(required))
}

func canManageTargetUser(c *gin.Context, targetUserID string) bool {
	if hasContextPermission(c, authz.PermissionManage) {
		return true
	}
	currentUserID := strings.TrimSpace(middleware.GetSafeUserID(c))
	return currentUserID != "" && currentUserID == strings.TrimSpace(targetUserID)
}

func isAdminPermissionPresetAssignment(currentPermissionPresetID string, requestedPermissionPresetID string) bool {
	return !strings.EqualFold(strings.TrimSpace(currentPermissionPresetID), "admin") &&
		strings.EqualFold(strings.TrimSpace(requestedPermissionPresetID), "admin")
}

func isReservedAdminUsernameChange(currentUsername string, requestedUsername string) bool {
	return !strings.EqualFold(strings.TrimSpace(currentUsername), "admin") &&
		strings.EqualFold(strings.TrimSpace(requestedUsername), "admin")
}
