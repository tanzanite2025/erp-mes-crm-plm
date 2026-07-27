package models

import (
	"encoding/json"
	"time"
)

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

const (
	VehicleModelTemplateParseTaskStatusQueued    = "queued"
	VehicleModelTemplateParseTaskStatusRunning   = "running"
	VehicleModelTemplateParseTaskStatusSucceeded = "succeeded"
	VehicleModelTemplateParseTaskStatusFailed    = "failed"
)

type LogisticsVehicleModelTemplateParseTask struct {
	BaseModel
	TemplateID      string     `gorm:"size:100;not null;index:idx_vehicle_model_template_parse_task_template,priority:1" json:"templateId"`
	SourceAssetURL  string     `gorm:"size:512;not null" json:"sourceAssetUrl"`
	SourceAssetName string     `gorm:"size:255;not null" json:"sourceAssetName"`
	SourceFormat    string     `gorm:"size:20;not null" json:"sourceFormat"`
	TemplateVersion int        `gorm:"not null" json:"templateVersion"`
	Status          string     `gorm:"size:30;not null;index:idx_vehicle_model_template_parse_task_claim,priority:1" json:"status"`
	AttemptCount    int        `gorm:"not null;default:0" json:"attemptCount"`
	MaxAttempts     int        `gorm:"not null;default:3" json:"maxAttempts"`
	NextAttemptAt   time.Time  `gorm:"not null;index:idx_vehicle_model_template_parse_task_claim,priority:2" json:"nextAttemptAt"`
	StartedAt       *time.Time `json:"startedAt,omitempty"`
	FinishedAt      *time.Time `json:"finishedAt,omitempty"`
	LastError       string     `gorm:"type:text;not null;default:''" json:"lastError,omitempty"`
	ActorID         string     `gorm:"size:100;not null;default:''" json:"-"`
	Operator        string     `gorm:"size:255;not null;default:''" json:"-"`
	IP              string     `gorm:"size:100;not null;default:''" json:"-"`
}

func (LogisticsVehicleModelTemplateParseTask) TableName() string {
	return "logistics_vehicle_model_template_parse_tasks"
}
