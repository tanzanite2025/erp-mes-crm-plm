package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)


func buildCurrencyUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "code", "name", "symbol", "status":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "rate":
			var value float64
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "precision":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "isBase":
			var value bool
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["is_base"] = value
		case "id", "createdAt", "updatedAt":
		default:
			return nil, errors.New("unsupported currency field: " + key)
		}
	}
	return updates, nil
}

func buildPaymentTermUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "code", "name", "description", "status":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "installments":
			var value string
			if err := json.Unmarshal(raw, &value); err == nil {
				updates["installment"] = value
				continue
			}
			updates["installment"] = string(raw)
		case "isDefault":
			var value bool
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["is_default"] = value
		case "id", "createdAt", "updatedAt":
		default:
			return nil, errors.New("unsupported payment term field: " + key)
		}
	}
	return updates, nil
}

func buildTaxRateUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "code", "name", "status", "description":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "rate":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "id", "createdAt", "updatedAt":
		default:
			return nil, errors.New("unsupported tax rate field: " + key)
		}
	}
	return updates, nil
}

func saveCurrencyRecord(currency *models.Currency) error {
	if currency.ID == 0 {
		return db.DB.Create(currency).Error
	}

	var existing models.Currency
	if err := db.DB.First(&existing, currency.ID).Error; err != nil {
		return err
	}

	updates := map[string]interface{}{
		"code":      currency.Code,
		"name":      currency.Name,
		"symbol":    currency.Symbol,
		"rate":      currency.Rate,
		"precision": currency.Precision,
		"is_base":   currency.IsBase,
		"status":    currency.Status,
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

func patchCurrencyRecord(id uint, updates map[string]interface{}) error {
	var existing models.Currency
	if err := db.DB.First(&existing, id).Error; err != nil {
		return err
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

func savePaymentTermRecord(term *models.PaymentTerm) error {
	if term.ID == 0 {
		return db.DB.Create(term).Error
	}

	var existing models.PaymentTerm
	if err := db.DB.First(&existing, term.ID).Error; err != nil {
		return err
	}

	updates := map[string]interface{}{
		"code":        term.Code,
		"name":        term.Name,
		"description": term.Description,
		"installment": term.Installment,
		"is_default":  term.IsDefault,
		"status":      term.Status,
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

func patchPaymentTermRecord(id uint, updates map[string]interface{}) error {
	var existing models.PaymentTerm
	if err := db.DB.First(&existing, id).Error; err != nil {
		return err
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

func saveTaxRateRecord(rate *models.TaxRate) error {
	if rate.ID == "" {
		return db.DB.Create(rate).Error
	}

	var existing models.TaxRate
	if err := db.DB.First(&existing, "id = ?", rate.ID).Error; err != nil {
		return err
	}

	updates := map[string]interface{}{
		"code":        rate.Code,
		"name":        rate.Name,
		"rate":        rate.Rate,
		"status":      rate.Status,
		"description": rate.Description,
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

func patchTaxRateRecord(id string, updates map[string]interface{}) error {
	var existing models.TaxRate
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

func GetCurrencies(c *gin.Context) {
	var currencies []models.Currency
	if err := db.DB.Find(&currencies).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to fetch currencies: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, currencies)
}

func SaveCurrency(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if rawID, ok := payload["id"]; ok {
		var id uint
		if err := json.Unmarshal(rawID, &id); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		updates, err := buildCurrencyUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := patchCurrencyRecord(id, updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to save currency: " + err.Error()})
			return
		}
		var currency models.Currency
		if err := db.DB.First(&currency, id).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to reload currency: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, currency)
		return
	}

	var currency models.Currency
	if err := json.Unmarshal(body, &currency); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := saveCurrencyRecord(&currency); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to save currency: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, currency)
}

func GetPaymentTerms(c *gin.Context) {
	var terms []models.PaymentTerm
	if err := db.DB.Find(&terms).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to fetch payment terms: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, terms)
}

func SavePaymentTerm(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if rawID, ok := payload["id"]; ok {
		var id uint
		if err := json.Unmarshal(rawID, &id); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		updates, err := buildPaymentTermUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := patchPaymentTermRecord(id, updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to save payment term: " + err.Error()})
			return
		}
		var term models.PaymentTerm
		if err := db.DB.First(&term, id).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to reload payment term: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, term)
		return
	}

	var term models.PaymentTerm
	if err := json.Unmarshal(body, &term); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := savePaymentTermRecord(&term); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to save payment term: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, term)
}

func GetTaxRates(c *gin.Context) {
	var rates []models.TaxRate
	if err := db.DB.Order("rate desc, code asc").Find(&rates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to fetch tax rates: " + err.Error()})
		return
	}

	if len(rates) == 0 {
		if err := seedDefaultTaxRates(db.DB); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to seed tax rates: " + err.Error()})
			return
		}
		if err := db.DB.Order("rate desc, code asc").Find(&rates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to reload tax rates: " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, rates)
}

func SaveTaxRate(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if rawID, ok := payload["id"]; ok {
		var id string
		if err := json.Unmarshal(rawID, &id); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		updates, err := buildTaxRateUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := patchTaxRateRecord(id, updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to save tax rate: " + err.Error()})
			return
		}
		var rate models.TaxRate
		if err := db.DB.First(&rate, "id = ?", id).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to reload tax rate: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, rate)
		return
	}

	var rate models.TaxRate
	if err := json.Unmarshal(body, &rate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := saveTaxRateRecord(&rate); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to save tax rate: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, rate)
}

func SetBaseCurrency(c *gin.Context) {
	id := c.Param("id")

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Currency{}).Where("1 = 1").Update("is_base", false).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.Currency{}).Where("id = ?", id).Updates(map[string]interface{}{
			"is_base": true,
			"rate":    1.0,
		}).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to switch base currency: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "System base currency updated successfully"})
}

func SeedFinanceData(c *gin.Context) {
	currencies := []models.Currency{
		{Code: "CNY", Name: "人民币", Symbol: "¥", Rate: 1.0, Precision: 2, IsBase: true, Status: "Active"},
		{Code: "USD", Name: "美元", Symbol: "$", Rate: 7.24, Precision: 2, IsBase: false, Status: "Active"},
		{Code: "EUR", Name: "欧元", Symbol: "EUR", Rate: 7.85, Precision: 2, IsBase: false, Status: "Active"},
		{Code: "HKD", Name: "港币", Symbol: "HK$", Rate: 0.92, Precision: 2, IsBase: false, Status: "Active"},
	}
	for _, curr := range currencies {
		db.DB.Where(models.Currency{Code: curr.Code}).FirstOrCreate(&curr)
	}

	terms := []models.PaymentTerm{
		{Code: "COD", Name: "货到付款", Description: "物资送达后支付全款", IsDefault: true, Status: "Active"},
		{Code: "PREPAY", Name: "全款预付", Description: "订单确认后立即支付全款", Status: "Active"},
		{Code: "NET30", Name: "月结 30 天", Description: "对账单确认后 30 天内支付", Status: "Active"},
	}
	for _, term := range terms {
		db.DB.Where(models.PaymentTerm{Code: term.Code}).FirstOrCreate(&term)
	}

	if err := seedDefaultTaxRates(db.DB); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] Failed to seed tax rates: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Finance data seeded successfully"})
}

