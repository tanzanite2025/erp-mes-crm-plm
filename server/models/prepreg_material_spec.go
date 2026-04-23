package models

// PrepregMaterialSpec defines an independent raw-material specification record.
// It is intentionally not linked to Material/BOM yet; those mappings belong to a later workflow.
type PrepregMaterialSpec struct {
	BaseModel
	Code                string `gorm:"size:100;uniqueIndex;not null" json:"code"`
	Name                string `gorm:"size:255;not null" json:"name"`
	SupplierProductCode string `gorm:"size:120;index" json:"supplierProductCode"`
	FiberModel          string `gorm:"size:120;index" json:"fiberModel"`
	ResinModel          string `gorm:"size:120;index" json:"resinModel"`
	ResinContentPercent string `gorm:"size:40" json:"resinContentPercent"`
	WidthMM             string `gorm:"size:40" json:"widthMm"`
	AreaWeightGSM       string `gorm:"size:80" json:"areaWeightGsm"`
	NominalAreaM2       string `gorm:"size:60" json:"nominalAreaM2"`
	SupplierBatchNo     string `gorm:"size:120;index" json:"supplierBatchNo"`
	RollNo              string `gorm:"size:80;index" json:"rollNo"`
	ProductionDate      string `gorm:"size:40" json:"productionDate"`
	StorageRequirement  string `gorm:"type:text" json:"storageRequirement"`
	Description         string `gorm:"type:text" json:"description"`
	Status              string `gorm:"size:20;default:'Active';index" json:"status"`
	Version             int    `gorm:"default:1" json:"version"`
}

func (PrepregMaterialSpec) TableName() string {
	return "prepreg_material_specs"
}
