package audit

import (
	"context"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// auditContextKey 是 context 的私有键类型
type auditContextKey struct{}

var actorKey = auditContextKey{}

// NewContextWithActor 将审计身份注入 context.Context
func NewContextWithActor(parent context.Context, actor AuditActor) context.Context {
	return context.WithValue(parent, actorKey, actor.Normalize())
}

// ActorFromContext 从 context.Context 中提取审计身份
func ActorFromContext(ctx context.Context) (AuditActor, bool) {
	if ctx == nil {
		return AuditActor{}, false
	}
	actor, ok := ctx.Value(actorKey).(AuditActor)
	return actor, ok
}

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
