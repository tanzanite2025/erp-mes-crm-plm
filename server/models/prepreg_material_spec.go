package models

// PrepregMaterialSpec defines an independent raw-material specification record.
// It is intentionally not linked to Material/BOM yet; those mappings belong to a later workflow.
type PrepregMaterialSpec struct {
	BaseModel
	Code                string `gorm:"size:100;uniqueIndex;not null" json:"code"`
	Name                string `gorm:"size:255;not null" json:"name"`
	DisplayAlias        string `gorm:"size:255;index" json:"displayAlias"`
	SupplierID          string `gorm:"size:36;index" json:"supplierId"`
	SupplierProductCode string `gorm:"size:120;index" json:"supplierProductCode"`
	FiberModel          string `gorm:"size:120;index" json:"fiberModel"`
	ResinContentPercent string `gorm:"size:40" json:"resinContentPercent"`
	WidthMM             string `gorm:"size:40" json:"widthMm"`
	LengthM             string `gorm:"size:60" json:"lengthM"`
	NominalAreaM2       string `gorm:"size:60" json:"nominalAreaM2"`
	SupplierBatchNo     string `gorm:"size:120;index" json:"supplierBatchNo"`
	Inspector           string `gorm:"size:80;index" json:"inspector"`
	BoxNo               string `gorm:"size:80;index" json:"boxNo"`
	ProductionDate      string `gorm:"size:40" json:"productionDate"`
	Description         string `gorm:"type:text" json:"description"`
	Status              string `gorm:"size:20;default:'Active';index" json:"status"`
	Version             int    `gorm:"default:1" json:"version"`
}

func (PrepregMaterialSpec) TableName() string {
	return "prepreg_material_specs"
}
