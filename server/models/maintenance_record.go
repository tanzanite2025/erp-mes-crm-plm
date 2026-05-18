package models

import (
	"time"

	"gorm.io/gorm"
)

// MaintenanceRecord 设备维保记录模型
type MaintenanceRecord struct {
	ID          string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	AssetType   string         `gorm:"size:50;not null;index:idx_mr_asset" json:"assetType"`   // 'MOLD', 'FURNACE'
	AssetID     string         `gorm:"type:uuid;not null;index:idx_mr_asset" json:"assetId"`
	AssetSN     string         `gorm:"size:100" json:"assetSn"`
	Type        string         `gorm:"size:50;not null" json:"type"`         // 'PREVENTIVE', 'CORRECTIVE', 'INSPECTION'
	Status      string         `gorm:"size:50;default:'OPEN'" json:"status"` // 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
	Title       string         `gorm:"size:255;not null" json:"title"`
	Description string         `gorm:"type:text" json:"description"`
	Priority    string         `gorm:"size:20;default:'MEDIUM'" json:"priority"` // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
	StartedAt   *time.Time     `json:"startedAt"`
	CompletedAt *time.Time     `json:"completedAt"`
	Cost        float64        `gorm:"default:0" json:"cost"`
	Remarks     string         `gorm:"type:text" json:"remarks"`
	CreatedBy   string         `gorm:"size:100" json:"createdBy"`
	UpdatedBy   string         `gorm:"size:100" json:"updatedBy"`
	Version     int            `gorm:"default:1" json:"version"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
