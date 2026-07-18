package middleware

import (
	"net/http"
	"strings"
	"xdfc-server/authz"

	"github.com/gin-gonic/gin"
)

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

func HasAnyPermission(c *gin.Context, required ...string) bool {
	if len(required) == 0 {
		return true // No permissions required
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

func HasAllPermissions(c *gin.Context, required ...string) bool {
	if len(required) == 0 {
		return true
	}

	rawPermissions, exists := c.Get("permissions")
	if !exists {
		return false
	}
	currentPermissionSet := make(map[string]struct{})
	for _, permission := range normalizePermissionsFromContext(rawPermissions) {
		currentPermissionSet[permission] = struct{}{}
	}
	for _, permission := range required {
		normalized := strings.ToLower(strings.TrimSpace(permission))
		if normalized == "" {
			continue
		}
		if _, exists := currentPermissionSet[normalized]; !exists {
			return false
		}
	}
	return true
}

func RequireAnyPermission(required ...string) gin.HandlerFunc {
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

func RequireAllPermissions(required ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if HasAllPermissions(c, required...) {
			c.Next()
			return
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		c.Abort()
	}
}
