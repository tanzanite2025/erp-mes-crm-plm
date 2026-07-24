package db

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"
	"xdfc-server/productidentity"
	"xdfc-server/salesorderidentity"

	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

type duplicatePackagingRuleRow struct {
	MaterialID string
	Count      int64
}

type duplicateProductAttributeOptionRow struct {
	ID          string
	CategoryKey string
	Value       string
	SortOrder   int
}

func normalizeProductAttributeMachineValueForDB(value string) string {
	result := make([]rune, 0, len(value))
	lastWasSeparator := false
	for _, r := range value {
		switch {
		case r >= 'A' && r <= 'Z':
			result = append(result, r+('a'-'A'))
			lastWasSeparator = false
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			result = append(result, r)
			lastWasSeparator = false
		case r == '-' || r == '_' || r == ' ' || r == '\t' || r == '\n' || r == '\r':
			if len(result) == 0 || lastWasSeparator {
				continue
			}
			result = append(result, '-')
			lastWasSeparator = true
		default:
			if len(result) == 0 || lastWasSeparator {
				continue
			}
			result = append(result, '-')
			lastWasSeparator = true
		}
	}
	for len(result) > 0 && result[len(result)-1] == '-' {
		result = result[:len(result)-1]
	}
	return string(result)
}

func cleanupDuplicateProductAttributeOptions() {
	if DB == nil || !DB.Migrator().HasTable(&models.ProductAttributeOption{}) || !DB.Migrator().HasTable(&models.ProductAttributeValue{}) {
		return
	}

	var options []duplicateProductAttributeOptionRow
	if err := DB.Table("product_attribute_options").
		Select("id", "category AS category_key", "value", "sort_order").
		Order("category asc").
		Order("sort_order asc").
		Order("id asc").
		Scan(&options).Error; err != nil {
		log.Fatal("Failed to scan product_attribute_options for cleanup:", err)
	}

	type groupedOptions struct {
		categoryKey string
		normalized  string
		items       []duplicateProductAttributeOptionRow
	}

	groups := make(map[string]*groupedOptions)
	for _, option := range options {
		normalized := normalizeProductAttributeMachineValueForDB(option.Value)
		if normalized == "" {
			continue
		}
		key := option.CategoryKey + "::" + normalized
		if groups[key] == nil {
			groups[key] = &groupedOptions{categoryKey: option.CategoryKey, normalized: normalized}
		}
		groups[key].items = append(groups[key].items, option)
	}

	err := DB.Transaction(func(tx *gorm.DB) error {
		for _, group := range groups {
			if len(group.items) == 0 {
				continue
			}

			canonical := group.items[0]
			for _, item := range group.items[1:] {
				if canonical.Value != group.normalized && item.Value == group.normalized {
					canonical = item
					continue
				}
				if item.SortOrder < canonical.SortOrder || (item.SortOrder == canonical.SortOrder && item.ID < canonical.ID) {
					canonical = item
				}
			}

			candidateValues := []string{canonical.Value, group.normalized}
			duplicateIDs := make([]string, 0)
			for _, item := range group.items {
				if item.ID == canonical.ID {
					continue
				}
				duplicateIDs = append(duplicateIDs, item.ID)
				candidateValues = append(candidateValues, item.Value)
			}

			if canonical.Value != group.normalized {
				if err := tx.Exec("UPDATE product_attribute_options SET value = ? WHERE id = ?", group.normalized, canonical.ID).Error; err != nil {
					return err
				}
			}

			seen := make(map[string]struct{}, len(candidateValues))
			uniqueValues := make([]string, 0, len(candidateValues))
			for _, value := range candidateValues {
				trimmed := strings.TrimSpace(value)
				if trimmed == "" {
					continue
				}
				if _, exists := seen[trimmed]; exists {
					continue
				}
				seen[trimmed] = struct{}{}
				uniqueValues = append(uniqueValues, trimmed)
			}

			if len(uniqueValues) > 0 {
				if err := tx.Exec("UPDATE product_attribute_values SET option_value = ? WHERE category_key = ? AND option_value IN ?", group.normalized, group.categoryKey, uniqueValues).Error; err != nil {
					return err
				}
			}

			if len(duplicateIDs) > 0 {
				if err := tx.Exec("DELETE FROM product_attribute_options WHERE id IN ?", duplicateIDs).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		log.Fatal("Failed to cleanup duplicate product attribute options:", err)
	}
}

func ensureProductAttributeOptionValueUniqueIndex() {
	if DB == nil || !DB.Migrator().HasTable(&models.ProductAttributeOption{}) {
		return
	}
	if err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(2026051202)").Error; err != nil {
			return err
		}
		if err := tx.Exec("DROP INDEX IF EXISTS idx_product_attribute_options_category_value_ci").Error; err != nil {
			return err
		}
		if err := tx.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_product_attribute_options_category_value_ci ON product_attribute_options (category, LOWER(value)) WHERE deleted_at IS NULL").Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		log.Fatal("Failed to enforce product attribute option value uniqueness:", err)
	}
}

// ensureBusinessEventSourceCodeUniqueIndex 把业务事件源 code 上的 unique 约束改为
// 排除软删记录的部分索引，让删除事件源后能立即重用同名 code。
func ensureBusinessEventSourceCodeUniqueIndex() {
	if DB == nil || !DB.Migrator().HasTable(&models.BusinessEventSource{}) {
		return
	}
	if err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(2026111801)").Error; err != nil {
			return err
		}
		// 先清掉 GORM uniqueIndex 标签历史上创建的无条件 unique 索引（如果存在）。
		if err := tx.Exec("DROP INDEX IF EXISTS idx_business_event_sources_code").Error; err != nil {
			return err
		}
		// 创建带 WHERE deleted_at IS NULL 的部分 unique 索引：
		//   - 活跃记录之间 code 唯一
		//   - 软删除记录不参与唯一性判定，code 立即可重用
		if err := tx.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_business_event_sources_code ON business_event_sources (code) WHERE deleted_at IS NULL").Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		log.Fatal("Failed to enforce business event source code uniqueness:", err)
	}
}

func ensureProductAttributeCategoryKeyUniqueIndex() {
	if DB == nil || !DB.Migrator().HasTable(&models.ProductAttributeCategory{}) {
		return
	}
	if err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(2026051201)").Error; err != nil {
			return err
		}
		if err := tx.Exec("DROP INDEX IF EXISTS idx_product_attribute_categories_key").Error; err != nil {
			return err
		}
		if err := tx.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_product_attribute_categories_key ON product_attribute_categories (LOWER(key)) WHERE deleted_at IS NULL").Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		log.Fatal("Failed to enforce product attribute category key uniqueness:", err)
	}
}

func failOnDuplicatePackagingRules() {
	if DB == nil || !DB.Migrator().HasTable(&models.PackagingRule{}) {
		return
	}

	var duplicates []duplicatePackagingRuleRow
	err := DB.Table("packaging_rules").
		Select("material_id, COUNT(*) AS count").
		Group("material_id").
		Having("COUNT(*) > 1").
		Scan(&duplicates).Error
	if err != nil {
		log.Fatal("Failed to verify packaging_rules uniqueness before migration:", err)
	}

	if len(duplicates) == 0 {
		return
	}

	samples := make([]string, 0, len(duplicates))
	for _, dup := range duplicates {
		samples = append(samples, fmt.Sprintf("%s(x%d)", dup.MaterialID, dup.Count))
	}
	log.Fatalf("[CRITICAL_DATA_INTEGRITY] packaging_rules contains duplicate material_id values. Clean these duplicates before startup: %s", strings.Join(samples, ", "))
}

