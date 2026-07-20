package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetCurrencies(c *gin.Context) {
	currencies, err := services.ListCurrencies()
	if err != nil {
		respondFinanceServer(c, "Failed to load currencies", err)
		return
	}
	c.JSON(http.StatusOK, currencies)
}

func SaveCurrency(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		respondFinanceValidation(c, "Invalid currency payload", err)
		return
	}

	currency, err := services.SaveCurrencyFromJSONWithContext(auditContextFromGin(c), payload, body)
	if err != nil {
		switch {
		case isFinanceValidationError(err):
			respondFinanceValidation(c, "Invalid currency payload", err)
		case errors.Is(err, gorm.ErrRecordNotFound):
			respondFinanceCritical(c, http.StatusNotFound, "Currency not found", nil)
		default:
			respondFinanceServer(c, "Failed to save currency", err)
		}
		return
	}

	c.JSON(http.StatusOK, currency)
}

func GetPaymentTerms(c *gin.Context) {
	terms, err := services.ListPaymentTerms()
	if err != nil {
		respondFinanceServer(c, "Failed to load payment terms", err)
		return
	}
	c.JSON(http.StatusOK, terms)
}

func SavePaymentTerm(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		respondFinanceValidation(c, "Invalid payment term payload", err)
		return
	}

	term, err := services.SavePaymentTermFromJSONWithContext(auditContextFromGin(c), payload, body)
	if err != nil {
		switch {
		case isFinanceValidationError(err):
			respondFinanceValidation(c, "Invalid payment term payload", err)
		case errors.Is(err, gorm.ErrRecordNotFound):
			respondFinanceCritical(c, http.StatusNotFound, "Payment term not found", nil)
		default:
			respondFinanceServer(c, "Failed to save payment term", err)
		}
		return
	}

	c.JSON(http.StatusOK, term)
}

func PatchPaymentTerm(c *gin.Context) {
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondFinanceValidation(c, "Invalid payment term patch payload", err)
		return
	}

	payload, err := buildFinancePatchPayloadMap(c.Param("id"), req.Delta)
	if err != nil {
		respondFinanceValidation(c, "Invalid payment term patch payload", err)
		return
	}

	term, err := services.SavePaymentTermFromJSONWithContext(auditContextFromGin(c), payload, nil)
	if err != nil {
		switch {
		case isFinanceValidationError(err):
			respondFinanceValidation(c, "Invalid payment term patch payload", err)
		case errors.Is(err, gorm.ErrRecordNotFound):
			respondFinanceCritical(c, http.StatusNotFound, "Payment term not found", nil)
		default:
			respondFinanceServer(c, "Failed to patch payment term", err)
		}
		return
	}

	c.JSON(http.StatusOK, term)
}

func GetPaymentMethods(c *gin.Context) {
	methods, err := services.ListPaymentMethods()
	if err != nil {
		respondFinanceServer(c, "Failed to load payment methods", err)
		return
	}
	c.JSON(http.StatusOK, methods)
}

func SavePaymentMethod(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		respondFinanceValidation(c, "Invalid payment method payload", err)
		return
	}

	method, err := services.SavePaymentMethodFromJSONWithContext(auditContextFromGin(c), payload, body)
	if err != nil {
		switch {
		case isFinanceValidationError(err):
			respondFinanceValidation(c, "Invalid payment method payload", err)
		case errors.Is(err, gorm.ErrRecordNotFound):
			respondFinanceCritical(c, http.StatusNotFound, "Payment method not found", nil)
		default:
			respondFinanceServer(c, "Failed to save payment method", err)
		}
		return
	}

	c.JSON(http.StatusOK, method)
}

func PatchPaymentMethod(c *gin.Context) {
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondFinanceValidation(c, "Invalid payment method patch payload", err)
		return
	}

	payload, err := buildFinancePatchPayloadMap(c.Param("id"), req.Delta)
	if err != nil {
		respondFinanceValidation(c, "Invalid payment method patch payload", err)
		return
	}

	method, err := services.SavePaymentMethodFromJSONWithContext(auditContextFromGin(c), payload, nil)
	if err != nil {
		switch {
		case isFinanceValidationError(err):
			respondFinanceValidation(c, "Invalid payment method patch payload", err)
		case errors.Is(err, gorm.ErrRecordNotFound):
			respondFinanceCritical(c, http.StatusNotFound, "Payment method not found", nil)
		default:
			respondFinanceServer(c, "Failed to patch payment method", err)
		}
		return
	}

	c.JSON(http.StatusOK, method)
}

func GetTaxRates(c *gin.Context) {
	rates, err := services.ListTaxRates()
	if err != nil {
		respondFinanceServer(c, "Failed to load tax rates", err)
		return
	}
	c.JSON(http.StatusOK, rates)
}

