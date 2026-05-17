// Package services - BOM 读路径与查询参数解析。
//
// 此文件聚焦 BOM 的列表/详情读路径和查询参数的解析、校验。
// 写路径(Save/Promote/Derive/Revise)在 bom_service.go,
// 校验/归属/唯一性在 bom_validation.go,
// Item 规范化在 bom_items.go。
package services

import (
	"fmt"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

// ValidBOMStatuses defines all valid BOM status values
var ValidBOMStatuses = []string{
	models.BOMStatusDraft,
	models.BOMStatusReviewing,
	models.BOMStatusApproved,
	models.BOMStatusReleased,
	models.BOMStatusObsolete,
}

// ValidBOMTypes defines all valid BOM type values
var ValidBOMTypes = []string{
	models.BOMTypeEBOM,
	models.BOMTypeMBOM,
}

// parseAndValidateStatuses parses comma-separated status string and validates each value
func parseAndValidateStatuses(statusStr string) ([]string, error) {
	if statusStr == "" {
		return nil, nil
	}

	statuses := strings.Split(statusStr, ",")
	var result []string
	var invalid []string

	for _, s := range statuses {
		trimmed := strings.TrimSpace(strings.ToUpper(s))
		if trimmed == "" {
			continue
		}

		if !contains(ValidBOMStatuses, trimmed) {
			invalid = append(invalid, s)
		} else {
			result = append(result, trimmed)
		}
	}

	if len(invalid) > 0 {
		return nil, fmt.Errorf("invalid status values: %s. Valid values are: %s",
			strings.Join(invalid, ", "),
			strings.Join(ValidBOMStatuses, ", "))
	}

	return result, nil
}

// parseAndValidateBOMTypes parses comma-separated BOM type string and validates each value
func parseAndValidateBOMTypes(bomTypeStr string) ([]string, error) {
	if bomTypeStr == "" {
		return nil, nil
	}

	types := strings.Split(bomTypeStr, ",")
	var result []string
	var invalid []string

	for _, t := range types {
		trimmed := strings.TrimSpace(strings.ToUpper(t))
		if trimmed == "" {
			continue
		}

		if !contains(ValidBOMTypes, trimmed) {
			invalid = append(invalid, t)
		} else {
			result = append(result, trimmed)
		}
	}

	if len(invalid) > 0 {
		return nil, fmt.Errorf("invalid BOM type values: %s. Valid values are: %s",
			strings.Join(invalid, ", "),
			strings.Join(ValidBOMTypes, ", "))
	}

	return result, nil
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// ListBOMs 按筛选条件分页查询 BOM。
//
// query.Options=true 时返回去分页的精简列表(供下拉等场景用)。
func ListBOMs(query BOMListQuery) ([]models.BOM, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	statuses, err := parseAndValidateStatuses(query.Status)
	if err != nil {
		return nil, 0, err
	}

	bomTypes, err := parseAndValidateBOMTypes(query.BOMType)
	if err != nil {
		return nil, 0, err
	}

	productID := strings.TrimSpace(query.ProductID)

	tx := db.DB.Model(&models.BOM{})

	if productID != "" {
		tx = tx.Where("product_id = ?", productID)
	}
	if len(statuses) > 0 {
		tx = tx.Where("status IN ?", statuses)
	}
	if len(bomTypes) > 0 {
		tx = tx.Where("bom_type IN ?", bomTypes)
	}

	if query.Options {
		var boms []models.BOM
		if err := tx.Order("created_at desc").Find(&boms).Error; err != nil {
			return nil, 0, err
		}
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
	return items, total, nil
}

// GetBOMByID 加载单个 BOM 详情(包含产品、items 关联)并映射为 API 响应。
func GetBOMByID(id string) (BOMDetailResponse, error) {
	var bom models.BOM
	if err := db.DB.
		Preload("Product").
		Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("bom_items.sort_order ASC") }).
		First(&bom, "id = ?", id).Error; err != nil {
		return BOMDetailResponse{}, err
	}
	return MapBOMToDetailResponse(bom)
}

func resolveBOMDisplayVersion(bom models.BOM) string {
	if strings.TrimSpace(bom.VersionText) != "" {
		return bom.VersionText
	}
	return "V1.0"
}
