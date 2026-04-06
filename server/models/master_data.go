package models

import (
	"strings"
	"time"
)

// MasterDataControl captures shared business revision metadata across
// engineering, material and BOM master data. `_v` remains the optimistic-lock
// field on each concrete entity.
type MasterDataControl struct {
	RevisionNo    string     `gorm:"size:40;default:'R1';index" json:"revisionNo"`
	EffectiveFrom *time.Time `gorm:"index" json:"effectiveFrom"`
	EffectiveTo   *time.Time `gorm:"index" json:"effectiveTo"`
	ChangeType    string     `gorm:"size:20;default:'MANUAL'" json:"changeType"` // MANUAL, ECO, ECN
	ChangeOrderNo string     `gorm:"size:100;index" json:"changeOrderNo"`
	SiteCode      string     `gorm:"size:50;index" json:"siteCode"`
	IsDefaultSite bool       `gorm:"default:true" json:"isDefaultSite"`
}

func (m *MasterDataControl) Normalize(defaultRevision string) {
	if strings.TrimSpace(m.RevisionNo) == "" {
		m.RevisionNo = defaultRevision
	}
	if strings.TrimSpace(m.ChangeType) == "" {
		m.ChangeType = "MANUAL"
	}
	if strings.TrimSpace(m.SiteCode) == "" {
		m.IsDefaultSite = true
	}
}

func (m *MasterDataControl) MergeMissingFrom(existing MasterDataControl, defaultRevision string) {
	if strings.TrimSpace(m.RevisionNo) == "" {
		m.RevisionNo = existing.RevisionNo
	}
	if m.EffectiveFrom == nil {
		m.EffectiveFrom = existing.EffectiveFrom
	}
	if m.EffectiveTo == nil {
		m.EffectiveTo = existing.EffectiveTo
	}
	if strings.TrimSpace(m.ChangeType) == "" {
		m.ChangeType = existing.ChangeType
	}
	if strings.TrimSpace(m.ChangeOrderNo) == "" {
		m.ChangeOrderNo = existing.ChangeOrderNo
	}
	if strings.TrimSpace(m.SiteCode) == "" {
		m.SiteCode = existing.SiteCode
		m.IsDefaultSite = existing.IsDefaultSite
	}
	m.Normalize(defaultRevision)
}
