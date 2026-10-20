package services

import (
	"context"
	"errors"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type qualityStandardApprovalBusinessTransactionContract struct{}

func (qualityStandardApprovalBusinessTransactionContract) ValidateStandaloneRequest(_ RequestApprovalInput) error {
	return domainValidationError("品质标准审批必须通过标准提审操作创建")
}

func (qualityStandardApprovalBusinessTransactionContract) ValidateRequestWithinTransaction(ctx context.Context, tx *gorm.DB, input RequestApprovalInput) error {
	if input.Action != qualityStandardApprovalReviewAction {
		return domainValidationError("品质标准审批动作无效")
	}
	actor, _ := audit.ActorFromContext(ctx)
	if actor.UserID == "" || actor.UserID != input.RequesterID {
		return domainValidationError("品质标准申请人身份无效")
	}
	var standard models.InspectionStandard
	if err := tx.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).First(&standard, "id = ?", input.TargetID).Error; err != nil {
		return err
	}
	if standard.Status != "PENDING_APPROVAL" || standard.ApprovalRequestID != nil {
		return domainConflictError("品质标准未处于可创建审批申请的提交事务中")
	}
	return nil
}

func (qualityStandardApprovalBusinessTransactionContract) IssuesAuthorizationCode() bool {
	return false
}

func (qualityStandardApprovalBusinessTransactionContract) NotificationDestination(request models.ApprovalRequest) ApprovalBusinessNotificationDestination {
	return ApprovalBusinessNotificationDestination{SourceCode: models.BusinessApprovalTypeQualityStandard, ActionURL: "/quality/standards/" + request.TargetID + "/preview"}
}

func (qualityStandardApprovalBusinessTransactionContract) ApplyDecisionWithinTransaction(ctx context.Context, tx *gorm.DB, request models.ApprovalRequest, comment string, now time.Time) error {
	return applyQualityStandardApprovalDecisionWithinTransaction(ctx, tx, request, comment, now)
}

func applyQualityStandardApprovalDecisionWithinTransaction(ctx context.Context, tx *gorm.DB, request models.ApprovalRequest, comment string, now time.Time) error {
	var standard models.InspectionStandard
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND approval_request_id = ?", request.TargetID, request.ID).First(&standard).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return domainConflictError("审批申请已不属于品质标准的当前审批轮次")
		}
		return err
	}
	if standard.Status != "PENDING_APPROVAL" {
		return domainConflictError("品质标准已结束当前审批")
	}
	if request.Status == "APPROVED_L1" {
		return nil
	}
	if request.Status != "APPROVED" && request.Status != "REJECTED" {
		return domainValidationError("品质标准审批结果无效")
	}
	actor, _ := audit.ActorFromContext(ctx)
	standard.Status = request.Status
	standard.Auditor = actor.Username
	if standard.Auditor == "" {
		standard.Auditor = actor.UserID
	}
	standard.Operator = standard.Auditor
	standard.AuditTime = &now
	standard.Version = nextQualityStandardVersion(standard.Version)
	if request.Status == "APPROVED" {
		standard.ReviewComment, standard.RejectReason = strings.TrimSpace(comment), ""
	} else {
		standard.ReviewComment, standard.RejectReason = "", strings.TrimSpace(comment)
	}
	if err := tx.Model(&standard).Select("Status", "Auditor", "Operator", "AuditTime", "Version", "ReviewComment", "RejectReason", "UpdatedAt").Updates(&standard).Error; err != nil {
		return err
	}
	if err := recordLegacyAuditEntryWithContext(ctx, tx, "InspectionStandard", standard.ID, "approval_"+strings.ToLower(request.Status), nil); err != nil {
		return err
	}
	return DispatchQualityStandardLifecycleNotificationsWithinTransaction(ctx, tx, standard, "PENDING_APPROVAL")
}
