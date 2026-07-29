package services

import (
	"context"
	"errors"
	"math"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type QualityService struct {
	txManager transactionManager
}

func NewQualityService(txManager transactionManager) *QualityService {
	return &QualityService{txManager: txManager}
}

var defaultQualityService = NewQualityService(defaultServiceRuntime().txManager)

// ValidateQualityAbnormalityDisposal enforces the quality domain's single
// source-of-truth contract for disposal facts. A SCRAP disposition is not
// considered an analytical fact until it has a positive quantity and unit.
func ValidateQualityAbnormalityDisposal(abnormality *models.QualityAbnormality) error {
	if abnormality == nil {
		return domainValidationError("品质异常处置记录不能为空")
	}

	method := strings.ToUpper(strings.TrimSpace(abnormality.DisposalMethod))
	abnormality.DisposalMethod = method
	abnormality.ScrapUnit = strings.TrimSpace(abnormality.ScrapUnit)
	abnormality.ProductionPlanID = strings.TrimSpace(abnormality.ProductionPlanID)
	abnormality.OrderID = strings.TrimSpace(abnormality.OrderID)
	abnormality.ProductID = strings.TrimSpace(abnormality.ProductID)
	abnormality.BatchNo = strings.TrimSpace(abnormality.BatchNo)

	switch method {
	case "SCRAP":
		if abnormality.ScrapQuantity == nil || *abnormality.ScrapQuantity <= 0 {
			return domainValidationError("报废处置必须填写大于 0 的报废数量")
		}
		if abnormality.ScrapUnit == "" {
			return domainValidationError("报废处置必须填写报废单位")
		}
	case "REWORK", "CONCESSION":
		// Non-scrap dispositions must not carry scrap facts that could be
		// accidentally counted by the analysis domain later.
		abnormality.ScrapQuantity = nil
		abnormality.ScrapUnit = ""
	default:
		return domainValidationError("品质异常处置方式必须是 SCRAP、REWORK 或 CONCESSION")
	}

	if abnormality.OccurredAt == nil {
		now := time.Now()
		abnormality.OccurredAt = &now
	}
	return nil
}

func SaveInspectionStandard(ctx context.Context, standard *models.InspectionStandard) error {
	return defaultQualityService.SaveInspectionStandard(ctx, standard)
}

func SaveInspectionTask(ctx context.Context, task *models.InspectionTask) error {
	return defaultQualityService.SaveInspectionTask(ctx, task)
}

func RecordQualityAbnormalityDisposal(
	ctx context.Context,
	id string,
	disposal *models.QualityAbnormality,
) (models.QualityAbnormality, error) {
	return defaultQualityService.RecordQualityAbnormalityDisposal(ctx, id, disposal)
}

func (s *QualityService) SaveInspectionStandard(ctx context.Context, standard *models.InspectionStandard) error {
	actor, _ := audit.ActorFromContext(ctx)
	standard.Operator = actor.Username
	if standard.Operator == "" {
		standard.Operator = actor.UserID
	}
	if standard.Operator == "" {
		standard.Operator = "system"
	}

	// 无论是否显式设置，只要有修改，Auditor 必须更新为当前操作人
	standard.Auditor = standard.Operator
	now := time.Now()
	standard.AuditTime = &now

	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var err error
		if standard.ID == "" {
			standard.Version = 1.0
			err = tx.Create(standard).Error
		} else {
			var existing models.InspectionStandard
			if err := tx.First(&existing, "id = ?", standard.ID).Error; err == nil {
				// 只有在版本未显式递增时才执行自动递增（防止 Patch 重复递增）
				if standard.Version <= existing.Version {
					standard.Version = nextQualityStandardVersion(existing.Version)
				}
			}
			err = tx.Model(standard).Omit("CreatedAt", "CreatedBy").Updates(standard).Error
		}
		if err != nil {
			return err
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, "InspectionStandard", standard.ID, "save", nil)
	})
}

func nextQualityStandardVersion(current float64) float64 {
	return math.Round((current+0.1)*10) / 10
}

