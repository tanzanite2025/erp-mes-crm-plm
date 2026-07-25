// Package services - 财务主数据(币种/付款方式/付款条件/税率)。
//
// 此文件管理财务字典数据,提供 List + Save (JSON delta 形式) 接口。
// 所有 SaveXxxFromJSON 入口都接受字段级 delta(map[string]json.RawMessage)而非全量结构体,
// 保证只更新前端真正改动的字段(对乐观锁 + 审计 diff 友好)。
//
// 关键不变量:
//   - 应用启动时通过 SeedFinanceData 确保至少存在 CNY 币种 + 默认付款方式/条件
//   - SetBaseCurrency 控制系统的本位币标记(全局唯一)
//   - 系统级付款条件(如 "现款/月结") 不允许通过 UI 删除,通过 removeDisallowedSystemPaymentTermsTx 清理脏数据
//   - normalize* 系列函数集中处理字段规范化,避免 UI 层歧义
package services

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func defaultFinanceCurrencies() []models.Currency {
	return []models.Currency{
		{Code: "CNY", Name: "人民币", Symbol: "¥", Rate: 1.0, Precision: 2, IsBase: true, Status: "Active"},
		{Code: "USD", Name: "美元", Symbol: "$", Rate: 7.24, Precision: 2, IsBase: false, Status: "Active"},
		{Code: "EUR", Name: "欧元", Symbol: "EUR", Rate: 7.85, Precision: 2, IsBase: false, Status: "Active"},
		{Code: "HKD", Name: "港币", Symbol: "HK$", Rate: 0.92, Precision: 2, IsBase: false, Status: "Active"},
	}
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
	return ensureFallbackCurrencyWithContext(financeSystemAuditContext())
}

func ensureFallbackCurrencyWithContext(ctx context.Context) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var baseCount int64
		if err := tx.Model(&models.Currency{}).Where("is_base = ?", true).Count(&baseCount).Error; err != nil {
			return err
		}

		var cny models.Currency
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code = ?", "CNY").First(&cny).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			cny = fallbackCNYCurrency()
			cny.IsBase = baseCount == 0
			if err := tx.Create(&cny).Error; err != nil {
				return err
			}
			return recordFinanceAuditChange(ctx, tx, AuditModuleCurrency, strconv.FormatUint(uint64(cny.ID), 10), "CREATE", nil, cny)
		case err != nil:
			return err
		case baseCount == 0:
			before := map[string]any{
				"isBase": cny.IsBase,
				"rate":   cny.Rate,
				"status": cny.Status,
			}
			if err := tx.Model(&cny).Updates(map[string]interface{}{
				"is_base": true,
				"rate":    1.0,
				"status":  "Active",
			}).Error; err != nil {
				return err
			}
			if err := tx.First(&cny, cny.ID).Error; err != nil {
				return err
			}
			after := map[string]any{
				"isBase": cny.IsBase,
				"rate":   cny.Rate,
				"status": cny.Status,
			}
			return recordFinanceAuditChange(ctx, tx, AuditModuleCurrency, strconv.FormatUint(uint64(cny.ID), 10), "UPDATE", before, after)
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

// SaveCurrencyFromJSON keeps the original service API for non-HTTP callers.
// New request paths should use SaveCurrencyFromJSONWithContext so the actor is
// carried into the transactional audit event.
func SaveCurrencyFromJSON(payload map[string]json.RawMessage, body []byte) (models.Currency, error) {
	return SaveCurrencyFromJSONWithContext(context.Background(), payload, body)
}

func SaveCurrencyFromJSONWithContext(ctx context.Context, payload map[string]json.RawMessage, body []byte) (models.Currency, error) {
	var saved models.Currency
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var before any
		action := "CREATE"

		if rawID, ok := payload["id"]; ok {
			var id uint
			if err := json.Unmarshal(rawID, &id); err != nil {
				return err
			}
			updates, err := buildCurrencyUpdates(payload)
			if err != nil {
				return err
			}
			var existing models.Currency
			if err := tx.First(&existing, id).Error; err != nil {
				return err
			}
			before = existing
			action = "UPDATE"
			if err := patchCurrencyRecord(tx, id, updates); err != nil {
				return err
			}
			if err := tx.First(&saved, id).Error; err != nil {
				return err
			}
		} else {
			if err := json.Unmarshal(body, &saved); err != nil {
				return err
			}
			if err := saveCurrencyRecord(tx, &saved); err != nil {
				return err
			}
		}

		return recordFinanceAuditChange(ctx, tx, AuditModuleCurrency, strconv.FormatUint(uint64(saved.ID), 10), action, before, saved)
	})
	return saved, err
}

