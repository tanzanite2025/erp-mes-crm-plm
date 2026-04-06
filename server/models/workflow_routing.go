package models

import (
	"encoding/json"
)

/**
 * StandardCommand 标准指令模板模型
 */
type StandardCommand struct {
	BaseModel
	ActionType string          `json:"actionType" gorm:"size:50"`
	BindType   string          `json:"bindType" gorm:"size:50"`
	NodeType   string          `json:"nodeType" gorm:"size:50"`
	Title      string          `json:"title" gorm:"size:255"`
	Content    string          `json:"content" gorm:"type:text"`
	TargetLink string          `json:"targetLink" gorm:"size:255"`
	Params     json.RawMessage `json:"params" gorm:"type:jsonb"`
}

func (StandardCommand) TableName() string {
	return "standard_commands"
}

/**
 * NotificationRule 通知路由规则模型
 */
type NotificationRule struct {
	BaseModel
	Name     string          `json:"name" gorm:"size:255"`
	Enabled  bool            `json:"enabled" gorm:"default:true"`
	Entity   string          `json:"entity" gorm:"size:50"`
	Segments json.RawMessage `json:"segments" gorm:"type:jsonb"`
}

func (NotificationRule) TableName() string {
	return "notification_rules"
}