func ensurePackagingRuleMaterialUniqueIndex() {
	if DB == nil || !DB.Migrator().HasTable(&models.PackagingRule{}) {
		return
	}

	if err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(2026041701)").Error; err != nil {
			return err
		}
		if err := tx.Exec("DROP INDEX IF EXISTS idx_packaging_rules_material_id").Error; err != nil {
			return err
		}
		if err := tx.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_packaging_rules_material_id ON packaging_rules (material_id)").Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		log.Fatal("Failed to enforce packaging_rules material_id uniqueness:", err)
	}
}

func defaultProductAttributeOptions() []models.ProductAttributeOption {
	return []models.ProductAttributeOption{
		{CategoryKey: "techSeries", Value: "normal", LabelZh: "常规系列", LabelEn: "Standard Series", Description: "常温常规工艺系列", SortOrder: 10, Active: true},
		{CategoryKey: "techSeries", Value: "high-tg", LabelZh: "高温系列", LabelEn: "High TG Series", Description: "高温工艺系列", SortOrder: 20, Active: true},
		{CategoryKey: "tireType", Value: "hooked", LabelZh: "有钩", LabelEn: "Hooked", Description: "有钩车圈类型", SortOrder: 10, Active: true},
		{CategoryKey: "tireType", Value: "hookless", LabelZh: "无钩", LabelEn: "Hookless", Description: "无钩车圈类型", SortOrder: 20, Active: true},
		{CategoryKey: "tireType", Value: "tubular", LabelZh: "管胎", LabelEn: "Tubular", Description: "管胎车圈类型", SortOrder: 30, Active: true},
		{CategoryKey: "brakeType", Value: "disc", LabelZh: "碟刹", LabelEn: "Disc", Description: "碟刹制动类型", SortOrder: 10, Active: true},
		{CategoryKey: "versionLevel", Value: "std", LabelZh: "标准版", LabelEn: "Standard", Description: "标准版本等级", SortOrder: 10, Active: true},
		{CategoryKey: "versionLevel", Value: "lightweight", LabelZh: "轻量版", LabelEn: "Lightweight", Description: "轻量化版本等级", SortOrder: 20, Active: true},
		{CategoryKey: "versionLevel", Value: "ultralight", LabelZh: "超轻版", LabelEn: "Ultralight", Description: "超轻版本等级", SortOrder: 30, Active: true},
		{CategoryKey: "versionLevel", Value: "reinforced", LabelZh: "加强版", LabelEn: "Reinforced", Description: "加强型版本等级", SortOrder: 40, Active: true},
	}
}

func defaultProductAttributeCategories() []models.ProductAttributeCategory {
	return []models.ProductAttributeCategory{
		{Key: "techSeries", NameZh: "工艺系列", NameEn: "Technical Series", Description: "产品工艺系列分类", SortOrder: 10, Active: true},
		{Key: "tireType", NameZh: "轮圈类型", NameEn: "Rim Type", Description: "产品轮圈类型分类", SortOrder: 20, Active: true},
		{Key: "brakeType", NameZh: "制动类型", NameEn: "Brake Type", Description: "产品制动类型分类", SortOrder: 30, Active: true},
		{Key: "versionLevel", NameZh: "版本等级", NameEn: "Version Level", Description: "产品版本等级分类", SortOrder: 40, Active: true},
	}
}

func ensureDefaultProductAttributeCategories() {
	if DB == nil || !DB.Migrator().HasTable(&models.ProductAttributeCategory{}) {
		return
	}

	var existingCount int64
	if err := DB.Unscoped().Model(&models.ProductAttributeCategory{}).Count(&existingCount).Error; err != nil {
		log.Fatal("[CRITICAL] Failed to count product attribute categories before seeding: ", err)
	}
	if existingCount > 0 {
		return
	}

	for _, category := range defaultProductAttributeCategories() {
		item := category
		item.MasterDataControl.Normalize("R1")
		item.Version = 1
		if err := DB.Create(&item).Error; err != nil {
			log.Fatal("[CRITICAL] Failed to seed default product attribute category: ", err)
		}
	}
}

func ensureDefaultProductAttributeOptions() {
	if DB == nil || !DB.Migrator().HasTable(&models.ProductAttributeOption{}) {
		return
	}

	var existingCount int64
	if err := DB.Unscoped().Model(&models.ProductAttributeOption{}).Count(&existingCount).Error; err != nil {
		log.Fatal("[CRITICAL] Failed to count product attribute options before seeding: ", err)
	}
	if existingCount > 0 {
		return
	}

	for _, option := range defaultProductAttributeOptions() {
		item := option
		item.MasterDataControl.Normalize("R1")
		item.Version = 1
		if err := DB.Create(&item).Error; err != nil {
			log.Fatal("[CRITICAL] Failed to seed default product attribute option: ", err)
		}
	}
}

func ensureDefaultWarehouseCategories() {
	if DB == nil || !DB.Migrator().HasTable(&models.WarehouseCategory{}) {
		return
	}

	for _, category := range models.DefaultWarehouseCategories {
		var existing models.WarehouseCategory
		err := DB.Where("code = ?", category.Code).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			item := category
			if createErr := DB.Create(&item).Error; createErr != nil {
				log.Fatal("[CRITICAL] Failed to seed default warehouse category: ", createErr)
			}
			continue
		}

		if err != nil {
			log.Fatal("[CRITICAL] Failed to query default warehouse category: ", err)
		}

		updates := map[string]interface{}{}
		if !existing.IsSystem {
			updates["is_system"] = true
		}
		if !existing.Active {
			updates["active"] = true
		}
		if existing.Name == "" {
			updates["name"] = category.Name
		}
		if existing.Description == "" && category.Description != "" {
			updates["description"] = category.Description
		}
		if existing.SortOrder == 0 {
			updates["sort_order"] = category.SortOrder
		}
		if !existing.AllowInbound && !existing.AllowShipment && !existing.AllowStocktake &&
			!existing.AllowPurchaseReceipt && !existing.DefaultForProductInbound &&
			!existing.DefaultForMaterialInbound && !existing.DefaultForPurchaseReceipt {
			updates["allow_inbound"] = category.AllowInbound
			updates["allow_shipment"] = category.AllowShipment
			updates["allow_stocktake"] = category.AllowStocktake
			updates["allow_purchase_receipt"] = category.AllowPurchaseReceipt
			updates["default_for_product_inbound"] = category.DefaultForProductInbound
			updates["default_for_material_inbound"] = category.DefaultForMaterialInbound
			updates["default_for_purchase_receipt"] = category.DefaultForPurchaseReceipt
		}

		if len(updates) == 0 {
			continue
		}
		if updateErr := DB.Model(&existing).Updates(updates).Error; updateErr != nil {
			log.Fatal("[CRITICAL] Failed to align default warehouse category: ", updateErr)
		}
	}

	ensureWarehouseCategoryDefaultFlag("default_for_product_inbound", "FINISHED")
	ensureWarehouseCategoryDefaultFlag("default_for_material_inbound", "MATERIAL")
	ensureWarehouseCategoryDefaultFlag("default_for_purchase_receipt", "MATERIAL")
}

