package services

import "xdfc-server/models"

func mapSettlementEvidenceAsset(item models.SettlementEvidenceAsset) SettlementEvidenceAssetResponse {
	return SettlementEvidenceAssetResponse{
		ID:         item.ID,
		FileName:   item.FileName,
		FileURL:    item.FileURL,
		MimeType:   item.MimeType,
		FileSize:   item.FileSize,
		Category:   item.Category,
		UploadedBy: item.UploadedBy,
		CreatedAt:  item.CreatedAt,
		UpdatedAt:  item.UpdatedAt,
	}
}

func mapSettlementRecordEvidence(item models.SettlementRecordEvidence) SettlementRecordEvidenceResponse {
	return SettlementRecordEvidenceResponse{
		ID:         item.ID,
		RecordType: item.RecordType,
		RecordID:   item.RecordID,
		AssetID:    item.AssetID,
		SortOrder:  item.SortOrder,
		Note:       item.Note,
		IsPrimary:  item.IsPrimary,
		CreatedAt:  item.CreatedAt,
		UpdatedAt:  item.UpdatedAt,
		Asset:      mapSettlementEvidenceAsset(item.Asset),
	}
}
