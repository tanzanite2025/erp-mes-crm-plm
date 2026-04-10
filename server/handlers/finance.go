package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetCurrencies(c *gin.Context) {
	currencies, err := services.ListCurrencies()
	if err != nil {
		respondFinanceServer(c, "获取币种列表失败", err)
		return
	}
	c.JSON(http.StatusOK, currencies)
}

func SaveCurrency(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		respondFinanceValidation(c, "币种数据格式错误", err)
		return
	}

	currency, err := services.SaveCurrencyFromJSON(payload, body)
	if err != nil {
		switch {
		case isFinanceValidationError(err):
			respondFinanceValidation(c, "币种数据格式错误", err)
		case errors.Is(err, gorm.ErrRecordNotFound):
			respondFinanceCritical(c, http.StatusNotFound, "币种不存在", nil)
		default:
			respondFinanceServer(c, "保存币种失败", err)
		}
		return
	}

	c.JSON(http.StatusOK, currency)
}

func GetPaymentTerms(c *gin.Context) {
	terms, err := services.ListPaymentTerms()
	if err != nil {
		respondFinanceServer(c, "获取账期列表失败", err)
		return
	}
	c.JSON(http.StatusOK, terms)
}

func SavePaymentTerm(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		respondFinanceValidation(c, "账期数据格式错误", err)
		return
	}

	term, err := services.SavePaymentTermFromJSON(payload, body)
	if err != nil {
		switch {
		case isFinanceValidationError(err):
			respondFinanceValidation(c, "账期数据格式错误", err)
		case errors.Is(err, gorm.ErrRecordNotFound):
			respondFinanceCritical(c, http.StatusNotFound, "账期不存在", nil)
		default:
			respondFinanceServer(c, "保存账期失败", err)
		}
		return
	}

	c.JSON(http.StatusOK, term)
}

func GetTaxRates(c *gin.Context) {
	rates, err := services.ListTaxRates()
	if err != nil {
		respondFinanceServer(c, "获取税率列表失败", err)
		return
	}
	c.JSON(http.StatusOK, rates)
}

func SaveTaxRate(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		respondFinanceValidation(c, "税率数据格式错误", err)
		return
	}

	rate, err := services.SaveTaxRateFromJSON(payload, body)
	if err != nil {
		switch {
		case isFinanceValidationError(err):
			respondFinanceValidation(c, "税率数据格式错误", err)
		case errors.Is(err, gorm.ErrRecordNotFound):
			respondFinanceCritical(c, http.StatusNotFound, "税率不存在", nil)
		default:
			respondFinanceServer(c, "保存税率失败", err)
		}
		return
	}

	c.JSON(http.StatusOK, rate)
}

func SetBaseCurrency(c *gin.Context) {
	if err := services.SetBaseCurrency(c.Param("id")); err != nil {
		respondFinanceServer(c, "切换基础币种失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "System base currency updated successfully"})
}

func SeedFinanceData(c *gin.Context) {
	if err := services.SeedFinanceData(); err != nil {
		respondFinanceServer(c, "初始化财务基础数据失败", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Finance data seeded successfully"})
}

func SyncExchangeRates(c *gin.Context) {
	count, err := services.SyncExchangeRatesFromEnv()
	if err != nil {
		if c == nil {
			return
		}
		switch {
		case errors.Is(err, services.ErrExchangeRateAPIKeyMissing):
			respondFinanceCritical(c, http.StatusInternalServerError, "汇率同步配置缺失: EXCHANGERATE_API_KEY 未设置", nil)
		case errors.Is(err, services.ErrExchangeRateBaseMissing):
			respondFinanceCritical(c, http.StatusNotFound, "系统基础币种未配置", nil)
		case errors.Is(err, services.ErrExchangeRateAPIStatus):
			respondFinanceServerWithStatus(c, http.StatusBadGateway, "汇率服务返回异常状态", nil)
		default:
			respondFinanceServer(c, "汇率同步失败", err)
		}
		return
	}

	if c != nil {
		c.JSON(http.StatusOK, gin.H{"message": "Exchange rates synced successfully", "count": count})
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
		strings.Contains(msg, "unsupported tax rate field")
}
