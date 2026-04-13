package models

const (
	SettlementRecordTypeReceipt = "RECEIPT"
	SettlementRecordTypePayment = "PAYMENT"
)

const (
	SettlementEvidenceCategoryImage = "IMAGE"
)

type SettlementEvidenceAsset struct {
	BaseModel
	FileName   string `gorm:"size:255;not null" json:"fileName"`
	FileURL    string `gorm:"size:500;not null" json:"fileUrl"`
	MimeType   string `gorm:"size:120" json:"mimeType"`
	FileSize   int64  `gorm:"not null;default:0" json:"fileSize"`
	Category   string `gorm:"size:40;not null;default:'IMAGE'" json:"category"`
	UploadedBy string `gorm:"size:100" json:"uploadedBy"`
}

func (SettlementEvidenceAsset) TableName() string {
	return "settlement_evidence_assets"
}

type SettlementRecordEvidence struct {
	BaseModel
	RecordType string                  `gorm:"size:20;index;not null" json:"recordType"`
	RecordID   string                  `gorm:"type:uuid;index;not null" json:"recordId"`
	AssetID    string                  `gorm:"type:uuid;index;not null" json:"assetId"`
	SortOrder  int                     `gorm:"not null;default:1" json:"sortOrder"`
	Note       string                  `gorm:"type:text" json:"note"`
	IsPrimary  bool                    `gorm:"not null;default:false" json:"isPrimary"`
	Asset      SettlementEvidenceAsset `gorm:"foreignKey:AssetID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"asset"`
}

func (SettlementRecordEvidence) TableName() string {
	return "settlement_record_evidences"
}
