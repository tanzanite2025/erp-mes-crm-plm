package models

// OutsourcePartner is production-domain master data for external processors.
//
// A partner may reference a purchasing Supplier for shared contact identity, but
// production-specific facts stay here. Process scope and execution state are
// separate follow-up models so this master record remains stable.
type OutsourcePartner struct {
	BaseModel
	Code                 string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name                 string `gorm:"size:255;not null" json:"name"`
	SupplierID           string `gorm:"size:36;index" json:"supplierId"`
	SupplierNameSnapshot string `gorm:"size:255" json:"supplierNameSnapshot"`
	ContactPerson        string `gorm:"size:100" json:"contactPerson"`
	ContactPhone         string `gorm:"size:50" json:"contactPhone"`
	Email                string `gorm:"size:100" json:"email"`
	Address              string `gorm:"type:text" json:"address"`
	QualityGrade         string `gorm:"size:20;index" json:"qualityGrade"`
	Status               string `gorm:"size:20;index;default:'ACTIVE'" json:"status"`
	LeadTimeDays         int    `gorm:"default:0" json:"leadTimeDays"`
	SettlementPolicy     string `gorm:"type:text" json:"settlementPolicy"`
	Notes                string `gorm:"type:text" json:"notes"`
	Operator             string `gorm:"size:100" json:"operator"`
	Version              int64  `gorm:"default:1" json:"version"`
}

func (OutsourcePartner) TableName() string {
	return "production_outsource_partners"
}