func ensureWarehouseCategoryDefaultFlag(column string, code string) {
	var count int64
	if err := DB.Model(&models.WarehouseCategory{}).Where(column+" = ?", true).Count(&count).Error; err != nil {
		log.Fatal("[CRITICAL] Failed to verify warehouse category default flag: ", err)
	}
	if count > 0 {
		return
	}

	if err := DB.Model(&models.WarehouseCategory{}).
		Where("code = ?", code).
		Update(column, true).Error; err != nil {
		log.Fatal("[CRITICAL] Failed to backfill warehouse category default flag: ", err)
	}
}

func ensureDefaultBOMSections() {
	if DB == nil || !DB.Migrator().HasTable(&models.BOMSection{}) {
		return
	}

	appendUnique := func(values []string, next string) []string {
		trimmed := strings.TrimSpace(next)
		if trimmed == "" {
			return values
		}
		for _, value := range values {
			if strings.TrimSpace(value) == trimmed {
				return values
			}
		}
		return append(values, trimmed)
	}

	for _, section := range models.DefaultBOMSections {
		var existing models.BOMSection
		err := DB.Where("code = ?", section.Code).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			item := section
			if createErr := DB.Create(&item).Error; createErr != nil {
				log.Fatal("[CRITICAL] Failed to seed default BOM section: ", createErr)
			}
			continue
		}

		if err != nil {
			log.Fatal("[CRITICAL] Failed to query default BOM section: ", err)
		}

		updates := map[string]interface{}{}
		if !existing.IsSystem {
			updates["is_system"] = true
		}
		if !existing.Active {
			updates["active"] = true
		}
		if existing.Name == "" {
			updates["name"] = section.Name
		}
		if existing.SortOrder == 0 {
			updates["sort_order"] = section.SortOrder
		}
		legacyNames := make([]string, 0)
		if len(existing.LegacyNames) > 0 {
			if unmarshalErr := json.Unmarshal(existing.LegacyNames, &legacyNames); unmarshalErr != nil {
				log.Fatal("[CRITICAL] Failed to parse BOM section legacy names: ", unmarshalErr)
			}
		}
		legacyNames = appendUnique(legacyNames, existing.Name)
		legacyNames = appendUnique(legacyNames, section.Name)
		legacyRaw, marshalErr := json.Marshal(legacyNames)
		if marshalErr != nil {
			log.Fatal("[CRITICAL] Failed to marshal BOM section legacy names: ", marshalErr)
		}
		if string(existing.LegacyNames) != string(legacyRaw) {
			updates["legacy_names"] = legacyRaw
		}

		if len(updates) == 0 {
			continue
		}
		if updateErr := DB.Model(&existing).Updates(updates).Error; updateErr != nil {
			log.Fatal("[CRITICAL] Failed to align default BOM section: ", updateErr)
		}
	}

	ensureDefaultBOMSectionFlag("PREPARE")
}

func ensureDefaultBOMSectionFlag(code string) {
	var count int64
	if err := DB.Model(&models.BOMSection{}).Where("is_default = ? AND active = ?", true, true).Count(&count).Error; err != nil {
		log.Fatal("[CRITICAL] Failed to verify BOM section default flag: ", err)
	}
	if count > 0 {
		return
	}

	if err := DB.Model(&models.BOMSection{}).
		Where("code = ?", code).
		Updates(map[string]interface{}{"is_default": true, "active": true}).Error; err != nil {
		log.Fatal("[CRITICAL] Failed to backfill BOM section default flag: ", err)
	}
}

func ensureProductIntegrityConstraints() {
	if DB == nil || !DB.Migrator().HasTable(&models.Product{}) {
		return
	}

	if err := DB.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_sku_not_blank'
			) THEN
				ALTER TABLE products
				ADD CONSTRAINT chk_products_sku_not_blank
				CHECK (sku IS NOT NULL AND length(btrim(sku)) > 0) NOT VALID;
			END IF;
		END
		$$;
	`).Error; err != nil {
		log.Fatal("Failed to add products sku integrity constraint:", err)
	}
}

func ensureSalesOrderIntegrityConstraints() {
	if DB == nil || !DB.Migrator().HasTable(&models.SalesOrder{}) {
		return
	}

	if err := DB.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_orders_order_no_not_blank'
			) THEN
				ALTER TABLE sales_orders
				ADD CONSTRAINT chk_sales_orders_order_no_not_blank
				CHECK (order_no IS NOT NULL AND length(btrim(order_no)) > 0) NOT VALID;
			END IF;
		END
		$$;
	`).Error; err != nil {
		log.Fatal("Failed to add sales_orders order_no integrity constraint:", err)
	}
}

func backfillTradingSoftDeleteTimestamps() {
	if DB == nil {
		return
	}

	targets := []string{
		"sales_orders",
		"purchase_orders",
		"customers",
		"suppliers",
	}

	for _, tableName := range targets {
		if !DB.Migrator().HasTable(tableName) {
			continue
		}
		if !DB.Migrator().HasColumn(tableName, "deleted_at") || !DB.Migrator().HasColumn(tableName, "is_deleted") {
			continue
		}
		if err := DB.Exec(
			"UPDATE " + tableName + " SET deleted_at = COALESCE(deleted_at, updated_at, created_at, NOW()) WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = TRUE",
		).Error; err != nil {
			log.Fatal("Failed to backfill deleted_at for table ", tableName, ": ", err)
		}
	}
}

func dropLegacyWorkflowArtifacts() {
	if DB == nil || DB.Dialector.Name() != "postgres" {
		return
	}

	if err := DB.Exec(`
		DROP TABLE IF EXISTS workflow_tasks, workflow_instances, workflow_definitions CASCADE;
		ALTER TABLE sales_orders DROP COLUMN IF EXISTS workflow_instance_id;
		ALTER TABLE purchase_orders DROP COLUMN IF EXISTS workflow_instance_id;
	`).Error; err != nil {
		log.Fatal("Failed to drop legacy workflow artifacts:", err)
	}
}

// dropLegacyProductWeightColumn 把 products.weight 列彻底从数据库移除。
//
// 方案 B（端到端 BOM 权威源）：产品的最终重量改由 BOM.MeasuredWeight 持有，
// Product 表不再保留 weight 字段。这里使用幂等的 DROP COLUMN IF EXISTS，
// 历史 weight 数据会随列一起丢弃（已与产品 owner 确认接受 D1 干净切换）。
func dropLegacyProductWeightColumn() {
	if DB == nil || DB.Dialector.Name() != "postgres" {
		return
	}

	if !DB.Migrator().HasTable("products") {
		return
	}
	if !DB.Migrator().HasColumn("products", "weight") {
		return
	}

	if err := DB.Exec(`ALTER TABLE products DROP COLUMN IF EXISTS weight`).Error; err != nil {
		log.Fatal("Failed to drop legacy products.weight column:", err)
	}
}