func ListPaymentTerms() ([]models.PaymentTerm, error) {
	if err := ensureDefaultPaymentTerms(); err != nil {
		return nil, err
	}

	var terms []models.PaymentTerm
	if err := db.DB.Order("is_default desc, sort_order asc, code asc").Find(&terms).Error; err != nil {
		return nil, err
	}
	return terms, nil
}

func ListPaymentMethods() ([]models.PaymentMethod, error) {
	if err := ensureDefaultPaymentMethods(); err != nil {
		return nil, err
	}

	var methods []models.PaymentMethod
	if err := db.DB.Order("is_default desc, sort_order asc, code asc").Find(&methods).Error; err != nil {
		return nil, err
	}
	return methods, nil
}

// SavePaymentTermFromJSON is the backwards-compatible system-context wrapper.
func SavePaymentTermFromJSON(payload map[string]json.RawMessage, body []byte) (models.PaymentTerm, error) {
	return SavePaymentTermFromJSONWithContext(context.Background(), payload, body)
}

func SavePaymentTermFromJSONWithContext(ctx context.Context, payload map[string]json.RawMessage, body []byte) (models.PaymentTerm, error) {
	var saved models.PaymentTerm
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var before any
		action := "CREATE"
		if rawID, ok := payload["id"]; ok {
			var id uint
			if err := json.Unmarshal(rawID, &id); err != nil {
				return err
			}
			updates, err := buildPaymentTermUpdates(payload)
			if err != nil {
				return err
			}
			var existing models.PaymentTerm
			var defaultsToUnset []models.PaymentTerm
			if value, enablesDefault := updates["is_default"].(bool); enablesDefault && value {
				existing, defaultsToUnset, err = lockPaymentTermDefaultSelectionTx(tx, id)
				if err != nil {
					return err
				}
			} else if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&existing, id).Error; err != nil {
				return err
			}
			before = existing
			action = "UPDATE"
			if err := unsetPaymentTermDefaultsWithAudit(ctx, tx, defaultsToUnset); err != nil {
				return err
			}
			if err := patchPaymentTermRecord(tx, id, updates); err != nil {
				return err
			}
			if err := tx.First(&saved, id).Error; err != nil {
				return err
			}
		} else {
			if err := json.Unmarshal(body, &saved); err != nil {
				return err
			}
			if saved.IsDefault {
				_, defaultsToUnset, err := lockPaymentTermDefaultSelectionTx(tx, 0)
				if err != nil {
					return err
				}
				if err := unsetPaymentTermDefaultsWithAudit(ctx, tx, defaultsToUnset); err != nil {
					return err
				}
			}
			if err := savePaymentTermRecord(tx, &saved); err != nil {
				return err
			}
		}

		return recordFinanceAuditChange(ctx, tx, AuditModulePaymentTerm, strconv.FormatUint(uint64(saved.ID), 10), action, before, saved)
	})
	return saved, err
}

// SavePaymentMethodFromJSON is the backwards-compatible system-context wrapper.
func SavePaymentMethodFromJSON(payload map[string]json.RawMessage, body []byte) (models.PaymentMethod, error) {
	return SavePaymentMethodFromJSONWithContext(context.Background(), payload, body)
}

