package services

import (
	"errors"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// The reserved storage category is internal to the performance version catalog.
// Users can create performance versions even when legacy product categories were
// never initialized or were archived; no product category selection is required.
func ensureBOMPerformanceVersionCatalogCategoryWithinTransaction(tx *gorm.DB) error {
	var category models.ProductAttributeCategory
	err := tx.Unscoped().Where("LOWER(key) = ?", "versionlevel").
		Order("deleted_at ASC NULLS FIRST").First(&category).Error
	if err == nil {
		if !category.DeletedAt.Valid {
			return nil
		}
		return tx.Unscoped().Model(&category).Updates(map[string]interface{}{
			"deleted_at": nil, "name_zh": "性能版本", "name_en": "Performance Version",
		}).Error
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	category = models.ProductAttributeCategory{
		Key: "versionLevel", NameZh: "性能版本", NameEn: "Performance Version",
		Description: "BOM 性能版本分类", Active: true, SortOrder: 40, Version: 1,
	}
	category.MasterDataControl.Normalize("R1")
	return tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&category).Error
}
