package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	statemachine "xdfc-server/services/state_machine"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ValidBOMStatuses defines all valid BOM status values
var ValidBOMStatuses = []string{
	models.BOMStatusDraft,
	models.BOMStatusReviewing,
	models.BOMStatusApproved,
	models.BOMStatusValidating,
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

func ListBOMs(query BOMListQuery) ([]models.BOM, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	// Validate and parse status filter
	statuses, err := parseAndValidateStatuses(query.Status)
	if err != nil {
		return nil, 0, err
	}

	// Validate and parse BOM type filter
	bomTypes, err := parseAndValidateBOMTypes(query.BOMType)
	if err != nil {
		return nil, 0, err
	}

	productID := strings.TrimSpace(query.ProductID)

	tx := db.DB.Model(&models.BOM{})
	
	// Apply product filter (existing)
	if productID != "" {
		tx = tx.Where("product_id = ?", productID)
	}
	
	// Apply status filter (NEW - supports multiple values)
	if len(statuses) > 0 {
		tx = tx.Where("status IN ?", statuses)
	}
	
	// Apply BOM type filter (NEW - supports multiple values)
	if len(bomTypes) > 0 {
		tx = tx.Where("bom_type IN ?", bomTypes)
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
		Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("bom_items.sort_order ASC") }).
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

			// ✅ 循环引用检查 (防止 A 包含 A 或 B->A 循环)
			if err := checkBOMCircularReference(tx, input.ProductID, item.MaterialID, make(map[string]bool)); err != nil {
				return err
			}
		}
	}

	// ✅ 同工艺段（Section）内物料唯一性校验
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