// migrateProductOwnershipToBOMs 把归属语义从 Product 迁移到 BOM（方案 B + 1:1 第二阶段）。
//
// 业务背景：同一产品可能服务不同对象（内部 / 客户A / 客户B），归属是 BOM 维度的事实，
// 不是 Product 维度的事实。因此 Product.owner_type / owner_customer_id 被移除，
// BOM.owner_type / owner_customer_id 成为新的权威字段。
//
// 迁移流程：
//  1. AutoMigrate 自动给 boms 加列（NOT NULL DEFAULT 'INTERNAL'）
//  2. 把每个产品的归属信息回填到该产品的所有 BOM（保留历史归属一致性）
//  3. 幂等地 DROP COLUMN products.owner_type / owner_customer_id
//
// 用户已确认接受 D1 干净切换：没 BOM 的产品归属信息丢失。
func migrateProductOwnershipToBOMs() {
	if DB == nil || DB.Dialector.Name() != "postgres" {
		return
	}

	if !DB.Migrator().HasTable("products") || !DB.Migrator().HasTable("boms") {
		return
	}

	hasProductOwnerType := DB.Migrator().HasColumn("products", "owner_type")
	hasProductOwnerCustomer := DB.Migrator().HasColumn("products", "owner_customer_id")

	// 1. 数据回填：把 products.owner_type / owner_customer_id 复制到对应 BOM
	if hasProductOwnerType {
		if err := DB.Exec(`
			UPDATE boms b
			SET owner_type = COALESCE(NULLIF(p.owner_type, ''), 'INTERNAL')
			FROM products p
			WHERE b.product_id = p.id
		`).Error; err != nil {
			log.Fatal("Failed to backfill boms.owner_type from products:", err)
		}
	}
	if hasProductOwnerCustomer {
		if err := DB.Exec(`
			UPDATE boms b
			SET owner_customer_id = NULLIF(p.owner_customer_id::text, '')::uuid
			FROM products p
			WHERE b.product_id = p.id
			  AND p.owner_customer_id IS NOT NULL
			  AND p.owner_customer_id::text <> ''
		`).Error; err != nil {
			log.Fatal("Failed to backfill boms.owner_customer_id from products:", err)
		}
	}

	// 2. 删除 products 上的归属列（幂等）
	if hasProductOwnerCustomer {
		if err := DB.Exec(`ALTER TABLE products DROP COLUMN IF EXISTS owner_customer_id`).Error; err != nil {
			log.Fatal("Failed to drop legacy products.owner_customer_id column:", err)
		}
	}
	if hasProductOwnerType {
		if err := DB.Exec(`ALTER TABLE products DROP COLUMN IF EXISTS owner_type`).Error; err != nil {
			log.Fatal("Failed to drop legacy products.owner_type column:", err)
		}
	}
}

// migrateProductVersionLevelToBOMs 把 versionLevel 从 Product 迁到 BOM（思路 3 重构 Step R3 → R7）。
//
// 业务背景：versionLevel 原本作为产品身份属性挂在 Product 上,导致同 typeId 下不同档次只能拆成多个
// Product 实体。重构后 versionLevel 是配方层标签,挂到 BOM 上,1 个 Product 可以挂多份不同档次的 BOM。
//
// 迁移流程（Step R7 完整态,D1 干净切换）：
//  1. AutoMigrate 自动给 boms 加 version_level 列(允许为空)
//  2. 若 products 仍有 version_level 列,先把每个产品的 versionLevel 回填到该产品所有 BOM
//  3. 物理删除 products.version_level 列(R7 切换:Product 不再持有该字段)
//
// 幂等：可重复执行(列已删则跳过)。
func migrateProductVersionLevelToBOMs() {
	if DB == nil || DB.Dialector.Name() != "postgres" {
		return
	}

	if !DB.Migrator().HasTable("products") || !DB.Migrator().HasTable("boms") {
		return
	}

	if !DB.Migrator().HasColumn("boms", "version_level") {
		return
	}

	hasProductVersionLevel := DB.Migrator().HasColumn("products", "version_level")

	// 1. 回填 BOM.version_level (仅当 products.version_level 列还存在时)
	if hasProductVersionLevel {
		if err := DB.Exec(`
			UPDATE boms b
			SET version_level = COALESCE(NULLIF(p.version_level, ''), '')
			FROM products p
			WHERE b.product_id = p.id
			  AND COALESCE(b.version_level, '') = ''
			  AND COALESCE(p.version_level, '') <> ''
		`).Error; err != nil {
			log.Fatal("Failed to backfill boms.version_level from products:", err)
		}

		// 2. Step R7 干净切换：物理删除 products.version_level 列
		if err := DB.Exec(`ALTER TABLE products DROP COLUMN IF EXISTS version_level`).Error; err != nil {
			log.Fatal("Failed to drop legacy products.version_level column:", err)
		}
	}
}

// normalizeBOMOwnershipAndVersionFields 思路 3 重构 Step R8 + 性能改进:
//
// 把 boms.owner_customer_id 从 uuid 类型改为 text + NOT NULL DEFAULT ”,
// boms.version_level 改为 NOT NULL DEFAULT ”,让唯一索引可以使用纯列索引(去掉 COALESCE)。
//
// 业务语义:
//   - INTERNAL BOM 的 owner_customer_id = ” (空字符串)
//   - CUSTOMER BOM 的 owner_customer_id = 客户 UUID 字符串
//
// 幂等:可重复执行,迁移完成后第二次调用 NOOP。
func normalizeBOMOwnershipAndVersionFields() {
	if DB == nil || DB.Dialector.Name() != "postgres" {
		return
	}
	if !DB.Migrator().HasTable(&models.BOM{}) {
		return
	}

	// 1. owner_customer_id: uuid → text 类型转换
	// 检查列类型,只有当前是 uuid 时才转。NULL 转为空字符串。
	var ownerCustomerColType string
	if err := DB.Raw(`
		SELECT data_type FROM information_schema.columns
		WHERE table_name = 'boms' AND column_name = 'owner_customer_id'
	`).Scan(&ownerCustomerColType).Error; err != nil {
		log.Fatal("Failed to inspect boms.owner_customer_id column type:", err)
	}
	if strings.EqualFold(ownerCustomerColType, "uuid") {
		// uuid → text + NULL → ''
		if err := DB.Exec(`
			ALTER TABLE boms
			ALTER COLUMN owner_customer_id TYPE varchar(36) USING COALESCE(owner_customer_id::text, ''),
			ALTER COLUMN owner_customer_id SET DEFAULT '',
			ALTER COLUMN owner_customer_id SET NOT NULL
		`).Error; err != nil {
			log.Fatal("Failed to convert boms.owner_customer_id to text NOT NULL:", err)
		}
	} else {
		// 已是 text 类型,确保 NOT NULL DEFAULT ''
		if err := DB.Exec(`UPDATE boms SET owner_customer_id = '' WHERE owner_customer_id IS NULL`).Error; err != nil {
			log.Fatal("Failed to backfill boms.owner_customer_id NULL → '':", err)
		}
		if err := DB.Exec(`ALTER TABLE boms ALTER COLUMN owner_customer_id SET DEFAULT ''`).Error; err != nil {
			log.Fatal("Failed to set boms.owner_customer_id default:", err)
		}
		if err := DB.Exec(`ALTER TABLE boms ALTER COLUMN owner_customer_id SET NOT NULL`).Error; err != nil {
			log.Fatal("Failed to set boms.owner_customer_id NOT NULL:", err)
		}
	}

	// 2. version_level: NULL → '' + NOT NULL DEFAULT ''
	if err := DB.Exec(`UPDATE boms SET version_level = '' WHERE version_level IS NULL`).Error; err != nil {
		log.Fatal("Failed to backfill boms.version_level NULL → '':", err)
	}
	if err := DB.Exec(`ALTER TABLE boms ALTER COLUMN version_level SET DEFAULT ''`).Error; err != nil {
		log.Fatal("Failed to set boms.version_level default:", err)
	}
	if err := DB.Exec(`ALTER TABLE boms ALTER COLUMN version_level SET NOT NULL`).Error; err != nil {
		log.Fatal("Failed to set boms.version_level NOT NULL:", err)
	}
}

