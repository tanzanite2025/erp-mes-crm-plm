package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type ExchangeRateResponse struct {
	Result          string             `json:"result"`
	BaseCode        string             `json:"base_code"`
	ConversionRates map[string]float64 `json:"conversion_rates"`
}

func normalizeRateAgainstBase(rawRate float64) (float64, error) {
	if rawRate <= 0 || math.IsNaN(rawRate) || math.IsInf(rawRate, 0) {
		return 0, fmt.Errorf("invalid exchange rate: %v", rawRate)
	}

	return math.Round((1/rawRate)*1_000_000) / 1_000_000, nil
}

func syncExchangeRatesWithExchangeRateAPI(provider ExchangeRateSyncProviderConfig) (int, error) {
	var baseCurrency models.Currency
	if err := db.DB.Where("is_base = ?", true).First(&baseCurrency).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, ErrExchangeRateBaseMissing
		}
		return 0, err
	}

	apiKey := strings.TrimSpace(provider.APIKey)
	if apiKey == "" {
		apiKey = strings.TrimSpace(getSystemConfigValue(db.DB, exchangeRateAPIKeyConfigKey, ""))
	}
	if apiKey == "" {
		return 0, ErrExchangeRateAPIKeyMissing
	}

	trimmedPathTemplate := strings.TrimSpace(provider.LatestPathTemplate)
	if trimmedPathTemplate == "" {
		trimmedPathTemplate = defaultExchangeRateLatestPathTemplate
	}
	resolvedPath := strings.ReplaceAll(trimmedPathTemplate, "{apiKey}", apiKey)
	resolvedPath = strings.ReplaceAll(resolvedPath, "{baseCode}", baseCurrency.Code)
	if !strings.HasPrefix(resolvedPath, "/") {
		resolvedPath = "/" + resolvedPath
	}

	resolvedBaseURL := strings.TrimSpace(provider.APIBaseURL)
	if resolvedBaseURL == "" {
		resolvedBaseURL = exchangeRateAPIBaseURL
	}

	apiURL := strings.TrimRight(resolvedBaseURL, "/") + resolvedPath
	resp, err := http.Get(apiURL)
	if err != nil {
		return 0, fmt.Errorf("request exchange rate api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		detail := strings.TrimSpace(string(body))
		if detail != "" {
			return 0, fmt.Errorf("%w: http %d: %s", ErrExchangeRateAPIStatus, resp.StatusCode, detail)
		}
		return 0, fmt.Errorf("%w: http %d", ErrExchangeRateAPIStatus, resp.StatusCode)
	}

	var result ExchangeRateResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, fmt.Errorf("decode exchange rate response: %w", err)
	}
	if result.Result != "success" {
		return 0, fmt.Errorf("%w: result=%s", ErrExchangeRateAPIStatus, result.Result)
	}

	updatedCount := 0
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		var currencies []models.Currency
		if err := tx.Find(&currencies).Error; err != nil {
			return fmt.Errorf("load currencies for sync: %w", err)
		}

		for _, curr := range currencies {
			if curr.IsBase {
				continue
			}
			if rawRate, ok := result.ConversionRates[curr.Code]; ok {
				normalizedRate, err := normalizeRateAgainstBase(rawRate)
				if err != nil {
					return fmt.Errorf("normalize rate for %s: %w", curr.Code, err)
				}
				if err := tx.Model(&curr).Update("rate", normalizedRate).Error; err != nil {
					return fmt.Errorf("update rate for %s: %w", curr.Code, err)
				}
				updatedCount++
			}
		}
		return nil
	})
	if err != nil {
		return 0, err
	}

	return updatedCount, nil
}
