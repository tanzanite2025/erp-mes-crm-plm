package services

import (
	"context"
	"errors"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"
)

var ErrQualityStandardVersionConflict = errors.New("quality standard version conflict")

// prepareQualityStandardLifecycleSave rejects client-written review decisions
// and stamps publication/archive facts from the authenticated server actor.
func prepareQualityStandardLifecycleSave(ctx context.Context, existing *models.InspectionStandard, standard *models.InspectionStandard) error {
	actor, _ := audit.ActorFromContext(ctx)
	standard.Operator = actor.Username
	if standard.Operator == "" {
		standard.Operator = actor.UserID
	}
	if strings.TrimSpace(standard.Code) == "" || strings.TrimSpace(standard.Name) == "" {
		return domainValidationError("品质标准编码和名称不能为空")
	}
	switch standard.Type {
	case "IQC", "IPQC", "FQC", "OQC":
	default:
		return domainValidationError("品质标准检验类型无效")
	}
	if standard.Status == "" {
		standard.Status = "DRAFT"
	}
	previousStatus := ""
	requestedArchiveReason := standard.ArchiveReason
	standard.ArchiveReason = ""
	if existing != nil {
		previousStatus = existing.Status
		standard.ApprovalRequestID = existing.ApprovalRequestID
		standard.Auditor, standard.AuditTime = existing.Auditor, existing.AuditTime
		standard.ReviewComment, standard.RejectReason = existing.ReviewComment, existing.RejectReason
		standard.PublishedBy, standard.PublishedAt = existing.PublishedBy, existing.PublishedAt
		standard.ArchivedBy, standard.ArchivedAt = existing.ArchivedBy, existing.ArchivedAt
		standard.ArchiveReason = existing.ArchiveReason
	}
	if previousStatus == standard.Status {
		if previousStatus != "DRAFT" && previousStatus != "REJECTED" {
			return domainValidationError("当前品质标准状态不允许编辑")
		}
		return nil
	}
	now := time.Now().UTC()
	switch {
	case (previousStatus == "" || previousStatus == "DRAFT" || previousStatus == "REJECTED") && (standard.Status == "DRAFT" || standard.Status == "PENDING_APPROVAL"):
		standard.Auditor, standard.AuditTime = "", nil
		standard.ReviewComment, standard.RejectReason = "", ""
		standard.ApprovalRequestID = nil
		standard.PublishedBy, standard.PublishedAt, standard.ArchiveReason, standard.ArchivedBy, standard.ArchivedAt = "", nil, "", "", nil
		return nil
	case previousStatus == "APPROVED" && standard.Status == "PUBLISHED":
		standard.PublishedBy, standard.PublishedAt = standard.Operator, &now
	case previousStatus == "PUBLISHED" && standard.Status == "ARCHIVED":
		standard.ArchiveReason = strings.TrimSpace(requestedArchiveReason)
		if standard.ArchiveReason == "" {
			return domainValidationError("归档品质标准必须填写原因")
		}
		standard.ArchivedBy, standard.ArchivedAt = standard.Operator, &now
	default:
		return domainValidationError("品质标准状态转换无效；审批决定必须通过当前审批申请执行")
	}
	if existing != nil {
		standard.Code, standard.Name, standard.ProductID, standard.ProductName = existing.Code, existing.Name, existing.ProductID, existing.ProductName
		standard.Type, standard.Items, standard.Description = existing.Type, existing.Items, existing.Description
	}
	return nil
}
