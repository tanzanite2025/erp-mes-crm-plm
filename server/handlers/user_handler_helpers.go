package handlers

import (
	"errors"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/middleware"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

var allowedUserStatuses = map[string]struct{}{
	"active":    {},
	"inactive":  {},
	"suspended": {},
}

func isProtectedUserAccount(user models.User) bool {
	return user.IsSystemProtected()
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

func isAdminRolePromotion(currentRole string, requestedRole string) bool {
	return !strings.EqualFold(strings.TrimSpace(currentRole), "admin") &&
		strings.EqualFold(strings.TrimSpace(requestedRole), "admin")
}

func isReservedAdminUsernameChange(currentUsername string, requestedUsername string) bool {
	return !strings.EqualFold(strings.TrimSpace(currentUsername), "admin") &&
		strings.EqualFold(strings.TrimSpace(requestedUsername), "admin")
}
