package services

import (
	"context"
	"fmt"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	statemachine "xdfc-server/services/state_machine"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// PromoteBOMStatus changes lifecycle state without allowing content edits.
func PromoteBOMStatus(ctx context.Context, id string, input PromoteBOMStatusInput) (BOMDetailResponse, error) {
	if strings.TrimSpace(id) == "" {
		return BOMDetailResponse{}, ErrBOMIDRequired
	}

	var saved models.BOM
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error
		saved, err = promoteBOMLifecycleStatusWithinExistingTransaction(ctx, tx, id, input)
		return err
	})
	if err != nil {
		return BOMDetailResponse{}, err
	}
	return MapBOMToDetailResponse(saved)
}

// Shared by direct lifecycle operations and atomic save-and-publish. Audit,
// snapshots, release validation, authorization and notifications stay in one transaction.
func promoteBOMLifecycleStatusWithinExistingTransaction(ctx context.Context, tx *gorm.DB, id string, input PromoteBOMStatusInput) (models.BOM, error) {
	normalizedTargetStatus := statemachine.NormalizeBOMStatus(input.Status)
	if normalizedTargetStatus == "" {
		return models.BOM{}, fmt.Errorf("[VALIDATION] invalid target BOM status: %s", input.Status)
	}
	input.Status = string(normalizedTargetStatus)
	var existing models.BOM
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Items").Where("id = ?", id).First(&existing).Error; err != nil {
		return models.BOM{}, err
	}

	// ✅ 强制乐观锁版本检查
	if input.ExpectedVersion == nil {
		return models.BOM{}, fmt.Errorf("[VALIDATION] expectedVersion is required for status promotion")
	}
	if existing.Version != *input.ExpectedVersion {
		return models.BOM{}, fmt.Errorf("[CONFLICT] BOM has been modified by another user (expected v%d, got v%d)", *input.ExpectedVersion, existing.Version)
	}

	// ✅ 状态转换验证（考虑BOM类型）
	if guard := statemachine.CanTransitionBOMStatusWithType(existing.Status, input.Status, existing.BOMType); !guard.Allowed {
		return models.BOM{}, fmt.Errorf("[VALIDATION] %w", guard.Err())
	}

	// ✅ 权限检查
	if permCheck := statemachine.CanUserPromoteBOMStatus(ctx, existing.Status, input.Status); !permCheck.Allowed {
		return models.BOM{}, permCheck.Err()
	}

	// Content locking must not block the approved -> released lifecycle transition.
	isPublishingApprovedBOM := statemachine.NormalizeBOMStatus(existing.Status) == statemachine.BOMStatusApproved && input.Status == models.BOMStatusReleased
	if existing.IsLocked && !isPublishingApprovedBOM && input.Status != models.BOMStatusObsolete {
		return models.BOM{}, fmt.Errorf("[CRITICAL] Cannot promote a locked BOM (Status: %s) to %s", existing.Status, input.Status)
	}

	// ✅ 业务完整性校验（防止发布空 BOM 或无效 BOM）
	if err := validateBOMBusinessIntegrity(tx, id, input.Status); err != nil {
		return models.BOM{}, err
	}

	before := bomAuditSnapshot(existing)

	existing.Status = input.Status

	// ✅ 使用状态机统一管理锁定逻辑
	existing.IsLocked = statemachine.ShouldLockBOMStatusString(input.Status)

	// ✅ 版本号递增
	existing.Version++

	if err := tx.Save(&existing).Error; err != nil {
		return models.BOM{}, wrapBOMUniqueViolation(err, &existing)
	}
	saved := existing

	if err := writeBOMVersionSnapshotTx(ctx, tx, saved, "PROMOTE"); err != nil {
		return models.BOM{}, err
	}
	payload := bomAuditSnapshot(saved)
	payload["operation"] = "promote"
	payload["statusTransition"] = map[string]interface{}{
		"from":            before["status"],
		"to":              saved.Status,
		"reason":          input.Reason,
		"approverComment": input.ApproverComment,
	}
	if err := writeBOMAuditEntryWithContext(ctx, tx, saved.ID, "PROMOTE", before, payload); err != nil {
		return models.BOM{}, err
	}
	action := "STATUS_CHANGED"
	if saved.BOMType == models.BOMTypeMBOM && saved.Status == models.BOMStatusObsolete {
		action = "OBSOLETED"
	}
	if err := dispatchBOMLifecycleNotificationsWithinTransaction(ctx, tx, saved, fmt.Sprint(before["status"]), action, "", map[string]any{"reason": input.Reason, "approverComment": input.ApproverComment}); err != nil {
		return models.BOM{}, err
	}
	return saved, nil
}

func publishSavedBOMWithinExistingTransaction(ctx context.Context, tx *gorm.DB, saved models.BOM) (models.BOM, error) {
	return promoteBOMLifecycleStatusWithinExistingTransaction(ctx, tx, saved.ID, PromoteBOMStatusInput{
		Status: models.BOMStatusReleased, ExpectedVersion: &saved.Version,
	})
}
