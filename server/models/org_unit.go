package models

// OrgUnit represents a pure organizational hierarchy node.
type OrgUnit struct {
	BaseModel
	Name              string  `gorm:"size:100;not null" json:"name"`
	Code              string  `gorm:"size:64;index" json:"code"`
	ParentID          *string `gorm:"type:uuid;index" json:"parentId"`
	UnitType          string  `gorm:"size:30;not null;default:'department'" json:"unitType"`
	ManagerEmployeeID *string `gorm:"type:uuid;index" json:"managerEmployeeId"`
	Status            string  `gorm:"size:20;not null;default:'active'" json:"status"`
	SortOrder         int     `gorm:"not null;default:0" json:"sortOrder"`
	Metadata          string  `gorm:"type:jsonb;not null;default:'{}'" json:"metadata"`
	LegacyPayload     string  `gorm:"type:jsonb" json:"legacyPayload"`
}

func (OrgUnit) TableName() string {
	return "org_units"
}
