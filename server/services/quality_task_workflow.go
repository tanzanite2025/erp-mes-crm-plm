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

const (
	QualityInspectionTaskSourceProductionOutsource = "PRODUCTION_OUTSOURCE"

	QualityInspectionTaskStatusOpen      = "OPEN"
	QualityInspectionTaskStatusClaimed   = "CLAIMED"
	QualityInspectionTaskStatusCompleted = "COMPLETED"
	QualityInspectionTaskStatusCancelled = "CANCELLED"
)

var (
	ErrQualityInspectionTaskNotFound = errors.New("quality inspection task not found")
	ErrQualityInspectionTaskClaimed  = errors.New("quality inspection task is claimed by another user")
)

func ClaimInspectionTask(
	ctx context.Context,
	id string,
) (models.InspectionTask, error) {
	return defaultQualityService.ClaimInspectionTask(ctx, id)
}

func (s *QualityService) ClaimInspectionTask(
	ctx context.Context,
	id string,
) (models.InspectionTask, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return models.InspectionTask{}, domainValidationError("检验任务 ID 不能为空")
	}

	actor, _ := audit.ActorFromContext(ctx)
	claimedBy := strings.TrimSpace(actor.Username)
	if claimedBy == "" {
		claimedBy = strings.TrimSpace(actor.UserID)
	}
	if claimedBy == "" {
		claimedBy = "system"
	}

	var claimed models.InspectionTask
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var task models.InspectionTask
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&task, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrQualityInspectionTaskNotFound
			}
			return err
		}

		switch strings.ToUpper(strings.TrimSpace(task.Status)) {
		case "", QualityInspectionTaskStatusOpen:
			now := time.Now()
			task.Status = QualityInspectionTaskStatusClaimed
			task.ClaimedBy = claimedBy
			task.ClaimedAt = &now
		case QualityInspectionTaskStatusClaimed:
			if strings.TrimSpace(task.ClaimedBy) != claimedBy {
				return ErrQualityInspectionTaskClaimed
			}
		case QualityInspectionTaskStatusCompleted:
			return domainValidationError("检验任务已经完成，不能重复领取")
		case QualityInspectionTaskStatusCancelled:
			return domainValidationError("检验任务已经取消，不能领取")
		default:
			return domainValidationError("检验任务状态无效")
		}

		if err := tx.Model(&models.InspectionTask{}).
			Where("id = ?", task.ID).
			Updates(map[string]any{
				"status":     task.Status,
				"claimed_by": task.ClaimedBy,
				"claimed_at": task.ClaimedAt,
				"updated_at": time.Now(),
			}).Error; err != nil {
			return err
		}
		if err := tx.First(&claimed, "id = ?", task.ID).Error; err != nil {
			return err
		}
		return recordAuditEventTx(tx, audit.NewAuditEvent(
			"InspectionTask",
			task.ID,
			audit.AuditActionStatus,
			audit.AuditActor{Username: claimedBy, Source: "quality"},
		).WithMetadata("status", QualityInspectionTaskStatusClaimed).Normalize())
	})
	if err != nil {
		return models.InspectionTask{}, err
	}
	return claimed, nil
}
