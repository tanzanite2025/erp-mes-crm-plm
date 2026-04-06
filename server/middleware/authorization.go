package middleware

import (
	"net/http"
	"strings"
	"xdfc-server/authz"

	"github.com/gin-gonic/gin"
)

func normalizeRolesFromContext(role any) []string {
	roles := make([]string, 0, 2)

	appendRole := func(value string) {
		normalized := strings.ToLower(strings.TrimSpace(value))
		if normalized != "" {
			roles = append(roles, normalized)
		}
	}

	switch v := role.(type) {
	case string:
		appendRole(v)
	case []string:
		for _, item := range v {
			appendRole(item)
		}
	case []any:
		for _, item := range v {
			if str, ok := item.(string); ok {
				appendRole(str)
			}
		}
	}

	return roles
}

func collectContextRoleIDs(c *gin.Context) []string {
	roleIDs := make([]string, 0, 4)
	seen := make(map[string]struct{})

	appendRole := func(roleID string) {
		normalized := strings.ToLower(strings.TrimSpace(roleID))
		if normalized == "" {
			return
		}
		if _, exists := seen[normalized]; exists {
			return
		}
		seen[normalized] = struct{}{}
		roleIDs = append(roleIDs, normalized)
	}

	if roleAny, exists := c.Get("role"); exists {
		for _, roleID := range normalizeRolesFromContext(roleAny) {
			appendRole(roleID)
		}
	}

	if effectiveRolesAny, exists := c.Get("effectiveRoles"); exists {
		for _, roleID := range normalizeRolesFromContext(effectiveRolesAny) {
			appendRole(roleID)
		}
	}

	return roleIDs
}

func ParsePermissionIDs(raw string) []string { return authz.ParsePermissionIDs(raw) }

func normalizePermissionsFromContext(value any) []string {
	permissions := make([]string, 0, 8)
	seen := make(map[string]struct{})

	appendPermission := func(permission string) {
		normalized := strings.ToLower(strings.TrimSpace(permission))
		if normalized == "" {
			return
		}
		if _, exists := seen[normalized]; exists {
			return
		}
		seen[normalized] = struct{}{}
		permissions = append(permissions, normalized)
	}

	switch v := value.(type) {
	case string:
		for _, permission := range ParsePermissionIDs(v) {
			appendPermission(permission)
		}
	case []string:
		for _, permission := range v {
			appendPermission(permission)
		}
	case []any:
		for _, item := range v {
			if permission, ok := item.(string); ok {
				appendPermission(permission)
			}
		}
	}

	return permissions
}

func HasAnyRole(c *gin.Context, allowed ...string) bool {
	if len(allowed) == 0 {
		return false
	}

	currentRoles := collectContextRoleIDs(c)
	for _, role := range currentRoles {
		if role == "admin" || role == "superadmin" {
			return true
		}
	}

	if len(currentRoles) == 0 {
		return false
	}

	allowedSet := make(map[string]struct{}, len(allowed))
	for _, role := range allowed {
		normalized := strings.ToLower(strings.TrimSpace(role))
		if normalized != "" {
			allowedSet[normalized] = struct{}{}
		}
	}

	for _, role := range currentRoles {
		if _, ok := allowedSet[role]; ok {
			return true
		}
	}

	return false
}

func HasAnyPermission(c *gin.Context, required ...string) bool {
	if len(required) == 0 {
		return true // No permissions required
	}

	// [SYSTEM_BYPASS] Admin automatically has all permissions
	if HasAnyRole(c, "admin", "superadmin") {
		return true
	}

	rawPermissions, exists := c.Get("permissions")
	if !exists {
		return false
	}

	currentPermissions := normalizePermissionsFromContext(rawPermissions)
	if len(currentPermissions) == 0 {
		return false
	}

	requiredSet := make(map[string]struct{}, len(required))
	for _, permission := range required {
		normalized := strings.ToLower(strings.TrimSpace(permission))
		if normalized != "" {
			requiredSet[normalized] = struct{}{}
		}
	}

	for _, permission := range currentPermissions {
		if _, ok := requiredSet[permission]; ok {
			return true
		}
	}

	return false
}

func RequireRoles(allowed ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if HasAnyRole(c, allowed...) {
			c.Next()
			return
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": "insufficient permissions",
		})
		c.Abort()
	}
}

func RequirePermissions(required ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if HasAnyPermission(c, required...) {
			c.Next()
			return
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": "insufficient permissions",
		})
		c.Abort()
	}
}
