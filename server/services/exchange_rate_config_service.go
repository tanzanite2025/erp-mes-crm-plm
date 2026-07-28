package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	exchangeRateSyncConfigConfigKey         = "exchange_rate_sync_config"
	exchangeRateProviderConfigKey           = "exchange_rate_provider"
	exchangeRateAPIBaseURLConfigKey         = "exchange_rate_api_base_url"
	exchangeRateAPIKeyConfigKey             = "exchange_rate_api_key"
	exchangeRateLatestPathTemplateConfigKey = "exchange_rate_latest_path_template"
	exchangeRateSyncEnabledConfigKey        = "exchange_rate_sync_enabled"
	defaultExchangeRateProvider             = "exchangerate-api"
	defaultExchangeRateLatestPathTemplate   = "/{apiKey}/latest/{baseCode}"
)

var exchangeRateAPIBaseURL = "https://v6.exchangerate-api.com/v6"

type ExchangeRateSyncProviderConfig struct {
	ID                 string `json:"id"`
	Provider           string `json:"provider"`
	Enabled            bool   `json:"enabled"`
	Priority           int    `json:"priority"`
	APIBaseURL         string `json:"apiBaseUrl"`
	APIKey             string `json:"apiKey"`
	LatestPathTemplate string `json:"latestPathTemplate"`
}

type ExchangeRateSyncConfig struct {
	Enabled         bool                             `json:"enabled"`
	FallbackEnabled bool                             `json:"fallbackEnabled"`
	Providers       []ExchangeRateSyncProviderConfig `json:"providers"`
}

func defaultExchangeRateSyncProviderConfig() ExchangeRateSyncProviderConfig {
	return ExchangeRateSyncProviderConfig{
		ID:                 "provider-1",
		Provider:           defaultExchangeRateProvider,
		Enabled:            true,
		Priority:           1,
		APIBaseURL:         exchangeRateAPIBaseURL,
		APIKey:             strings.TrimSpace(os.Getenv("EXCHANGERATE_API_KEY")),
		LatestPathTemplate: defaultExchangeRateLatestPathTemplate,
	}
}

func defaultExchangeRateSyncConfig() ExchangeRateSyncConfig {
	return ExchangeRateSyncConfig{
		Enabled:         true,
		FallbackEnabled: false,
		Providers:       []ExchangeRateSyncProviderConfig{defaultExchangeRateSyncProviderConfig()},
	}
}

func getSystemConfigValue(database *gorm.DB, key string, defaultValue string) string {
	var config models.SystemConfig
	result := database.Where("key = ?", key).Limit(1).Find(&config)
	if result.Error != nil || result.RowsAffected == 0 {
		return defaultValue
	}
	return config.Value
}

func upsertSystemConfigRecord(tx *gorm.DB, key string, value string, label string, description string) error {
	record := models.SystemConfig{
		Key:         key,
		Value:       value,
		Label:       label,
		Description: description,
	}

	var existing models.SystemConfig
	err := tx.Where("key = ?", key).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return tx.Create(&record).Error
	}
	if err != nil {
		return err
	}

	return tx.Model(&existing).Updates(map[string]interface{}{
		"value":       value,
		"label":       label,
		"description": description,
	}).Error
}

func normalizeExchangeRateSyncProviderConfig(provider ExchangeRateSyncProviderConfig, index int) ExchangeRateSyncProviderConfig {
	normalized := ExchangeRateSyncProviderConfig{
		ID:                 strings.TrimSpace(provider.ID),
		Provider:           strings.TrimSpace(provider.Provider),
		Enabled:            provider.Enabled,
		Priority:           provider.Priority,
		APIBaseURL:         strings.TrimSpace(provider.APIBaseURL),
		APIKey:             strings.TrimSpace(provider.APIKey),
		LatestPathTemplate: strings.TrimSpace(provider.LatestPathTemplate),
	}

	if normalized.ID == "" {
		normalized.ID = fmt.Sprintf("provider-%d", index+1)
	}
	if normalized.Provider == "" {
		normalized.Provider = defaultExchangeRateProvider
	}
	if normalized.Priority <= 0 {
		normalized.Priority = index + 1
	}
	if normalized.APIBaseURL == "" {
		normalized.APIBaseURL = exchangeRateAPIBaseURL
	}
	if normalized.LatestPathTemplate == "" {
		normalized.LatestPathTemplate = defaultExchangeRateLatestPathTemplate
	}

	return normalized
}

