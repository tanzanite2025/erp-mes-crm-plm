package services

import (
	"context"
	"encoding/json"
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
		Order("created_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&items).Error; err != nil {
		return nil, 0, err
	}
	hydrateBOMDerivedFields(items)
	return items, total, nil
}

func GetBOMByID(id string) (BOMDetailResponse, error) {
	var bom models.BOM
	if err := db.DB.
		Preload("Product").
		Preload("Items").
		First(&bom, "id = ?", id).Error; err != nil {
		return BOMDetailResponse{}, err
	}
	bom.DisplayVersion = resolveBOMDisplayVersion(bom)
	return MapBOMToDetailResponse(bom)
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

func normalizeBOMSectionToken(value string) string {
	return strings.ToUpper(strings.Join(strings.Fields(strings.TrimSpace(value)), ""))
}

func parseBOMSectionLegacyNames(raw json.RawMessage) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var values []string
	if err := json.Unmarshal(raw, &values); err != nil {
		return []string{}
	}
	result := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := normalizeBOMSectionToken(trimmed)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func defaultBOMSectionCode(sections []models.BOMSection) string {
	for _, section := range sections {
		if section.Active && section.IsDefault {
			return section.Code
		}
	}
	for _, section := range sections {
		if section.Active {
			return section.Code
		}
	}
	return ""
}

func resolveBOMSectionConfig(sections []models.BOMSection, raw string) *models.BOMSection {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}
	normalized := normalizeBOMSectionToken(trimmed)
	for idx := range sections {
		section := &sections[idx]
		if normalizeBOMSectionToken(section.Code) == normalized {
			return section
		}
		if normalizeBOMSectionToken(section.Name) == normalized {
			return section
		}
		for _, legacyName := range parseBOMSectionLegacyNames(section.LegacyNames) {
			if normalizeBOMSectionToken(legacyName) == normalized {
				return section
			}
		}
	}
	return nil
}

func normalizeBOMItemSections(tx *gorm.DB, items []models.BOMItem) ([]models.BOMItem, error) {
	var sections []models.BOMSection
	if err := tx.Order("sort_order asc, code asc").Find(&sections).Error; err != nil {
		return nil, err
	}
	if len(sections) == 0 {
		return nil, fmt.Errorf("[VALIDATION] no BOM section configuration found")
	}

	defaultCode := defaultBOMSectionCode(sections)
	if strings.TrimSpace(defaultCode) == "" {
		return nil, fmt.Errorf("[VALIDATION] no default BOM section configured")
	}

	for idx := range items {
		sectionConfig := resolveBOMSectionConfig(sections, items[idx].Section)
		if sectionConfig == nil {
			if strings.TrimSpace(items[idx].Section) == "" {
				sectionConfig = resolveBOMSectionConfig(sections, defaultCode)
			}
		}
		if sectionConfig == nil {
			return nil, fmt.Errorf("[VALIDATION] unsupported BOM section: %s", items[idx].Section)
		}
		items[idx].Section = sectionConfig.Code
	}
	return items, nil
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
		if err := tx.Session(&gorm.Session{FullSaveAssociations: true}).Create(&items[idx]).Error; err != nil {
			return err
		}
	}
	return nil
}

func SaveBOM(ctx context.Context, input SaveBOMInput) (BOMDetailResponse, error) {
	modelInput := input.toModel()
	normalizedRelationSidecar, err := normalizeRequiredBOMRelationSidecar(modelInput.RelationSidecar)
	if err != nil {
		return BOMDetailResponse{}, err
	}
	modelInput.RelationSidecar = normalizedRelationSidecar
	var saved models.BOM

	err = db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		normalizedItems, err := normalizeBOMItemSections(tx, modelInput.Items)
		if err != nil {
			return err
		}
		modelInput.Items = normalizedItems
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
			if err := tx.Preload("Items").Where("id = ?", modelInput.ID).First(&existing).Error; err != nil {
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
				First(&saved, "id = ?", existing.ID).Error; err != nil {
				return err
			}
			if err := writeBOMVersionSnapshotTx(ctx, tx, saved, "SAVE"); err != nil {
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
			First(&saved, "id = ?", modelInput.ID).Error; err != nil {
			return err
		}
		if err := writeBOMVersionSnapshotTx(ctx, tx, saved, "SAVE"); err != nil {
			return err
		}
		payload := bomAuditSnapshot(saved)
		payload["operation"] = "create"
		return writeBOMAuditEntryWithContext(ctx, tx, saved.ID, "SAVE", nil, payload)
	})
	if err != nil {
		return BOMDetailResponse{}, err
	}
	saved.DisplayVersion = resolveBOMDisplayVersion(saved)
	return MapBOMToDetailResponse(saved)
}

func DeleteBOM(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrBOMIDRequired
	}

	return db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var bom models.BOM
		if err := tx.Preload("Items").Where("id = ?", id).First(&bom).Error; err != nil {
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
		if err := writeBOMVersionSnapshotTx(ctx, tx, bom, "DELETE"); err != nil {
			return err
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
