package services

import (
	"fmt"
	"strings"
	"testing"
	"time"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openFinanceSeedTestDB(t *testing.T, withAuditLog bool) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:finance_seed_%d?mode=memory&cache=shared", time.Now().UnixNano())
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatalf("open sqlite connection: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Errorf("close sqlite: %v", err)
		}
	})

	modelsToMigrate := []any{
		&models.Currency{},
		&models.PaymentMethod{},
		&models.PaymentTerm{},
	}
	if withAuditLog {
		modelsToMigrate = append(modelsToMigrate, &models.AuditLog{})
	}
	if err := testDB.AutoMigrate(modelsToMigrate...); err != nil {
		t.Fatalf("migrate finance seed schema: %v", err)
	}
	if err := testDB.Exec(`
		CREATE TABLE tax_rates (
			id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			rate INTEGER NOT NULL,
			status TEXT DEFAULT 'Active',
			description TEXT
		)
	`).Error; err != nil {
		t.Fatalf("create sqlite tax rate table: %v", err)
	}
	return testDB
}

func TestSeedFinanceDataWritesAuditInOneTransactionAndIsIdempotent(t *testing.T) {
	testDB := openFinanceSeedTestDB(t, true)
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	if err := SeedFinanceDataWithContext(financeTestContext()); err != nil {
		t.Fatalf("seed finance data: %v", err)
	}

	var logs []models.AuditLog
	if err := testDB.Find(&logs).Error; err != nil {
		t.Fatalf("load finance seed audit logs: %v", err)
	}
	if len(logs) != 17 {
		t.Fatalf("expected 17 audit logs for seeded records, got %d", len(logs))
	}
	for _, log := range logs {
		if log.Operator != "finance-tester" || log.Action != "CREATE" {
			t.Fatalf("unexpected finance seed audit log: %+v", log)
		}
	}

	if err := SeedFinanceDataWithContext(financeTestContext()); err != nil {
		t.Fatalf("repeat finance seed: %v", err)
	}
	var count int64
	if err := testDB.Model(&models.AuditLog{}).Count(&count).Error; err != nil {
		t.Fatalf("count finance seed audit logs: %v", err)
	}
	if count != int64(len(logs)) {
		t.Fatalf("idempotent seed must not add audit noise: before=%d after=%d", len(logs), count)
	}
}

func TestSeedFinanceDataRollsBackWhenAuditWriteFails(t *testing.T) {
	testDB := openFinanceSeedTestDB(t, false)
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	err := SeedFinanceDataWithContext(financeTestContext())
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "audit_logs") {
		t.Fatalf("expected missing audit_logs error, got %v", err)
	}

	for _, model := range []any{&models.Currency{}, &models.PaymentMethod{}, &models.PaymentTerm{}, &models.TaxRate{}} {
		var count int64
		if err := testDB.Model(model).Count(&count).Error; err != nil {
			t.Fatalf("count rolled-back finance seed model %T: %v", model, err)
		}
		if count != 0 {
			t.Fatalf("finance seed must roll back %T when audit fails, found %d rows", model, count)
		}
	}
}

func TestFinanceListSelfHealingWritesSystemAudit(t *testing.T) {
	testDB := openFinanceSeedTestDB(t, true)
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	if _, err := ListCurrencies(); err != nil {
		t.Fatalf("list currencies: %v", err)
	}
	if _, err := ListPaymentMethods(); err != nil {
		t.Fatalf("list payment methods: %v", err)
	}
	if _, err := ListPaymentTerms(); err != nil {
		t.Fatalf("list payment terms: %v", err)
	}
	if _, err := ListTaxRates(); err != nil {
		t.Fatalf("list tax rates: %v", err)
	}

	expectedByModule := map[string]int64{
		AuditModuleCurrency:      1,
		AuditModulePaymentMethod: 5,
		AuditModulePaymentTerm:   4,
		AuditModuleTaxRate:       4,
	}
	for module, expected := range expectedByModule {
		var logs []models.AuditLog
		if err := testDB.Where("module = ?", module).Find(&logs).Error; err != nil {
			t.Fatalf("load %s self-heal audit logs: %v", module, err)
		}
		if int64(len(logs)) != expected {
			t.Fatalf("expected %d %s self-heal logs, got %d", expected, module, len(logs))
		}
		for _, log := range logs {
			if log.Operator != "system" || log.Action != "CREATE" {
				t.Fatalf("unexpected %s self-heal audit log: %+v", module, log)
			}
		}
	}

	var beforeRepeat int64
	if err := testDB.Model(&models.AuditLog{}).Count(&beforeRepeat).Error; err != nil {
		t.Fatalf("count self-heal audit logs: %v", err)
	}
	if _, err := ListCurrencies(); err != nil {
		t.Fatalf("repeat list currencies: %v", err)
	}
	if _, err := ListPaymentMethods(); err != nil {
		t.Fatalf("repeat list payment methods: %v", err)
	}
	if _, err := ListTaxRates(); err != nil {
		t.Fatalf("repeat list tax rates: %v", err)
	}
	var afterRepeat int64
	if err := testDB.Model(&models.AuditLog{}).Count(&afterRepeat).Error; err != nil {
		t.Fatalf("count repeated self-heal audit logs: %v", err)
	}
	if afterRepeat != beforeRepeat {
		t.Fatalf("repeat self-heal reads must not add audit noise: before=%d after=%d", beforeRepeat, afterRepeat)
	}
}