func SaveTaxRate(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		respondFinanceValidation(c, "Invalid tax rate payload", err)
		return
	}

	rate, err := services.SaveTaxRateFromJSONWithContext(auditContextFromGin(c), payload, body)
	if err != nil {
		switch {
		case isFinanceValidationError(err):
			respondFinanceValidation(c, "Invalid tax rate payload", err)
		case errors.Is(err, gorm.ErrRecordNotFound):
			respondFinanceCritical(c, http.StatusNotFound, "Tax rate not found", nil)
		default:
			respondFinanceServer(c, "Failed to save tax rate", err)
		}
		return
	}

	c.JSON(http.StatusOK, rate)
}

func SetBaseCurrency(c *gin.Context) {
	if err := services.SetBaseCurrencyWithContext(auditContextFromGin(c), c.Param("id")); err != nil {
		respondFinanceServer(c, "Failed to switch base currency", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "System base currency updated successfully"})
}

func SeedFinanceData(c *gin.Context) {
	if err := services.SeedFinanceDataWithContext(auditContextFromGin(c)); err != nil {
		respondFinanceServer(c, "Failed to seed finance data", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Finance data seeded successfully"})
}

func GetExchangeRateSyncConfigHandler(c *gin.Context) {
	config, err := services.GetExchangeRateSyncConfig()
	if err != nil {
		respondFinanceServer(c, "Failed to load exchange rate sync config", err)
		return
	}

	c.JSON(http.StatusOK, config)
}

func SaveExchangeRateSyncConfigHandler(c *gin.Context) {
	var config services.ExchangeRateSyncConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		respondFinanceValidation(c, "Invalid exchange rate sync config payload", err)
		return
	}

	saved, err := services.SaveExchangeRateSyncConfigWithContext(auditContextFromGin(c), config)
	if err != nil {
		respondFinanceServer(c, "Failed to save exchange rate sync config", err)
		return
	}

	c.JSON(http.StatusOK, saved)
}

func RunExchangeRateSync() (int, error) {
	return services.SyncExchangeRates()
}

func RunExchangeRateSyncWithContext(ctx context.Context) (int, error) {
	return services.SyncExchangeRatesWithContext(ctx)
}

func respondExchangeRateSyncError(c *gin.Context, err error) {
	if c == nil {
		return
	}

	switch {
	case errors.Is(err, services.ErrExchangeRateAPIKeyMissing):
		respondFinanceCritical(c, http.StatusInternalServerError, "Exchange rate sync configuration missing: API key is not set", nil)
	case errors.Is(err, services.ErrExchangeRateBaseMissing):
		respondFinanceCritical(c, http.StatusNotFound, "System base currency is not configured", nil)
	case errors.Is(err, services.ErrExchangeRateSyncDisabled):
		respondFinanceValidation(c, "Exchange rate sync is disabled in configuration", nil)
	case errors.Is(err, services.ErrExchangeRateAPIStatus):
		respondFinanceServerWithStatus(c, http.StatusBadGateway, "Exchange rate service returned an abnormal response", err)
	default:
		respondFinanceServer(c, "Exchange rate sync failed", err)
	}
}

func respondFinanceValidation(c *gin.Context, message string, err error) {
	respondFinance(c, http.StatusBadRequest, "[VALIDATION]", message, err)
}

func respondFinanceServer(c *gin.Context, message string, err error) {
	respondFinance(c, http.StatusInternalServerError, "[SERVER]", message, err)
}

func respondFinanceServerWithStatus(c *gin.Context, status int, message string, err error) {
	respondFinance(c, status, "[SERVER]", message, err)
}

func respondFinanceCritical(c *gin.Context, status int, message string, err error) {
	respondFinance(c, status, "[CRITICAL]", message, err)
}

func respondFinance(c *gin.Context, status int, level string, message string, err error) {
	detail := strings.TrimSpace(message)
	if err != nil {
		detail = detail + ": " + err.Error()
	}
	c.JSON(status, gin.H{"error": level + " " + detail})
}

func isFinanceValidationError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.HasPrefix(msg, "json:") ||
		strings.Contains(msg, "invalid character") ||
		strings.Contains(msg, "cannot unmarshal") ||
		strings.Contains(msg, "unexpected end") ||
		strings.Contains(msg, "unsupported currency field") ||
		strings.Contains(msg, "unsupported payment term field") ||
		strings.Contains(msg, "unsupported payment method field") ||
		strings.Contains(msg, "unsupported tax rate field")
}

func buildFinancePatchPayloadMap(idRaw string, delta map[string]json.RawMessage) (map[string]json.RawMessage, error) {
	id, err := strconv.Atoi(strings.TrimSpace(idRaw))
	if err != nil || id <= 0 {
		return nil, errors.New("invalid finance master id")
	}

	payload := map[string]json.RawMessage{
		"id": json.RawMessage(strconv.Itoa(id)),
	}

	for key, raw := range delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		payload[key] = valueRaw
	}

	return payload, nil
}
