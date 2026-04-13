package services

import (
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type PersonalRecordAssetInput struct {
	StoragePath string `json:"storagePath"`
	MimeType    string `json:"mimeType"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	SizeBytes   int64  `json:"sizeBytes"`
}

type PersonalRecordUpsertInput struct {
	Title         string                     `json:"title"`
	Note          string                     `json:"note"`
	ColumnKey     string                     `json:"columnKey"`
	SortOrder     int                        `json:"sortOrder"`
	CoverImageURL string                     `json:"coverImageUrl"`
	Assets        []PersonalRecordAssetInput `json:"assets"`
}

type PersonalRecordReorderInput struct {
	ID        string `json:"id"`
	ColumnKey string `json:"columnKey"`
	SortOrder int    `json:"sortOrder"`
}

var allowedPersonalRecordColumns = map[string]struct{}{
	"INBOX":      {},
	"ORGANIZING": {},
	"PARKED":     {},
	"ARCHIVED":   {},
}

func normalizePersonalRecordColumn(value string) string {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	if _, ok := allowedPersonalRecordColumns[normalized]; ok {
		return normalized
	}
	return "INBOX"
}

func ListPersonalRecordsByOwner(ownerUserID string) ([]models.PersonalRecord, error) {
	var items []models.PersonalRecord
	err := db.DB.
		Preload("Assets").
		Where("owner_user_id = ?", ownerUserID).
		Order("column_key ASC").
		Order("sort_order ASC").
		Order("updated_at DESC").
		Find(&items).Error
	return items, err
}

func CreatePersonalRecord(ownerUserID string, input PersonalRecordUpsertInput) (*models.PersonalRecord, error) {
	record := models.PersonalRecord{
		OwnerUserID:   ownerUserID,
		Title:         strings.TrimSpace(input.Title),
		Note:          strings.TrimSpace(input.Note),
		ColumnKey:     normalizePersonalRecordColumn(input.ColumnKey),
		SortOrder:     input.SortOrder,
		CoverImageURL: strings.TrimSpace(input.CoverImageURL),
	}
	if record.ColumnKey == "ARCHIVED" {
		now := time.Now()
		record.ArchivedAt = &now
	}
	if err := db.DB.Create(&record).Error; err != nil {
		return nil, err
	}
	if err := replacePersonalRecordAssets(&record, input.Assets); err != nil {
		return nil, err
	}
	if err := db.DB.Preload("Assets").First(&record, "id = ?", record.ID).Error; err != nil {
		return nil, err
	}
	return &record, nil
}

func UpdatePersonalRecord(ownerUserID string, recordID string, input PersonalRecordUpsertInput) (*models.PersonalRecord, error) {
	var record models.PersonalRecord
	if err := db.DB.Where("id = ? AND owner_user_id = ?", recordID, ownerUserID).First(&record).Error; err != nil {
		return nil, err
	}
	columnKey := normalizePersonalRecordColumn(input.ColumnKey)
	updates := map[string]interface{}{
		"title":           strings.TrimSpace(input.Title),
		"note":            strings.TrimSpace(input.Note),
		"column_key":      columnKey,
		"sort_order":      input.SortOrder,
		"cover_image_url": strings.TrimSpace(input.CoverImageURL),
	}
	if columnKey == "ARCHIVED" {
		now := time.Now()
		updates["archived_at"] = &now
	} else {
		updates["archived_at"] = nil
	}
	if err := db.DB.Model(&record).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := replacePersonalRecordAssets(&record, input.Assets); err != nil {
		return nil, err
	}
	if err := db.DB.Preload("Assets").First(&record, "id = ?", record.ID).Error; err != nil {
		return nil, err
	}
	return &record, nil
}

func ReorderPersonalRecords(ownerUserID string, inputs []PersonalRecordReorderInput) error {
	if strings.TrimSpace(ownerUserID) == "" {
		return fmt.Errorf("owner user id is required")
	}
	if len(inputs) == 0 {
		return nil
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, input := range inputs {
			id := strings.TrimSpace(input.ID)
			if id == "" {
				return fmt.Errorf("record id is required")
			}
			updates := map[string]interface{}{
				"column_key": normalizePersonalRecordColumn(input.ColumnKey),
				"sort_order": input.SortOrder,
			}
			if normalizePersonalRecordColumn(input.ColumnKey) == "ARCHIVED" {
				now := time.Now()
				updates["archived_at"] = &now
			} else {
				updates["archived_at"] = nil
			}
			result := tx.Model(&models.PersonalRecord{}).
				Where("id = ? AND owner_user_id = ?", id, ownerUserID).
				Updates(updates)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				return gorm.ErrRecordNotFound
			}
		}
		return nil
	})
}

func replacePersonalRecordAssets(record *models.PersonalRecord, assets []PersonalRecordAssetInput) error {
	if err := db.DB.Where("record_id = ?", record.ID).Delete(&models.PersonalRecordAsset{}).Error; err != nil {
		return err
	}
	for _, asset := range assets {
		storagePath := strings.TrimSpace(asset.StoragePath)
		if storagePath == "" {
			continue
		}
		item := models.PersonalRecordAsset{
			RecordID:    record.ID,
			OwnerUserID: record.OwnerUserID,
			StoragePath: storagePath,
			MimeType:    strings.TrimSpace(asset.MimeType),
			Width:       asset.Width,
			Height:      asset.Height,
			SizeBytes:   asset.SizeBytes,
		}
		if err := db.DB.Create(&item).Error; err != nil {
			return err
		}
	}
	return nil
}
