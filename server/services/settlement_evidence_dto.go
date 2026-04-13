package services

import "time"

type SettlementEvidenceAssetResponse struct {
	ID         string    `json:"id"`
	FileName   string    `json:"fileName"`
	FileURL    string    `json:"fileUrl"`
	MimeType   string    `json:"mimeType"`
	FileSize   int64     `json:"fileSize"`
	Category   string    `json:"category"`
	UploadedBy string    `json:"uploadedBy"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type SettlementRecordEvidenceResponse struct {
	ID         string                         `json:"id"`
	RecordType string                         `json:"recordType"`
	RecordID   string                         `json:"recordId"`
	AssetID    string                         `json:"assetId"`
	SortOrder  int                            `json:"sortOrder"`
	Note       string                         `json:"note"`
	IsPrimary  bool                           `json:"isPrimary"`
	CreatedAt  time.Time                      `json:"createdAt"`
	UpdatedAt  time.Time                      `json:"updatedAt"`
	Asset      SettlementEvidenceAssetResponse `json:"asset"`
}

type CreateSettlementRecordEvidenceRequest struct {
	FileName  string `json:"fileName" binding:"required"`
	FileURL   string `json:"fileUrl" binding:"required"`
	MimeType  string `json:"mimeType"`
	FileSize  int64  `json:"fileSize"`
	Category  string `json:"category"`
	SortOrder int    `json:"sortOrder"`
	Note      string `json:"note"`
	IsPrimary bool   `json:"isPrimary"`
}
