package models

// QualityInspectionStage is the quality-owned catalog of inspection stations.
// Its identity survives renaming; published standard items keep their own name snapshot.
type QualityInspectionStage struct {
	BaseModel
	Code           string `gorm:"size:64;uniqueIndex;not null" json:"code"`
	Name           string `gorm:"size:100;not null" json:"name"`
	NormalizedName string `gorm:"size:100;uniqueIndex;not null" json:"-"`
	Description    string `gorm:"type:text" json:"description"`
	SortOrder      int    `gorm:"not null;default:0" json:"sortOrder"`
	Active         bool   `gorm:"not null" json:"active"`
	Version        int64  `gorm:"not null;default:1" json:"version"`
}

var DefaultQualityInspectionStages = []QualityInspectionStage{
	{Code: "QUALITY_FORMING_INSPECTION_STATION", Name: "成型检验站", SortOrder: 10, Active: true},
	{Code: "QUALITY_MACHINING_INSPECTION_STATION", Name: "机加检验站", SortOrder: 20, Active: true},
	{Code: "QUALITY_FINE_INSPECTION_STATION", Name: "精细检验站", SortOrder: 30, Active: true},
	{Code: "QUALITY_PAINTING_INSPECTION_STATION", Name: "涂装检验站", SortOrder: 40, Active: true},
}
