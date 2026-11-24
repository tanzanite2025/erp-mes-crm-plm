package services

import (
	"context"
	"errors"
	"math"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
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
		if abnormality.ScrapQuantity == nil || (*abnormality.ScrapQuantity <= 0 || math.IsNaN(*abnormality.ScrapQuantity) || math.IsInf(*abnormality.ScrapQuantity, 0)) {
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
	disposal *QualityAbnormalityDisposalCommand,
) (models.QualityAbnormality, error) {
	return defaultQualityService.RecordQualityAbnormalityDisposal(ctx, id, disposal)
}

func (s *QualityService) SaveInspectionStandard(ctx context.Context, standard *models.InspectionStandard) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		return SaveInspectionStandardWithinTransaction(ctx, tx, standard)
	})
}

// SaveInspectionStandardWithinTransaction keeps version updates and audit writes
// on the transaction that already owns the standard's row lock.
func SaveInspectionStandardWithinTransaction(ctx context.Context, tx *gorm.DB, standard *models.InspectionStandard) error {
	var existing *models.InspectionStandard
	if standard.ID != "" {
		var stored models.InspectionStandard
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&stored, "id = ?", standard.ID).Error; err != nil {
			return err
		}
		if math.Abs(standard.Version-stored.Version) > 0.000001 {
			return ErrQualityStandardVersionConflict
		}
		existing = &stored
	}
	if err := prepareQualityStandardLifecycleSave(ctx, existing, standard); err != nil {
		return err
	}
	if existing == nil || existing.Status == "DRAFT" || existing.Status == "REJECTED" {
		if err := validateQualityStandardInspectionCriteriaWithinTransaction(tx, *standard); err != nil {
			return err
		}
	}
	var approvalPolicy models.BusinessApprovalPolicyConfiguration
	submitting := standard.Status == "PENDING_APPROVAL"
	if submitting {
		var err error
		approvalPolicy, err = resolveQualityStandardApprovalPolicyWithinTransaction(ctx, tx)
		if err != nil {
			return err
		}
	}
	previousStatus := ""
	if existing == nil {
		standard.ID = uuid.NewString()
		standard.Version = 1
		if err := tx.Create(standard).Error; err != nil {
			return err
		}
	} else {
		previousStatus = existing.Status
		standard.CreatedAt = existing.CreatedAt
		standard.Version = nextQualityStandardVersion(existing.Version)
		if err := tx.Model(standard).Select("*").Omit("CreatedAt", "DeletedAt").Updates(standard).Error; err != nil {
			return err
		}
	}
	if submitting {
		if err := createQualityStandardApprovalWithinTransaction(ctx, tx, standard, approvalPolicy); err != nil {
			return err
		}
	}
	if err := recordLegacyAuditEntryWithContext(ctx, tx, "InspectionStandard", standard.ID, "save", nil); err != nil {
		return err
	}
	return DispatchQualityStandardLifecycleNotificationsWithinTransaction(ctx, tx, *standard, previousStatus)
}

func nextQualityStandardVersion(current float64) float64 {
	return math.Round((current+0.1)*10) / 10
}

func (s *QualityService) SaveInspectionTask(ctx context.Context, task *models.InspectionTask) error {
	if task == nil {
		return domainValidationError("实测提交不能为空")
	}
	actor, ok := audit.ActorFromContext(ctx)
	if !ok || actor.UserID == "" && actor.Username == "" {
		return domainValidationError("实测提交必须关联当前检验人员")
	}
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if restored, err := restorePreviouslySubmittedQualityInspectionWithinTransaction(ctx, tx, task); err != nil || restored {
			return err
		}
		if err := prepareAndEvaluateInspectionTaskWithinTransaction(ctx, tx, task); err != nil {
			return err
		}
		omittedColumns := append([]string{"Standard"}, collectEmptyOptionalUUIDColumns(
			optionalUUIDColumnValue{Column: "production_plan_id", Value: task.ProductionPlanID},
			optionalUUIDColumnValue{Column: "order_id", Value: task.OrderID},
			optionalUUIDColumnValue{Column: "parent_task_id", Value: task.ParentTaskID},
		)...)
		if task.ID == "" {
			task.ID = uuid.NewString()
			if err := tx.Omit(omittedColumns...).Create(task).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Model(task).Select("*").Omit(append(omittedColumns, "CreatedAt", "DeletedAt")...).Updates(task).Error; err != nil {
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
					if err := omitEmptyUUIDColumnsForRecordCreation(tx,
						optionalUUIDColumnValue{Column: "production_plan_id", Value: abnormality.ProductionPlanID},
						optionalUUIDColumnValue{Column: "order_id", Value: abnormality.OrderID},
					).Create(&abnormality).Error; err != nil {
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