// 递归检测 BOM 循环引用
func checkBOMCircularReference(tx *gorm.DB, rootProductID string, currentMaterialID string, visited map[string]bool) error {
	if currentMaterialID == rootProductID {
		return fmt.Errorf("[CIRCULAR_REFERENCE] BOM circular dependency detected: Product depends on itself (ID: %s)", rootProductID)
	}

	if visited[currentMaterialID] {
		return nil
	}
	visited[currentMaterialID] = true

	// 查询以此物料 ID 作为产品 ID 的所有现有 BOM
	var boms []models.BOM
	if err := tx.Where("product_id = ? AND status != ?", currentMaterialID, models.BOMStatusObsolete).
		Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("bom_items.sort_order ASC") }).Find(&boms).Error; err != nil {
		return err
	}

	for _, b := range boms {
		for _, item := range b.Items {
			if err := checkBOMCircularReference(tx, rootProductID, item.MaterialID, visited); err != nil {
				return err
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

func validateUniqueReleasedMBOM(tx *gorm.DB, input *models.BOM) error {
	if strings.TrimSpace(input.ProductID) == "" || input.BOMType != models.BOMTypeMBOM || input.Status != models.BOMStatusReleased {
		return nil
	}

	query := tx.Model(&models.BOM{}).
		Where("product_id = ? AND bom_type = ? AND status = ?", input.ProductID, models.BOMTypeMBOM, models.BOMStatusReleased)
	if strings.TrimSpace(input.ID) != "" {
		query = query.Where("id <> ?", input.ID)
	}

	var activeCount int64
	if err := query.Count(&activeCount).Error; err != nil {
		return err
	}
	if activeCount > 0 {
		return fmt.Errorf("%w: product %s already has a RELEASED MBOM", ErrBOMActiveConflict, input.ProductID)
	}
	return nil
}

func generateBOMNo(tx *gorm.DB) string {
	now := time.Now()
	dateStr := now.Format("20060102")
	var count int64
	tx.Model(&models.BOM{}).Where("bom_no LIKE ?", "BOM-"+dateStr+"-%").Count(&count)
	// ✅ 引入纳秒随机因子防止竞态冲突
	randFactor := now.UnixNano() % 1000
	return fmt.Sprintf("BOM-%s-%03d-%03d", dateStr, count+1, randFactor)
}

func saveBOMItems(tx *gorm.DB, bomID string, items []models.BOMItem) error {
	for idx := range items {
		if strings.TrimSpace(items[idx].ID) == "" {
			items[idx].ID = uuid.NewString()
		}
		items[idx].BOMID = bomID
		items[idx].SortOrder = idx // 持久化物理顺序
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
		if err := validateUniqueReleasedMBOM(tx, &modelInput); err != nil {
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
			if existing.IsLocked {
				return fmt.Errorf("[CRITICAL] Cannot modify a locked BOM (ID: %s)", existing.ID)
			}

			// ✅ 乐观锁版本检查
			if input.Version > 0 && existing.Version != input.Version {
				return fmt.Errorf("[CONFLICT] BOM has been modified by another user (expected v%d, got v%d)", input.Version, existing.Version)
			}

			// 防篡改
			modelInput.Status = existing.Status
			modelInput.BOMType = existing.BOMType
			modelInput.IsLocked = existing.IsLocked
			modelInput.SourceEBOMID = existing.SourceEBOMID

			before := bomAuditSnapshot(existing)

			modelInput.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, defaultRevision)
			if strings.TrimSpace(modelInput.VersionText) == "" {
				modelInput.VersionText = existing.VersionText
			}

			// ✅ 版本号递增
			modelInput.Version = existing.Version + 1

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

		modelInput.Status = models.BOMStatusDraft
		if strings.TrimSpace(modelInput.BOMType) == "" {
			modelInput.BOMType = models.BOMTypeEBOM
		}
		modelInput.IsLocked = false
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
			Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("bom_items.sort_order ASC") }).
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
		if bom.IsLocked {
			return fmt.Errorf("%w: cannot delete a locked BOM for product %s", ErrBOMDeleteLockedActive, bom.ProductID)
		}

		var referenceCount int64
		if err := tx.Model(&models.BOM{}).Where("source_ebom_id = ?", id).Count(&referenceCount).Error; err != nil {
			return err
		}
		if referenceCount > 0 {
			return fmt.Errorf("[VALIDATION] Cannot delete EBOM because it is referenced by %d MBOM(s) as a source", referenceCount)
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

// validateBOMBusinessIntegrity 校验 BOM 业务完整性（仅在发布时执行）
func validateBOMBusinessIntegrity(tx *gorm.DB, bomID string, targetStatus string) error {
	// 仅在发布（RELEASED）时校验
	if targetStatus != models.BOMStatusReleased {
		return nil
	}

	var bom models.BOM
	if err := tx.Preload("Items").Where("id = ?", bomID).First(&bom).Error; err != nil {
		return err
	}

	// 1. 校验：至少包含 1 行物料
	if len(bom.Items) == 0 {
		return fmt.Errorf("[VALIDATION] Cannot release an empty BOM (ID: %s). At least one material is required", bomID)
	}

	// 2. 校验：至少有一行物料的用量 > 0
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

	// 3. 校验：所有物料必须存在且状态为 Active
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

	return nil
}

func PromoteBOMStatus(ctx context.Context, id string, input PromoteBOMStatusInput) (BOMDetailResponse, error) {
	if strings.TrimSpace(id) == "" {
		return BOMDetailResponse{}, ErrBOMIDRequired
	}

	var saved models.BOM
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing models.BOM
		if err := tx.Preload("Items").Where("id = ?", id).First(&existing).Error; err != nil {
			return err
		}

		// ✅ 乐观锁版本检查
		if input.ExpectedVersion != nil && existing.Version != *input.ExpectedVersion {
			return fmt.Errorf("[CONFLICT] BOM has been modified by another user (expected v%d, got v%d)", *input.ExpectedVersion, existing.Version)
		}

		// ✅ 状态转换验证（考虑BOM类型）
		if guard := statemachine.CanTransitionBOMStatusWithType(existing.Status, input.Status, existing.BOMType); !guard.Allowed {
			return guard.Err()
		}

		// ✅ 权限检查
		if permCheck := statemachine.CanUserPromoteBOMStatus(ctx, existing.Status, input.Status); !permCheck.Allowed {
			return permCheck.Err()
		}

		if existing.IsLocked && input.Status != models.BOMStatusObsolete {
			return fmt.Errorf("[CRITICAL] Cannot promote a locked BOM (Status: %s) to %s", existing.Status, input.Status)
		}

		// ✅ 业务完整性校验（防止发布空 BOM 或无效 BOM）
		if err := validateBOMBusinessIntegrity(tx, id, input.Status); err != nil {
			return err
		}

		before := bomAuditSnapshot(existing)

		existing.Status = input.Status
		
		// ✅ 使用状态机统一管理锁定逻辑
		existing.IsLocked = statemachine.ShouldLockBOMStatusString(input.Status)

		if existing.Status == models.BOMStatusReleased && existing.BOMType == models.BOMTypeMBOM {
			if err := validateUniqueReleasedMBOM(tx, &existing); err != nil {
				return err
			}
		}

		// ✅ 版本号递增
		existing.Version++

		if err := tx.Save(&existing).Error; err != nil {
			return err
		}
		saved = existing

		if err := writeBOMVersionSnapshotTx(ctx, tx, saved, "PROMOTE"); err != nil {
			return err
		}
		payload := bomAuditSnapshot(saved)
		payload["operation"] = "promote"
		payload["statusTransition"] = map[string]interface{}{
			"from":            before["status"],
			"to":              saved.Status,
			"reason":          input.Reason,
			"approverComment": input.ApproverComment,
		}
		return writeBOMAuditEntryWithContext(ctx, tx, saved.ID, "PROMOTE", before, payload)
	})

	if err != nil {
		return BOMDetailResponse{}, err
	}
	saved.DisplayVersion = resolveBOMDisplayVersion(saved)
	return MapBOMToDetailResponse(saved)
}


func DeriveMBOMFromEBOM(ctx context.Context, ebomID string, input DeriveMBOMInput) (BOMDetailResponse, error) {
	if strings.TrimSpace(ebomID) == "" {
		return BOMDetailResponse{}, ErrBOMIDRequired
	}

	var saved models.BOM
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. 获取源EBOM
		var ebom models.BOM
		if err := tx.Preload("Items").Where("id = ?", ebomID).First(&ebom).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrEBOMNotFound
			}
			return err
		}

		// 2. 验证源BOM类型与状态
		if ebom.BOMType != models.BOMTypeEBOM {
			return fmt.Errorf("%w: source BOM must be EBOM, got %s", ErrInvalidBOMType, ebom.BOMType)
		}

		// ✅ 只允许从RELEASED状态派生，确保源EBOM已经稳定
		if ebom.Status != models.BOMStatusReleased {
			return fmt.Errorf("[VALIDATION] Only RELEASED EBOMs can be derived to MBOM (current: %s). EBOM must be released before derivation", ebom.Status)
		}

		// ✅ 验证源EBOM必须被锁定
		if !ebom.IsLocked {
			return fmt.Errorf("[VALIDATION] Source EBOM must be locked before derivation (ID: %s)", ebomID)
		}

		// 3. 克隆BOM Items
		clonedItems := make([]models.BOMItem, len(ebom.Items))
		for idx, item := range ebom.Items {
			clonedItems[idx] = models.BOMItem{
				ID:             uuid.NewString(),
				Section:        item.Section,
				MaterialID:     item.MaterialID,
				UnitPrice:      item.UnitPrice,
				Unit:           item.Unit,
				UnitUsage:      item.UnitUsage,
				WastagePercent: item.WastagePercent,
				StandardUsage:  item.StandardUsage,
				MaterialType:   item.MaterialType,
				SupplyChannel:  item.SupplyChannel,
				SortOrder:      item.SortOrder, // ✅ 继承源 EBOM 的装配顺序
			}
		}

		// 4. 创建MBOM
		mbom := models.BOM{
			BOMType:      models.BOMTypeMBOM,
			BOMNo:        generateBOMNo(tx),
			ProductID:    ebom.ProductID,
			SourceEBOMID: &ebomID,
			VersionText:  "V1.0",
			Status:       models.BOMStatusDraft,
			IsLocked:     false,
			Description:  input.Description,
			MasterDataControl: models.MasterDataControl{
				RevisionNo:    input.RevisionNo,
				ChangeOrderNo: input.ChangeOrderNo,
				ChangeType:    "MANUAL",
			},
			RelationSidecar: ebom.RelationSidecar, // 复制关系结构
		}

		if strings.TrimSpace(mbom.Description) == "" {
			mbom.Description = fmt.Sprintf("Derived from EBOM %s", ebom.BOMNo)
		}
		if strings.TrimSpace(mbom.MasterDataControl.RevisionNo) == "" {
			mbom.MasterDataControl.RevisionNo = "R1"
		}

		mbom.MasterDataControl.Normalize("V1.0")

		// 5. 保存MBOM
		if err := tx.Create(&mbom).Error; err != nil {
			return err
		}

		// 6. 保存Items
		if err := saveBOMItems(tx, mbom.ID, clonedItems); err != nil {
			return err
		}

		// 7. 重新加载完整数据
		if err := tx.Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("bom_items.sort_order ASC") }).First(&saved, "id = ?", mbom.ID).Error; err != nil {
			return err
		}

		// 8. 写入版本快照
		if err := writeBOMVersionSnapshotTx(ctx, tx, saved, "DERIVE"); err != nil {
			return err
		}

		// 9. 写入审计日志
		payload := bomAuditSnapshot(saved)
		payload["operation"] = "derive"
		payload["sourceEbomId"] = ebomID
		payload["sourceEbomNo"] = ebom.BOMNo
		return writeBOMAuditEntryWithContext(ctx, tx, saved.ID, "DERIVE", nil, payload)
	})

	if err != nil {
		return BOMDetailResponse{}, err
	}

	saved.DisplayVersion = resolveBOMDisplayVersion(saved)
	return MapBOMToDetailResponse(saved)
}