func SavePaymentMethodFromJSONWithContext(ctx context.Context, payload map[string]json.RawMessage, body []byte) (models.PaymentMethod, error) {
	var saved models.PaymentMethod
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var before any
		action := "CREATE"
		if rawID, ok := payload["id"]; ok {
			var id uint
			if err := json.Unmarshal(rawID, &id); err != nil {
				return err
			}
			updates, err := buildPaymentMethodUpdates(payload)
			if err != nil {
				return err
			}
			var existing models.PaymentMethod
			var defaultsToUnset []models.PaymentMethod
			if value, enablesDefault := updates["is_default"].(bool); enablesDefault && value {
				existing, defaultsToUnset, err = lockPaymentMethodDefaultSelectionTx(tx, id)
				if err != nil {
					return err
				}
			} else if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&existing, id).Error; err != nil {
				return err
			}
			before = existing
			action = "UPDATE"
			if err := unsetPaymentMethodDefaultsWithAudit(ctx, tx, defaultsToUnset); err != nil {
				return err
			}
			if err := patchPaymentMethodRecord(tx, id, updates); err != nil {
				return err
			}
			if err := tx.First(&saved, id).Error; err != nil {
				return err
			}
		} else {
			if err := json.Unmarshal(body, &saved); err != nil {
				return err
			}
			if saved.IsDefault {
				_, defaultsToUnset, err := lockPaymentMethodDefaultSelectionTx(tx, 0)
				if err != nil {
					return err
				}
				if err := unsetPaymentMethodDefaultsWithAudit(ctx, tx, defaultsToUnset); err != nil {
					return err
				}
			}
			if err := savePaymentMethodRecord(tx, &saved); err != nil {
				return err
			}
		}

		return recordFinanceAuditChange(ctx, tx, AuditModulePaymentMethod, strconv.FormatUint(uint64(saved.ID), 10), action, before, saved)
	})
	return saved, err
}

func ListTaxRates() ([]models.TaxRate, error) {
	var rates []models.TaxRate
	if err := db.DB.Order("rate desc, code asc").Find(&rates).Error; err != nil {
		return nil, err
	}

	if len(rates) == 0 {
		if err := ensureDefaultTaxRatesWithAudit(financeSystemAuditContext()); err != nil {
			return nil, err
		}
		if err := db.DB.Order("rate desc, code asc").Find(&rates).Error; err != nil {
			return nil, err
		}
	}

	return rates, nil
}

// SaveTaxRateFromJSON is the backwards-compatible system-context wrapper.
func SaveTaxRateFromJSON(payload map[string]json.RawMessage, body []byte) (models.TaxRate, error) {
	return SaveTaxRateFromJSONWithContext(context.Background(), payload, body)
}

func SaveTaxRateFromJSONWithContext(ctx context.Context, payload map[string]json.RawMessage, body []byte) (models.TaxRate, error) {
	var saved models.TaxRate
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var before any
		action := "CREATE"
		if rawID, ok := payload["id"]; ok {
			var id string
			if err := json.Unmarshal(rawID, &id); err != nil {
				return err
			}
			updates, err := buildTaxRateUpdates(payload)
			if err != nil {
				return err
			}
			var existing models.TaxRate
			if err := tx.First(&existing, "id = ?", id).Error; err != nil {
				return err
			}
			before = existing
			action = "UPDATE"
			if err := patchTaxRateRecord(tx, id, updates); err != nil {
				return err
			}
			if err := tx.First(&saved, "id = ?", id).Error; err != nil {
				return err
			}
		} else {
			if err := json.Unmarshal(body, &saved); err != nil {
				return err
			}
			if err := saveTaxRateRecord(tx, &saved); err != nil {
				return err
			}
		}

		return recordFinanceAuditChange(ctx, tx, AuditModuleTaxRate, saved.ID, action, before, saved)
	})
	return saved, err
}

// SetBaseCurrency keeps the original system-level service API.
func SetBaseCurrency(id string) error {
	return SetBaseCurrencyWithContext(context.Background(), id)
}

func SetBaseCurrencyWithContext(ctx context.Context, id string) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		return setBaseCurrencyTx(ctx, tx, id)
	})
}

func SeedFinanceData() error {
	return SeedFinanceDataWithContext(financeSystemAuditContext())
}

func SeedFinanceDataWithContext(ctx context.Context) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		before, err := loadFinanceSeedSnapshot(tx)
		if err != nil {
			return err
		}

		if err := seedFinanceDefaultsTx(tx); err != nil {
			return err
		}

		after, err := loadFinanceSeedSnapshot(tx)
		if err != nil {
			return err
		}
		return recordFinanceSeedAuditChanges(ctx, tx, before, after)
	})
}

