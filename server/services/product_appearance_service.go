package services

import (
	"errors"
	"regexp"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrProductAppearanceVersionConflict      = errors.New("product appearance version conflict")
	ErrProductAppearancePatchVersionConflict = errors.New("product appearance patch version conflict")
	ErrProductAppearanceDuplicateBarcodeCode = errors.New("product appearance barcode code already exists")
)

var productAppearanceBarcodeCodePattern = regexp.MustCompile(`^[1-9]$`)

type SaveProductAppearanceAPIRequest struct {
	ID                string     `json:"id"`
	Name              string     `json:"name"`
	BarcodeCode       string     `json:"barcodeCode"`
	Description       string     `json:"description"`
	ImageURL          string     `json:"imageUrl"`
	ImageThumbnailURL string     `json:"imageThumbnailUrl"`
	ImageName         string     `json:"imageName"`
	Active            bool       `json:"active"`
	SortOrder         int        `json:"sortOrder"`
	RevisionNo        string     `json:"revisionNo"`
	EffectiveFrom     *time.Time `json:"effectiveFrom"`
	EffectiveTo       *time.Time `json:"effectiveTo"`
	ChangeType        string     `json:"changeType"`
	ChangeOrderNo     string     `json:"changeOrderNo"`
	SiteCode          string     `json:"siteCode"`
	IsDefaultSite     bool       `json:"isDefaultSite"`
	Version           int        `json:"version"`
}

type PatchProductAppearanceRequest struct {
	ID                string
	ExpectedVersion   int
	DeltaKeys         []string
	Name              *string
	BarcodeCode       *string
	Description       *string
	ImageURL          *string
	ImageThumbnailURL *string
	ImageName         *string
	Active            *bool
	SortOrder         *int
	RevisionNo        *string
	EffectiveFrom     *time.Time
	EffectiveFromSet  bool
	EffectiveTo       *time.Time
	EffectiveToSet    bool
	ChangeType        *string
	ChangeOrderNo     *string
	SiteCode          *string
	IsDefaultSite     *bool
}

func defaultProductAppearances() []models.ProductAppearance {
	items := []models.ProductAppearance{
		{Name: "UD", BarcodeCode: "1", Description: "Default appearance 1", Active: true, SortOrder: 10},
		{Name: "3K", BarcodeCode: "2", Description: "Default appearance 2", Active: true, SortOrder: 20},
		{Name: "12K", BarcodeCode: "3", Description: "Default appearance 3", Active: true, SortOrder: 30},
		{Name: "MARBLE", BarcodeCode: "4", Description: "Default appearance 4", Active: true, SortOrder: 40},
		{Name: "PAINT", BarcodeCode: "5", Description: "Default appearance 5", Active: true, SortOrder: 50},
		{Name: "CUSTOM", BarcodeCode: "6", Description: "Default appearance 6", Active: true, SortOrder: 60},
	}
	for idx := range items {
		items[idx].MasterDataControl.Normalize("R1")
		items[idx].Version = 1
	}
	return items
}

func normalizeProductAppearanceWriteInput(input SaveProductAppearanceAPIRequest) SaveProductAppearanceAPIRequest {
	input.Name = strings.TrimSpace(input.Name)
	input.BarcodeCode = strings.TrimSpace(input.BarcodeCode)
	input.Description = strings.TrimSpace(input.Description)
	input.ImageURL = strings.TrimSpace(input.ImageURL)
	input.ImageThumbnailURL = strings.TrimSpace(input.ImageThumbnailURL)
	input.ImageName = strings.TrimSpace(input.ImageName)
	input.RevisionNo = strings.TrimSpace(input.RevisionNo)
	input.ChangeType = strings.TrimSpace(input.ChangeType)
	input.ChangeOrderNo = strings.TrimSpace(input.ChangeOrderNo)
	input.SiteCode = strings.TrimSpace(input.SiteCode)
	return input
}

func toProductAppearanceModel(input SaveProductAppearanceAPIRequest) models.ProductAppearance {
	return models.ProductAppearance{
		BaseModel: models.BaseModel{
			ID: input.ID,
		},
		MasterDataControl: models.MasterDataControl{
			RevisionNo:    input.RevisionNo,
			EffectiveFrom: input.EffectiveFrom,
			EffectiveTo:   input.EffectiveTo,
			ChangeType:    input.ChangeType,
			ChangeOrderNo: input.ChangeOrderNo,
			SiteCode:      input.SiteCode,
			IsDefaultSite: input.IsDefaultSite,
		},
		Name:              input.Name,
		BarcodeCode:       input.BarcodeCode,
		Description:       input.Description,
		ImageURL:          input.ImageURL,
		ImageThumbnailURL: input.ImageThumbnailURL,
		ImageName:         input.ImageName,
		Active:            input.Active,
		SortOrder:         input.SortOrder,
		Version:           input.Version,
	}
}

func nextProductAppearanceSortOrder(tx *gorm.DB) (int, error) {
	var maxSortOrder int
	if err := tx.Model(&models.ProductAppearance{}).
		Select("COALESCE(MAX(sort_order), 0)").
		Scan(&maxSortOrder).Error; err != nil {
		return 0, err
	}
	return maxSortOrder + 10, nil
}

func validateProductAppearanceWriteInput(input SaveProductAppearanceAPIRequest) error {
	if input.Name == "" {
		return domainValidationError("产品外观名称不能为空")
	}
	if !productAppearanceBarcodeCodePattern.MatchString(input.BarcodeCode) {
		return domainValidationError("条码位值必须为 1-9 的单个数字")
	}
	return nil
}

