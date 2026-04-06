package handlers

import (
	"fmt"
	"net/http"
	"reflect"
	"strings"

	"github.com/gin-gonic/gin"
)

var bulkSyncAllowedRoles = map[string]struct{}{
	"superadmin": {},
	"admin":      {},
}

func normalizeRoleFromContext(v any) string {
	switch role := v.(type) {
	case string:
		return strings.ToLower(strings.TrimSpace(role))
	case []string:
		for _, r := range role {
			if normalized := strings.ToLower(strings.TrimSpace(r)); normalized != "" {
				return normalized
			}
		}
	case []any:
		for _, r := range role {
			if normalized := normalizeRoleFromContext(r); normalized != "" {
				return normalized
			}
		}
	default:
		rv := reflect.ValueOf(v)
		if rv.IsValid() {
			return strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", v)))
		}
	}
	return ""
}

func enforceBulkSyncRole(c *gin.Context) bool {
	roleAny, _ := c.Get("role")
	role := normalizeRoleFromContext(roleAny)
	if _, ok := bulkSyncAllowedRoles[role]; ok {
		return true
	}

	c.JSON(http.StatusForbidden, gin.H{
		"error": "[SECURITY] Bulk sync requires admin role",
	})
	return false
}
