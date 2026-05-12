package models

import (
	"encoding/json"
	"time"
)

type BOMVersionSnapshot struct {
	BaseModel
	BOMID          string          `gorm:"type:uuid;not null;uniqueIndex:idx_bom_version_snapshots_bom_sequence,priority:1" json:"bomId"`
	ProductID      string          `gorm:"type:uuid;not null;index" json:"productId"`
	BOMNo          string          `gorm:"size:50;not null;index" json:"bomNo"`
	VersionSequence int            `gorm:"not null;uniqueIndex:idx_bom_version_snapshots_bom_sequence,priority:2" json:"versionSequence"`
	VersionText    string          `gorm:"size:20" json:"versionText"`
	Status         string          `gorm:"size:20" json:"status"`
	Description    string          `gorm:"type:text" json:"description"`
	RevisionNo     string          `gorm:"size:40" json:"revisionNo"`
	EffectiveFrom  *time.Time      `json:"effectiveFrom"`
	EffectiveTo    *time.Time      `json:"effectiveTo"`
	ChangeType     string          `gorm:"size:20" json:"changeType"`
	ChangeOrderNo  string          `gorm:"size:100" json:"changeOrderNo"`
	SiteCode       string          `gorm:"size:50" json:"siteCode"`
	IsDefaultSite  bool            `json:"isDefaultSite"`
	Operation      string          `gorm:"size:20;not null;default:'SAVE'" json:"operation"`
	CreatedBy      string          `gorm:"size:100;index" json:"createdBy"`
	Snapshot       json.RawMessage `gorm:"type:jsonb;not null" json:"-"`
	RelationSidecar json.RawMessage `gorm:"type:jsonb" json:"-"`
}
