package models

import "time"

type PersonalRecord struct {
	BaseModel
	OwnerUserID      string                `gorm:"type:uuid;index;not null" json:"ownerUserId"`
	Title            string                `gorm:"size:255;not null" json:"title"`
	Note             string                `gorm:"type:text" json:"note"`
	ColumnKey        string                `gorm:"size:50;index;not null;default:'INBOX'" json:"columnKey"`
	SortOrder        int                   `gorm:"default:0" json:"sortOrder"`
	CoverImageURL    string                `gorm:"size:512" json:"coverImageUrl"`
	ArchivedAt       *time.Time            `json:"archivedAt"`
	Assets           []PersonalRecordAsset `gorm:"foreignKey:RecordID;constraint:OnDelete:CASCADE" json:"assets,omitempty"`
}

type PersonalRecordAsset struct {
	BaseModel
	RecordID    string `gorm:"type:uuid;index;not null" json:"recordId"`
	OwnerUserID string `gorm:"type:uuid;index;not null" json:"ownerUserId"`
	StoragePath string `gorm:"size:512;not null" json:"storagePath"`
	MimeType    string `gorm:"size:120" json:"mimeType"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	SizeBytes   int64  `json:"sizeBytes"`
}

type PersonalRecordActionLog struct {
	BaseModel
	RecordID    string `gorm:"type:uuid;index;not null" json:"recordId"`
	OwnerUserID string `gorm:"type:uuid;index;not null" json:"ownerUserId"`
	ActionType  string `gorm:"size:120;not null" json:"actionType"`
	TargetType  string `gorm:"size:120" json:"targetType"`
	TargetID    string `gorm:"size:120" json:"targetId"`
	PayloadJSON string `gorm:"type:text" json:"payloadJson"`
}
