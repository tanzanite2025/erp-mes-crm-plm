package models

import "time"

type PrepregRollInstance struct {
	BaseModel
	BindingToken        string               `gorm:"size:120;uniqueIndex;not null" json:"bindingToken"`
	SpecID              string               `gorm:"size:36;index;not null" json:"specId"`
	Spec                *PrepregMaterialSpec `gorm:"foreignKey:SpecID" json:"spec,omitempty"`
	SpecCode            string               `gorm:"size:100;index;not null" json:"specCode"`
	SpecName            string               `gorm:"size:255;index;not null" json:"specName"`
	ResinContentPercent string               `gorm:"size:40" json:"resinContentPercent"`
	SupplierBatchNo     string               `gorm:"size:120;index" json:"supplierBatchNo"`
	WidthMM             string               `gorm:"size:40" json:"widthMm"`
	LengthM             string               `gorm:"size:60" json:"lengthM"`
	NominalAreaM2       string               `gorm:"size:60" json:"nominalAreaM2"`
	Inspector           string               `gorm:"size:80;index" json:"inspector"`
	BoxNo               string               `gorm:"size:80;index" json:"boxNo"`
	ProductionDate      string               `gorm:"size:40" json:"productionDate"`
	OcrRawPayload       string               `gorm:"type:text" json:"ocrRawPayload"`
	ActivatedAt         *time.Time           `gorm:"index" json:"activatedAt,omitempty"`
	ActivatedBy         string               `gorm:"size:120" json:"activatedBy"`
	Status              string               `gorm:"size:20;index;not null" json:"status"`
}

func (PrepregRollInstance) TableName() string {
	return "prepreg_roll_instances"
}
