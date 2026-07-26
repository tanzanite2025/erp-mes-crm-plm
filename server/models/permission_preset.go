package models

type PermissionPreset struct {
	BaseModel
	PermissionPresetID string `gorm:"column:permission_preset_id;uniqueIndex;not null;size:100" json:"id"`
	Label              string `gorm:"size:100" json:"label"`
	Color              string `gorm:"size:255" json:"color"`
	Permissions        string `gorm:"type:text" json:"permissions"`
}

func (PermissionPreset) TableName() string {
	return "permission_presets"
}
