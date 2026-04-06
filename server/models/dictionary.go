package models

import (
	"encoding/json"
)

// DictGroup 字典组模型
type DictGroup struct {
	BaseModel
	Name        string `gorm:"size:100;not null" json:"name"`
	Code        string `gorm:"size:100;uniqueIndex;not null" json:"code"`
	Description string `gorm:"type:text" json:"description"`
	Active      bool   `gorm:"default:true" json:"active"`
	IsSystem    bool   `gorm:"default:false" json:"isSystem"`
}

// DictEntry 字典项模型
type DictEntry struct {
	BaseModel
	GroupID     string `gorm:"size:36;index" json:"groupId"`
	Label       string `gorm:"size:100;not null" json:"label"`
	Code        string `gorm:"size:100;uniqueIndex" json:"code"`
	Description string `gorm:"type:text" json:"description"`
	Options     json.RawMessage `gorm:"type:jsonb" json:"options"` // 存储 DictionaryOption 数组 JSON
	SortOrder   int    `gorm:"default:0" json:"sortOrder"`
	Active      bool   `gorm:"default:true" json:"active"`
	IsSystem    bool   `gorm:"default:false" json:"isSystem"`
}
