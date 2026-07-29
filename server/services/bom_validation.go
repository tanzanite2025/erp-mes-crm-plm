// Package services - BOM 校验、归属规范化、唯一性冲突包装、编号生成。
//
// 此文件聚焦 BOM 写入前后的"防御层":
//   - 引用完整性 (validateBOMReferences, checkBOMCircularReference)
//   - 业务完整性 (validateBOMBusinessIntegrity, RELEASED 阶段)
//   - 归属规范化 (validateBOMOwnership)
//   - DB 唯一索引冲突包装 (wrapBOMUniqueViolation, isPostgresUniqueViolation, isSqliteUniqueViolation)
//   - BOM 编号生成 (generateBOMNo)
//
// 写路径主入口 (Save/Promote/Derive/Revise) 在 bom_service.go,
// 读路径在 bom_query.go,
// Item 规范化与 Upsert 在 bom_items.go。
package services

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

// MaxBOMDepth 定义 BOM 最大嵌套深度（工业标准）
const MaxBOMDepth = 50

// validateBOMReferences 校验 BOM 引用的产品/物料是否存在,以及禁用物料/循环引用/同段重复物料。
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

			// 循环引用检查 (防止 A 包含 A 或 B->A 循环)
			if err := checkBOMCircularReference(tx, input.ProductID, item.MaterialID, make(map[string]bool), 0); err != nil {
				return err
			}
		}
	}

	// 同工艺段(Section)内物料唯一性校验
	sectionMaterialMap := make(map[string]map[string]bool)
	for _, item := range input.Items {
		if item.MaterialID == "" {
			continue
		}
		if sectionMaterialMap[item.Section] == nil {
			sectionMaterialMap[item.Section] = make(map[string]bool)
		}
		if sectionMaterialMap[item.Section][item.MaterialID] {
			return fmt.Errorf("[DUPLICATE_ITEM] Duplicate material %s found in section %s", item.MaterialID, item.Section)
		}
		sectionMaterialMap[item.Section][item.MaterialID] = true
	}

	return nil
}

// checkBOMCircularReference 递归检测 BOM 循环引用(带深度限制保护)。
func checkBOMCircularReference(tx *gorm.DB, rootProductID string, currentMaterialID string, visited map[string]bool, depth int) error {
	if depth > MaxBOMDepth {
		return fmt.Errorf("[DEPTH_EXCEEDED] BOM nesting exceeds maximum depth of %d levels. Please simplify the BOM structure", MaxBOMDepth)
	}

	if currentMaterialID == rootProductID {
		return fmt.Errorf("[CIRCULAR_REFERENCE] BOM circular dependency detected: Product depends on itself (ID: %s)", rootProductID)
	}

	if visited[currentMaterialID] {
		return nil
	}
	visited[currentMaterialID] = true

	var boms []models.BOM
	if err := tx.Where("product_id = ? AND status != ?", currentMaterialID, models.BOMStatusObsolete).
		Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("bom_items.sort_order ASC") }).Find(&boms).Error; err != nil {
		return err
	}

	for _, b := range boms {
		for _, item := range b.Items {
			if err := checkBOMCircularReference(tx, rootProductID, item.MaterialID, visited, depth+1); err != nil {
				return err
			}
		}
	}

	return nil
}

// validateBOMBusinessIntegrity 校验 BOM 业务完整性,仅在发布(RELEASED)时执行。
//
// 检查项:
//  1. 至少包含 1 行物料
//  2. 至少有一行物料的用量 > 0
//  3. 所有物料必须存在且状态为 Active
//  4. 方案 B 端到端权威源:RELEASED 必须有正向重量 + 单位
func validateBOMBusinessIntegrity(tx *gorm.DB, bomID string, targetStatus string) error {
	if targetStatus != models.BOMStatusReleased {
		return nil
	}

	var bom models.BOM
	if err := tx.Preload("Items").Where("id = ?", bomID).First(&bom).Error; err != nil {
		return err
	}

	if len(bom.Items) == 0 {
		return fmt.Errorf("[VALIDATION] Cannot release an empty BOM (ID: %s). At least one material is required", bomID)
	}

	hasValidUsage := false
	for _, item := range bom.Items {
		if item.UnitUsage > 0 || item.StandardUsage > 0 {
			hasValidUsage = true
			break
		}
	}
	if !hasValidUsage {
		return fmt.Errorf("[VALIDATION] Cannot release BOM with all zero-usage materials (ID: %s)", bomID)
	}

	for _, item := range bom.Items {
		var material models.Material
		if err := tx.Where("id = ?", item.MaterialID).First(&material).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("[VALIDATION] BOM contains non-existent material (ID: %s)", item.MaterialID)
			}
			return err
		}
		if material.Status != "Active" {
			return fmt.Errorf("[VALIDATION] BOM contains inactive material: %s - %s (Status: %s)", material.Code, material.Name, material.Status)
		}
	}

	if bom.MeasuredWeight <= 0 {
		return fmt.Errorf("[VALIDATION] Cannot release BOM (ID: %s) without a positive measuredWeight; product weight comes solely from BOM", bomID)
	}
	if strings.TrimSpace(bom.MeasuredWeightUnit) == "" {
		return fmt.Errorf("[VALIDATION] Cannot release BOM (ID: %s) without measuredWeightUnit; pick a WEIGHT-category unit from basic settings", bomID)
	}

	return nil
}

