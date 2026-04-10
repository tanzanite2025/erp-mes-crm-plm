package services

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrExchangeRateAPIKeyMissing = errors.New("exchange rate api key not set")
	ErrExchangeRateBaseMissing   = errors.New("base currency not defined")
	ErrExchangeRateAPIStatus     = errors.New("exchange rate api returned non-success")
)

type ExchangeRateResponse struct {
	Result          string             `json:"result"`
	BaseCode        string             `json:"base_code"`
	ConversionRates map[string]float64 `json:"conversion_rates"`
}

func ListCurrencies() ([]models.Currency, error) {
	var currencies []models.Currency
	if err := db.DB.Find(&currencies).Error; err != nil {
		return nil, err
	}
	return currencies, nil
}

func SaveCurrencyFromJSON(payload map[string]json.RawMessage, body []byte) (models.Currency, error) {
	if rawID, ok := payload["id"]; ok {
		var id uint
		if err := json.Unmarshal(rawID, &id); err != nil {
			return models.Currency{}, err
		}
		updates, err := buildCurrencyUpdates(payload)
		if err != nil {
			return models.Currency{}, err
		}
		if err := patchCurrencyRecord(id, updates); err != nil {
			return models.Currency{}, err
		}
		var currency models.Currency
		if err := db.DB.First(&currency, id).Error; err != nil {
			return models.Currency{}, err
		}
		return currency, nil
	}

	var currency models.Currency
	if err := json.Unmarshal(body, &currency); err != nil {
		return models.Currency{}, err
	}
	if err := saveCurrencyRecord(&currency); err != nil {
		return models.Currency{}, err
	}
	return currency, nil
}

func ListPaymentTerms() ([]models.PaymentTerm, error) {
	var terms []models.PaymentTerm
	if err := db.DB.Find(&terms).Error; err != nil {
		return nil, err
	}
	return terms, nil
}

func SavePaymentTermFromJSON(payload map[string]json.RawMessage, body []byte) (models.PaymentTerm, error) {
	if rawID, ok := payload["id"]; ok {
		var id uint
		if err := json.Unmarshal(rawID, &id); err != nil {
			return models.PaymentTerm{}, err
		}
		updates, err := buildPaymentTermUpdates(payload)
		if err != nil {
			return models.PaymentTerm{}, err
		}
		if err := patchPaymentTermRecord(id, updates); err != nil {
			return models.PaymentTerm{}, err
		}
		var term models.PaymentTerm
		if err := db.DB.First(&term, id).Error; err != nil {
			return models.PaymentTerm{}, err
		}
		return term, nil
	}

	var term models.PaymentTerm
	if err := json.Unmarshal(body, &term); err != nil {
		return models.PaymentTerm{}, err
	}
	if err := savePaymentTermRecord(&term); err != nil {
		return models.PaymentTerm{}, err
	}
	return term, nil
}

func ListTaxRates() ([]models.TaxRate, error) {
	var rates []models.TaxRate
	if err := db.DB.Order("rate desc, code asc").Find(&rates).Error; err != nil {
		return nil, err
	}

	if len(rates) == 0 {
		if err := seedDefaultTaxRates(db.DB); err != nil {
			return nil, err
		}
		if err := db.DB.Order("rate desc, code asc").Find(&rates).Error; err != nil {
			return nil, err
		}
	}

	return rates, nil
}

func SaveTaxRateFromJSON(payload map[string]json.RawMessage, body []byte) (models.TaxRate, error) {
	if rawID, ok := payload["id"]; ok {
		var id string
		if err := json.Unmarshal(rawID, &id); err != nil {
			return models.TaxRate{}, err
		}
		updates, err := buildTaxRateUpdates(payload)
		if err != nil {
			return models.TaxRate{}, err
		}
		if err := patchTaxRateRecord(id, updates); err != nil {
			return models.TaxRate{}, err
		}
		var rate models.TaxRate
		if err := db.DB.First(&rate, "id = ?", id).Error; err != nil {
			return models.TaxRate{}, err
		}
		return rate, nil
	}

	var rate models.TaxRate
	if err := json.Unmarshal(body, &rate); err != nil {
		return models.TaxRate{}, err
	}
	if err := saveTaxRateRecord(&rate); err != nil {
		return models.TaxRate{}, err
	}
	return rate, nil
}

func SetBaseCurrency(id string) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
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
}

func SeedFinanceData() error {
	currencies := []models.Currency{
		{Code: "CNY", Name: "人民币", Symbol: "¥", Rate: 1.0, Precision: 2, IsBase: true, Status: "Active"},
		{Code: "USD", Name: "美元", Symbol: "$", Rate: 7.24, Precision: 2, IsBase: false, Status: "Active"},
		{Code: "EUR", Name: "欧元", Symbol: "EUR", Rate: 7.85, Precision: 2, IsBase: false, Status: "Active"},
		{Code: "HKD", Name: "港币", Symbol: "HK$", Rate: 0.92, Precision: 2, IsBase: false, Status: "Active"},
	}
	for _, curr := range currencies {
		item := curr
		db.DB.Where(models.Currency{Code: item.Code}).FirstOrCreate(&item)
	}

	terms := []models.PaymentTerm{
		{Code: "COD", Name: "货到付款", Description: "物资送达后支付全款", IsDefault: true, Status: "Active"},
		{Code: "PREPAY", Name: "全款预付", Description: "订单确认后立即支付全款", Status: "Active"},
		{Code: "NET30", Name: "月结 30 天", Description: "对账单确认后 30 天内支付", Status: "Active"},
	}
	for _, term := range terms {
		item := term
		db.DB.Where(models.PaymentTerm{Code: item.Code}).FirstOrCreate(&item)
	}

	return seedDefaultTaxRates(db.DB)
}

func SyncExchangeRatesFromEnv() (int, error) {
	apiKey := strings.TrimSpace(os.Getenv("EXCHANGERATE_API_KEY"))
	if apiKey == "" {
		return 0, ErrExchangeRateAPIKeyMissing
	}
	return syncExchangeRates(apiKey)
}

func syncExchangeRates(apiKey string) (int, error) {
	var baseCurrency models.Currency
	if err := db.DB.Where("is_base = ?", true).First(&baseCurrency).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, ErrExchangeRateBaseMissing
		}
		return 0, err
	}

	apiURL := "https://v6.exchangerate-api.com/v6/" + apiKey + "/latest/" + baseCurrency.Code
	resp, err := http.Get(apiURL)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var result ExchangeRateResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, err
	}
	if result.Result != "success" {
		return 0, ErrExchangeRateAPIStatus
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
		return 0, err
	}

	return len(result.ConversionRates), nil
}

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
			item := rate
			if err := tx.Create(&item).Error; err != nil {
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
