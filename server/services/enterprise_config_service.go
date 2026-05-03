package services

import (
	"context"
	"errors"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type EnterpriseConfigService struct{}

func NewEnterpriseConfigService() *EnterpriseConfigService {
	return &EnterpriseConfigService{}
}

var defaultEnterpriseConfigService = NewEnterpriseConfigService()

func SaveEnterpriseConfig(ctx context.Context, config *models.EnterpriseConfig) error {
	return defaultEnterpriseConfigService.SaveEnterpriseConfig(ctx, config)
}

func (s *EnterpriseConfigService) SaveEnterpriseConfig(ctx context.Context, config *models.EnterpriseConfig) error {
	actor, _ := audit.ActorFromContext(ctx)
	if actor.UserID == "" {
		return errors.New("[CRITICAL] Identity required for enterprise config update")
	}

	config.Operator = actor.Username
	if config.Operator == "" {
		config.Operator = actor.UserID
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.EnterpriseConfig
		if err := tx.First(&existing).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// 创建初始配置
				config.Version = 1
				if err := tx.Create(config).Error; err != nil {
					return err
				}
				return recordLegacyAuditEntryWithContext(ctx, tx, "EnterpriseConfig", config.ID, "create", nil)
			}
			return err
		}

		// 乐观锁校验
		if config.Version != 0 && config.Version != existing.Version {
			return errors.New("[CONFLICT] 数据已被其他管理员更新，请刷新后重试")
		}

		// 执行更新
		newVersion := existing.Version + 1
		updates := map[string]interface{}{
			"name":       config.Name,
			"plan":       config.Plan,
			"operator":   config.Operator,
			"version":    newVersion,
			"updated_at": time.Now(),
		}

		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}

		return recordLegacyAuditEntryWithContext(ctx, tx, "EnterpriseConfig", existing.ID, "update", nil)
	})
}
