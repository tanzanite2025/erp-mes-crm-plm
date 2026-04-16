package middleware

import (
	"encoding/json"
	"net/http"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

const aiPolicyConfigKey = "ai_capability_policy"

type AIPolicy struct {
	Enabled            bool     `json:"enabled"`
	AllowedPermissions []string `json:"allowedPermissions"`
	AllowedUsers       []string `json:"allowedUsers"`
}

// AIPolicyGuard enforces AI governance policy on backend.
func AIPolicyGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		permissionIDs := normalizePermissionsFromContext(mustGetContext(c, "permissions"))
		username := strings.TrimSpace(getStringContext(c, "username"))

		if hasManagePermission(permissionIDs) {
			c.Next()
			return
		}

		policy, err := loadAIPolicy()
		if err != nil {
			// 如果是非管理员，且策略加载失败，则出于安全考虑予以拦截 (Fail Loudly)
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":  "AI_POLICY_LOAD_FAILED",
				"error": "AI policy load failed",
			})
			c.Abort()
			return
		}

		if contains(policy.AllowedUsers, username) || containsAny(policy.AllowedPermissions, permissionIDs) {
			c.Next()
			return
		}

		c.JSON(http.StatusForbidden, gin.H{
			"code":  "AI_POLICY_FORBIDDEN",
			"error": "Current user is not allowed by AI governance policy",
		})
		c.Abort()
	}
}

func loadAIPolicy() (AIPolicy, error) {
	policy := AIPolicy{
		Enabled:            true,
		AllowedPermissions: []string{authz.PermissionManage},
		AllowedUsers:       []string{},
	}

	var cfg models.SystemConfig
	if err := db.DB.Where("key = ?", aiPolicyConfigKey).First(&cfg).Error; err != nil {
		return policy, nil
	}

	if strings.TrimSpace(cfg.Value) == "" {
		return policy, nil
	}

	if err := json.Unmarshal([]byte(cfg.Value), &policy); err != nil {
		return policy, err
	}

	// Normalize.
	policy.AllowedPermissions = normalize(policy.AllowedPermissions)
	policy.AllowedUsers = normalize(policy.AllowedUsers)
	return policy, nil
}

func normalize(in []string) []string {
	out := make([]string, 0, len(in))
	for _, s := range in {
		s = strings.TrimSpace(s)
		if s != "" {
			out = append(out, s)
		}
	}
	return out
}

func contains(list []string, target string) bool {
	for _, v := range list {
		if strings.EqualFold(strings.TrimSpace(v), strings.TrimSpace(target)) {
			return true
		}
	}
	return false
}

func containsAny(list []string, targets []string) bool {
	for _, target := range targets {
		if contains(list, target) {
			return true
		}
	}
	return false
}

func hasManagePermission(permissionIDs []string) bool {
	for _, permissionID := range permissionIDs {
		if authz.NormalizePermissionID(permissionID) == authz.PermissionManage {
			return true
		}
	}
	return false
}

func mustGetContext(c *gin.Context, key string) any {
	v, _ := c.Get(key)
	return v
}

func getStringContext(c *gin.Context, key string) string {
	v, ok := c.Get(key)
	if !ok || v == nil {
		return ""
	}
	switch vv := v.(type) {
	case string:
		return vv
	default:
		return ""
	}
}
