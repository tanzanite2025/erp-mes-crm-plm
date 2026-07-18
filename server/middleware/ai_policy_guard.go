package middleware

import (
	"net/http"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

const aiPolicyContextKey = "aiPolicy"
const aiRoutePermissionHeader = "X-AI-Route-Permission"

func AIPolicyFromContext(c *gin.Context) (services.AIPolicy, bool) {
	value, exists := c.Get(aiPolicyContextKey)
	if !exists {
		return services.AIPolicy{}, false
	}
	policy, ok := value.(services.AIPolicy)
	return policy, ok
}

func policyContainsPermission(policy services.AIPolicy, permissionID string) bool {
	normalized := authz.NormalizePermissionID(permissionID)
	if normalized == "" {
		return false
	}
	for _, allowedPermissionID := range policy.AllowedPermissions {
		if authz.NormalizePermissionID(allowedPermissionID) == normalized {
			return true
		}
	}
	return false
}

// AIPolicyGuard enforces the global switch and route-level AI capability policy.
func AIPolicyGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		policy, err := services.LoadAIPolicy(db.DB)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":  "AI_POLICY_LOAD_FAILED",
				"error": "AI policy load failed",
			})
			c.Abort()
			return
		}
		if !policy.Enabled {
			c.JSON(http.StatusForbidden, gin.H{
				"code":  "AI_CAPABILITY_DISABLED",
				"error": "AI capability is globally disabled",
			})
			c.Abort()
			return
		}

		c.Set(aiPolicyContextKey, policy)
		if HasAnyPermission(c, authz.PermissionManage) {
			c.Next()
			return
		}

		routePermissionID := authz.NormalizePermissionID(c.GetHeader(aiRoutePermissionHeader))
		if strings.HasPrefix(routePermissionID, "page_") || strings.HasPrefix(routePermissionID, "tab_") {
			if authz.IsSupportedPermissionID(routePermissionID) && policyContainsPermission(policy, routePermissionID) {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"code":  "AI_POLICY_FORBIDDEN",
			"error": "AI capability is not enabled for the current route",
		})
		c.Abort()
	}
}
