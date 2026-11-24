package models

// QualityDefectType is the quality-owned shared vocabulary of inspection problems.
// It does not own measurement limits, repair destinations or production state.
type QualityDefectType struct {
	BaseModel
	Code           string `gorm:"size:64;uniqueIndex;not null" json:"code"`
	Name           string `gorm:"size:100;not null" json:"name"`
	NormalizedName string `gorm:"size:100;uniqueIndex;not null" json:"-"`
	Description    string `gorm:"type:text" json:"description"`
	SortOrder      int    `gorm:"not null;default:0" json:"sortOrder"`
	Active         bool   `gorm:"not null" json:"active"`
	Version        int64  `gorm:"not null;default:1" json:"version"`
}

// QualityInspectionStageDefectTypeBinding declares applicability, not a finding.
// The station's existing version protects replacement of its complete binding set.
type QualityInspectionStageDefectTypeBinding struct {
	InspectionStageID string                  `gorm:"type:uuid;primaryKey" json:"inspectionStageId"`
	DefectTypeID      string                  `gorm:"type:uuid;primaryKey;index" json:"defectTypeId"`
	InspectionStage   *QualityInspectionStage `gorm:"foreignKey:InspectionStageID;constraint:OnDelete:RESTRICT" json:"-"`
	DefectType        *QualityDefectType      `gorm:"foreignKey:DefectTypeID;constraint:OnDelete:RESTRICT" json:"-"`
}
