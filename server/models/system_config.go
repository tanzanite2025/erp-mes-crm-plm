package models

// SystemConfig stores key-value configuration for system behavior.
type SystemConfig struct {
	Key         string `gorm:"primaryKey;size:100" json:"key"`
	Value       string `gorm:"type:text" json:"value"`
	Label       string `gorm:"size:255" json:"label"`
	Description string `gorm:"type:text" json:"description"`
}

func (SystemConfig) TableName() string {
	return "system_configs"
}

