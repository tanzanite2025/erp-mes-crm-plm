package services

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type EnterpriseConfigService struct{}

const DefaultEnterpriseLogoURL = "/brand/hackgripe.png"

func NewEnterpriseConfigService() *EnterpriseConfigService {
	return &EnterpriseConfigService{}
}

var defaultEnterpriseConfigService = NewEnterpriseConfigService()

func SaveEnterpriseConfig(ctx context.Context, config *models.EnterpriseConfig) error {
	return defaultEnterpriseConfigService.SaveEnterpriseConfig(ctx, config)
}

func ApplyEnterpriseConfigDefaults(config *models.EnterpriseConfig) {
	config.Name = strings.TrimSpace(config.Name)
	config.Plan = strings.TrimSpace(config.Plan)
	config.LogoURL = normalizeEnterpriseLogoURL(config.LogoURL)
}

func normalizeEnterpriseLogoURL(raw string) string {
	logoURL := strings.TrimSpace(raw)
	if logoURL == "" {
		return DefaultEnterpriseLogoURL
	}
	return logoURL
}

func validateEnterpriseLogoURL(logoURL string) error {
	normalizedURL := normalizeEnterpriseLogoURL(logoURL)
	if normalizedURL == DefaultEnterpriseLogoURL {
		return nil
	}

	if !strings.HasPrefix(normalizedURL, "/uploads/enterprise-logo-") {
		return errors.New("[VALIDATION] enterprise logo must use the managed logo upload endpoint")
	}

	ext := strings.ToLower(filepath.Ext(normalizedURL))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
		return errors.New("[VALIDATION] enterprise logo must be a PNG or JPEG image")
	}

	if strings.Contains(normalizedURL, "..") || strings.Contains(normalizedURL, "\\") || len(normalizedURL) > 512 {
		return errors.New("[VALIDATION] enterprise logo URL is invalid")
	}

	return nil
}

func (s *EnterpriseConfigService) SaveEnterpriseConfig(ctx context.Context, config *models.EnterpriseConfig) error {
	actor, _ := audit.ActorFromContext(ctx)
	if actor.UserID == "" {
		return errors.New("[CRITICAL] Identity required for enterprise config update")
	}

	ApplyEnterpriseConfigDefaults(config)
	if err := validateEnterpriseLogoURL(config.LogoURL); err != nil {
		return err
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
			"logo_url":   config.LogoURL,
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
