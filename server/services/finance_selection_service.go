package services

import (
	"context"
	"strconv"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func setBaseCurrencyTx(ctx context.Context, tx *gorm.DB, targetID string) error {
	locked, err := lockBaseCurrencySelectionTx(tx, targetID)
	if err != nil {
		return err
	}

	var target models.Currency
	targetFound := false
	for _, currency := range locked {
		if strconv.FormatUint(uint64(currency.ID), 10) == targetID {
			target = currency
			targetFound = true
			break
		}
	}
	if !targetFound {
		return gorm.ErrRecordNotFound
	}

	for _, currency := range locked {
		if !currency.IsBase || currency.ID == target.ID {
			continue
		}
		result := tx.Model(&models.Currency{}).
			Where("id = ? AND is_base = ?", currency.ID, true).
			Update("is_base", false)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			continue
		}

		var updated models.Currency
		if err := tx.First(&updated, currency.ID).Error; err != nil {
			return err
		}
		if err := recordFinanceAuditChange(
			ctx,
			tx,
			AuditModuleCurrency,
			strconv.FormatUint(uint64(currency.ID), 10),
			"UNSET_BASE",
			currencyBaseSelectionAuditSnapshot(currency),
			currencyBaseSelectionAuditSnapshot(updated),
		); err != nil {
			return err
		}
	}

	if target.IsBase && target.Rate == 1 {
		return nil
	}
	if err := tx.Model(&models.Currency{}).Where("id = ?", target.ID).Updates(map[string]interface{}{
		"is_base": true,
		"rate":    1.0,
	}).Error; err != nil {
		return err
	}

	var updatedTarget models.Currency
	if err := tx.First(&updatedTarget, target.ID).Error; err != nil {
		return err
	}
	return recordFinanceAuditChange(
		ctx,
		tx,
		AuditModuleCurrency,
		strconv.FormatUint(uint64(target.ID), 10),
		"SET_BASE",
		currencyBaseSelectionAuditSnapshot(target),
		currencyBaseSelectionAuditSnapshot(updatedTarget),
	)
}

func lockBaseCurrencySelectionTx(tx *gorm.DB, targetID string) ([]models.Currency, error) {
	load := func() ([]models.Currency, error) {
		var currencies []models.Currency
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("is_base = ? OR id = ?", true, targetID).
			Order("id asc").
			Find(&currencies).Error
		return currencies, err
	}

	barrier, err := load()
	if err != nil {
		return nil, err
	}
	targetFound := false
	for _, currency := range barrier {
		if strconv.FormatUint(uint64(currency.ID), 10) == targetID {
			targetFound = true
			break
		}
	}
	if !targetFound {
		return nil, gorm.ErrRecordNotFound
	}

	// Re-read after any lock wait so READ COMMITTED sees the latest base set.
	return load()
}

func currencyBaseSelectionAuditSnapshot(currency models.Currency) map[string]any {
	return map[string]any{
		"id":     currency.ID,
		"isBase": currency.IsBase,
		"rate":   currency.Rate,
	}
}

func paymentTermDefaultAuditSnapshot(term models.PaymentTerm) map[string]any {
	return map[string]any{
		"id":        term.ID,
		"isDefault": term.IsDefault,
	}
}

func paymentMethodDefaultAuditSnapshot(method models.PaymentMethod) map[string]any {
	return map[string]any{
		"id":        method.ID,
		"isDefault": method.IsDefault,
	}
}

