package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
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

var exchangeRateAPIBaseURL = "https://v6.exchangerate-api.com/v6"

type ExchangeRateResponse struct {
	Result          string             `json:"result"`
	BaseCode        string             `json:"base_code"`
	ConversionRates map[string]float64 `json:"conversion_rates"`
}

func fallbackCNYCurrency() models.Currency {
	return models.Currency{
		Code:      "CNY",
		Name:      "\u4eba\u6c11\u5e01",
		Symbol:    "\u00a5",
		Rate:      1.0,
		Precision: 2,
		Status:    "Active",
	}
}

func ensureFallbackCurrency() error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var baseCount int64
		if err := tx.Model(&models.Currency{}).Where("is_base = ?", true).Count(&baseCount).Error; err != nil {
			return err
		}

		var cny models.Currency
		err := tx.Where("code = ?", "CNY").First(&cny).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			cny = fallbackCNYCurrency()
			cny.IsBase = baseCount == 0
			return tx.Create(&cny).Error
		case err != nil:
			return err
		case baseCount == 0:
			return tx.Model(&cny).Updates(map[string]interface{}{
				"is_base": true,
				"rate":    1.0,
				"status":  "Active",
			}).Error
		default:
			return nil
		}
	})
}

func ListCurrencies() ([]models.Currency, error) {
	if err := ensureFallbackCurrency(); err != nil {
		return nil, err
	}

	var currencies []models.Currency
	if err := db.DB.Order("is_base desc, code asc").Find(&currencies).Error; err != nil {
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
	if err := ensureDefaultPaymentTerms(); err != nil {
		return nil, err
	}

	var terms []models.PaymentTerm
	if err := db.DB.Order("sort_order asc, code asc").Find(&terms).Error; err != nil {
		return nil, err
	}
	return terms, nil
}

func ListPaymentMethods() ([]models.PaymentMethod, error) {
	if err := ensureDefaultPaymentMethods(); err != nil {
		return nil, err
	}

	var methods []models.PaymentMethod
	if err := db.DB.Order("sort_order asc, code asc").Find(&methods).Error; err != nil {
		return nil, err
	}
	return methods, nil
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

func SavePaymentMethodFromJSON(payload map[string]json.RawMessage, body []byte) (models.PaymentMethod, error) {
	if rawID, ok := payload["id"]; ok {
		var id uint
		if err := json.Unmarshal(rawID, &id); err != nil {
			return models.PaymentMethod{}, err
		}
		updates, err := buildPaymentMethodUpdates(payload)
		if err != nil {
			return models.PaymentMethod{}, err
		}
		if err := patchPaymentMethodRecord(id, updates); err != nil {
			return models.PaymentMethod{}, err
		}
		var method models.PaymentMethod
		if err := db.DB.First(&method, id).Error; err != nil {
			return models.PaymentMethod{}, err
		}
		return method, nil
	}

	var method models.PaymentMethod
	if err := json.Unmarshal(body, &method); err != nil {
		return models.PaymentMethod{}, err
	}
	if err := savePaymentMethodRecord(&method); err != nil {
		return models.PaymentMethod{}, err
	}
	return method, nil
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

	if err := ensureDefaultPaymentMethods(); err != nil {
		return err
	}
	if err := ensureDefaultPaymentTerms(); err != nil {
		return err
	}

	return seedDefaultTaxRates(db.DB)
}

func EnsureFinanceDictionaryCompatibility() error {
	if db.DB == nil {
		return errors.New("database not initialized")
	}

	if err := db.DB.AutoMigrate(&models.PaymentMethod{}, &models.PaymentTerm{}); err != nil {
		return err
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		if err := normalizeExistingPaymentTerms(tx); err != nil {
			return err
		}
		if err := normalizeExistingPaymentMethods(tx); err != nil {
			return err
		}
		return ensureDefaultFinanceDictionariesTx(tx)
	})
}

func SyncExchangeRatesFromEnv() (int, error) {
	apiKey := strings.TrimSpace(os.Getenv("EXCHANGERATE_API_KEY"))
	if apiKey == "" {
		return 0, ErrExchangeRateAPIKeyMissing
	}
	return syncExchangeRates(apiKey)
}

func normalizeRateAgainstBase(rawRate float64) (float64, error) {
	if rawRate <= 0 || math.IsNaN(rawRate) || math.IsInf(rawRate, 0) {
		return 0, fmt.Errorf("invalid exchange rate: %v", rawRate)
	}

	// Persist rate as: 1 current currency = x units of base currency.
	return math.Round((1/rawRate)*1_000_000) / 1_000_000, nil
}

func syncExchangeRates(apiKey string) (int, error) {
	var baseCurrency models.Currency
	if err := db.DB.Where("is_base = ?", true).First(&baseCurrency).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, ErrExchangeRateBaseMissing
		}
		return 0, err
	}

	apiURL := strings.TrimRight(exchangeRateAPIBaseURL, "/") + "/" + apiKey + "/latest/" + baseCurrency.Code
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
		case "name", "description", "status":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "installments":
			var value string
			if err := json.Unmarshal(raw, &value); err == nil {
				updates["installment"] = normalizePaymentTermInstallment(value)
				continue
			}
			updates["installment"] = normalizePaymentTermInstallment(string(raw))
		case "isDefault":
			var value bool
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["is_default"] = value
		case "sortOrder":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["sort_order"] = value
		case "id", "createdAt", "updatedAt":
		default:
			return nil, errors.New("unsupported payment term field: " + key)
		}
	}
	return updates, nil
}

func buildPaymentMethodUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "name", "description", "status":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "isDefault":
			var value bool
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["is_default"] = value
		case "sortOrder":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["sort_order"] = value
		case "id", "createdAt", "updatedAt":
		default:
			return nil, errors.New("unsupported payment method field: " + key)
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
	normalizePaymentTerm(term)

	return db.DB.Transaction(func(tx *gorm.DB) error {
		if term.ID == 0 {
			if term.Version == 0 {
				term.Version = 1
			}
			if term.IsDefault {
				if err := tx.Model(&models.PaymentTerm{}).Where("id <> 0").Update("is_default", false).Error; err != nil {
					return err
				}
			}
			return tx.Create(term).Error
		}

		var existing models.PaymentTerm
		if err := tx.First(&existing, term.ID).Error; err != nil {
			return err
		}

		if term.IsDefault {
			if err := tx.Model(&models.PaymentTerm{}).Where("id <> ?", existing.ID).Update("is_default", false).Error; err != nil {
				return err
			}
		}

		updates := map[string]interface{}{
			"code":        term.Code,
			"name":        term.Name,
			"description": term.Description,
			"installment": term.Installment,
			"is_default":  term.IsDefault,
			"sort_order":  term.SortOrder,
			"status":      term.Status,
			"version":     existing.Version + 1,
		}
		return tx.Model(&existing).Updates(updates).Error
	})
}

func patchPaymentTermRecord(id uint, updates map[string]interface{}) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.PaymentTerm
		if err := tx.First(&existing, id).Error; err != nil {
			return err
		}
		if value, ok := updates["is_default"].(bool); ok && value {
			if err := tx.Model(&models.PaymentTerm{}).Where("id <> ?", existing.ID).Update("is_default", false).Error; err != nil {
				return err
			}
		}
		updates["version"] = existing.Version + 1
		return tx.Model(&existing).Updates(updates).Error
	})
}

func savePaymentMethodRecord(method *models.PaymentMethod) error {
	normalizePaymentMethod(method)

	return db.DB.Transaction(func(tx *gorm.DB) error {
		if method.ID == 0 {
			if method.Version == 0 {
				method.Version = 1
			}
			if method.IsDefault {
				if err := tx.Model(&models.PaymentMethod{}).Where("id <> 0").Update("is_default", false).Error; err != nil {
					return err
				}
			}
			return tx.Create(method).Error
		}

		var existing models.PaymentMethod
		if err := tx.First(&existing, method.ID).Error; err != nil {
			return err
		}

		if method.IsDefault {
			if err := tx.Model(&models.PaymentMethod{}).Where("id <> ?", existing.ID).Update("is_default", false).Error; err != nil {
				return err
			}
		}

		updates := map[string]interface{}{
			"code":        method.Code,
			"name":        method.Name,
			"description": method.Description,
			"is_default":  method.IsDefault,
			"sort_order":  method.SortOrder,
			"status":      method.Status,
			"version":     existing.Version + 1,
		}
		return tx.Model(&existing).Updates(updates).Error
	})
}