func normalizeExchangeRateSyncConfig(config ExchangeRateSyncConfig) ExchangeRateSyncConfig {
	normalized := ExchangeRateSyncConfig{
		Enabled:         config.Enabled,
		FallbackEnabled: config.FallbackEnabled,
		Providers:       make([]ExchangeRateSyncProviderConfig, 0, len(config.Providers)),
	}

	if len(config.Providers) == 0 {
		defaults := defaultExchangeRateSyncConfig()
		normalized.Providers = defaults.Providers
		if !config.Enabled {
			normalized.Enabled = false
		}
		return normalized
	}

	for index, provider := range config.Providers {
		normalized.Providers = append(normalized.Providers, normalizeExchangeRateSyncProviderConfig(provider, index))
	}

	sort.Slice(normalized.Providers, func(i int, j int) bool {
		if normalized.Providers[i].Priority == normalized.Providers[j].Priority {
			return normalized.Providers[i].ID < normalized.Providers[j].ID
		}
		return normalized.Providers[i].Priority < normalized.Providers[j].Priority
	})

	return normalized
}

func loadLegacyExchangeRateSyncConfig(database *gorm.DB) (ExchangeRateSyncConfig, error) {
	provider := getSystemConfigValue(database, exchangeRateProviderConfigKey, defaultExchangeRateProvider)
	apiBaseURL := getSystemConfigValue(database, exchangeRateAPIBaseURLConfigKey, exchangeRateAPIBaseURL)
	apiKey := getSystemConfigValue(database, exchangeRateAPIKeyConfigKey, strings.TrimSpace(os.Getenv("EXCHANGERATE_API_KEY")))
	latestPathTemplate := getSystemConfigValue(database, exchangeRateLatestPathTemplateConfigKey, defaultExchangeRateLatestPathTemplate)
	defaultEnabled := "false"
	if strings.TrimSpace(apiKey) != "" {
		defaultEnabled = "true"
	}
	enabledRaw := getSystemConfigValue(database, exchangeRateSyncEnabledConfigKey, defaultEnabled)

	enabled, err := strconv.ParseBool(strings.TrimSpace(enabledRaw))
	if err != nil {
		return ExchangeRateSyncConfig{}, fmt.Errorf("parse exchange rate sync enabled flag: %w", err)
	}

	return normalizeExchangeRateSyncConfig(ExchangeRateSyncConfig{
		Enabled:         enabled,
		FallbackEnabled: false,
		Providers: []ExchangeRateSyncProviderConfig{{
			ID:                 "provider-1",
			Provider:           strings.TrimSpace(provider),
			Enabled:            true,
			Priority:           1,
			APIBaseURL:         strings.TrimSpace(apiBaseURL),
			APIKey:             strings.TrimSpace(apiKey),
			LatestPathTemplate: strings.TrimSpace(latestPathTemplate),
		}},
	}), nil
}

func loadExchangeRateSyncConfig(database *gorm.DB) (ExchangeRateSyncConfig, error) {
	rawJSON := strings.TrimSpace(getSystemConfigValue(database, exchangeRateSyncConfigConfigKey, ""))
	if rawJSON == "" {
		return loadLegacyExchangeRateSyncConfig(database)
	}

	var config ExchangeRateSyncConfig
	if err := json.Unmarshal([]byte(rawJSON), &config); err != nil {
		return ExchangeRateSyncConfig{}, fmt.Errorf("decode exchange rate sync config: %w", err)
	}

	return normalizeExchangeRateSyncConfig(config), nil
}

