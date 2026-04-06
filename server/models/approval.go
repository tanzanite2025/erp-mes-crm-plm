package models

import (
	"time"
)

// ApprovalConfig 审批职责配置
// 用于定义：哪个模块的哪个动作，由谁来审批。
type ApprovalConfig struct {
	BaseModel
	Module      string `gorm:"size:50;index;not null" json:"module"` // 模块名, 如 Inventory
	Action      string `gorm:"size:50;index;not null" json:"action"` // 动作名, 如 VOID
	Approver1ID string `gorm:"type:uuid;not null" json:"approver1Id"`
	Approver1   *User  `gorm:"foreignKey:Approver1ID" json:"approver1,omitempty"`
	Approver2ID string `gorm:"type:uuid" json:"approver2Id"`         // 二级审批人 (可选)
	Approver2   *User  `gorm:"foreignKey:Approver2ID" json:"approver2,omitempty"`
	IsActive    bool   `gorm:"default:true" json:"isActive"`
	Description string `gorm:"type:text" json:"description"`
}

func (ApprovalConfig) TableName() string {
	return "approval_configs"
}

// ApprovalRequest 审批申请实例
type ApprovalRequest struct {
	BaseModel
	ConfigID    string          `gorm:"type:uuid;index;not null" json:"configId"`
	Config      *ApprovalConfig `gorm:"foreignKey:ConfigID" json:"config,omitempty"`
	RequesterID string          `gorm:"type:uuid;index;not null" json:"requesterId"`
	Requester   *User           `gorm:"foreignKey:RequesterID" json:"requester,omitempty"`
	
	TargetID    string          `gorm:"size:100;index" json:"targetId"` // 被操作的数据主键
	Reason      string          `gorm:"type:text" json:"reason"`        // 申请理由
	
	CurrentLevel int            `gorm:"default:1" json:"currentLevel"`  // 当前审批进度 1 或 2
	Status       string         `gorm:"size:50;default:'PENDING'" json:"status"` // PENDING, APPROVED_L1, APPROVED, REJECTED, EXPIRED, CONSUMED
	
	AuthCode     string         `gorm:"size:100" json:"authCode"`        // 6 位数字口令 (Hash 存储)
	ExpiresAt    *time.Time     `json:"expiresAt"`                       // 授权口令有效期
	
	Module       string         `gorm:"size:50" json:"module"`           // 冗余字段方便查询
	Action       string         `gorm:"size:50" json:"action"`           // 冗余字段方便查询
}

func (ApprovalRequest) TableName() string {
	return "approval_requests"
}
