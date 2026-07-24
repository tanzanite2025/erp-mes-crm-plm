package services

import (
	"context"
	"errors"
	"math"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const qualityQuantitySettlementTolerance = 0.000001

var (
	ErrQualityQuantitySettlementNotFound = errors.New("quality quantity settlement not found")
)

// ValidateQualityBatchQuantitySettlement validates the complete-batch
// quantity contract. SampleQty from an inspection task is intentionally not
// used here because it is only the sampled scope.
func ValidateQualityBatchQuantitySettlement(
	settlement *models.QualityBatchQuantitySettlement,
) error {
	if settlement == nil {
		return domainValidationError("质量批次数量结算不能为空")
	}

	settlement.ProductionPlanID = strings.TrimSpace(settlement.ProductionPlanID)
	settlement.OrderID = strings.TrimSpace(settlement.OrderID)
	settlement.ProductID = strings.TrimSpace(settlement.ProductID)
	settlement.BatchNo = strings.TrimSpace(settlement.BatchNo)
	settlement.InspectionTaskID = strings.TrimSpace(settlement.InspectionTaskID)
	settlement.QuantityUnit = strings.TrimSpace(settlement.QuantityUnit)

	if settlement.ProductionPlanID == "" {
		return domainValidationError("质量批次数量结算必须关联生产计划")
	}
	if settlement.ProductID == "" {
		return domainValidationError("质量批次数量结算必须关联产品")
	}
	if settlement.BatchNo == "" {
		return domainValidationError("质量批次数量结算必须填写批次")
	}
	if settlement.InspectionTaskID == "" {
		return domainValidationError("质量批次数量结算必须关联检验任务")
	}
	if settlement.QuantityUnit == "" {
		return domainValidationError("质量批次数量结算必须填写数量单位")
	}
	if settlement.InputQuantity <= 0 {
		return domainValidationError("质量批次数量结算的投入量必须大于 0")
	}
	if settlement.QualifiedQuantity < 0 ||
		settlement.RejectedQuantity < 0 ||
		settlement.ReworkQuantity < 0 {
		return domainValidationError("质量批次数量结算的数量不能为负数")
	}
	for _, quantity := range []float64{
		settlement.InputQuantity,
		settlement.QualifiedQuantity,
		settlement.RejectedQuantity,
		settlement.ReworkQuantity,
	} {
		if math.IsNaN(quantity) || math.IsInf(quantity, 0) {
			return domainValidationError("质量批次数量结算的数量必须是有限数字")
		}
	}

	disposedQuantity :=
		settlement.QualifiedQuantity +
			settlement.RejectedQuantity +
			settlement.ReworkQuantity
	if math.Abs(settlement.InputQuantity-disposedQuantity) >
		qualityQuantitySettlementTolerance {
		return domainValidationError("投入量必须等于合格量、报废量和返工量之和")
	}

	if settlement.OccurredAt.IsZero() {
		settlement.OccurredAt = time.Now()
	}
	return nil
}

func ConfirmQualityBatchQuantitySettlement(
	ctx context.Context,
	settlement *models.QualityBatchQuantitySettlement,
) (models.QualityBatchQuantitySettlement, error) {
	return defaultQualityQuantitySettlementService().Confirm(ctx, settlement)
}

func GetQualityBatchQuantitySettlementByTask(
	ctx context.Context,
	inspectionTaskID string,
) (models.QualityBatchQuantitySettlement, error) {
	return defaultQualityQuantitySettlementService().GetByTask(ctx, inspectionTaskID)
}

type qualityQuantitySettlementService struct {
	txManager transactionManager
	database  *gorm.DB
}

func defaultQualityQuantitySettlementService() *qualityQuantitySettlementService {
	return &qualityQuantitySettlementService{
		txManager: defaultServiceRuntime().txManager,
		database:  db.DB,
	}
}

func (s *qualityQuantitySettlementService) Confirm(
	ctx context.Context,
	settlement *models.QualityBatchQuantitySettlement,
) (models.QualityBatchQuantitySettlement, error) {
	if err := ValidateQualityBatchQuantitySettlement(settlement); err != nil {
		return models.QualityBatchQuantitySettlement{}, err
	}
	if s == nil || s.txManager == nil {
		return models.QualityBatchQuantitySettlement{}, errors.New(
			"quality quantity settlement database is unavailable",
		)
	}

	actor, _ := audit.ActorFromContext(ctx)
	confirmedBy := strings.TrimSpace(actor.Username)
	if confirmedBy == "" {
		confirmedBy = strings.TrimSpace(actor.UserID)
	}
	if confirmedBy == "" {
		confirmedBy = "system"
	}

	var updated models.QualityBatchQuantitySettlement
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var inspectionTask models.InspectionTask
		if err := tx.First(&inspectionTask, "id = ?", settlement.InspectionTaskID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return domainNotFoundError("关联检验任务不存在")
			}
			return err
		}
		if strings.TrimSpace(inspectionTask.ProductionPlanID) == "" {
			return domainValidationError("检验任务缺少生产计划关联，不能确认质量数量")
		}
		if strings.TrimSpace(inspectionTask.ProductID) == "" {
			return domainValidationError("检验任务缺少产品关联，不能确认质量数量")
		}
		if strings.TrimSpace(inspectionTask.BatchNo) == "" {
			return domainValidationError("检验任务缺少批次，不能确认质量数量")
		}
		if strings.EqualFold(strings.TrimSpace(inspectionTask.Result), "PENDING") ||
			strings.TrimSpace(inspectionTask.Result) == "" {
			return domainValidationError("检验任务尚未完成，不能确认质量数量")
		}
		if strings.TrimSpace(inspectionTask.ProductionPlanID) != settlement.ProductionPlanID {
			return domainValidationError("质量数量结算与检验任务的生产计划不一致")
		}
		if strings.TrimSpace(inspectionTask.ProductID) != settlement.ProductID {
			return domainValidationError("质量数量结算与检验任务的产品不一致")
		}
		if strings.TrimSpace(inspectionTask.BatchNo) != settlement.BatchNo {
			return domainValidationError("质量数量结算与检验任务的批次不一致")
		}

		var plan models.ProductionPlan
		if err := tx.First(&plan, "id = ?", settlement.ProductionPlanID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return domainNotFoundError("关联生产计划不存在")
			}
			return err
		}
		if strings.TrimSpace(plan.ProductID) != "" &&
			strings.TrimSpace(plan.ProductID) != settlement.ProductID {
			return domainValidationError("质量数量结算与生产计划的产品不一致")
		}
		if strings.TrimSpace(plan.OrderID) != "" {
			if settlement.OrderID == "" {
				settlement.OrderID = strings.TrimSpace(plan.OrderID)
			} else if strings.TrimSpace(plan.OrderID) != settlement.OrderID {
				return domainValidationError("质量数量结算与生产计划的销售订单不一致")
			}
		}

		var product models.Product
		if err := tx.First(&product, "id = ?", settlement.ProductID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return domainNotFoundError("关联产品不存在")
			}
			return err
		}
		if settlement.OrderID == "" {
			settlement.OrderID = strings.TrimSpace(inspectionTask.OrderID)
		}

		now := time.Now()
		settlement.ConfirmedAt = now
		settlement.ConfirmedBy = confirmedBy

		var existing models.QualityBatchQuantitySettlement
		result := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where(
				"production_plan_id = ? AND batch_no = ?",
				settlement.ProductionPlanID,
				settlement.BatchNo,
			).
			First(&existing)
		switch {
		case result.Error == nil:
			settlement.ID = existing.ID
			settlement.CreatedAt = existing.CreatedAt
			if err := tx.Model(&models.QualityBatchQuantitySettlement{}).
				Where("id = ?", existing.ID).
				Updates(map[string]interface{}{
					"order_id":           settlement.OrderID,
					"product_id":         settlement.ProductID,
					"inspection_task_id": settlement.InspectionTaskID,
					"input_quantity":     settlement.InputQuantity,
					"qualified_quantity": settlement.QualifiedQuantity,
					"rejected_quantity":  settlement.RejectedQuantity,
					"rework_quantity":    settlement.ReworkQuantity,
					"quantity_unit":      settlement.QuantityUnit,
					"occurred_at":        settlement.OccurredAt,
					"confirmed_at":       settlement.ConfirmedAt,
					"confirmed_by":       settlement.ConfirmedBy,
					"updated_at":         now,
				}).Error; err != nil {
				return err
			}
		case errors.Is(result.Error, gorm.ErrRecordNotFound):
			if settlement.ID == "" {
				settlement.ID = uuid.NewString()
			}
			if err := tx.Create(settlement).Error; err != nil {
				return err
			}
		default:
			return result.Error
		}

		if err := tx.Preload("InspectionTask").
			First(&updated, "id = ?", settlement.ID).Error; err != nil {
			return err
		}
		return recordLegacyAuditEntryWithContext(
			ctx,
			tx,
			"QualityBatchQuantitySettlement",
			updated.ID,
			"confirm",
			nil,
		)
	})
	if err != nil {
		return models.QualityBatchQuantitySettlement{}, err
	}
	return updated, nil
}

func (s *qualityQuantitySettlementService) GetByTask(
	ctx context.Context,
	inspectionTaskID string,
) (models.QualityBatchQuantitySettlement, error) {
	if s == nil || s.database == nil {
		return models.QualityBatchQuantitySettlement{}, errors.New(
			"quality quantity settlement database is unavailable",
		)
	}
	inspectionTaskID = strings.TrimSpace(inspectionTaskID)
	if inspectionTaskID == "" {
		return models.QualityBatchQuantitySettlement{}, domainValidationError(
			"检验任务 ID 不能为空",
		)
	}

	var settlement models.QualityBatchQuantitySettlement
	err := s.database.WithContext(ctx).
		Preload("InspectionTask").
		Where("inspection_task_id = ?", inspectionTaskID).
		First(&settlement).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.QualityBatchQuantitySettlement{}, ErrQualityQuantitySettlementNotFound
	}
	if err != nil {
		return models.QualityBatchQuantitySettlement{}, err
	}
	return settlement, nil
}