// ensureBOMReleasedUniquenessIndex 把"同 (产品, BOM 类型, 归属, 档次) 下只能有 1 份 RELEASED"
// 这条业务约束物化成 DB 层的部分唯一索引（方案 B + 1:1 + 思路 3 重构 Step R6 + R8）。
//
// 业务规则：
//   - 同一产品的内部 MBOM RELEASED 和客户A 的 MBOM RELEASED 可以共存
//   - 同 (productId, MBOM, INTERNAL) 下不同 versionLevel 的 RELEASED 可以共存
//     (1 Product : N BOM 的核心:不同档次互为差异化实例)
//   - 但 (productId, bomType, owner_type, owner_customer_id, version_level) 同时只能 1 份 RELEASED
//   - OBSOLETE / DRAFT / 已软删的 BOM 不参与唯一性，所以用 partial index
//
// Step R8 改进: 字段全部 NOT NULL DEFAULT ”,索引为纯列索引(去掉 COALESCE),
// PostgreSQL planner 命中更确定。
//
// 应用层不再做 SELECT COUNT 软校验,改为乐观写入 + 捕获 unique violation 转友好错误。
func ensureBOMReleasedUniquenessIndex() {
	if DB == nil || DB.Dialector.Name() != "postgres" {
		return
	}
	if !DB.Migrator().HasTable(&models.BOM{}) {
		return
	}

	// 旧索引（仅按 product_id + bom_type 限制 RELEASED 唯一）若存在，先删掉
	if err := DB.Exec(`DROP INDEX IF EXISTS idx_boms_released_unique`).Error; err != nil {
		log.Fatal("Failed to drop legacy idx_boms_released_unique:", err)
	}

	// Step R6 旧 with_owner 索引(缺 versionLevel 维度)若存在,先删
	if err := DB.Exec(`DROP INDEX IF EXISTS idx_boms_released_unique_with_owner`).Error; err != nil {
		log.Fatal("Failed to drop legacy idx_boms_released_unique_with_owner:", err)
	}

	// Step R8 旧 with_owner_version 索引(用 COALESCE 表达式)若存在,先删并重建为纯列索引
	if err := DB.Exec(`DROP INDEX IF EXISTS idx_boms_released_unique_with_owner_version`).Error; err != nil {
		log.Fatal("Failed to drop legacy idx_boms_released_unique_with_owner_version:", err)
	}

	// 字段都已 NOT NULL DEFAULT '',直接用纯列索引,planner 命中更稳。
	if err := DB.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_boms_released_unique_v2
		ON boms (
			product_id,
			bom_type,
			owner_type,
			owner_customer_id,
			version_level
		)
		WHERE status = 'RELEASED' AND deleted_at IS NULL
	`).Error; err != nil {
		log.Fatal("Failed to create idx_boms_released_unique_v2:", err)
	}
}

func backfillBlankProductSKUs() {
	if DB == nil || !DB.Migrator().HasTable(&models.Product{}) {
		return
	}

	plans, err := productidentity.ApplyBlankProductSKUBackfill(DB)
	if err != nil {
		log.Fatal("Failed to backfill blank product skus:", err)
	}
	if len(plans) == 0 {
		return
	}

	log.Printf("[DATA_FIX] Backfilled %d product row(s) with derived SKUs.", len(plans))
	for _, plan := range plans {
		log.Printf(
			"[DATA_FIX] product=%s name=%s derived_sku=%s type=%s model=%s",
			plan.ID,
			plan.Name,
			plan.DerivedSKU,
			plan.TypeCode,
			plan.ModelCode,
		)
	}
}

func backfillLeaveRequestSubmittedByUsers() {
	if DB == nil || !DB.Migrator().HasTable(&models.LeaveRequest{}) || !DB.Migrator().HasTable("users") {
		return
	}
	if !DB.Migrator().HasColumn(&models.LeaveRequest{}, "submitted_by_user_id") {
		return
	}

	if err := DB.Exec(`
		UPDATE leave_requests lr
		SET submitted_by_user_id = u.id
		FROM users u
		WHERE lr.submitted_by_user_id IS NULL
		  AND NULLIF(BTRIM(u.employee_id), '') = CAST(lr.employee_id AS text)
	`).Error; err != nil {
		log.Fatal("Failed to backfill leave request submitted_by_user_id:", err)
	}
}

func backfillBlankSalesOrderNos() {
	if DB == nil || !DB.Migrator().HasTable(&models.SalesOrder{}) {
		return
	}

	plans, err := salesorderidentity.ApplyBlankSalesOrderNoBackfill(DB)
	if err != nil {
		log.Fatal("Failed to backfill blank sales order orderNos:", err)
	}
	if len(plans) == 0 {
		return
	}

	log.Printf("[DATA_FIX] Backfilled %d sales order row(s) with derived orderNo values.", len(plans))
	for _, plan := range plans {
		log.Printf(
			"[DATA_FIX] sales_order=%s customer=%s derived_order_no=%s barcode=%s",
			plan.ID,
			plan.CustomerName,
			plan.DerivedOrderNo,
			plan.Barcode,
		)
	}
}

func ensureSidebarCommandAssignmentUniqueIndex() {
	if DB == nil || !DB.Migrator().HasTable(&models.UserSidebarCommandAssignment{}) {
		return
	}

	if err := DB.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sidebar_commands_user_command_active_unique
		ON user_sidebar_command_assignments (user_id, command_id)
		WHERE deleted_at IS NULL;
	`).Error; err != nil {
		log.Fatal("Failed to enforce unique active sidebar command per user:", err)
	}
}