func patchPaymentMethodRecord(id uint, updates map[string]interface{}) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.PaymentMethod
		if err := tx.First(&existing, id).Error; err != nil {
			return err
		}
		if value, ok := updates["is_default"].(bool); ok && value {
			if err := tx.Model(&models.PaymentMethod{}).Where("id <> ?", existing.ID).Update("is_default", false).Error; err != nil {
				return err
			}
		}
		updates["version"] = existing.Version + 1
		return tx.Model(&existing).Updates(updates).Error
	})
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

func defaultPaymentTerms() []models.PaymentTerm {
	return []models.PaymentTerm{
		{Code: "COD", Name: "货到付款", Description: "物资送达后支付全款", IsDefault: true, SortOrder: 10, IsSystem: true, Status: "Active", Version: 1},
		{Code: "PREPAY100", Name: "预付 100%", Description: "订单确认后支付全款再排产或发货", SortOrder: 20, IsSystem: true, Status: "Active", Version: 1},
		{Code: "PREPAY30_BAL70", Name: "预付 30% 尾款 70%", Description: "签约预付 30%，交付前或交付时支付尾款 70%", SortOrder: 30, IsSystem: true, Status: "Active", Version: 1},
		{Code: "NET30", Name: "月结 30 天", Description: "对账单确认后 30 天内支付", SortOrder: 40, IsSystem: true, Status: "Active", Version: 1},
		{Code: "NET60", Name: "月结 60 天", Description: "对账单确认后 60 天内支付", SortOrder: 50, IsSystem: true, Status: "Active", Version: 1},
	}
}

func defaultPaymentMethods() []models.PaymentMethod {
	return []models.PaymentMethod{
		{Code: "CASH", Name: "现款", Description: "现金或现场即时收付", IsDefault: true, SortOrder: 10, IsSystem: true, Status: "Active", Version: 1},
		{Code: "BANK_TRANSFER", Name: "对公转账", Description: "银行对公账户转账结算", SortOrder: 20, IsSystem: true, Status: "Active", Version: 1},
		{Code: "WIRE_TRANSFER", Name: "电汇", Description: "通过银行电汇方式收付款", SortOrder: 30, IsSystem: true, Status: "Active", Version: 1},
		{Code: "ACCEPTANCE_BILL", Name: "承兑", Description: "银行承兑汇票或商业承兑汇票结算", SortOrder: 40, IsSystem: true, Status: "Active", Version: 1},
	}
}

func ensureDefaultPaymentTerms() error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		return ensureDefaultFinanceDictionariesTx(tx)
	})
}

func ensureDefaultPaymentMethods() error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		return ensureDefaultFinanceDictionariesTx(tx)
	})
}

func ensureDefaultFinanceDictionariesTx(tx *gorm.DB) error {
	if err := ensureDefaultPaymentMethodsTx(tx); err != nil {
		return err
	}
	return ensureDefaultPaymentTermsTx(tx)
}