func (s *QualityService) SaveInspectionTask(ctx context.Context, task *models.InspectionTask) error {
	actor, _ := audit.ActorFromContext(ctx)
	task.Inspector = actor.Username
	if task.Inspector == "" {
		task.Inspector = actor.UserID
	}
	if task.Inspector == "" {
		task.Inspector = "system"
	}

	task.Result = strings.ToUpper(strings.TrimSpace(task.Result))
	if task.Result == "" {
		task.Result = "PENDING"
	}
	if task.Status == "" {
		task.Status = QualityInspectionTaskStatusOpen
	}
	if task.Result != "PENDING" {
		task.Status = QualityInspectionTaskStatusCompleted
		now := time.Now()
		task.CompletedAt = &now
	} else {
		task.CompletedAt = nil
	}

	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if task.ID != "" {
			var existing models.InspectionTask
			if err := tx.First(&existing, "id = ?", task.ID).Error; err != nil {
				return err
			}
			if existing.SourceType == QualityInspectionTaskSourceProductionOutsource {
				return domainValidationError("委外品质任务必须通过委外收发检验入口判定")
			}
			if task.Status == QualityInspectionTaskStatusOpen {
				task.Status = existing.Status
			}
			if err := tx.Model(&models.InspectionTask{}).Where("id = ?", task.ID).Updates(task).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Save(task).Error; err != nil {
				return err
			}
		}

		// 异常单自动生成与身份注入
		if task.Result == "FAIL" {
			var existingAbnormality models.QualityAbnormality
			if err := tx.Where("task_id = ? AND status = ?", task.ID, "OPEN").First(&existingAbnormality).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					abnormality := models.QualityAbnormality{
						TaskID:           task.ID,
						Severity:         "MAJOR",
						Description:      "[AUTO_GEN] 检验判定不通过: " + task.Remarks,
						ProductionPlanID: task.ProductionPlanID,
						OrderID:          task.OrderID,
						ProductID:        task.ProductID,
						BatchNo:          task.BatchNo,
						OccurredAt:       task.CompletedAt,
						Status:           "OPEN",
						Reporter:         task.Inspector, // 强制注入报告人
					}
					if err := tx.Create(&abnormality).Error; err != nil {
						return err
					}
				} else {
					return err
				}
			}
		}

		if err := tx.Preload("Standard").First(task, "id = ?", task.ID).Error; err != nil {
			return err
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, "InspectionTask", task.ID, "submit", nil)
	})
}

// RecordQualityAbnormalityDisposal records the final quality disposition.
// The command intentionally lives in the quality service so every future UI,
// import path, or automation uses the same validation and audit boundary.
func (s *QualityService) RecordQualityAbnormalityDisposal(
	ctx context.Context,
	id string,
	disposal *models.QualityAbnormality,
) (models.QualityAbnormality, error) {
	if strings.TrimSpace(id) == "" {
		return models.QualityAbnormality{}, domainValidationError("品质异常 ID 不能为空")
	}
	if disposal == nil {
		return models.QualityAbnormality{}, domainValidationError("品质异常处置记录不能为空")
	}

	var updated models.QualityAbnormality
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var existing models.QualityAbnormality
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("InspectionTask").
			First(&existing, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return domainNotFoundError("品质异常不存在")
			}
			return err
		}

		// Preserve the original linkage when the command only supplies the
		// disposal fields. This keeps old abnormality records incrementally
		// editable without silently losing task context.
		next := existing
		next.DisposalMethod = disposal.DisposalMethod
		next.ScrapQuantity = disposal.ScrapQuantity
		next.ScrapUnit = disposal.ScrapUnit
		if disposal.ProductionPlanID != "" {
			next.ProductionPlanID = disposal.ProductionPlanID
		}
		if disposal.OrderID != "" {
			next.OrderID = disposal.OrderID
		}
		if disposal.ProductID != "" {
			next.ProductID = disposal.ProductID
		}
		if disposal.BatchNo != "" {
			next.BatchNo = disposal.BatchNo
		}
		if disposal.OccurredAt != nil {
			next.OccurredAt = disposal.OccurredAt
		}
		if next.InspectionTask != nil {
			if next.ProductionPlanID == "" {
				next.ProductionPlanID = next.InspectionTask.ProductionPlanID
			}
			if next.OrderID == "" {
				next.OrderID = next.InspectionTask.OrderID
			}
			if next.ProductID == "" {
				next.ProductID = next.InspectionTask.ProductID
			}
			if next.BatchNo == "" {
				next.BatchNo = next.InspectionTask.BatchNo
			}
		}

		if err := ValidateQualityAbnormalityDisposal(&next); err != nil {
			return err
		}

		actor, _ := audit.ActorFromContext(ctx)
		next.Resolver = actor.Username
		if next.Resolver == "" {
			next.Resolver = actor.UserID
		}
		if next.Resolver == "" {
			next.Resolver = "system"
		}

		if err := tx.Model(&models.QualityAbnormality{}).
			Where("id = ?", id).
			Updates(map[string]interface{}{
				"disposal_method":    next.DisposalMethod,
				"scrap_quantity":     next.ScrapQuantity,
				"scrap_unit":         next.ScrapUnit,
				"production_plan_id": next.ProductionPlanID,
				"order_id":           next.OrderID,
				"product_id":         next.ProductID,
				"batch_no":           next.BatchNo,
				"occurred_at":        next.OccurredAt,
				"status":             "CLOSED",
				"resolver":           next.Resolver,
			}).Error; err != nil {
			return err
		}

		if err := tx.Preload("InspectionTask").First(&updated, "id = ?", id).Error; err != nil {
			return err
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, "QualityAbnormality", id, "record_disposal", nil)
	})
	if err != nil {
		return models.QualityAbnormality{}, err
	}
	return updated, nil
}
