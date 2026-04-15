package models

import "encoding/json"

type LogisticsVehiclePhoto struct {
	BaseModel
	VehicleID   string          `gorm:"size:100;index;not null" json:"vehicleId"`
	URL         string          `gorm:"size:512;not null" json:"url"`
	ViewType    string          `gorm:"size:50;index;not null" json:"viewType"`
	Alt         string          `gorm:"size:255" json:"alt"`
	Caption     string          `gorm:"type:text" json:"caption"`
	SortOrder   int             `gorm:"default:0" json:"sortOrder"`
	Annotations json.RawMessage `gorm:"type:jsonb;not null;default:'[]'" json:"annotations"`
	Version     int             `gorm:"default:1" json:"version"`
}
