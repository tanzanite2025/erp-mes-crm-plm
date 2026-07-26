package models

import "encoding/json"

type LogisticsVehicleModelTemplate struct {
	BaseModel
	SeedVehicleSpecID  string          `gorm:"size:100;not null;index:idx_vehicle_model_template_seed_name,priority:1;uniqueIndex:uniq_vehicle_model_template_seed_name,priority:1" json:"seedVehicleSpecId"`
	Name               string          `gorm:"size:255;not null;index:idx_vehicle_model_template_seed_name,priority:2;uniqueIndex:uniq_vehicle_model_template_seed_name,priority:2" json:"name"`
	SourceAssetURL     string          `gorm:"size:512;not null" json:"sourceAssetUrl"`
	SourceAssetName    string          `gorm:"size:255;not null" json:"sourceAssetName"`
	SourceFormat       string          `gorm:"size:20;not null" json:"sourceFormat"`
	Status             string          `gorm:"size:30;not null;index" json:"status"`
	NormalizedLengthMm int             `gorm:"not null;default:0" json:"normalizedLengthMm"`
	NormalizedWidthMm  int             `gorm:"not null;default:0" json:"normalizedWidthMm"`
	NormalizedHeightMm int             `gorm:"not null;default:0" json:"normalizedHeightMm"`
	Version            int             `gorm:"not null;default:1" json:"version"`
	Notes              json.RawMessage `gorm:"type:jsonb;not null;default:'[]'" json:"notes"`
}

func (LogisticsVehicleModelTemplate) TableName() string {
	return "logistics_vehicle_model_templates"
}

type LogisticsVehicleModelTemplateVersion struct {
	BaseModel
	TemplateID         string          `gorm:"size:100;not null;index;uniqueIndex:uniq_vehicle_model_template_version_number,priority:1" json:"templateId"`
	Version            int             `gorm:"not null;uniqueIndex:uniq_vehicle_model_template_version_number,priority:2" json:"version"`
	SeedVehicleSpecID  string          `gorm:"size:100;not null;index" json:"seedVehicleSpecId"`
	Name               string          `gorm:"size:255;not null" json:"name"`
	SourceAssetURL     string          `gorm:"size:512;not null" json:"sourceAssetUrl"`
	SourceAssetName    string          `gorm:"size:255;not null" json:"sourceAssetName"`
	SourceFormat       string          `gorm:"size:20;not null" json:"sourceFormat"`
	Status             string          `gorm:"size:30;not null;index" json:"status"`
	NormalizedLengthMm int             `gorm:"not null;default:0" json:"normalizedLengthMm"`
	NormalizedWidthMm  int             `gorm:"not null;default:0" json:"normalizedWidthMm"`
	NormalizedHeightMm int             `gorm:"not null;default:0" json:"normalizedHeightMm"`
	Notes              json.RawMessage `gorm:"type:jsonb;not null;default:'[]'" json:"notes"`
	Snapshot           json.RawMessage `gorm:"type:jsonb;not null;default:'{}'" json:"snapshot"`
}

func (LogisticsVehicleModelTemplateVersion) TableName() string {
	return "logistics_vehicle_model_template_versions"
}