func GetExchangeRateSyncConfig() (ExchangeRateSyncConfig, error) {
	return loadExchangeRateSyncConfig(db.DB)
}

func getPrimaryExchangeRateSyncProvider(config ExchangeRateSyncConfig) ExchangeRateSyncProviderConfig {
	normalized := normalizeExchangeRateSyncConfig(config)
	if len(normalized.Providers) == 0 {
		return defaultExchangeRateSyncProviderConfig()
	}
	return normalized.Providers[0]
}

func getEnabledExchangeRateSyncProviders(config ExchangeRateSyncConfig) []ExchangeRateSyncProviderConfig {
	normalized := normalizeExchangeRateSyncConfig(config)
	providers := make([]ExchangeRateSyncProviderConfig, 0, len(normalized.Providers))
	for _, provider := range normalized.Providers {
		if provider.Enabled {
			providers = append(providers, provider)
		}
	}
	return providers
}

// SaveExchangeRateSyncConfig keeps the original system-context API. HTTP
// handlers should call SaveExchangeRateSyncConfigWithContext to preserve actor
// information in the audit event.
func SaveExchangeRateSyncConfig(config ExchangeRateSyncConfig) (ExchangeRateSyncConfig, error) {
	return SaveExchangeRateSyncConfigWithContext(context.Background(), config)
}

func SaveExchangeRateSyncConfigWithContext(ctx context.Context, config ExchangeRateSyncConfig) (ExchangeRateSyncConfig, error) {
	normalized := normalizeExchangeRateSyncConfig(config)
	payload, err := json.Marshal(normalized)
	if err != nil {
		return ExchangeRateSyncConfig{}, fmt.Errorf("encode exchange rate sync config: %w", err)
	}

	primaryProvider := getPrimaryExchangeRateSyncProvider(normalized)
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		before, err := loadExchangeRateSyncConfig(tx)
		if err != nil {
			return err
		}
		if err := upsertSystemConfigRecord(tx, exchangeRateSyncConfigConfigKey, string(payload), "汇率同步配置", "汇率同步 provider 列表与策略配置。"); err != nil {
			return err
		}
		if err := upsertSystemConfigRecord(tx, exchangeRateProviderConfigKey, primaryProvider.Provider, "汇率同步供应商", "当前主汇率同步供应商标识。"); err != nil {
			return err
		}
		if err := upsertSystemConfigRecord(tx, exchangeRateAPIBaseURLConfigKey, primaryProvider.APIBaseURL, "汇率 API Base URL", "主汇率同步请求使用的第三方 API 根地址。"); err != nil {
			return err
		}
		if err := upsertSystemConfigRecord(tx, exchangeRateAPIKeyConfigKey, primaryProvider.APIKey, "汇率 API Key", "主汇率同步请求使用的 API Key。"); err != nil {
			return err
		}
		if err := upsertSystemConfigRecord(tx, exchangeRateLatestPathTemplateConfigKey, primaryProvider.LatestPathTemplate, "汇率最新汇价路径模板", "支持 {apiKey} 与 {baseCode} 占位符的主 provider 路径模板。"); err != nil {
			return err
		}
		if err := upsertSystemConfigRecord(tx, exchangeRateSyncEnabledConfigKey, strconv.FormatBool(normalized.Enabled), "汇率同步开关", "控制手动汇率同步是否启用。"); err != nil {
			return err
		}
		return recordFinanceAuditChange(
			ctx,
			tx,
			AuditModuleExchangeRateConfig,
			exchangeRateSyncConfigConfigKey,
			"UPDATE",
			exchangeRateConfigAuditSnapshot(before),
			exchangeRateConfigAuditSnapshot(normalized),
		)
	})
	if err != nil {
		return ExchangeRateSyncConfig{}, err
	}

	return normalized, nil
}
