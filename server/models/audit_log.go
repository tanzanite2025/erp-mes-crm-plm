package models

import (
	"encoding/json"
	"time"
)

// AuditLog 定义了新版全字段审计日志模型
type AuditLog struct {
	ID        string          `gorm:"primaryKey;type:uuid" json:"id"`
	Module    string          `gorm:"index" json:"module"`     // 模块名 (如: Production, Organization)
	TargetID  string          `gorm:"index" json:"target_id"`  // 目标对象 ID
	Action    string          `json:"action"`                  // 操作类型 (Create, Update, Delete)
	Diff      json.RawMessage `gorm:"type:jsonb" json:"diff"`  // 差异片段 (JSONB)
	Operator  string          `gorm:"index" json:"operator"`   // 操作人
	IP        string          `json:"ip"`                      // 操作 IP
	CreatedAt time.Time       `gorm:"index" json:"created_at"` // 创建时间
}
