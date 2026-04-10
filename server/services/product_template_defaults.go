package services

import (
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func defaultProductTemplates() []models.ProductTemplate {
	createdAt := time.Date(2026, time.January, 28, 0, 0, 0, 0, time.UTC)

	return []models.ProductTemplate{
		{
			BaseModel: models.BaseModel{
				ID:        "787d558d-71b5-4a5d-a602-990a986f1e2c",
				CreatedAt: createdAt,
				UpdatedAt: createdAt,
			},
			Name:         "Rim Physical Spec Template",
			Code:         "RIM_STD",
			ComponentKey: "RIM",
			Description:  "Standard geometry template for rim products.",
			Active:       true,
			Version:      1,
		},
		{
			BaseModel: models.BaseModel{
				ID:        "8e88e89f-8671-460c-8f4b-09257e8cc49a",
				CreatedAt: createdAt,
				UpdatedAt: createdAt,
			},
			Name:         "Stem Physical Spec Template",
			Code:         "STEM_STD",
			ComponentKey: "STEM",
			Description:  "Physical spec template for stems and related components.",
			Active:       true,
			Version:      1,
		},
		{
			BaseModel: models.BaseModel{
				ID:        "c2c1a8d0-6f9a-4c28-98e7-789a695e1234",
				CreatedAt: createdAt,
				UpdatedAt: createdAt,
			},
			Name:         "Fork Physical Spec Template",
			Code:         "FORK_STD",
			ComponentKey: "FORK",
			Description:  "Parameter definition template for composite forks.",
			Active:       true,
			Version:      1,
		},
	}
}

func ensureDefaultProductTemplates(tx *gorm.DB) error {
	var count int64
	if err := tx.Model(&models.ProductTemplate{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	defaults := defaultProductTemplates()
	for idx := range defaults {
		defaults[idx].MasterDataControl.Normalize("R1")
		if defaults[idx].Version == 0 {
			defaults[idx].Version = 1
		}
	}

	return tx.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "code"}},
		DoNothing: true,
	}).Create(&defaults).Error
}