type ExchangeRateResponse struct {
	Result          string             `json:"result"`
	BaseCode        string             `json:"base_code"`
	ConversionRates map[string]float64 `json:"conversion_rates"`
}

func SyncExchangeRates(c *gin.Context) {
	apiKey := os.Getenv("EXCHANGERATE_API_KEY")
	if apiKey == "" {
		if c != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL] EXCHANGERATE_API_KEY not set"})
		}
		return
	}

	var baseCurrency models.Currency
	if err := db.DB.Where("is_base = ?", true).First(&baseCurrency).Error; err != nil {
		if c != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Base currency not defined"})
		}
		return
	}

	apiURL := "https://v6.exchangerate-api.com/v6/" + apiKey + "/latest/" + baseCurrency.Code
	resp, err := http.Get(apiURL)
	if err != nil {
		if c != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to call API: " + err.Error()})
		}
		return
	}
	defer resp.Body.Close()

	var result ExchangeRateResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		if c != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse API response: " + err.Error()})
		}
		return
	}
	if result.Result != "success" {
		if c != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "API returned error status"})
		}
		return
	}

	err = db.DB.Transaction(func(tx *gorm.DB) error {
		var currencies []models.Currency
		if err := tx.Find(&currencies).Error; err != nil {
			return err
		}

		for _, curr := range currencies {
			if curr.IsBase {
				continue
			}
			if newRate, ok := result.ConversionRates[curr.Code]; ok {
				if err := tx.Model(&curr).Update("rate", newRate).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		if c != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update database: " + err.Error()})
		}
		return
	}

	if c != nil {
		c.JSON(http.StatusOK, gin.H{"message": "Exchange rates synced successfully", "count": len(result.ConversionRates)})
	}
}

func defaultFinanceTaxRates() []models.TaxRate {
	return []models.TaxRate{
		{Code: "VAT13", Name: "增值税 - 工业/销项", Rate: 13, Status: "Active", Description: "适用于成品销售及大部分工业制造环节"},
		{Code: "VAT9", Name: "增值税 - 服务/运输", Rate: 9, Status: "Active", Description: "适用于交通运输、建筑、基础电信服务等"},
		{Code: "VAT6", Name: "增值税 - 现代服务", Rate: 6, Status: "Active", Description: "适用于研发和技术服务、信息技术服务等"},
		{Code: "VAT0", Name: "增值税 - 出口免税", Rate: 0, Status: "Active", Description: "适用于出口贸易免税环节"},
	}
}

func seedDefaultTaxRates(tx *gorm.DB) error {
	for _, rate := range defaultFinanceTaxRates() {
		var existing models.TaxRate
		err := tx.Where("code = ?", rate.Code).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := tx.Create(&rate).Error; err != nil {
				return err
			}
			continue
		}
		if err != nil {
			return err
		}
	}

	return nil
}
