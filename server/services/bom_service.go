package services

import (
	"context"
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func ListBOMs(query BOMListQuery) ([]models.BOM, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	productID := strings.TrimSpace(query.ProductID)
	tx := db.DB.Model(&models.BOM{})
	if productID != "" {
		tx = tx.Where("product_id = ?", productID)
	}

	if query.Options {
		var boms []models.BOM
		if err := tx.Order("created_at desc").Find(&boms).Error; err != nil {
			return nil, 0, err
		}
		hydrateBOMDerivedFields(boms)
		return boms, int64(len(boms)), nil
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []models.BOM
	if err := tx.
		Preload("Product").
		Preload("Items").
		Preload("Items.Substitutes").
		Preload("Items.Substitutes.Material").
		Order("created_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&items).Error; err != nil {
		return nil, 0, err
	}
	hydrateBOMDerivedFields(items)
	return items, total, nil
}

func GetBOMByID(id string) (models.BOM, error) {
	var bom models.BOM
	if err := db.DB.
		Preload("Product").
		Preload("Items").
		Preload("Items.Substitutes").
		Preload("Items.Substitutes.Material").
		First(&bom, "id = ?", id).Error; err != nil {
		return models.BOM{}, err
	}
	bom.DisplayVersion = resolveBOMDisplayVersion(bom)
	return bom, nil
}

func resolveBOMDisplayVersion(bom models.BOM) string {
	if strings.TrimSpace(bom.VersionText) != "" {
		return bom.VersionText
	}
	return "V1.0"
}

func hydrateBOMDerivedFields(items []models.BOM) {
	for idx := range items {
		items[idx].DisplayVersion = resolveBOMDisplayVersion(items[idx])
	}
}

func validateBOMReferences(tx *gorm.DB, input *models.BOM) error {
	if input.ProductID != "" {
		var p models.Product
		if err := tx.Where("id = ?", input.ProductID).First(&p).Error; err != nil {
			return err
		}
	}

	for _, item := range input.Items {
		if item.MaterialID != "" {
			var m models.Material
			if err := tx.Where("id = ?", item.MaterialID).First(&m).Error; err != nil {
				return err
			}
			if m.Status == "Archived" || m.Status == "Inactive" {
				return fmt.Errorf("[LOCKED_ASSET] BOM contains disabled material (%s - %s)", m.Code, m.Name)
			}
		}

		for _, substitute := range item.Substitutes {
			if strings.TrimSpace(substitute.MaterialID) == "" {
				return fmt.Errorf("[VALIDATION] substitute material is required")
			}
			if substitute.MaterialID == item.MaterialID {
				return fmt.Errorf("[VALIDATION] substitute material cannot equal primary material")
			}

			var alt models.Material
			if err := tx.Where("id = ?", substitute.MaterialID).First(&alt).Error; err != nil {
				return err
			}
			if alt.Status == "Archived" || alt.Status == "Inactive" {
				return fmt.Errorf("[LOCKED_ASSET] substitute material is disabled (%s - %s)", alt.Code, alt.Name)
			}
		}
	}

	return nil
}

func normalizeBOMItems(items []models.BOMItem) []models.BOMItem {
	for idx := range items {
		unitUsage := items[idx].UnitUsage
		wastagePercent := items[idx].WastagePercent
		items[idx].StandardUsage = unitUsage * (1 + wastagePercent/100)
		if items[idx].StandardUsage < 0 {
			items[idx].StandardUsage = 0
		}
	}
	return items
}

func validateUniqueActiveBOM(tx *gorm.DB, input *models.BOM) error {
	if strings.TrimSpace(input.ProductID) == "" || strings.TrimSpace(input.Status) != "active" {
		return nil
	}

	query := tx.Model(&models.BOM{}).
		Where("product_id = ? AND status = ?", input.ProductID, "active")
	if strings.TrimSpace(input.ID) != "" {
		query = query.Where("id <> ?", input.ID)
	}

	var activeCount int64
	if err := query.Count(&activeCount).Error; err != nil {
		return err
	}
	if activeCount > 0 {
		return fmt.Errorf("%w: product %s already has another active BOM", ErrBOMActiveConflict, input.ProductID)
	}
	return nil
}

func generateBOMNo(tx *gorm.DB) string {
	dateStr := time.Now().Format("20060102")
	var count int64
	tx.Model(&models.BOM{}).Where("bom_no LIKE ?", "BOM-"+dateStr+"-%").Count(&count)
	return fmt.Sprintf("BOM-%s-%03d", dateStr, count+1)
}

func saveBOMItems(tx *gorm.DB, bomID string, items []models.BOMItem) error {
	for idx := range items {
		if strings.TrimSpace(items[idx].ID) == "" {
			items[idx].ID = uuid.NewString()
		}
		items[idx].BOMID = bomID
		for subIdx := range items[idx].Substitutes {
			if strings.TrimSpace(items[idx].Substitutes[subIdx].ID) == "" {
				items[idx].Substitutes[subIdx].ID = uuid.NewString()
			}
			items[idx].Substitutes[subIdx].BOMItemID = items[idx].ID
			if items[idx].Substitutes[subIdx].ConversionRate == 0 {
				items[idx].Substitutes[subIdx].ConversionRate = 1
			}
			if items[idx].Substitutes[subIdx].Priority == 0 {
				items[idx].Substitutes[subIdx].Priority = subIdx + 1
			}
		}
		if err := tx.Session(&gorm.Session{FullSaveAssociations: true}).Create(&items[idx]).Error; err != nil {
			return err
		}
	}
	return nil
}

func SaveBOM(ctx context.Context, input SaveBOMInput) (models.BOM, error) {
	modelInput := input.toModel()
	var saved models.BOM

	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		modelInput.Items = normalizeBOMItems(modelInput.Items)
		if err := validateBOMReferences(tx, &modelInput); err != nil {
			return err
		}
		if err := validateUniqueActiveBOM(tx, &modelInput); err != nil {
			return err
		}

		defaultRevision := modelInput.VersionText
		if strings.TrimSpace(defaultRevision) == "" {
			defaultRevision = "V1.0"
		}
		if strings.TrimSpace(modelInput.RevisionNo) == "" {
			modelInput.RevisionNo = "R1"
		}

		if modelInput.ID != "" {
			var existing models.BOM
			if err := tx.Preload("Items").Preload("Items.Substitutes").Where("id = ?", modelInput.ID).First(&existing).Error; err != nil {
				return err
			}
			before := bomAuditSnapshot(existing)

			modelInput.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, defaultRevision)
			if strings.TrimSpace(modelInput.VersionText) == "" {
				modelInput.VersionText = existing.VersionText
			}
			if err := tx.Model(&existing).Omit("Items").Updates(modelInput).Error; err != nil {
				return err
			}
			if err := tx.Where("bom_id = ?", existing.ID).Delete(&models.BOMItem{}).Error; err != nil {
				return err
			}
			if err := saveBOMItems(tx, existing.ID, modelInput.Items); err != nil {
				return err
			}
			if err := tx.
				Preload("Items").
				Preload("Items.Substitutes").
				Preload("Items.Substitutes.Material").
				First(&saved, "id = ?", existing.ID).Error; err != nil {
				return err
			}
			payload := bomAuditSnapshot(saved)
			payload["operation"] = "update"
			return writeBOMAuditEntryWithContext(ctx, tx, saved.ID, "SAVE", before, payload)
		}

		modelInput.MasterDataControl.Normalize(defaultRevision)
		items := modelInput.Items
		modelInput.Items = nil
		if strings.TrimSpace(modelInput.BOMNo) == "" {
			modelInput.BOMNo = generateBOMNo(tx)
		}
		if err := tx.Create(&modelInput).Error; err != nil {
			return err
		}
		if err := saveBOMItems(tx, modelInput.ID, items); err != nil {
			return err
		}
		if err := tx.
			Preload("Items").
			Preload("Items.Substitutes").
			Preload("Items.Substitutes.Material").
			First(&saved, "id = ?", modelInput.ID).Error; err != nil {
			return err
		}
		payload := bomAuditSnapshot(saved)
		payload["operation"] = "create"
		return writeBOMAuditEntryWithContext(ctx, tx, saved.ID, "SAVE", nil, payload)
	})
	if err != nil {
		return models.BOM{}, err
	}
	saved.DisplayVersion = resolveBOMDisplayVersion(saved)
	return saved, nil
}

func DeleteBOM(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrBOMIDRequired
	}

	return db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var bom models.BOM
		if err := tx.Preload("Items").Preload("Items.Substitutes").Where("id = ?", id).First(&bom).Error; err != nil {
			return err
		}
		before := bomAuditSnapshot(bom)
		if strings.TrimSpace(bom.Status) == "active" {
			var activeCount int64
			if err := tx.Model(&models.BOM{}).
				Where("product_id = ? AND status = ?", bom.ProductID, "active").
				Count(&activeCount).Error; err != nil {
				return err
			}
			if activeCount <= 1 {
				return fmt.Errorf("%w: cannot delete the only active BOM for product %s", ErrBOMDeleteLockedActive, bom.ProductID)
			}
		}
		if err := tx.Where("bom_id = ?", id).Delete(&models.BOMItem{}).Error; err != nil {
			return err
		}
		if err := tx.Delete(&bom).Error; err != nil {
			return err
		}
		payload := bomAuditSnapshot(bom)
		payload["operation"] = "delete"
		return writeBOMAuditEntryWithContext(ctx, tx, bomAuditTargetID(bom), "DELETE", before, payload)
	})
}