func lockPaymentTermDefaultSelectionTx(tx *gorm.DB, targetID uint) (models.PaymentTerm, []models.PaymentTerm, error) {
	load := func() ([]models.PaymentTerm, error) {
		var terms []models.PaymentTerm
		query := tx.Clauses(clause.Locking{Strength: "UPDATE"})
		if targetID == 0 {
			query = query.Where("is_default = ?", true)
		} else {
			query = query.Where("is_default = ? OR id = ?", true, targetID)
		}
		err := query.Order("id asc").Find(&terms).Error
		return terms, err
	}

	barrier, err := load()
	if err != nil {
		return models.PaymentTerm{}, nil, err
	}
	if targetID != 0 && !paymentTermSelectionContains(barrier, targetID) {
		return models.PaymentTerm{}, nil, gorm.ErrRecordNotFound
	}

	locked, err := load()
	if err != nil {
		return models.PaymentTerm{}, nil, err
	}
	var target models.PaymentTerm
	others := make([]models.PaymentTerm, 0, len(locked))
	for _, term := range locked {
		if term.ID == targetID {
			target = term
			continue
		}
		if term.IsDefault {
			others = append(others, term)
		}
	}
	if targetID != 0 && target.ID == 0 {
		return models.PaymentTerm{}, nil, gorm.ErrRecordNotFound
	}
	return target, others, nil
}

func paymentTermSelectionContains(terms []models.PaymentTerm, targetID uint) bool {
	for _, term := range terms {
		if term.ID == targetID {
			return true
		}
	}
	return false
}

func unsetPaymentTermDefaultsWithAudit(ctx context.Context, tx *gorm.DB, terms []models.PaymentTerm) error {
	for _, before := range terms {
		result := tx.Model(&models.PaymentTerm{}).
			Where("id = ? AND is_default = ?", before.ID, true).
			Update("is_default", false)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			continue
		}

		var after models.PaymentTerm
		if err := tx.First(&after, before.ID).Error; err != nil {
			return err
		}
		if err := recordFinanceAuditChange(
			ctx,
			tx,
			AuditModulePaymentTerm,
			strconv.FormatUint(uint64(before.ID), 10),
			"UNSET_DEFAULT",
			paymentTermDefaultAuditSnapshot(before),
			paymentTermDefaultAuditSnapshot(after),
		); err != nil {
			return err
		}
	}
	return nil
}

func lockPaymentMethodDefaultSelectionTx(tx *gorm.DB, targetID uint) (models.PaymentMethod, []models.PaymentMethod, error) {
	load := func() ([]models.PaymentMethod, error) {
		var methods []models.PaymentMethod
		query := tx.Clauses(clause.Locking{Strength: "UPDATE"})
		if targetID == 0 {
			query = query.Where("is_default = ?", true)
		} else {
			query = query.Where("is_default = ? OR id = ?", true, targetID)
		}
		err := query.Order("id asc").Find(&methods).Error
		return methods, err
	}

	barrier, err := load()
	if err != nil {
		return models.PaymentMethod{}, nil, err
	}
	if targetID != 0 && !paymentMethodSelectionContains(barrier, targetID) {
		return models.PaymentMethod{}, nil, gorm.ErrRecordNotFound
	}

	locked, err := load()
	if err != nil {
		return models.PaymentMethod{}, nil, err
	}
	var target models.PaymentMethod
	others := make([]models.PaymentMethod, 0, len(locked))
	for _, method := range locked {
		if method.ID == targetID {
			target = method
			continue
		}
		if method.IsDefault {
			others = append(others, method)
		}
	}
	if targetID != 0 && target.ID == 0 {
		return models.PaymentMethod{}, nil, gorm.ErrRecordNotFound
	}
	return target, others, nil
}

func paymentMethodSelectionContains(methods []models.PaymentMethod, targetID uint) bool {
	for _, method := range methods {
		if method.ID == targetID {
			return true
		}
	}
	return false
}

func unsetPaymentMethodDefaultsWithAudit(ctx context.Context, tx *gorm.DB, methods []models.PaymentMethod) error {
	for _, before := range methods {
		result := tx.Model(&models.PaymentMethod{}).
			Where("id = ? AND is_default = ?", before.ID, true).
			Update("is_default", false)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			continue
		}

		var after models.PaymentMethod
		if err := tx.First(&after, before.ID).Error; err != nil {
			return err
		}
		if err := recordFinanceAuditChange(
			ctx,
			tx,
			AuditModulePaymentMethod,
			strconv.FormatUint(uint64(before.ID), 10),
			"UNSET_DEFAULT",
			paymentMethodDefaultAuditSnapshot(before),
			paymentMethodDefaultAuditSnapshot(after),
		); err != nil {
			return err
		}
	}
	return nil
}
