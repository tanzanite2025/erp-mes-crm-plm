// Package services - BOM Item 规范化与 Upsert。
//
// 此文件聚焦 BOM Item 的:
//   - 用量/损耗规范化 (normalizeBOMItems)
//   - Section 规范化与配置查找 (normalizeBOMItemSections / resolveBOMSectionConfig 等)
//   - Upsert 智能合并 (upsertBOMItems / upsertBOMItemsLegacy / saveBOMItems)
//
// 写路径主入口在 bom_service.go,
// 读路径在 bom_query.go,
// 校验/归属/唯一性在 bom_validation.go。
package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UpsertResult 记录 Upsert 操作的统计信息
type UpsertResult struct {
	Created int
	Updated int
	Deleted int
}

// normalizeBOMItems 根据 unitUsage + wastagePercent 派生 standardUsage(向上修正非负)。
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

// normalizeBOMSectionToken 把 section 标识规范化为大写无空白字符串,用于跨字段(code/name/legacyNames)匹配。
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

// resolveBOMSectionConfig 把任意输入(code / name / legacyName)解析回当前激活的 BOMSection 配置。
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

// normalizeBOMItemSections 把每行 item 的 Section 字段规范化为 BOMSection.Code(权威源)。
//
// 容错:输入可能是 code / name / legacyName,空值时回退到 default section。
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

// upsertBOMItems 智能 Upsert BOM Items,保持 ID 稳定性。
// 根据前端发送的 ID 判断是新增、更新还是删除。
//
// 兼容降级:如果所有 item 都没有 ID(旧版本前端),回退到 legacy 物理删除 + 重新插入。
func upsertBOMItems(tx *gorm.DB, bomID string, items []models.BOMItem) (*UpsertResult, error) {
	result := &UpsertResult{}

	allEmpty := len(items) > 0
	for _, item := range items {
		if strings.TrimSpace(item.ID) != "" {
			allEmpty = false
			break
		}
	}
	if allEmpty {
		return upsertBOMItemsLegacy(tx, bomID, items)
	}

	var existingItems []models.BOMItem
	if err := tx.Where("bom_id = ?", bomID).Find(&existingItems).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch existing items: %w", err)
	}

	existingMap := make(map[string]*models.BOMItem)
	for i := range existingItems {
		existingMap[existingItems[i].ID] = &existingItems[i]
	}

	var toCreate []models.BOMItem
	var toUpdate []models.BOMItem
	incomingIDs := make(map[string]bool)

	for idx := range items {
		item := &items[idx]
		item.BOMID = bomID
		item.SortOrder = idx // 持久化物理顺序

		if strings.TrimSpace(item.ID) == "" {
			item.ID = uuid.NewString()
			toCreate = append(toCreate, *item)
		} else if _, found := existingMap[item.ID]; found {
			toUpdate = append(toUpdate, *item)
		} else {
			// 有 ID 但当前 BOM 下不存在,视为新增(前端预生成 ID)
			toCreate = append(toCreate, *item)
		}

		incomingIDs[item.ID] = true
	}

	var toDelete []models.BOMItem
	for _, existing := range existingItems {
		if !incomingIDs[existing.ID] {
			toDelete = append(toDelete, existing)
		}
	}

	if len(toDelete) > 0 {
		deleteIDs := make([]string, len(toDelete))
		for i, item := range toDelete {
			deleteIDs[i] = item.ID
		}
		if err := tx.Where("id IN ?", deleteIDs).Delete(&models.BOMItem{}).Error; err != nil {
			return nil, fmt.Errorf("failed to delete items: %w", err)
		}
		result.Deleted = len(toDelete)
	}

	if len(toCreate) > 0 {
		if err := tx.Create(&toCreate).Error; err != nil {
			return nil, fmt.Errorf("failed to create items: %w", err)
		}
		result.Created = len(toCreate)
	}

	if len(toUpdate) > 0 {
		for _, item := range toUpdate {
			if err := tx.Save(&item).Error; err != nil {
				return nil, fmt.Errorf("failed to update item %s: %w", item.ID, err)
			}
		}
		result.Updated = len(toUpdate)
	}

	return result, nil
}

// upsertBOMItemsLegacy 旧逻辑:物理删除所有 + 重新插入(兼容旧版本前端无 ID 提交)。
func upsertBOMItemsLegacy(tx *gorm.DB, bomID string, items []models.BOMItem) (*UpsertResult, error) {
	if err := tx.Where("bom_id = ?", bomID).Delete(&models.BOMItem{}).Error; err != nil {
		return nil, err
	}

	for idx := range items {
		items[idx].ID = uuid.NewString()
		items[idx].BOMID = bomID
		items[idx].SortOrder = idx
	}

	if len(items) > 0 {
		if err := tx.Create(&items).Error; err != nil {
			return nil, err
		}
	}

	return &UpsertResult{Created: len(items)}, nil
}

// saveBOMItems 用于 Derive/Revise 路径:全部以新 ID 创建,不做存量比较。
func saveBOMItems(tx *gorm.DB, bomID string, items []models.BOMItem) error {
	for idx := range items {
		if strings.TrimSpace(items[idx].ID) == "" {
			items[idx].ID = uuid.NewString()
		}
		items[idx].BOMID = bomID
		items[idx].SortOrder = idx
		if err := tx.Session(&gorm.Session{FullSaveAssociations: true}).Create(&items[idx]).Error; err != nil {
			return err
		}
	}
	return nil
}
