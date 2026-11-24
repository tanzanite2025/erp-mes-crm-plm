package services

import (
	"context"
	"errors"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// QualityAbnormalityDisposalCommand owns only disposition fields. Legacy source
// fields are assertions for compatibility, never assignments to the source.
type QualityAbnormalityDisposalCommand struct {
	DisposalMethod   string
	ScrapQuantity    *float64
	ScrapUnit        string
	ProductionPlanID string
	OrderID          string
	ProductID        string
	BatchNo          string
	OccurredAt       *time.Time
}

func (s *QualityService) RecordQualityAbnormalityDisposal(ctx context.Context, id string, command *QualityAbnormalityDisposalCommand) (models.QualityAbnormality, error) {
	id = strings.TrimSpace(id)
	if _, err := uuid.Parse(id); err != nil {
		return models.QualityAbnormality{}, domainValidationError("品质异常 ID 必须是有效 UUID")
	}
	if command == nil {
		return models.QualityAbnormality{}, domainValidationError("品质异常处置记录不能为空")
	}
	actor, ok := audit.ActorFromContext(ctx)
	if !ok || strings.TrimSpace(actor.UserID) == "" && strings.TrimSpace(actor.Username) == "" {
		return models.QualityAbnormality{}, domainValidationError("品质异常处置必须关联当前处置人员")
	}
	var updated models.QualityAbnormality
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		tx = tx.WithContext(ctx)
		var existing models.QualityAbnormality
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("InspectionTask").First(&existing, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return domainNotFoundError("品质异常不存在")
			}
			return err
		}
		if existing.TaskID != "" && existing.InspectionTask == nil {
			return domainConflictError("原检验任务不可用，请先核查异常来源")
		}
		next := existing
		// Historical missing links may only be restored from the original task.
		if task := existing.InspectionTask; task != nil {
			for _, link := range []struct {
				stored *string
				source string
			}{
				{&next.ProductionPlanID, task.ProductionPlanID}, {&next.OrderID, task.OrderID},
				{&next.ProductID, task.ProductID}, {&next.BatchNo, task.BatchNo},
			} {
				if *link.stored != "" && link.source != "" && *link.stored != link.source {
					return domainConflictError("品质异常与原检验任务来源不一致，请先核查原始记录")
				}
				if *link.stored == "" {
					*link.stored = link.source
				}
			}
			if next.OccurredAt == nil {
				next.OccurredAt = task.CompletedAt
			}
		}
		if next.OccurredAt == nil {
			next.OccurredAt = &existing.CreatedAt
		}
		for _, assertion := range []struct{ supplied, source string }{
			{command.ProductionPlanID, next.ProductionPlanID}, {command.OrderID, next.OrderID},
			{command.ProductID, next.ProductID}, {command.BatchNo, next.BatchNo},
		} {
			if strings.TrimSpace(assertion.supplied) != "" && strings.TrimSpace(assertion.supplied) != assertion.source {
				return domainValidationError("处置不能变更原检验任务的产品、批次、生产计划或订单")
			}
		}
		if command.OccurredAt != nil && !command.OccurredAt.Equal(*next.OccurredAt) {
			return domainValidationError("处置不能变更异常发生时间")
		}
		next.DisposalMethod, next.ScrapQuantity, next.ScrapUnit = command.DisposalMethod, command.ScrapQuantity, command.ScrapUnit
		if err := ValidateQualityAbnormalityDisposal(&next); err != nil {
			return err
		}
		if existing.Status == "CLOSED" {
			if haveIdenticalQualityAbnormalityDisposalFacts(existing, next) {
				updated = existing
				return nil
			}
			return domainConflictError("品质异常已关闭，不能覆盖已确认的处置，请刷新查看")
		}
		if existing.Status != "OPEN" {
			return domainConflictError("仅待处置的品质异常可以关闭")
		}
		outsource := existing.InspectionTask != nil && existing.InspectionTask.SourceType == QualityInspectionTaskSourceProductionOutsource
		if outsource && !haveIdenticalQualityAbnormalityDisposalFacts(existing, next) {
			return domainConflictError("委外处置已联动库存，不能通过异常关闭改写，请在委外业务核查")
		}
		if next.DisposalMethod == "SCRAP" && !outsource {
			var unit models.Unit
			if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).Where("code = ? AND status = ?", next.ScrapUnit, "active").First(&unit).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return domainValidationError("报废单位必须是已启用的计量单位")
				}
				return err
			}
		}
		next.Resolver = strings.TrimSpace(actor.Username)
		if next.Resolver == "" {
			next.Resolver = strings.TrimSpace(actor.UserID)
		}
		updates := map[string]any{"disposal_method": next.DisposalMethod, "scrap_quantity": next.ScrapQuantity, "scrap_unit": next.ScrapUnit, "status": "CLOSED", "resolver": next.Resolver, "batch_no": next.BatchNo, "occurred_at": next.OccurredAt}
		for _, link := range []struct{ column, value string }{{"production_plan_id", next.ProductionPlanID}, {"order_id", next.OrderID}, {"product_id", next.ProductID}} {
			if link.value == "" {
				updates[link.column] = nil
			} else {
				updates[link.column] = link.value
			}
		}
		if err := tx.Model(&models.QualityAbnormality{}).Where("id = ?", id).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.Preload("InspectionTask").First(&updated, "id = ?", id).Error; err != nil {
			return err
		}
		return recordAuditEventTx(tx, audit.NewAuditEvent(audit.AuditEntityKey(NormalizeAuditModule("QualityAbnormality")), id, "record_disposal", actor).WithChanges(
			audit.AuditChange{Field: "status", OldValue: existing.Status, NewValue: updated.Status},
			audit.AuditChange{Field: "disposalMethod", OldValue: existing.DisposalMethod, NewValue: updated.DisposalMethod},
			audit.AuditChange{Field: "scrapQuantity", OldValue: existing.ScrapQuantity, NewValue: updated.ScrapQuantity},
			audit.AuditChange{Field: "scrapUnit", OldValue: existing.ScrapUnit, NewValue: updated.ScrapUnit},
			audit.AuditChange{Field: "resolver", OldValue: existing.Resolver, NewValue: updated.Resolver},
			audit.AuditChange{Field: "productionPlanId", OldValue: existing.ProductionPlanID, NewValue: updated.ProductionPlanID},
			audit.AuditChange{Field: "orderId", OldValue: existing.OrderID, NewValue: updated.OrderID},
			audit.AuditChange{Field: "productId", OldValue: existing.ProductID, NewValue: updated.ProductID},
			audit.AuditChange{Field: "batchNo", OldValue: existing.BatchNo, NewValue: updated.BatchNo},
			audit.AuditChange{Field: "occurredAt", OldValue: existing.OccurredAt, NewValue: updated.OccurredAt},
		).Normalize())
	})
	if err != nil {
		return models.QualityAbnormality{}, err
	}
	return updated, nil
}

