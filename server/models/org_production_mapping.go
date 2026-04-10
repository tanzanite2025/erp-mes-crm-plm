package models

// OrgProductionMapping links organization units with production units.
type OrgProductionMapping struct {
	BaseModel
	OrgUnitID        string `gorm:"type:uuid;not null;index" json:"orgUnitId"`
	ProductionUnitID string `gorm:"type:uuid;not null;index" json:"productionUnitId"`
	RelationType     string `gorm:"size:30;not null;default:'belongs_to'" json:"relationType"`
}

func (OrgProductionMapping) TableName() string {
	return "org_production_mappings"
}
