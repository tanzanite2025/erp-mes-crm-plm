package services

import (
	"context"
	"errors"
	"fmt"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const qualityStandardApprovalReviewAction = "QUALITY_STANDARD_REVIEW"

func qualityStandardApprovalPolicyConfigurationDefinition() BusinessApprovalPolicyConfigurationDefinition {
	return BusinessApprovalPolicyConfigurationDefinition{BusinessType: models.BusinessApprovalTypeQualityStandard,
		BusinessName: "品质标准", SubmissionDescription: "标准提交审核时创建审批申请；最终通过或驳回后同步标准状态。"}
}

func resolveQualityStandardApprovalPolicyWithinTransaction(ctx context.Context, tx *gorm.DB) (models.BusinessApprovalPolicyConfiguration, error) {
	var policy models.BusinessApprovalPolicyConfiguration
	err := tx.WithContext(ctx).Clauses(clause.Locking{Strength: "SHARE"}).Where("business_type = ?", models.BusinessApprovalTypeQualityStandard).First(&policy).Error
	if errors.Is(err, gorm.ErrRecordNotFound) || err == nil && !policy.Enabled {
		return policy, domainValidationError("请在审批中心的审批配置中启用品质标准审批链，未提交审批")
	}
	if err != nil {
		return policy, err
	}
	if err := validateBusinessApprovalPolicyApproversWithinTransaction(tx, policy.Approver1ID, policy.Approver2ID, true); err != nil {
		return policy, err
	}
	actor, _ := audit.ActorFromContext(ctx)
	if _, err := uuid.Parse(actor.UserID); err != nil {
		return policy, domainValidationError("品质标准申请人身份无效，未提交审批")
	}
	var requester models.User
	if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).First(&requester, "id = ? AND status = ?", actor.UserID, "active").Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return policy, domainValidationError("品质标准申请人不存在或已停用，未提交审批")
		}
		return policy, err
	}
	return policy, nil
}

func createQualityStandardApprovalWithinTransaction(ctx context.Context, tx *gorm.DB, standard *models.InspectionStandard, policy models.BusinessApprovalPolicyConfiguration) error {
	actor, _ := audit.ActorFromContext(ctx)
	result, err := RequestApprovalTxWithContext(ctx, tx, RequestApprovalInput{
		Module: "Quality", Action: qualityStandardApprovalReviewAction, TargetID: standard.ID,
		Reason:      fmt.Sprintf("请审批品质标准 %s（%s）。", standard.Code, standard.Name),
		RequesterID: actor.UserID, Approver1ID: policy.Approver1ID, Approver2ID: policy.Approver2ID,
	})
	if err != nil {
		return err
	}
	standard.ApprovalRequestID = &result.Request.ID
	if err := tx.Model(standard).Update("approval_request_id", result.Request.ID).Error; err != nil {
		return err
	}
	return recordLegacyAuditEntryWithContext(ctx, tx, "InspectionStandard", standard.ID, "submit_approval", mustJSONRawMessage(map[string]any{
		"approvalRequestId": result.Request.ID, "policyId": policy.ID, "policyVersion": policy.Version,
		"approver1Id": policy.Approver1ID, "approver2Id": policy.Approver2ID,
	}))
}
