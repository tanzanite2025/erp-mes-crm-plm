// Package services - BOM 写路径主入口。
//
// 此文件聚焦 BOM 的写操作 (SaveBOM / DeleteBOM / PromoteBOMStatus /
// DeriveMBOMFromEBOM / ReviseMBOM) 和 SDRTS Sidecar Delta 处理。
//
// 读路径在 bom_query.go,
// 校验/归属/唯一性在 bom_validation.go,
// Item 规范化与 Upsert 在 bom_items.go。
package services

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	statemachine "xdfc-server/services/state_machine"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// 定义详细的审计操作类型
const (
	AuditOpBOMCreate       = "bom.create"
	AuditOpBOMUpdate       = "bom.update"
	AuditOpBOMDelete       = "bom.delete"
	AuditOpBOMDerive       = "bom.derive"
	AuditOpBOMPromote      = "bom.promote"
	AuditOpRelationAdd     = "relation.add"
	AuditOpRelationRemove  = "relation.remove"
	AuditOpRelationMove    = "relation.move"
	AuditOpRelationUpdate  = "relation.update"
)


// processSidecarDelta 处理 Sidecar Delta 并记录审计日志
// 这是 SDRTS 协议的核心处理函数
func processSidecarDelta(ctx context.Context, tx *gorm.DB, bomID string, delta *DeltaSet) error {
	if delta == nil || len(delta.Entries) == 0 {
		return nil
	}

	// 从上下文获取用户信息（如果可用）
	var userID string
	if uid := ctx.Value("userID"); uid != nil {
		if uidStr, ok := uid.(string); ok {
			userID = uidStr
		}
	}

	// 为每个 Delta 条目生成详细的审计日志
	for _, entry := range delta.Entries {
		var auditOp string
		switch entry.Operation {
		case DeltaOperationAdd:
			auditOp = AuditOpRelationAdd
		case DeltaOperationRemove:
			auditOp = AuditOpRelationRemove
		case DeltaOperationMove:
			auditOp = AuditOpRelationMove
		case DeltaOperationUpdate:
			auditOp = AuditOpRelationUpdate
		default:
			auditOp = AuditOpBOMUpdate
		}

		// 构建审计日志详情
		auditDetail := map[string]interface{}{
			"operation": string(entry.Operation),
			"path":      entry.Path,
		}
		if entry.Value != nil {
			auditDetail["value"] = entry.Value
		}
		if entry.OldValue != nil {
			auditDetail["oldValue"] = entry.OldValue
		}

		// 写入审计日志
		payload := map[string]interface{}{
			"operation": auditOp,
			"detail":    auditDetail,
		}
		if userID != "" {
			payload["userId"] = userID
		}

		// 使用现有的审计日志函数
		// 注意：这里使用 nil 作为 before，因为 Delta 本身就包含了变更信息
		if err := writeBOMAuditEntryWithContext(ctx, tx, bomID, auditOp, nil, payload); err != nil {
			// 审计日志失败不应阻塞主流程，只记录错误
			fmt.Printf("[WARN] Failed to write audit log for delta entry: %v\n", err)
		}
	}

	return nil
}

