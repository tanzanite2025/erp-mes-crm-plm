package models

import "encoding/json"

type BOMSection struct {
	BaseModel
	Code        string          `gorm:"size:100;uniqueIndex;not null" json:"code"`
	Name        string          `gorm:"size:100;not null" json:"name"`
	Description string          `gorm:"type:text" json:"description"`
	IsSystem    bool            `gorm:"default:false" json:"isSystem"`
	Active      bool            `gorm:"default:true" json:"active"`
	SortOrder   int             `gorm:"default:0" json:"sortOrder"`
	IsDefault   bool            `gorm:"default:false" json:"isDefault"`
	LegacyNames json.RawMessage `gorm:"type:jsonb;not null;default:'[]'" json:"legacyNames"`
}

func (BOMSection) TableName() string {
	return "bom_sections"
}

func mustBOMSectionJSON(values []string) json.RawMessage {
	data, err := json.Marshal(values)
	if err != nil {
		panic(err)
	}
	return data
}

var DefaultBOMSections = []BOMSection{
	{
		Code:        "PREPARE",
		Name:        "备料",
		IsSystem:    true,
		Active:      true,
		SortOrder:   1,
		IsDefault:   true,
		LegacyNames: mustBOMSectionJSON([]string{"备料"}),
	},
	{
		Code:        "ROLLING",
		Name:        "卷料",
		IsSystem:    true,
		Active:      true,
		SortOrder:   2,
		LegacyNames: mustBOMSectionJSON([]string{"卷料"}),
	},
	{
		Code:        "FORMING",
		Name:        "成型",
		IsSystem:    true,
		Active:      true,
		SortOrder:   3,
		LegacyNames: mustBOMSectionJSON([]string{"成型"}),
	},
	{
		Code:        "MACHINING",
		Name:        "机加",
		IsSystem:    true,
		Active:      true,
		SortOrder:   4,
		LegacyNames: mustBOMSectionJSON([]string{"机加"}),
	},
	{
		Code:        "FINISHING",
		Name:        "精细",
		IsSystem:    true,
		Active:      true,
		SortOrder:   5,
		LegacyNames: mustBOMSectionJSON([]string{"精细"}),
	},
	{
		Code:        "COATING",
		Name:        "涂装",
		IsSystem:    true,
		Active:      true,
		SortOrder:   6,
		LegacyNames: mustBOMSectionJSON([]string{"涂装"}),
	},
	{
		Code:        "PACKAGING",
		Name:        "包装",
		IsSystem:    true,
		Active:      true,
		SortOrder:   7,
		LegacyNames: mustBOMSectionJSON([]string{"包装"}),
	},
}
