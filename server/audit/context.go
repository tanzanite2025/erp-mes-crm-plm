package audit

import (
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// FromContext 从 Gin Context 中提取审计元数据（操作人、IP）并返回一个带元数据的 GORM Session
func FromContext(c *gin.Context, db *gorm.DB) *gorm.DB {
	if c == nil || db == nil {
		return db
	}

	// 提取操作人标识 (优先取 username, 其次由鉴权中间件写入的上下文)
	operator := strings.TrimSpace(c.GetString("username"))
	if operator == "" {
		// 备选方案：尝试获取快照 ID 或其他标识
		operator = "anonymous"
	}

	ip := c.ClientIP()

	// 使用 db.Set 将审计元数据注入当前 Statement
	// 这些值会被 hooks.go 中的 db.Get 提取
	return db.Set("audit:operator", operator).Set("audit:ip", ip)
}