// validateBOMOwnership 规范化并校验 BOM 归属字段(方案 B + 1:1)。
//
// 业务规则:
//   - ownerType 必须是 INTERNAL / CUSTOMER 之一,空值规范化为 INTERNAL
//   - ownerType=CUSTOMER 时 ownerCustomerId 必须非空
//   - ownerType=INTERNAL 时 ownerCustomerId 必须为空(避免脏数据:内部 BOM 不该有客户绑定)
func validateBOMOwnership(input *models.BOM) error {
	ownerType := strings.TrimSpace(input.OwnerType)
	customerID := strings.TrimSpace(input.OwnerCustomerID)

	switch ownerType {
	case "", "INTERNAL":
		input.OwnerType = "INTERNAL"
		if customerID != "" {
			return fmt.Errorf("%w: ownerType=INTERNAL must not carry ownerCustomerId (got %s)", ErrBOMOwnershipInvalid, customerID)
		}
		input.OwnerCustomerID = ""
	case "CUSTOMER":
		if customerID == "" {
			return fmt.Errorf("%w: ownerType=CUSTOMER requires a non-empty ownerCustomerId", ErrBOMOwnershipInvalid)
		}
		input.OwnerCustomerID = customerID
	default:
		return fmt.Errorf("%w: unknown ownerType %q", ErrBOMOwnershipInvalid, ownerType)
	}
	return nil
}

// wrapBOMUniqueViolation 把 PostgreSQL/SQLite 唯一约束冲突转换成业务错误 ErrBOMActiveConflict,
// 带上 BOM 上下文便于排查。
//
// 思路 3 重构 (Step R8): 移除应用层 SELECT COUNT 软校验,改为乐观写入 + 捕获 DB 唯一索引报错。
//   - DB 层 idx_boms_released_unique_v2 是单一权威源
//   - 减少每次 BOM 写入一次 SELECT COUNT 开销
//   - 索引无 COALESCE,planner 命中更稳
func wrapBOMUniqueViolation(err error, bom *models.BOM) error {
	if err == nil {
		return nil
	}
	if !isDatabaseUniqueViolation(err) {
		return err
	}
	if bom == nil {
		return fmt.Errorf("%w: duplicate BOM violates unique constraint", ErrBOMActiveConflict)
	}
	ownerType := strings.TrimSpace(bom.OwnerType)
	if ownerType == "" {
		ownerType = "INTERNAL"
	}
	return fmt.Errorf(
		"%w: product %s already has a RELEASED MBOM for owner=%s/%s versionLevel=%q",
		ErrBOMActiveConflict,
		bom.ProductID,
		ownerType,
		strings.TrimSpace(bom.OwnerCustomerID),
		strings.TrimSpace(bom.VersionLevel),
	)
}

// generateBOMNo 生成形如 BOM-20260518-001-123 的 BOM 编号(日期前缀 + 当日序号 + 纳秒随机因子防竞态)。
func generateBOMNo(tx *gorm.DB) string {
	now := time.Now()
	dateStr := now.Format("20060102")
	var count int64
	tx.Model(&models.BOM{}).Where("bom_no LIKE ?", "BOM-"+dateStr+"-%").Count(&count)
	randFactor := now.UnixNano() % 1000
	return fmt.Sprintf("BOM-%s-%03d-%03d", dateStr, count+1, randFactor)
}