func SaveBOM(ctx context.Context, input SaveBOMInput) (BOMDetailResponse, error) {
	modelInput := input.toModel()
	if err := validateBOMOwnership(&modelInput); err != nil {
		return BOMDetailResponse{}, err
	}
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

			// ✅ 乐观锁版本检查（强制要求版本号）
			if input.Version <= 0 {
				return fmt.Errorf("[VALIDATION] version is required for update operations")
			}
			if existing.Version != input.Version {
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
				return wrapBOMUniqueViolation(err, &modelInput)
			}
			
			// ✅ 使用智能 Upsert 替代物理删除，保持 ID 稳定性
			upsertResult, err := upsertBOMItems(tx, existing.ID, modelInput.Items)
			if err != nil {
				return err
			}
			
			// 📊 记录 Upsert 统计信息到日志（便于监控和调试）
			if upsertResult.Created > 0 || upsertResult.Updated > 0 || upsertResult.Deleted > 0 {
				fmt.Printf("[BOM_UPSERT] BOM %s saved: created=%d, updated=%d, deleted=%d\n",
					existing.ID, upsertResult.Created, upsertResult.Updated, upsertResult.Deleted)
			}
			if err := tx.
				Preload("Items").
				First(&saved, "id = ?", existing.ID).Error; err != nil {
				return err
			}
			if err := writeBOMVersionSnapshotTx(ctx, tx, saved, "SAVE"); err != nil {
				return err
			}
			
			// 🔥 处理 SDRTS Delta（在保存成功后）
			if input.SidecarDelta != nil && len(input.SidecarDelta.Entries) > 0 {
				fmt.Printf("[SDRTS] Processing %d delta entries for BOM %s\n", len(input.SidecarDelta.Entries), saved.ID)
				if err := processSidecarDelta(ctx, tx, saved.ID, input.SidecarDelta); err != nil {
					// Delta 处理失败不阻塞主流程，只记录警告
					fmt.Printf("[WARN] Failed to process sidecar delta: %v\n", err)
				}
			} else {
				// 降级：记录全量变更（兼容旧版本前端）
				payload := bomAuditSnapshot(saved)
				payload["operation"] = "update"
				if err := writeBOMAuditEntryWithContext(ctx, tx, saved.ID, "SAVE", before, payload); err != nil {
					fmt.Printf("[WARN] Failed to write fallback audit log: %v\n", err)
				}
			}
			
			return nil
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
			return wrapBOMUniqueViolation(err, &modelInput)
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

		// ✅ 强制乐观锁版本检查
		if input.ExpectedVersion == nil {
			return fmt.Errorf("[VALIDATION] expectedVersion is required for status promotion")
		}
		if existing.Version != *input.ExpectedVersion {
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

		// ✅ 版本号递增
		existing.Version++

		if err := tx.Save(&existing).Error; err != nil {
			return wrapBOMUniqueViolation(err, &existing)
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

		// ✅ 强制版本检查（防止基于过期版本派生）
		if input.SourceVersion != nil && ebom.Version != *input.SourceVersion {
			return fmt.Errorf("[CONFLICT] Source EBOM has been modified (expected v%d, got v%d). Please refresh and try again", *input.SourceVersion, ebom.Version)
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

		// ✅ 验证源 EBOM 的物料完整性（防止幽灵物料注入）
		if err := validateBOMReferences(tx, &ebom); err != nil {
			return fmt.Errorf("[VALIDATION] Source EBOM contains invalid references: %w", err)
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
			// 方案 B：派生 MBOM 默认继承源 EBOM 的归属、重量与单位
			OwnerType:          ebom.OwnerType,
			OwnerCustomerID:    ebom.OwnerCustomerID,
			VersionLevel:       ebom.VersionLevel,
			MeasuredWeight:     ebom.MeasuredWeight,
			MeasuredWeightUnit: ebom.MeasuredWeightUnit,
			MasterDataControl: models.MasterDataControl{
				RevisionNo:    input.RevisionNo,
				ChangeOrderNo: input.ChangeOrderNo,
				ChangeType:    "MANUAL",
			},
			RelationSidecar: ebom.RelationSidecar, // 复制关系结构
		}

		// 校验继承的归属是否一致（防止源 EBOM 是历史脏数据传染下游）
		if err := validateBOMOwnership(&mbom); err != nil {
			return fmt.Errorf("[VALIDATION] inherited ownership from source EBOM is invalid: %w", err)
		}

		if strings.TrimSpace(mbom.Description) == "" {
			mbom.Description = fmt.Sprintf("Derived from EBOM %s (v%d)", ebom.BOMNo, ebom.Version)
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
		payload["sourceEbomVersion"] = ebom.Version
		return writeBOMAuditEntryWithContext(ctx, tx, saved.ID, "DERIVE", nil, payload)
	})

	if err != nil {
		return BOMDetailResponse{}, err
	}

	return MapBOMToDetailResponse(saved)
}

// bumpMBOMVersionText 把 V1.0 / V2.3 等版本号的次版本号 +1。
// 解析失败时回退为 V1.0 -> V1.1，最坏情况返回 "V1.1"。
func bumpMBOMVersionText(current string) string {
	trimmed := strings.TrimSpace(current)
	if trimmed == "" {
		return "V1.1"
	}
	body := strings.TrimPrefix(strings.ToUpper(trimmed), "V")
	parts := strings.Split(body, ".")
	if len(parts) < 2 {
		return "V" + body + ".1"
	}
	major, err1 := strconv.Atoi(parts[0])
	minor, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil {
		return "V1.1"
	}
	return fmt.Sprintf("V%d.%d", major, minor+1)
}

// ReviseMBOM 把当前 MBOM 复制为新版本（次版本号 +1），旧版自动 OBSOLETE。
//
// 业务约束：
//   - 仅 MBOM 可修订（BOMType == 'MBOM'）
//   - 当前 MBOM 状态必须是 RELEASED（"生效中"），其它状态不允许修订
//   - 修订原因（Reason）必填，作为审计依据
//
// 修订完成后返回新 MBOM 的 detail。整个过程在单事务内完成，要么全成功，
// 要么全回滚（旧 MBOM 状态保持原样、不创建新版本）。
func ReviseMBOM(ctx context.Context, mbomID string, input ReviseMBOMInput) (BOMDetailResponse, error) {
	if strings.TrimSpace(mbomID) == "" {
		return BOMDetailResponse{}, ErrBOMIDRequired
	}
	if strings.TrimSpace(input.Reason) == "" {
		return BOMDetailResponse{}, fmt.Errorf("[VALIDATION] revise reason is required")
	}

	var savedNew models.BOM
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. 取出当前 MBOM
		var current models.BOM
		if err := tx.Preload("Items").Where("id = ?", mbomID).First(&current).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("[VALIDATION] MBOM not found: %s", mbomID)
			}
			return err
		}

		// 2. 类型与状态校验
		if current.BOMType != models.BOMTypeMBOM {
			return fmt.Errorf("%w: revise target must be MBOM, got %s", ErrInvalidBOMType, current.BOMType)
		}
		if current.Status != models.BOMStatusReleased {
			return fmt.Errorf("[VALIDATION] only RELEASED MBOM can be revised (current: %s)", current.Status)
		}

		// 3. 乐观锁
		if input.ExpectedVersion != nil && current.Version != *input.ExpectedVersion {
			return fmt.Errorf("[CONFLICT] MBOM has been modified (expected v%d, got v%d). Please refresh and try again", *input.ExpectedVersion, current.Version)
		}

		// 4. 旧 MBOM 置 OBSOLETE
		beforeSnapshot := bomAuditSnapshot(current)
		if err := tx.Model(&current).
			Updates(map[string]interface{}{
				"status":    models.BOMStatusObsolete,
				"is_locked": true,
			}).Error; err != nil {
			return err
		}
		if err := writeBOMVersionSnapshotTx(ctx, tx, current, "REVISE_OBSOLETE"); err != nil {
			return err
		}
		obsoletePayload := bomAuditSnapshot(current)
		obsoletePayload["operation"] = "revise_obsolete"
		obsoletePayload["reason"] = input.Reason
		if err := writeBOMAuditEntryWithContext(ctx, tx, current.ID, "REVISE_OBSOLETE", beforeSnapshot, obsoletePayload); err != nil {
			return err
		}

		// 5. 克隆 items
		clonedItems := make([]models.BOMItem, len(current.Items))
		for idx, item := range current.Items {
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
				SortOrder:      item.SortOrder,
			}
		}

		// 6. 创建新 MBOM 版本
		nextVersionText := bumpMBOMVersionText(current.VersionText)
		nextRevisionNo := strings.TrimSpace(input.RevisionNo)
		if nextRevisionNo == "" {
			nextRevisionNo = current.MasterDataControl.RevisionNo
		}

		// 方案 B：修订是版本递进，新 MBOM 默认继承当前版本的 measuredWeight + 单位。
		// 如果当前版本不持有重量（理论上不应发生，因为 RELEASED 必须 > 0），快速失败。
		if current.MeasuredWeight <= 0 || strings.TrimSpace(current.MeasuredWeightUnit) == "" {
			return fmt.Errorf("[VALIDATION] revise blocked: current MBOM (ID: %s) is missing measuredWeight/unit", current.ID)
		}

		newMBOM := models.BOM{
			BOMType:      models.BOMTypeMBOM,
			BOMNo:        generateBOMNo(tx),
			ProductID:    current.ProductID,
			SourceEBOMID: current.SourceEBOMID,
			VersionText:  nextVersionText,
			Status:       models.BOMStatusReleased, // ✅ 修订即生效，无中间态
			IsLocked:     false,
			Description:  fmt.Sprintf("Revised from %s (%s) — %s", current.BOMNo, current.VersionText, input.Reason),
			OwnerType:          current.OwnerType,
			OwnerCustomerID:    current.OwnerCustomerID,
			VersionLevel:       current.VersionLevel,
			MeasuredWeight:     current.MeasuredWeight,
			MeasuredWeightUnit: current.MeasuredWeightUnit,
			MasterDataControl: models.MasterDataControl{
				RevisionNo:    nextRevisionNo,
				ChangeOrderNo: input.ChangeOrderNo,
				ChangeType:    "MANUAL",
			},
			RelationSidecar: current.RelationSidecar,
		}
		// 校验继承的归属是否一致(防止源 MBOM 是历史脏数据传染下游)
		if err := validateBOMOwnership(&newMBOM); err != nil {
			return fmt.Errorf("[VALIDATION] inherited ownership from current MBOM is invalid: %w", err)
		}
		newMBOM.MasterDataControl.Normalize(nextVersionText)
		// Revise 创建即 RELEASED,DB 唯一索引会拦截同 (productId, MBOM, owner, versionLevel) 的重复
		if err := tx.Create(&newMBOM).Error; err != nil {
			return wrapBOMUniqueViolation(err, &newMBOM)
		}

		// 7. 保存 items
		if err := saveBOMItems(tx, newMBOM.ID, clonedItems); err != nil {
			return err
		}

		// 8. 重新加载
		if err := tx.Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("bom_items.sort_order ASC") }).First(&savedNew, "id = ?", newMBOM.ID).Error; err != nil {
			return err
		}

		// 9. 写入版本快照与审计日志
		if err := writeBOMVersionSnapshotTx(ctx, tx, savedNew, "REVISE"); err != nil {
			return err
		}
		payload := bomAuditSnapshot(savedNew)
		payload["operation"] = "revise"
		payload["reason"] = input.Reason
		payload["previousMbomId"] = current.ID
		payload["previousMbomVersion"] = current.VersionText
		return writeBOMAuditEntryWithContext(ctx, tx, savedNew.ID, "REVISE", nil, payload)
	})

	if err != nil {
		return BOMDetailResponse{}, err
	}

	return MapBOMToDetailResponse(savedNew)
}
