package models

type PackagingProfile struct {
	BaseModel
	Code              string                 `gorm:"size:100;uniqueIndex;not null" json:"code"`
	Name              string                 `gorm:"size:255;not null" json:"name"`
	PackagingType     string                 `gorm:"size:50;not null" json:"packagingType"`
	Length            float64                `gorm:"default:0" json:"length"`
	Width             float64                `gorm:"default:0" json:"width"`
	Height            float64                `gorm:"default:0" json:"height"`
	DimensionUnitCode string                 `gorm:"size:50" json:"dimensionUnitCode"`
	NetWeight         float64                `gorm:"default:0" json:"netWeight"`
	GrossWeight       float64                `gorm:"default:0" json:"grossWeight"`
	WeightUnitCode    string                 `gorm:"size:50" json:"weightUnitCode"`
	Capacity          float64                `gorm:"default:0" json:"capacity"`
	CapacityUnitCode  string                 `gorm:"size:50" json:"capacityUnitCode"`
	AssemblySource    string                 `gorm:"size:100" json:"assemblySource"`
	IsActive          bool                   `gorm:"default:true" json:"isActive"`
	Notes             string                 `gorm:"type:text" json:"notes"`
	Targets           []PackagingProfileTarget `gorm:"foreignKey:PackagingProfileID;constraint:OnDelete:CASCADE" json:"targets,omitempty"`
}

func (PackagingProfile) TableName() string {
	return "packaging_profiles"
}

type PackagingProfileTarget struct {
	BaseModel
	PackagingProfileID string `gorm:"type:uuid;index;not null" json:"packagingProfileId"`
	EntityType         string `gorm:"size:20;index;not null" json:"entityType"`
	EntityID           string `gorm:"size:100;index;not null" json:"entityId"`
	EntityCode         string `gorm:"size:100" json:"entityCode"`
	EntityName         string `gorm:"size:255" json:"entityName"`
	Spec               string `gorm:"type:text" json:"spec"`
	IsDefault          bool   `gorm:"default:false" json:"isDefault"`
	SortOrder          int    `gorm:"default:0" json:"sortOrder"`
}

func (PackagingProfileTarget) TableName() string {
	return "packaging_profile_targets"
}
