package services

import (
	"context"
	"reflect"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type financeSeedSnapshot struct {
	Currencies     []models.Currency
	PaymentMethods []models.PaymentMethod
	PaymentTerms   []models.PaymentTerm
	TaxRates       []models.TaxRate
}

type financeDictionarySnapshot struct {
	PaymentMethods []models.PaymentMethod
	PaymentTerms   []models.PaymentTerm
}

func loadFinanceSeedSnapshot(tx *gorm.DB) (financeSeedSnapshot, error) {
	var snapshot financeSeedSnapshot
	currencyCodes := financeEntityCodes(defaultFinanceCurrencies(), func(item models.Currency) string { return item.Code })
	methodCodes := financeEntityCodes(defaultPaymentMethods(), func(item models.PaymentMethod) string { return item.Code })
	termCodes := financeDefaultPaymentTermAuditCodes()
	taxCodes := financeEntityCodes(defaultFinanceTaxRates(), func(item models.TaxRate) string { return item.Code })

	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code IN ?", currencyCodes).Order("id asc").Find(&snapshot.Currencies).Error; err != nil {
		return financeSeedSnapshot{}, err
	}
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code IN ?", methodCodes).Order("id asc").Find(&snapshot.PaymentMethods).Error; err != nil {
		return financeSeedSnapshot{}, err
	}
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code IN ?", termCodes).Order("id asc").Find(&snapshot.PaymentTerms).Error; err != nil {
		return financeSeedSnapshot{}, err
	}
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code IN ?", taxCodes).Order("id asc").Find(&snapshot.TaxRates).Error; err != nil {
		return financeSeedSnapshot{}, err
	}
	return snapshot, nil
}

func loadFinanceDictionarySnapshot(tx *gorm.DB) (financeDictionarySnapshot, error) {
	var snapshot financeDictionarySnapshot
	methodCodes := financeEntityCodes(defaultPaymentMethods(), func(item models.PaymentMethod) string { return item.Code })
	termCodes := financeDefaultPaymentTermAuditCodes()
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code IN ?", methodCodes).Order("id asc").Find(&snapshot.PaymentMethods).Error; err != nil {
		return financeDictionarySnapshot{}, err
	}
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code IN ?", termCodes).Order("id asc").Find(&snapshot.PaymentTerms).Error; err != nil {
		return financeDictionarySnapshot{}, err
	}
	return snapshot, nil
}

func recordFinanceSeedAuditChanges(ctx context.Context, tx *gorm.DB, before financeSeedSnapshot, after financeSeedSnapshot) error {
	uintTargetID := func(id uint) string {
		return strconv.FormatUint(uint64(id), 10)
	}
	if err := recordFinanceEntitySnapshotChanges(
		ctx,
		tx,
		AuditModuleCurrency,
		before.Currencies,
		after.Currencies,
		func(item models.Currency) uint { return item.ID },
		func(item models.Currency) string { return uintTargetID(item.ID) },
	); err != nil {
		return err
	}
	if err := recordFinanceEntitySnapshotChanges(
		ctx,
		tx,
		AuditModulePaymentMethod,
		before.PaymentMethods,
		after.PaymentMethods,
		func(item models.PaymentMethod) uint { return item.ID },
		func(item models.PaymentMethod) string { return uintTargetID(item.ID) },
	); err != nil {
		return err
	}
	if err := recordFinanceEntitySnapshotChanges(
		ctx,
		tx,
		AuditModulePaymentTerm,
		before.PaymentTerms,
		after.PaymentTerms,
		func(item models.PaymentTerm) uint { return item.ID },
		func(item models.PaymentTerm) string { return uintTargetID(item.ID) },
	); err != nil {
		return err
	}
	return recordFinanceEntitySnapshotChanges(
		ctx,
		tx,
		AuditModuleTaxRate,
		before.TaxRates,
		after.TaxRates,
		func(item models.TaxRate) string { return item.ID },
		func(item models.TaxRate) string { return item.ID },
	)
}

func ensureDefaultFinanceDictionariesWithAudit(ctx context.Context) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		before, err := loadFinanceDictionarySnapshot(tx)
		if err != nil {
			return err
		}
		if err := ensureDefaultFinanceDictionariesTx(tx); err != nil {
			return err
		}
		after, err := loadFinanceDictionarySnapshot(tx)
		if err != nil {
			return err
		}

		uintTargetID := func(id uint) string {
			return strconv.FormatUint(uint64(id), 10)
		}
		if err := recordFinanceEntitySnapshotChanges(
			ctx,
			tx,
			AuditModulePaymentMethod,
			before.PaymentMethods,
			after.PaymentMethods,
			func(item models.PaymentMethod) uint { return item.ID },
			func(item models.PaymentMethod) string { return uintTargetID(item.ID) },
		); err != nil {
			return err
		}
		return recordFinanceEntitySnapshotChanges(
			ctx,
			tx,
			AuditModulePaymentTerm,
			before.PaymentTerms,
			after.PaymentTerms,
			func(item models.PaymentTerm) uint { return item.ID },
			func(item models.PaymentTerm) string { return uintTargetID(item.ID) },
		)
	})
}

func ensureDefaultTaxRatesWithAudit(ctx context.Context) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		taxCodes := financeEntityCodes(defaultFinanceTaxRates(), func(item models.TaxRate) string { return item.Code })
		var before []models.TaxRate
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code IN ?", taxCodes).Order("id asc").Find(&before).Error; err != nil {
			return err
		}
		if err := seedDefaultTaxRates(tx); err != nil {
			return err
		}
		var after []models.TaxRate
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code IN ?", taxCodes).Order("id asc").Find(&after).Error; err != nil {
			return err
		}
		return recordFinanceEntitySnapshotChanges(
			ctx,
			tx,
			AuditModuleTaxRate,
			before,
			after,
			func(item models.TaxRate) string { return item.ID },
			func(item models.TaxRate) string { return item.ID },
		)
	})
}

func financeEntityCodes[T any](items []T, code func(T) string) []string {
	codes := make([]string, 0, len(items))
	for _, item := range items {
		codes = append(codes, code(item))
	}
	return codes
}

func financeDefaultPaymentTermAuditCodes() []string {
	codes := financeEntityCodes(defaultPaymentTerms(), func(item models.PaymentTerm) string { return item.Code })
	return append(codes, disallowedSystemPaymentTermCodes()...)
}

func recordFinanceEntitySnapshotChanges[T any, K comparable](
	ctx context.Context,
	tx *gorm.DB,
	module string,
	before []T,
	after []T,
	key func(T) K,
	targetID func(T) string,
) error {
	beforeByKey := make(map[K]T, len(before))
	for _, item := range before {
		beforeByKey[key(item)] = item
	}
	afterByKey := make(map[K]T, len(after))
	for _, item := range after {
		itemKey := key(item)
		afterByKey[itemKey] = item
		previous, exists := beforeByKey[itemKey]
		switch {
		case !exists:
			if err := recordFinanceAuditChange(ctx, tx, module, targetID(item), "CREATE", nil, item); err != nil {
				return err
			}
		case !reflect.DeepEqual(previous, item):
			if err := recordFinanceAuditChange(ctx, tx, module, targetID(item), "UPDATE", previous, item); err != nil {
				return err
			}
		}
	}

	for _, item := range before {
		if _, exists := afterByKey[key(item)]; exists {
			continue
		}
		if err := recordFinanceAuditChange(ctx, tx, module, targetID(item), "DELETE", item, nil); err != nil {
			return err
		}
	}
	return nil
}