func TestListPaymentMethodsEnsuresVisibleCustomMethod(t *testing.T) {
	testDB := openFinanceSeedTestDB(t, true)
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	seededCustom := models.PaymentMethod{
		Code:        "CUSTOM",
		Name:        "自定义",
		Description: "旧排序自定义支付方式",
		SortOrder:   90,
		IsSystem:    true,
		Status:      "Active",
		Version:     1,
	}
	if err := testDB.Create(&seededCustom).Error; err != nil {
		t.Fatalf("seed custom payment method: %v", err)
	}

	methods, err := ListPaymentMethods()
	if err != nil {
		t.Fatalf("list payment methods: %v", err)
	}

	var custom *models.PaymentMethod
	for index := range methods {
		if methods[index].Code == "CUSTOM" {
			custom = &methods[index]
			break
		}
	}
	if custom == nil {
		t.Fatal("expected CUSTOM payment method to be present")
	}
	if custom.Name != "自定义" {
		t.Fatalf("expected CUSTOM name to be 自定义, got %q", custom.Name)
	}
	if custom.SortOrder != 5 {
		t.Fatalf("expected CUSTOM sort order to be 5, got %d", custom.SortOrder)
	}
	if !custom.IsSystem {
		t.Fatal("expected CUSTOM payment method to be system preset")
	}
}

func TestListPaymentTermsEnsuresVisibleCustomTerm(t *testing.T) {
	testDB := openFinanceSeedTestDB(t, true)
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	seededCustom := models.PaymentTerm{
		Code:        "DIY",
		Name:        "自定义",
		Description: "旧排序自定义结算方式",
		SortOrder:   90,
		IsSystem:    false,
		Status:      "Active",
		Version:     1,
	}
	if err := testDB.Create(&seededCustom).Error; err != nil {
		t.Fatalf("seed custom payment term: %v", err)
	}

	terms, err := ListPaymentTerms()
	if err != nil {
		t.Fatalf("list payment terms: %v", err)
	}

	var custom *models.PaymentTerm
	for index := range terms {
		if terms[index].Code == "DIY" {
			custom = &terms[index]
			break
		}
	}
	if custom == nil {
		t.Fatal("expected DIY payment term to be present")
	}
	if custom.Name != "自定义" {
		t.Fatalf("expected DIY name to be 自定义, got %q", custom.Name)
	}
	if custom.SortOrder != 5 {
		t.Fatalf("expected DIY sort order to be 5, got %d", custom.SortOrder)
	}
	if !custom.IsSystem {
		t.Fatal("expected DIY payment term to be system preset")
	}
}

func TestFinanceListSelfHealingRollsBackWhenAuditWriteFails(t *testing.T) {
	t.Run("currency", func(t *testing.T) {
		testDB := openFinanceSeedTestDB(t, false)
		previousDB := appdb.DB
		appdb.DB = testDB
		t.Cleanup(func() { appdb.DB = previousDB })

		_, err := ListCurrencies()
		if err == nil || !strings.Contains(strings.ToLower(err.Error()), "audit_logs") {
			t.Fatalf("expected missing audit_logs error, got %v", err)
		}
		var count int64
		if err := testDB.Model(&models.Currency{}).Count(&count).Error; err != nil {
			t.Fatalf("count currencies: %v", err)
		}
		if count != 0 {
			t.Fatalf("currency self-heal must roll back, found %d rows", count)
		}
	})

	t.Run("dictionaries", func(t *testing.T) {
		testDB := openFinanceSeedTestDB(t, false)
		previousDB := appdb.DB
		appdb.DB = testDB
		t.Cleanup(func() { appdb.DB = previousDB })

		_, err := ListPaymentMethods()
		if err == nil || !strings.Contains(strings.ToLower(err.Error()), "audit_logs") {
			t.Fatalf("expected missing audit_logs error, got %v", err)
		}
		for _, model := range []any{&models.PaymentMethod{}, &models.PaymentTerm{}} {
			var count int64
			if err := testDB.Model(model).Count(&count).Error; err != nil {
				t.Fatalf("count dictionary %T: %v", model, err)
			}
			if count != 0 {
				t.Fatalf("dictionary self-heal must roll back %T, found %d rows", model, count)
			}
		}
	})

	t.Run("tax-rates", func(t *testing.T) {
		testDB := openFinanceSeedTestDB(t, false)
		previousDB := appdb.DB
		appdb.DB = testDB
		t.Cleanup(func() { appdb.DB = previousDB })

		_, err := ListTaxRates()
		if err == nil || !strings.Contains(strings.ToLower(err.Error()), "audit_logs") {
			t.Fatalf("expected missing audit_logs error, got %v", err)
		}
		var count int64
		if err := testDB.Model(&models.TaxRate{}).Count(&count).Error; err != nil {
			t.Fatalf("count tax rates: %v", err)
		}
		if count != 0 {
			t.Fatalf("tax rate self-heal must roll back, found %d rows", count)
		}
	})
}
