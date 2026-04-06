package models

import "time"

// ChangeOrder captures formal ECO/ECN master records that can be linked to BOM revisions.
type ChangeOrder struct {
	BaseModel
	ChangeOrderNo string     `gorm:"size:100;uniqueIndex;not null" json:"changeOrderNo"`
	Title         string     `gorm:"size:255;not null" json:"title"`
	ChangeType    string     `gorm:"size:20;default:'ECO'" json:"changeType"` // ECO, ECN
	ProductID     *string    `gorm:"type:uuid;index" json:"productId"`
	Product       *Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	SiteCode      string     `gorm:"size:50;index" json:"siteCode"`
	IsDefaultSite bool       `gorm:"default:true" json:"isDefaultSite"`
	RevisionNo    string     `gorm:"size:40;default:'R1';index" json:"revisionNo"`
	EffectiveFrom *time.Time `gorm:"index" json:"effectiveFrom"`
	EffectiveTo   *time.Time `gorm:"index" json:"effectiveTo"`
	Status        string     `gorm:"size:20;default:'draft'" json:"status"` // draft, released, obsolete
	Description   string     `gorm:"type:text" json:"description"`
	Version       int        `gorm:"default:1" json:"_v"`
}