func ensureSidebarCommandCategoryAssignmentUniqueIndex() {
	if DB == nil || !DB.Migrator().HasTable(&models.UserSidebarCommandCategoryAssignment{}) {
		return
	}

	if err := DB.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sidebar_command_categories_user_category_active_unique
		ON user_sidebar_command_category_assignments (user_id, category_id)
		WHERE deleted_at IS NULL;
	`).Error; err != nil {
		log.Fatal("Failed to enforce unique active sidebar command category per user:", err)
	}
}

func ensurePersonnelExcellenceIndexes() {
	if DB == nil {
		return
	}

	if DB.Migrator().HasTable(&models.LeaveRequest{}) {
		if err := DB.Exec(`
			CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_employee
			ON leave_requests (employee_id)
			WHERE status = 'APPROVED' AND deleted_at IS NULL;
		`).Error; err != nil {
			log.Fatal("Failed to create personnel excellence leave index:", err)
		}
	}

	if DB.Migrator().HasTable(&models.Employee{}) {
		if err := DB.Exec(`
			CREATE INDEX IF NOT EXISTS idx_employees_active_dept_id
			ON employees (dept_id)
			WHERE deleted_at IS NULL;
		`).Error; err != nil {
			log.Fatal("Failed to create personnel excellence employee index:", err)
		}
	}
}

func ensureDefaultSidebarCommandCategories() {
	if DB == nil || !DB.Migrator().HasTable(&models.SidebarCommandCategory{}) {
		return
	}

	defaultCategories := []models.SidebarCommandCategory{
		{
			CategoryID:  "business",
			Name:        "业务指令",
			Description: "系统内置业务指令默认分类，可按现场需要继续拆分。",
			Enabled:     true,
			Status:      "active",
			SortOrder:   10,
		},
		{
			CategoryID:  "warehouse",
			Name:        "仓库现场",
			Description: "仓库现场扫码、入库、出库、盘点、装箱组装等可分配指令。",
			Enabled:     true,
			Status:      "active",
			SortOrder:   20,
		},
	}

	for _, category := range defaultCategories {
		var existing models.SidebarCommandCategory
		err := DB.Where("category_id = ?", category.CategoryID).First(&existing).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Fatal("Failed to inspect default sidebar command category:", err)
		}
		if err := DB.Create(&category).Error; err != nil {
			log.Fatal("Failed to seed default sidebar command category:", err)
		}
	}
}

func ensureDefaultSidebarCommandDefinitions() {
	if DB == nil || !DB.Migrator().HasTable(&models.SidebarCommandDefinition{}) {
		return
	}

	defaultCommands := []models.SidebarCommandDefinition{
		{
			CommandID:    "wheel_trace_scan",
			Title:        "车圈追溯",
			Description:  "侧边栏直接进入车圈条码追溯，适合现场快速查找来源和流转记录。",
			Route:        "/wheel-trace",
			SearchParams: json.RawMessage(`{"scan":"1"}`),
			Icon:         "SearchCheck",
			Category:     "business",
			Assignable:   true,
			Enabled:      true,
			Status:       "active",
			SortOrder:    5,
		},
		{
			CommandID:    "warehouse_inbound_scan",
			Title:        "入库扫描",
			Description:  "侧边栏直接进入仓库入库扫描，适合收货、上架等现场动作。",
			Route:        "/warehouse/inbound",
			SearchParams: json.RawMessage(`{"mode":"scan"}`),
			Icon:         "PackagePlus",
			Category:     "business",
			Assignable:   true,
			Enabled:      true,
			Status:       "active",
			SortOrder:    10,
		},
		{
			CommandID:    "warehouse_shipment_scan",
			Title:        "出货扫描",
			Description:  "侧边栏直接进入仓库出货扫描，适合发货确认和扫码出库。",
			Route:        "/warehouse/shipment",
			SearchParams: json.RawMessage(`{"mode":"scan"}`),
			Icon:         "ScanLine",
			Category:     "business",
			Assignable:   true,
			Enabled:      true,
			Status:       "active",
			SortOrder:    20,
		},
		{
			CommandID:    "warehouse_stocktake_scan",
			Title:        "盘点扫描",
			Description:  "侧边栏直接进入 PDA 盘点扫描，适合仓库现场盘点。",
			Route:        "/warehouse/stocktake",
			SearchParams: json.RawMessage(`{"mode":"scan"}`),
			Icon:         "ClipboardCheck",
			Category:     "business",
			Assignable:   true,
			Enabled:      true,
			Status:       "active",
			SortOrder:    30,
		},
		{
			CommandID:    "warehouse_packaging_assembly",
			Title:        "装箱组装",
			Description:  "从快捷入口进入仓库装箱组装台，生成手机扫码会话并绑定系统产品一维码。",
			Route:        "/warehouse-config/packaging-assembly",
			SearchParams: json.RawMessage(`{}`),
			Icon:         "PackagePlus",
			Category:     "warehouse",
			Assignable:   true,
			Enabled:      true,
			Status:       "active",
			SortOrder:    40,
		},
	}

	for _, command := range defaultCommands {
		var existing models.SidebarCommandDefinition
		err := DB.Where("command_id = ?", command.CommandID).First(&existing).Error
		if err == nil {
			if command.CommandID == "warehouse_packaging_assembly" && existing.Route != command.Route {
				if updateErr := DB.Model(&existing).Update("route", command.Route).Error; updateErr != nil {
					log.Fatal("Failed to update default sidebar command definition:", updateErr)
				}
			}
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Fatal("Failed to inspect default sidebar command definition:", err)
		}
		if err := DB.Create(&command).Error; err != nil {
			log.Fatal("Failed to seed default sidebar command definition:", err)
		}
	}
}

func logLocalDbAuthHint(dsn string, err error) {
	if err == nil {
		return
	}

	message := strings.ToLower(err.Error())
	if !strings.Contains(message, "password authentication failed") &&
		!strings.Contains(message, "failed sasl auth") &&
		!strings.Contains(message, "sqlstate 28p01") {
		return
	}

	normalizedDSN := strings.ToLower(strings.TrimSpace(dsn))
	if !strings.Contains(normalizedDSN, "127.0.0.1") &&
		!strings.Contains(normalizedDSN, "localhost") &&
		!strings.Contains(normalizedDSN, "@db:5432") &&
		!strings.Contains(normalizedDSN, "host=db") {
		return
	}

	log.Printf("[DEV_HINT] DATABASE_URL credentials were rejected by the local Postgres instance.")
	log.Printf("[DEV_HINT] Current local dev conventions use xdfc_local_dev_password for xdfc_admin.")
	log.Printf("[DEV_HINT] If server/postgres_data was initialized with different credentials before, rebuild it with:")
	log.Printf("[DEV_HINT]   powershell -ExecutionPolicy Bypass -File .\\server\\dev-up.ps1 -ResetDb")
}

// prepareProductionTopologySchema removes route rows that still depend on the
// deleted four-level topology before GORM creates the current route-step shape.
func prepareProductionTopologySchema() {
	if DB == nil {
		return
	}

	statements := []string{
		`DROP TABLE IF EXISTS production_route_steps CASCADE`,
	}
	for _, statement := range statements {
		if err := DB.Exec(statement).Error; err != nil {
			log.Printf("Failed to prepare production topology schema: %v", err)
			log.Fatal(err)
		}
	}
}

// cleanupDeletedProductionTopologySchema removes tables and columns that are
// no longer part of the fixed L1/L2/L3 production topology.
func cleanupDeletedProductionTopologySchema() {
	if DB == nil {
		return
	}

	statements := []string{
		`DROP TABLE IF EXISTS job_category_process_mappings CASCADE`,
		`DROP TABLE IF EXISTS job_categories CASCADE`,
		`ALTER TABLE IF EXISTS production_route_steps DROP COLUMN IF EXISTS job_category_id`,
		`ALTER TABLE IF EXISTS line_segments DROP COLUMN IF EXISTS hierarchy_option_id`,
	}
	for _, statement := range statements {
		if err := DB.Exec(statement).Error; err != nil {
			log.Printf("Failed to clean legacy production topology schema: %v", err)
			log.Fatal(err)
		}
	}
}

// InitDB initializes the database connection and schema.
func InitDB(dsn string) {
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		logLocalDbAuthHint(dsn, err)
		log.Fatal("Failed to connect to database:", err)
	}

	// Register global audit hooks.
	audit.RegisterHooks(DB)
	// Start background audit archiver task.
	audit.StartArchiver(DB)
	// Migrating database schemas.
	fmt.Println("Migrating database schemas...")
	prepareProductionTopologySchema()
	failOnDuplicatePackagingRules()

	if err := DB.SetupJoinTable(&models.ProcessStep{}, "AllowedPositions", &models.ProcessStepAllowedPosition{}); err != nil {
		log.Fatal("Failed to setup process step allowed positions join table:", err)
	}

	err = DB.AutoMigrate(
		&models.User{},
		&models.Role{},
		&models.UserPermission{},
		&models.SidebarCommandCategory{},
		&models.SidebarCommandDefinition{},
		&models.UserSidebarCommandAssignment{},
		&models.UserSidebarCommandCategoryAssignment{},
		&models.PersonalRecord{},
		&models.PersonalRecordAsset{},
		&models.PersonalRecordActionLog{},
		&models.SalesOrder{},
		&models.SalesOrderLine{},
		&models.QuoteConversion{},
		&models.SalesReturn{},
		&models.SalesReturnLine{},
		&models.SalesReturnActualAmountRecord{},
		&models.SalesExchange{},
		&models.SalesExchangeLine{},
		&models.SalesExchangeLabelCode{},
		&models.Customer{},
		&models.Supplier{},
		&models.Inventory{},
		&models.InboundRecord{},
		&models.ShipmentRecord{},
		&models.CutSizeInventory{},
		&models.CutSizeInventoryTransaction{},
		&models.PrintBatch{},
		&models.LinearBarcodeInventoryItem{},
		&models.Sequence{},
		&models.ProductType{},
		&models.LogisticsRecord{},
		&models.Product{},
		&models.ProductAppearance{},
		&models.BOM{},
		&models.BOMItem{},
		&models.BOMVersionSnapshot{},
		&models.BOMSection{},
		&models.NumberingRule{},
		&models.Position{},
		&models.ProcessStep{},
		&models.ProcessStepAllowedPosition{},
		&models.ProductionLine{},
		&models.LineSegment{},
		&models.ProductionRoute{},
		&models.ProductionRouteStep{},
		&models.ProductBarcodeState{},
		&models.ProductBarcodeStateEvent{},
		&models.ProductionExecutionLot{},
		&models.ProductionOperationExecution{},
		&models.EngineeringSpec{},
		&models.ProductAttributeCategory{},
		&models.ProductAttributeOption{},
		&models.Unit{},
		&models.ProductTemplate{},
		&models.ProductTemplateAttributeBinding{},
		&models.ProductAttributeValue{},
		&models.Mold{},
		&models.Furnace{},
		&models.MoldLoan{},
		&models.MaintenanceRecord{},
		&models.PrepregMaterialSpec{},
		&models.PrepregBindingToken{},
		&models.PrepregRollInstance{},
		&models.PrepregLabelOcrSession{},
		&models.ProductBarcodeCaptureSession{},
		&models.PackagingAssembly{},
		&models.PackagingAssemblyItem{},
		&models.PackagingAssemblyCaptureSession{},
		&models.Material{},
		&models.ProductInventoryMaterialMapping{},
		&models.PackagingRule{},
		&models.PackagingProfile{},
		&models.PackagingProfileTarget{},
		&models.Organization{},
		&models.Employee{},
		&models.WarehouseCategory{},
		&models.InventoryThresholdRule{},
		&models.ApprovalRequest{},
		&models.LeaveRequest{},
		&models.VehicleContactBinding{},
		&models.FinancialVoucher{},
		&models.ClearingEntry{},
		&models.PayableLedger{},
		&models.ReceiptRecord{},
		&models.PaymentRecord{},
		&models.SettlementAllocation{},
		&models.SettlementEvidenceAsset{},
		&models.SettlementRecordEvidence{},
		&models.LogisticsVehiclePhoto{},
		&models.InventoryAdjustment{},
		&models.InventoryAdjustmentItem{},
		&models.StocktakeTask{},
		&models.StocktakeItem{},
		&models.PurchaseOrder{},
		&models.PurchaseOrderLine{},
		&models.PurchaseReturn{},
		&models.PurchaseReturnLine{},
		&models.PurchaseReturnDictionary{},
		&models.Currency{},
		&models.PaymentMethod{},
		&models.PaymentTerm{},
		&models.TaxRate{},
		&models.OrgUnit{},
		&models.ProductionUnit{},
		&models.OrgProductionMapping{},
		&models.EmployeeAssignment{},
		&models.ProductionPlan{},
		&models.ProductionTask{},
		&models.CuttingIssuanceExecution{},
		&models.CuttingIssuanceBatch{},
		&models.ProductBarcodeBinding{},
		&models.ProductBarcodeBindingEvent{},

		// 婵犵妲呴崑鎾跺緤娴犲鑸?闂傚倷娴囬褎顨ョ粙鍖¤€块梺顒€绉寸壕濠氭煏閸繍妲归柛瀣戠换娑㈠幢濡搫顫庨梺宕囩帛濮婂綊濡甸崟顖氱閻犻缚妗ㄩ幋閿嬬節?(Experimental Center)
		&models.ExpCategory{},
		&models.ExpEquipment{},
		&models.ExpTask{},
		&models.ExpReport{},

		// 婵犵妲呴崑鎾跺緤娴犲鐤い鏍ㄧ矌閻棗顭块懜闈涘闁?闂傚倷娴囧畷鍨叏閻㈢绀夐柟杈剧畱缁€澶愭煙鏉堝墽鐣遍梻鍌ゅ灦閺屟嗙疀閹剧纭€婵炴垶鎸哥粔褰掑蓟閵娿儮妲堟俊顖欒娴犻箖姊?(Quality Management)
		&models.InspectionStandard{},
		&models.InspectionTask{},
		&models.QualityBatchQuantitySettlement{},
		&models.QualityAbnormality{},

		// 婵犵妲呴崑鎾跺緤娴犲鐤い鏍ㄧ矆閻?闂傚倷娴囧畷鍨叏瀹曞洦濯奸柡灞诲劚閻掑灚銇勯幒鍡椾壕閻庢鍠栭悥濂搞€侀弴銏″仼閻忕偟顭堟禍楣冩偡濞嗗繐顏柛瀣█閺屾稒鎯旈埥鍡楁缂?(Piecework Management)
		&models.Team{},
		&models.PieceworkRate{},
		&models.PieceworkRecord{},

		// 婵犵妲呴崑鎾跺緤娴犲鐤い鏍剱閺?闂傚倷娴囧畷鍨叏瀹ュ绀冩い顓熷灣鏉╂ê鈹戞幊閸婃鎱ㄩ弶鎳ㄦ椽顢橀悜鍡樼稁婵炲濮撮鍛矆鐎ｎ偁浜滈柟鎵虫櫅閻掔儤绻涢懝浼村摵缂佺粯鐩弫鎰板川椤旂虎妲洪梻浣告啞閹歌崵鎹㈤崘顏佸亾?(Asset Metadata)
		&models.EquipmentPartner{},
		&models.MoldDrawing{},
		&models.MoldDrawingLog{},

		// 闂傚倸鍊峰ù鍥р枍閺囩姭鍋撶粭娑樻处閸嬶繝寮堕崼姘珖缂?缂傚倸鍊搁崐椋庢閿熺姴鍨傞梻鍫熺〒閺嗭箓鏌ｉ姀銈嗘锭闁搞劍绻冪换娑橆啅椤旇崵鍑归梺缁樺笧缁垶骞堥妸銉庣喖宕稿Δ鈧幗鐢告⒑閸濆嫭顥滅紒缁樏～蹇撁洪鍕獓闁荤姵浜介崜閬嶅Χ婢跺鍘?(System Configs)
		&models.SystemConfig{},
		&models.KnowledgeBaseEntry{},

		// 婵犵妲呴崑鎾跺緤娴犲鐤い鏍剱閺?闂傚倸鍊烽懗鍓佸垝椤栫偛桅婵炴垯鍨归悿鐐節婵犲倹鍣介柣顓炵墦閺屻劑寮撮悙娴嬪亾閸濄儳涓嶉柟鎯板Г閻撳繐鈹戦悙闈涗壕闁哄缍婇弻娑氣偓锝庡亝鐏忎即鏌熷畡鐗堝櫧缂侇喗鐟ч幑鍕Ω閵夈儳鐣?(Logistics Push - Hot-Pluggable)
		// 闂傚倸鍊风粈渚€骞夐敓鐘偓鍐川閺夋垵鍋嶉梺鍝勭Р閸斿海绮绘ィ鍐╃厱闁靛绲芥俊鎸庛亜閳哄啫鍘撮柡灞炬礃瀵板嫰宕煎┑鍐ㄤ壕婵°倕鎳忛崑锟犳煙閸撗呭笡闁稿濮电换娑㈠箣閻愰潧鈪规繝娈垮枓閸嬫挾绱撻崒娆戠獢缂傚倹宀稿畷鎴﹀箛椤旂厧鐏婇梺鍝勫暙閸婂湱鈧碍宀搁幃姗€鎮欓幓鎺嗗亾閻戣棄绾фい鎾卞灪閻撶喖鏌ｅΟ鍝勬毐濠殿喖鍊块弻娑欐償閵堝懎鎯炲┑鈥冲级閸旀洟鍩為幋锕€鐐婇柍鍦亾閻忓啴鏌ｆ惔锛勭暛闁稿酣浜堕獮濠冩償閵婏絺鍋撻崘銊㈡闁靛骏绱曢崢鍗炩攽閻樼粯娑ф俊顐ｇ☉閻☆參姊绘担鍛婂暈闁荤啙鍥х；闁规崘顕х粻顖炴煕濞戝崬骞愰柡瀣叄閺岀喖鏌囬敃鈧晶濠氭煛閸☆厾绡€婵﹥妞藉畷顐﹀礋椤撶儐鏆俊鐐€х€靛矂宕归柆宥呯疄闁靛鍎Σ鍫ユ煏韫囧ň鍋撻搹顐ゆ殸?		&models.DeliveryOrder{},
		&models.DeliveryTrackingDetail{},
		&models.LogisticsAPIProvider{},

		// 缂備緡鍨靛畷鐢靛垝閻戞鈻旈幖绮光偓鑼煑婵炶揪绲剧划宥囩矈閿曞倹鐓€鐎广儱娲ㄩ弸?(System & Workflow)
		&models.EnterpriseConfig{},
		&models.BusinessEventSource{},
		&models.StandardCommand{},
		&models.NotificationRule{},
		&models.RuleExecutionLog{},
		&models.AIUsageLog{},
		&models.AuditLog{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
	cleanupDeletedProductionTopologySchema()
	dropLegacyRoleArtifacts()
	dropLegacyWorkflowArtifacts()
	dropLegacyProductWeightColumn()
	migrateProductOwnershipToBOMs()
	migrateProductVersionLevelToBOMs()
	normalizeBOMOwnershipAndVersionFields()
	ensureBOMReleasedUniquenessIndex()
	// --- 闂傚鍓﹂崑鍌炲船閵堝洠鍋撻棃娑氱Ш缂傚秴鐗婂缁樻媴閻?(v8.7) ---
	ensureUserIntegrityConstraints()
	backfillBlankProductSKUs()
	backfillBlankSalesOrderNos()
	backfillTradingSoftDeleteTimestamps()
	backfillLeaveRequestSubmittedByUsers()
	ensureProductIntegrityConstraints()
	ensureSalesOrderIntegrityConstraints()
	ensureUserPermissionUniqueIndex()
	normalizeUserEmployeeBindings()
	ensureUserEmployeeBindingUniqueIndex()
	ensureSidebarCommandAssignmentUniqueIndex()
	ensureSidebarCommandCategoryAssignmentUniqueIndex()
	ensurePersonnelExcellenceIndexes()
	ensureDefaultSidebarCommandCategories()
	ensureDefaultSidebarCommandDefinitions()

	ensurePackagingRuleMaterialUniqueIndex()
	ensureProductAttributeCategoryKeyUniqueIndex()
	cleanupDuplicateProductAttributeOptions()
	ensureProductAttributeOptionValueUniqueIndex()
	ensureBusinessEventSourceCodeUniqueIndex()
	fmt.Println("Database migration completed.")
	sqlDB, err := DB.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetConnMaxLifetime(time.Hour)
		fmt.Println("Database connection pool tuned: MaxIdle=10, MaxOpen=100")
	}

	// 3. 闂佸憡甯楃换鍌烇綖閹版澘绀?Seed
	var count int64
	DB.Model(&models.User{}).Count(&count)
	if count == 0 {
		fmt.Println("No users found. Seeding initial admin...")

		adminPass := os.Getenv("INITIAL_ADMIN_PASSWORD")
		ginMode := os.Getenv("GIN_MODE")
		if adminPass == "" {
			if ginMode == "release" {
				log.Fatal("[CRITICAL_SECURITY] INITIAL_ADMIN_PASSWORD is required in release mode. Please set it in your environment.")
			} else {
				adminPass = "Wang622575"
				fmt.Println("[DEV_SEC_NOTICE] INITIAL_ADMIN_PASSWORD not set. Using debug fallback password.")
			}
		}

		// Use bcrypt cost 11 to balance security and startup latency.
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPass), 11)
		if err != nil {
			log.Fatal("[CRITICAL_SECURITY] Failed to hash initial admin password: ", err)
		}
		admin := models.User{
			Username:    "admin",
			Password:    string(hashedPassword),
			Status:      "active",
			IsProtected: true,
			Role:        "admin",
		}
		DB.Create(&admin)
		fmt.Println("Initial admin 'admin' created.")
	}

	ensureDefaultAdminRole()
	ensureSeedAdminUserInvariants()
	ensureSeedAdminUserPermissions()
	ensureDefaultProductAttributeCategories()
	ensureDefaultProductAttributeOptions()
	ensureDefaultUnits()
	ensureDefaultWarehouseCategories()
	ensureDefaultBOMSections()

	// 6. 闂傚倸鍊风粈渚€骞夐敍鍕殰婵°倕鍟畷鏌ユ煕瀹€鈧崕鎴犵礊閺嶎厽鐓欓梺顓ㄧ畱閺嬫盯鎮楅崹顐ゅ弨闁哄被鍊栭幈銊╁箛椤戣棄浜炬俊銈呮噹閺勩儵鏌ｅΟ鑲╁笡闁绘挻娲樼换娑㈠幢濡ゅ啰顔囬梺閫炲苯澧紓宥咃工椤?Seed
	var configCount int64
	DB.Model(&models.SystemConfig{}).Where("key = ?", "topology_auth_password").Count(&configCount)
	if configCount == 0 {
		topoPass := os.Getenv("TOPOLOGY_AUTH_PASSWORD")
		ginMode := os.Getenv("GIN_MODE")
		if topoPass == "" {
			if ginMode == "release" {
				log.Fatal("[CRITICAL_SECURITY] TOPOLOGY_AUTH_PASSWORD is required in release mode for production safety.")
			} else {
				topoPass = "622575"
				fmt.Println("[DEV_SEC_NOTICE] TOPOLOGY_AUTH_PASSWORD not set. Using debug fallback.")
			}
		}

		config := models.SystemConfig{
			Key:         "topology_auth_password",
			Value:       topoPass,
			Label:       "Topology Auth Password",
			Description: "Password used by topology-related endpoints. Must be at least 6 characters.",
		}
		DB.Create(&config)
		fmt.Println("Initial system config seeded.")
	}

}
