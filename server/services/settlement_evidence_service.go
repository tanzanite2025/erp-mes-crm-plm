package services

import (
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrSettlementRecordTypeInvalid   = errors.New("settlement record type invalid")
	ErrSettlementRecordNotFound      = errors.New("settlement record not found")
	ErrSettlementEvidenceNotFound    = errors.New("settlement evidence not found")
	ErrSettlementEvidenceFileInvalid = errors.New("settlement evidence file invalid")
)

func ListReceiptRecordEvidences(recordID string) ([]SettlementRecordEvidenceResponse, error) {
	return listSettlementRecordEvidences(models.SettlementRecordTypeReceipt, recordID)
}

func ListPaymentRecordEvidences(recordID string) ([]SettlementRecordEvidenceResponse, error) {
	return listSettlementRecordEvidences(models.SettlementRecordTypePayment, recordID)
}

func CreateReceiptRecordEvidence(recordID string, req CreateSettlementRecordEvidenceRequest, operator string) (SettlementRecordEvidenceResponse, error) {
	return createSettlementRecordEvidence(models.SettlementRecordTypeReceipt, recordID, req, operator)
}

func CreatePaymentRecordEvidence(recordID string, req CreateSettlementRecordEvidenceRequest, operator string) (SettlementRecordEvidenceResponse, error) {
	return createSettlementRecordEvidence(models.SettlementRecordTypePayment, recordID, req, operator)
}

func DeleteReceiptRecordEvidence(recordID string, evidenceID string) error {
	return deleteSettlementRecordEvidence(models.SettlementRecordTypeReceipt, recordID, evidenceID)
}

func DeletePaymentRecordEvidence(recordID string, evidenceID string) error {
	return deleteSettlementRecordEvidence(models.SettlementRecordTypePayment, recordID, evidenceID)
}

func listSettlementRecordEvidences(recordType string, recordID string) ([]SettlementRecordEvidenceResponse, error) {
	normalizedRecordID := strings.TrimSpace(recordID)
	if err := ensureSettlementRecordExists(recordType, normalizedRecordID); err != nil {
		return nil, err
	}

	var items []models.SettlementRecordEvidence
	if err := db.DB.Preload("Asset").
		Where("record_type = ? AND record_id = ?", normalizeSettlementRecordType(recordType), normalizedRecordID).
		Order("sort_order asc, created_at asc").
		Find(&items).Error; err != nil {
		return nil, err
	}

	responses := make([]SettlementRecordEvidenceResponse, 0, len(items))
	for _, item := range items {
		responses = append(responses, mapSettlementRecordEvidence(item))
	}
	return responses, nil
}

func createSettlementRecordEvidence(recordType string, recordID string, req CreateSettlementRecordEvidenceRequest, operator string) (SettlementRecordEvidenceResponse, error) {
	normalizedRecordType := normalizeSettlementRecordType(recordType)
	normalizedRecordID := strings.TrimSpace(recordID)
	if err := ensureSettlementRecordExists(normalizedRecordType, normalizedRecordID); err != nil {
		return SettlementRecordEvidenceResponse{}, err
	}
	if strings.TrimSpace(req.FileName) == "" || strings.TrimSpace(req.FileURL) == "" {
		return SettlementRecordEvidenceResponse{}, ErrSettlementEvidenceFileInvalid
	}

	var response SettlementRecordEvidenceResponse
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		asset := models.SettlementEvidenceAsset{
			BaseModel:  models.BaseModel{ID: uuid.NewString()},
			FileName:   strings.TrimSpace(req.FileName),
			FileURL:    strings.TrimSpace(req.FileURL),
			MimeType:   strings.TrimSpace(req.MimeType),
			FileSize:   req.FileSize,
			Category:   normalizeSettlementEvidenceCategory(req.Category),
			UploadedBy: strings.TrimSpace(operator),
		}
		if err := tx.Create(&asset).Error; err != nil {
			return err
		}

		if req.IsPrimary {
			if err := tx.Model(&models.SettlementRecordEvidence{}).
				Where("record_type = ? AND record_id = ?", normalizedRecordType, normalizedRecordID).
				Update("is_primary", false).Error; err != nil {
				return err
			}
		}

		evidence := models.SettlementRecordEvidence{
			BaseModel:  models.BaseModel{ID: uuid.NewString()},
			RecordType: normalizedRecordType,
			RecordID:   normalizedRecordID,
			AssetID:    asset.ID,
			SortOrder:  normalizeSettlementEvidenceSortOrder(req.SortOrder),
			Note:       strings.TrimSpace(req.Note),
			IsPrimary:  req.IsPrimary,
			Asset:      asset,
		}
		if err := tx.Create(&evidence).Error; err != nil {
			return err
		}
		response = mapSettlementRecordEvidence(evidence)
		return nil
	})
	return response, err
}

func deleteSettlementRecordEvidence(recordType string, recordID string, evidenceID string) error {
	normalizedRecordType := normalizeSettlementRecordType(recordType)
	normalizedRecordID := strings.TrimSpace(recordID)
	if err := ensureSettlementRecordExists(normalizedRecordType, normalizedRecordID); err != nil {
		return err
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		var evidence models.SettlementRecordEvidence
		if err := tx.Where("id = ? AND record_type = ? AND record_id = ?", strings.TrimSpace(evidenceID), normalizedRecordType, normalizedRecordID).
			First(&evidence).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrSettlementEvidenceNotFound
			}
			return err
		}
		if err := tx.Delete(&evidence).Error; err != nil {
			return err
		}
		return tx.Delete(&models.SettlementEvidenceAsset{}, "id = ?", evidence.AssetID).Error
	})
}

func ensureSettlementRecordExists(recordType string, recordID string) error {
	if strings.TrimSpace(recordID) == "" {
		return ErrSettlementRecordNotFound
	}
	switch normalizeSettlementRecordType(recordType) {
	case models.SettlementRecordTypeReceipt:
		var record models.ReceiptRecord
		if err := db.DB.First(&record, "id = ?", strings.TrimSpace(recordID)).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrSettlementRecordNotFound
			}
			return err
		}
		return nil
	case models.SettlementRecordTypePayment:
		var record models.PaymentRecord
		if err := db.DB.First(&record, "id = ?", strings.TrimSpace(recordID)).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrSettlementRecordNotFound
			}
			return err
		}
		return nil
	default:
		return ErrSettlementRecordTypeInvalid
	}
}

func normalizeSettlementRecordType(value string) string {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	switch normalized {
	case models.SettlementRecordTypeReceipt, models.SettlementRecordTypePayment:
		return normalized
	default:
		return ""
	}
}

func normalizeSettlementEvidenceCategory(value string) string {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	if normalized == "" {
		return models.SettlementEvidenceCategoryImage
	}
	return normalized
}

func normalizeSettlementEvidenceSortOrder(value int) int {
	if value > 0 {
		return value
	}
	return 1
}
