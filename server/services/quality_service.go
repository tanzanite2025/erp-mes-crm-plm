package services

import (
	"context"
	"errors"
	"math"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type QualityService struct {
	txManager transactionManager
}

func NewQualityService(txManager transactionManager) *QualityService {
	return &QualityService{txManager: txManager}
}

var defaultQualityService = NewQualityService(defaultServiceRuntime().txManager)

func SaveInspectionStandard(ctx context.Context, standard *models.InspectionStandard) error {
	return defaultQualityService.SaveInspectionStandard(ctx, standard)
}

func SaveInspectionTask(ctx context.Context, task *models.InspectionTask) error {
	return defaultQualityService.SaveInspectionTask(ctx, task)
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

	now := time.Now()
	task.CompletedAt = &now

	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if task.ID != "" {
			var existing models.InspectionTask
			if err := tx.First(&existing, "id = ?", task.ID).Error; err != nil {
				return err
			}
			// 权限检查已在 Handler 层处理，此处执行更新
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
						TaskID:      task.ID,
						Severity:    "MAJOR",
						Description: "[AUTO_GEN] 检验判定不通过: " + task.Remarks,
						Status:      "OPEN",
						Reporter:    task.Inspector, // 强制注入报告人
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