func seedFinanceDefaultsTx(tx *gorm.DB) error {
	for _, curr := range defaultFinanceCurrencies() {
		item := curr
		if err := tx.Where(models.Currency{Code: item.Code}).FirstOrCreate(&item).Error; err != nil {
			return err
		}
	}

	if err := ensureDefaultFinanceDictionariesTx(tx); err != nil {
		return err
	}

	return seedDefaultTaxRates(tx)
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

func saveCurrencyRecord(tx *gorm.DB, currency *models.Currency) error {
	if currency.ID == 0 {
		return tx.Create(currency).Error
	}

	var existing models.Currency
	if err := tx.First(&existing, currency.ID).Error; err != nil {
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
	return tx.Model(&existing).Updates(updates).Error
}

func patchCurrencyRecord(tx *gorm.DB, id uint, updates map[string]interface{}) error {
	var existing models.Currency
	if err := tx.First(&existing, id).Error; err != nil {
		return err
	}
	return tx.Model(&existing).Updates(updates).Error
}

func savePaymentTermRecord(tx *gorm.DB, term *models.PaymentTerm) error {
	normalizePaymentTerm(term)

	if term.ID == 0 {
		if term.Version == 0 {
			term.Version = 1
		}
		return tx.Create(term).Error
	}

	var existing models.PaymentTerm
	if err := tx.First(&existing, term.ID).Error; err != nil {
		return err
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
}

func patchPaymentTermRecord(tx *gorm.DB, id uint, updates map[string]interface{}) error {
	var existing models.PaymentTerm
	if err := tx.First(&existing, id).Error; err != nil {
		return err
	}
	updates["version"] = existing.Version + 1
	return tx.Model(&existing).Updates(updates).Error
}

func savePaymentMethodRecord(tx *gorm.DB, method *models.PaymentMethod) error {
	normalizePaymentMethod(method)

	if method.ID == 0 {
		if method.Version == 0 {
			method.Version = 1
		}
		return tx.Create(method).Error
	}

	var existing models.PaymentMethod
	if err := tx.First(&existing, method.ID).Error; err != nil {
		return err
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
}

func patchPaymentMethodRecord(tx *gorm.DB, id uint, updates map[string]interface{}) error {
	var existing models.PaymentMethod
	if err := tx.First(&existing, id).Error; err != nil {
		return err
	}
	updates["version"] = existing.Version + 1
	return tx.Model(&existing).Updates(updates).Error
}

func saveTaxRateRecord(tx *gorm.DB, rate *models.TaxRate) error {
	if rate.ID == "" {
		return tx.Create(rate).Error
	}

	var existing models.TaxRate
	if err := tx.First(&existing, "id = ?", rate.ID).Error; err != nil {
		return err
	}

	updates := map[string]interface{}{
		"code":        rate.Code,
		"name":        rate.Name,
		"rate":        rate.Rate,
		"status":      rate.Status,
		"description": rate.Description,
	}
	return tx.Model(&existing).Updates(updates).Error
}

func patchTaxRateRecord(tx *gorm.DB, id string, updates map[string]interface{}) error {
	var existing models.TaxRate
	if err := tx.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	return tx.Model(&existing).Updates(updates).Error
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
		{Code: "CUSTOM", Name: "自定义", Description: "业务特殊支付方式，适用于无法归类到系统内置渠道的结算场景", SortOrder: 5, IsSystem: true, Status: "Active", Version: 1},
	}
}

func ensureDefaultPaymentTerms() error {
	return ensureDefaultFinanceDictionariesWithAudit(financeSystemAuditContext())
}

func ensureDefaultPaymentMethods() error {
	return ensureDefaultFinanceDictionariesWithAudit(financeSystemAuditContext())
}

func ensureDefaultFinanceDictionariesTx(tx *gorm.DB) error {
	if err := ensureDefaultPaymentMethodsTx(tx); err != nil {
		return err
	}
	return ensureDefaultPaymentTermsTx(tx)
}

func removeDisallowedSystemPaymentTermsTx(tx *gorm.DB) error {
	return tx.Where("is_system = ? AND code IN ?", true, disallowedSystemPaymentTermCodes()).Delete(&models.PaymentTerm{}).Error
}

func disallowedSystemPaymentTermCodes() []string {
	return []string{"PREPAY100", "PREPAY30_BAL70"}
}

func ensureDefaultPaymentTermsTx(tx *gorm.DB) error {
	if err := removeDisallowedSystemPaymentTermsTx(tx); err != nil {
		return err
	}

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
		default:
			updates := map[string]interface{}{}
			if !existing.IsSystem {
				updates["is_system"] = true
			}
			if method.Code == "CUSTOM" && existing.SortOrder != method.SortOrder {
				updates["sort_order"] = method.SortOrder
			}
			if len(updates) > 0 {
				if err := tx.Model(&existing).Updates(updates).Error; err != nil {
					return err
				}
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
