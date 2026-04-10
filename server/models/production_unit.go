package models

// ProductionUnit represents the production execution hierarchy.
type ProductionUnit struct {
	BaseModel
	Name        string  `gorm:"size:100;not null" json:"name"`
	Code        string  `gorm:"size:64;index" json:"code"`
	UnitType    string  `gorm:"size:30;not null" json:"unitType"`
	ParentID    *string `gorm:"type:uuid;index" json:"parentId"`
	OrgUnitID   *string `gorm:"type:uuid;index" json:"orgUnitId"`
	Status      string  `gorm:"size:20;not null;default:'active'" json:"status"`
	SortOrder   int     `gorm:"not null;default:0" json:"sortOrder"`
	Metadata    string  `gorm:"type:jsonb;not null;default:'{}'" json:"metadata"`
	SourceTable string  `gorm:"size:64" json:"sourceTable"`
	SourceRowID *string `gorm:"type:uuid" json:"sourceRowId"`
}

func (ProductionUnit) TableName() string {
	return "production_units"
}
