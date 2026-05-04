package services

import (
	"errors"
	"fmt"
	"strings"
)

var (
	ErrExchangeRateAPIKeyMissing = fmt.Errorf("exchange rate api key not set")
	ErrExchangeRateBaseMissing   = fmt.Errorf("base currency not defined")
	ErrExchangeRateAPIStatus     = fmt.Errorf("exchange rate api returned non-success")
	ErrExchangeRateSyncDisabled  = fmt.Errorf("exchange rate sync disabled")
)

type ExchangeRateSyncAttemptResult struct {
	ProviderID   string
	ProviderName string
	Priority     int
	Reason       string
}

type ExchangeRateSyncFallbackError struct {
	Attempts []ExchangeRateSyncAttemptResult
	LastErr  error
}

func (e *ExchangeRateSyncFallbackError) Error() string {
	if e == nil {
		return "exchange rate sync fallback failed"
	}
	if e.LastErr == nil {
		return "exchange rate sync fallback failed"
	}
	return fmt.Sprintf("exchange rate sync fallback exhausted: %v", e.LastErr)
}

func (e *ExchangeRateSyncFallbackError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.LastErr
}

func SyncExchangeRatesFromEnv() (int, error) {
	provider := defaultExchangeRateSyncProviderConfig()
	provider.APIKey = strings.TrimSpace(provider.APIKey)
	if provider.APIKey == "" {
		return 0, ErrExchangeRateAPIKeyMissing
	}
	return syncExchangeRatesWithProvider(provider)
}

func syncExchangeRatesWithProvider(provider ExchangeRateSyncProviderConfig) (int, error) {
	switch strings.TrimSpace(provider.Provider) {
	case "", defaultExchangeRateProvider:
		return syncExchangeRatesWithExchangeRateAPI(provider)
	default:
		return 0, fmt.Errorf("unsupported exchange rate provider: %s", provider.Provider)
	}
}

func isFallbackEligibleExchangeRateError(err error) bool {
	if err == nil {
		return false
	}

	if errors.Is(err, ErrExchangeRateSyncDisabled) || errors.Is(err, ErrExchangeRateBaseMissing) {
		return false
	}

	if errors.Is(err, ErrExchangeRateAPIKeyMissing) || errors.Is(err, ErrExchangeRateAPIStatus) {
		return true
	}

	message := strings.ToLower(strings.TrimSpace(err.Error()))
	return strings.Contains(message, "timeout") ||
		strings.Contains(message, "connection refused") ||
		strings.Contains(message, "no such host") ||
		strings.Contains(message, "temporary") ||
		strings.Contains(message, "request exchange rate api") ||
		strings.Contains(message, "unsupported exchange rate provider")
}

func summarizeExchangeRateSyncError(err error) string {
	if err == nil {
		return ""
	}
	message := strings.TrimSpace(err.Error())
	if message == "" {
		return "unknown sync error"
	}
	return message
}

func selectPrimaryExchangeRateSyncProvider(providers []ExchangeRateSyncProviderConfig) (ExchangeRateSyncProviderConfig, bool) {
	if len(providers) == 0 {
		return ExchangeRateSyncProviderConfig{}, false
	}
	return providers[0], true
}

func tryExchangeRateSyncProviders(providers []ExchangeRateSyncProviderConfig) (int, error) {
	var attempts []ExchangeRateSyncAttemptResult
	var lastErr error

	for _, provider := range providers {
		count, err := syncExchangeRatesWithProvider(provider)
		if err == nil {
			return count, nil
		}

		attempts = append(attempts, ExchangeRateSyncAttemptResult{
			ProviderID:   provider.ID,
			ProviderName: provider.Provider,
			Priority:     provider.Priority,
			Reason:       summarizeExchangeRateSyncError(err),
		})
		lastErr = err

		if !isFallbackEligibleExchangeRateError(err) {
			return 0, err
		}
	}

	if lastErr != nil {
		return 0, &ExchangeRateSyncFallbackError{
			Attempts: attempts,
			LastErr:  lastErr,
		}
	}

	return 0, ErrExchangeRateSyncDisabled
}

func SyncExchangeRates() (int, error) {
	config, err := GetExchangeRateSyncConfig()
	if err != nil {
		return 0, err
	}
	if !config.Enabled {
		return 0, ErrExchangeRateSyncDisabled
	}

	providers := getEnabledExchangeRateSyncProviders(config)
	if len(providers) == 0 {
		return 0, ErrExchangeRateSyncDisabled
	}

	if !config.FallbackEnabled {
		primaryProvider, ok := selectPrimaryExchangeRateSyncProvider(providers)
		if !ok {
			return 0, ErrExchangeRateSyncDisabled
		}
		return syncExchangeRatesWithProvider(primaryProvider)
	}

	return tryExchangeRateSyncProviders(providers)
}