func ensureDefaultPaymentTermsTx(tx *gorm.DB) error {
	for _, term := range defaultPaymentTerms() {
		var existing models.PaymentTerm
		err := tx.Where("code = ?", term.Code).First(&existing).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			item := term
			normalizePaymentTerm(&item)
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		case err != nil:
			return err
		case !existing.IsSystem:
			if err := tx.Model(&existing).Update("is_system", true).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func ensureDefaultPaymentMethodsTx(tx *gorm.DB) error {
	for _, method := range defaultPaymentMethods() {
		var existing models.PaymentMethod
		err := tx.Where("code = ?", method.Code).First(&existing).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			item := method
			normalizePaymentMethod(&item)
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		case err != nil:
			return err
		case !existing.IsSystem:
			if err := tx.Model(&existing).Update("is_system", true).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func normalizePaymentTerm(term *models.PaymentTerm) {
	term.Code = strings.ToUpper(strings.TrimSpace(term.Code))
	term.Name = strings.TrimSpace(term.Name)
	term.Description = strings.TrimSpace(term.Description)
	term.Installment = normalizePaymentTermInstallment(term.Installment)
	if term.Status == "" {
		term.Status = "Active"
	}
}

func normalizePaymentTermInstallment(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "[]"
	}

	var payload any
	if err := json.Unmarshal([]byte(trimmed), &payload); err == nil {
		normalized, marshalErr := json.Marshal(payload)
		if marshalErr == nil {
			return string(normalized)
		}
	}

	quoted, err := json.Marshal(trimmed)
	if err != nil {
		return "[]"
	}
	return string(quoted)
}

func normalizePaymentMethod(method *models.PaymentMethod) {
	method.Code = strings.ToUpper(strings.TrimSpace(method.Code))
	method.Name = strings.TrimSpace(method.Name)
	method.Description = strings.TrimSpace(method.Description)
	if method.Status == "" {
		method.Status = "Active"
	}
}

func normalizeExistingPaymentTerms(tx *gorm.DB) error {
	var terms []models.PaymentTerm
	if err := tx.Find(&terms).Error; err != nil {
		return err
	}

	for _, term := range terms {
		updates := map[string]interface{}{}
		normalizedCode := strings.ToUpper(strings.TrimSpace(term.Code))
		normalizedName := strings.TrimSpace(term.Name)
		normalizedDescription := strings.TrimSpace(term.Description)
		normalizedInstallment := normalizePaymentTermInstallment(term.Installment)
		normalizedStatus := strings.TrimSpace(term.Status)
		if normalizedStatus == "" {
			normalizedStatus = "Active"
		}
		normalizedVersion := term.Version
		if normalizedVersion <= 0 {
			normalizedVersion = 1
		}

		if term.Code != normalizedCode {
			updates["code"] = normalizedCode
		}
		if term.Name != normalizedName {
			updates["name"] = normalizedName
		}
		if term.Description != normalizedDescription {
			updates["description"] = normalizedDescription
		}
		if term.Installment != normalizedInstallment {
			updates["installment"] = normalizedInstallment
		}
		if term.Status != normalizedStatus {
			updates["status"] = normalizedStatus
		}
		if term.Version != normalizedVersion {
			updates["version"] = normalizedVersion
		}

		if len(updates) == 0 {
			continue
		}
		if err := tx.Model(&term).Updates(updates).Error; err != nil {
			return err
		}
	}

	return nil
}

func normalizeExistingPaymentMethods(tx *gorm.DB) error {
	if !tx.Migrator().HasTable(&models.PaymentMethod{}) {
		return nil
	}

	var methods []models.PaymentMethod
	if err := tx.Find(&methods).Error; err != nil {
		return err
	}

	for _, method := range methods {
		updates := map[string]interface{}{}
		normalizedCode := strings.ToUpper(strings.TrimSpace(method.Code))
		normalizedName := strings.TrimSpace(method.Name)
		normalizedDescription := strings.TrimSpace(method.Description)
		normalizedStatus := strings.TrimSpace(method.Status)
		if normalizedStatus == "" {
			normalizedStatus = "Active"
		}
		normalizedVersion := method.Version
		if normalizedVersion <= 0 {
			normalizedVersion = 1
		}

		if method.Code != normalizedCode {
			updates["code"] = normalizedCode
		}
		if method.Name != normalizedName {
			updates["name"] = normalizedName
		}
		if method.Description != normalizedDescription {
			updates["description"] = normalizedDescription
		}
		if method.Status != normalizedStatus {
			updates["status"] = normalizedStatus
		}
		if method.Version != normalizedVersion {
			updates["version"] = normalizedVersion
		}

		if len(updates) == 0 {
			continue
		}
		if err := tx.Model(&method).Updates(updates).Error; err != nil {
			return err
		}
	}

	return nil
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
