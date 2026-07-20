package services

import (
	"context"
	"encoding/json"
	"strings"
	"xdfc-server/audit"

	"gorm.io/gorm"
)

func financeSystemAuditContext() context.Context {
	return audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "system",
		Username: "system",
		Source:   "system",
	})
}

func recordFinanceAuditChange(
	ctx context.Context,
	tx *gorm.DB,
	module string,
	targetID string,
	action string,
	before any,
	after any,
) error {
	diff, err := json.Marshal(map[string]any{
		"before":  before,
		"payload": after,
	})
	if err != nil {
		return err
	}
	return recordLegacyAuditEntryWithContext(
		ctx,
		tx,
		module,
		strings.TrimSpace(targetID),
		strings.TrimSpace(action),
		diff,
	)
}

func exchangeRateConfigAuditSnapshot(config ExchangeRateSyncConfig) map[string]any {
	providers := make([]map[string]any, 0, len(config.Providers))
	for _, provider := range config.Providers {
		providers = append(providers, map[string]any{
			"id":                 provider.ID,
			"provider":           provider.Provider,
			"enabled":            provider.Enabled,
			"priority":           provider.Priority,
			"apiBaseUrl":         provider.APIBaseURL,
			"hasApiKey":          strings.TrimSpace(provider.APIKey) != "",
			"latestPathTemplate": provider.LatestPathTemplate,
		})
	}
	return map[string]any{
		"enabled":         config.Enabled,
		"fallbackEnabled": config.FallbackEnabled,
		"providers":       providers,
	}
}