func haveIdenticalQualityAbnormalityDisposalFacts(first, second models.QualityAbnormality) bool {
	if first.DisposalMethod != second.DisposalMethod || first.ScrapUnit != second.ScrapUnit {
		return false
	}
	if first.ScrapQuantity == nil || second.ScrapQuantity == nil {
		return first.ScrapQuantity == nil && second.ScrapQuantity == nil
	}
	return *first.ScrapQuantity == *second.ScrapQuantity
}

func closeCompletedOutsourceReworkAbnormalitiesWithinQualityTransaction(
	tx *gorm.DB,
	parentTaskID string,
	actor audit.AuditActor,
	closedAt time.Time,
) error {
	parentTaskID = strings.TrimSpace(parentTaskID)
	if parentTaskID == "" {
		return nil
	}
	var parentTask models.InspectionTask
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Select("id", "source_type").
		First(&parentTask, "id = ?", parentTaskID).Error; err != nil {
		return err
	}
	if parentTask.SourceType != QualityInspectionTaskSourceProductionOutsource {
		return domainConflictError("返工复检的父任务不是委外品质任务")
	}
	var abnormalities []models.QualityAbnormality
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("task_id = ? AND status = ? AND disposal_method = ?", parentTask.ID, "OPEN", OutsourceInspectionDispositionRework).
		Order("id asc").
		Find(&abnormalities).Error; err != nil {
		return err
	}
	resolver := strings.TrimSpace(actor.Username)
	if resolver == "" {
		resolver = strings.TrimSpace(actor.UserID)
	}
	for _, abnormality := range abnormalities {
		result := tx.Model(&models.QualityAbnormality{}).
			Where("id = ? AND status = ?", abnormality.ID, "OPEN").
			Updates(map[string]any{
				"status":     "CLOSED",
				"resolver":   resolver,
				"updated_at": closedAt,
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			continue
		}
		if err := recordAuditEventTx(tx, audit.NewAuditEvent(
			audit.AuditEntityKey(NormalizeAuditModule("QualityAbnormality")),
			abnormality.ID,
			"close_after_rework_reinspection",
			actor,
		).WithChanges(
			audit.AuditChange{Field: "status", OldValue: abnormality.Status, NewValue: "CLOSED"},
			audit.AuditChange{Field: "resolver", OldValue: abnormality.Resolver, NewValue: resolver},
		).Normalize()); err != nil {
			return err
		}
	}
	return nil
}