func ensureProductAppearanceBarcodeCodeUnique(tx *gorm.DB, barcodeCode string, excludeID string) error {
	var count int64
	query := tx.Model(&models.ProductAppearance{}).Where("barcode_code = ?", strings.TrimSpace(barcodeCode))
	if strings.TrimSpace(excludeID) != "" {
		query = query.Where("id <> ?", strings.TrimSpace(excludeID))
	}
	if err := query.Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrProductAppearanceDuplicateBarcodeCode
	}
	return nil
}

func ensureProductAppearanceSeeds() error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&models.ProductAppearance{}).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return nil
		}
		seeds := defaultProductAppearances()
		return tx.Create(&seeds).Error
	})
}

func ListProductAppearances() ([]models.ProductAppearance, error) {
	if err := ensureProductAppearanceSeeds(); err != nil {
		return nil, err
	}
	var items []models.ProductAppearance
	if err := db.DB.Order("sort_order asc").Order("barcode_code asc").Order("name asc").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func SaveProductAppearance(input SaveProductAppearanceAPIRequest) (models.ProductAppearance, error) {
	input = normalizeProductAppearanceWriteInput(input)
	if err := validateProductAppearanceWriteInput(input); err != nil {
		return models.ProductAppearance{}, err
	}

	modelInput := toProductAppearanceModel(input)
	var saved models.ProductAppearance

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := ensureProductAppearanceBarcodeCodeUnique(tx, modelInput.BarcodeCode, modelInput.ID); err != nil {
			return err
		}
		if modelInput.ID != "" {
			var existing models.ProductAppearance
			if err := tx.Where("id = ?", modelInput.ID).First(&existing).Error; err == nil {
				if modelInput.Version != existing.Version {
					return ErrProductAppearanceVersionConflict
				}
				modelInput.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, "R1")
				modelInput.Version = existing.Version + 1
				if err := tx.Model(&existing).Updates(modelInput).Error; err != nil {
					return err
				}
				return tx.Where("id = ?", existing.ID).First(&saved).Error
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
		}

		modelInput.MasterDataControl.Normalize("R1")
		modelInput.Version = 1
		if modelInput.SortOrder <= 0 {
			nextSortOrder, err := nextProductAppearanceSortOrder(tx)
			if err != nil {
				return err
			}
			modelInput.SortOrder = nextSortOrder
		}
		if err := tx.Create(&modelInput).Error; err != nil {
			return err
		}
		saved = modelInput
		return nil
	})
	if err != nil {
		return models.ProductAppearance{}, err
	}
	return saved, nil
}

func PatchProductAppearance(input PatchProductAppearanceRequest) (models.ProductAppearance, error) {
	var updated models.ProductAppearance

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var current models.ProductAppearance
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", strings.TrimSpace(input.ID)).First(&current).Error; err != nil {
			return err
		}
		if input.ExpectedVersion != current.Version {
			return ErrProductAppearancePatchVersionConflict
		}

		if input.Name != nil {
			current.Name = strings.TrimSpace(*input.Name)
		}
		if input.BarcodeCode != nil {
			current.BarcodeCode = strings.TrimSpace(*input.BarcodeCode)
		}
		if input.Description != nil {
			current.Description = strings.TrimSpace(*input.Description)
		}
		if input.ImageURL != nil {
			current.ImageURL = strings.TrimSpace(*input.ImageURL)
		}
		if input.ImageThumbnailURL != nil {
			current.ImageThumbnailURL = strings.TrimSpace(*input.ImageThumbnailURL)
		}
		if input.ImageName != nil {
			current.ImageName = strings.TrimSpace(*input.ImageName)
		}
		if input.Active != nil {
			current.Active = *input.Active
		}
		if input.SortOrder != nil {
			current.SortOrder = *input.SortOrder
		}
		if input.RevisionNo != nil {
			current.RevisionNo = strings.TrimSpace(*input.RevisionNo)
		}
		if input.EffectiveFromSet {
			current.EffectiveFrom = input.EffectiveFrom
		}
		if input.EffectiveToSet {
			current.EffectiveTo = input.EffectiveTo
		}
		if input.ChangeType != nil {
			current.ChangeType = strings.TrimSpace(*input.ChangeType)
		}
		if input.ChangeOrderNo != nil {
			current.ChangeOrderNo = strings.TrimSpace(*input.ChangeOrderNo)
		}
		if input.SiteCode != nil {
			current.SiteCode = strings.TrimSpace(*input.SiteCode)
		}
		if input.IsDefaultSite != nil {
			current.IsDefaultSite = *input.IsDefaultSite
		}

		if err := validateProductAppearanceWriteInput(SaveProductAppearanceAPIRequest{
			Name:        current.Name,
			BarcodeCode: current.BarcodeCode,
		}); err != nil {
			return err
		}
		if err := ensureProductAppearanceBarcodeCodeUnique(tx, current.BarcodeCode, current.ID); err != nil {
			return err
		}

		current.MasterDataControl.Normalize("R1")
		current.Version++
		if err := tx.Save(&current).Error; err != nil {
			return err
		}
		updated = current
		return nil
	})
	if err != nil {
		return models.ProductAppearance{}, err
	}
	return updated, nil
}

func DeleteProductAppearance(id string) error {
	return db.DB.Delete(&models.ProductAppearance{}, "id = ?", strings.TrimSpace(id)).Error
}
