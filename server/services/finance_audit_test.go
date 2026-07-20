package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"
	"xdfc-server/audit"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openFinanceTransactionTestDB(t *testing.T, withAuditLog bool) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:finance_transaction_%d?mode=memory&cache=shared", time.Now().UnixNano())
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
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

	modelsToMigrate := []any{&models.Currency{}}
	if withAuditLog {
		modelsToMigrate = append(modelsToMigrate, &models.AuditLog{})
	}
	if err := testDB.AutoMigrate(modelsToMigrate...); err != nil {
		t.Fatalf("migrate finance test schema: %v", err)
	}
	return testDB
}

func financeTestContext() context.Context {
	return audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "finance-test-user",
		Username: "finance-tester",
		IP:       "127.0.0.1",
	})
}

func TestSaveCurrencyFromJSONWritesAuditLogInSameTransaction(t *testing.T) {
	testDB := openFinanceTransactionTestDB(t, true)
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	payload := map[string]json.RawMessage{}
	body := []byte(`{"code":"USD","name":"US Dollar","symbol":"$","rate":7.2,"precision":2,"isBase":false,"status":"Active"}`)
	saved, err := SaveCurrencyFromJSONWithContext(financeTestContext(), payload, body)
	if err != nil {
		t.Fatalf("save currency: %v", err)
	}
	if saved.ID == 0 {
		t.Fatal("expected saved currency to receive an ID")
	}

	var logs []models.AuditLog
	if err := testDB.Where("module = ? AND target_id = ?", AuditModuleCurrency, fmt.Sprint(saved.ID)).Find(&logs).Error; err != nil {
		t.Fatalf("load currency audit log: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected one currency audit log, got %d", len(logs))
	}
	if logs[0].Action != "CREATE" || logs[0].Operator != "finance-tester" {
		t.Fatalf("unexpected currency audit log: %+v", logs[0])
	}
}

func TestSaveCurrencyFromJSONRollsBackWhenAuditTableIsMissing(t *testing.T) {
	testDB := openFinanceTransactionTestDB(t, false)
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	body := []byte(`{"code":"EUR","name":"Euro","symbol":"EUR","rate":7.8,"precision":2,"isBase":false,"status":"Active"}`)
	_, err := SaveCurrencyFromJSONWithContext(financeTestContext(), map[string]json.RawMessage{}, body)
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "audit_logs") {
		t.Fatalf("expected missing audit_logs error, got %v", err)
	}

	var count int64
	if err := testDB.Model(&models.Currency{}).Where("code = ?", "EUR").Count(&count).Error; err != nil {
		t.Fatalf("count rolled-back currencies: %v", err)
	}
	if count != 0 {
		t.Fatalf("currency write must roll back when audit write fails, found %d rows", count)
	}
}

func auditDiffField(t *testing.T, log models.AuditLog, field string) audit.DiffItem {
	t.Helper()
	var items []audit.DiffItem
	if err := json.Unmarshal(log.Diff, &items); err != nil {
		t.Fatalf("decode audit diff: %v", err)
	}
	for _, item := range items {
		if item.Field == field {
			return item
		}
	}
	t.Fatalf("audit log %s has no %s field: %s", log.ID, field, string(log.Diff))
	return audit.DiffItem{}
}

func TestSetBaseCurrencyAuditsEachChangedCurrency(t *testing.T) {
	testDB := openFinanceTransactionTestDB(t, true)
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	oldBase := models.Currency{Code: "CNY", Name: "Renminbi", Rate: 1, IsBase: true, Status: "Active"}
	newBase := models.Currency{Code: "USD", Name: "US Dollar", Rate: 7.2, Status: "Active"}
	if err := testDB.Create(&oldBase).Error; err != nil {
		t.Fatalf("create old base: %v", err)
	}
	if err := testDB.Create(&newBase).Error; err != nil {
		t.Fatalf("create new base: %v", err)
	}

	if err := SetBaseCurrencyWithContext(financeTestContext(), fmt.Sprint(newBase.ID)); err != nil {
		t.Fatalf("set base currency: %v", err)
	}

	var currencies []models.Currency
	if err := testDB.Order("id asc").Find(&currencies).Error; err != nil {
		t.Fatalf("reload currencies: %v", err)
	}
	if currencies[0].IsBase || !currencies[1].IsBase || currencies[1].Rate != 1 {
		t.Fatalf("unexpected base currency state: %+v", currencies)
	}

	var logs []models.AuditLog
	if err := testDB.Where("module = ?", AuditModuleCurrency).Find(&logs).Error; err != nil {
		t.Fatalf("load base currency audit logs: %v", err)
	}
	if len(logs) != 2 {
		t.Fatalf("expected two currency audit logs, got %d", len(logs))
	}
	logsByTarget := make(map[string]models.AuditLog, len(logs))
	for _, log := range logs {
		logsByTarget[log.TargetID] = log
	}
	oldLog := logsByTarget[fmt.Sprint(oldBase.ID)]
	newLog := logsByTarget[fmt.Sprint(newBase.ID)]
	if oldLog.Action != "UNSET_BASE" || newLog.Action != "SET_BASE" {
		t.Fatalf("unexpected base actions: old=%+v new=%+v", oldLog, newLog)
	}
	for id, log := range map[uint]models.AuditLog{oldBase.ID: oldLog, newBase.ID: newLog} {
		change := auditDiffField(t, log, "id")
		if change.Old != float64(id) || change.New != float64(id) {
			t.Fatalf("base audit compared different entities for %d: %+v", id, change)
		}
	}
}

func TestSetBaseCurrencySameTargetWritesAtMostOneAudit(t *testing.T) {
	testDB := openFinanceTransactionTestDB(t, true)
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	base := models.Currency{Code: "CNY", Name: "Renminbi", Rate: 2, IsBase: true, Status: "Active"}
	if err := testDB.Create(&base).Error; err != nil {
		t.Fatalf("create base: %v", err)
	}
	if err := SetBaseCurrencyWithContext(financeTestContext(), fmt.Sprint(base.ID)); err != nil {
		t.Fatalf("normalize same base: %v", err)
	}
	if err := SetBaseCurrencyWithContext(financeTestContext(), fmt.Sprint(base.ID)); err != nil {
		t.Fatalf("repeat same base: %v", err)
	}

	var logs []models.AuditLog
	if err := testDB.Where("module = ? AND target_id = ?", AuditModuleCurrency, fmt.Sprint(base.ID)).Find(&logs).Error; err != nil {
		t.Fatalf("load same-base audit logs: %v", err)
	}
	if len(logs) != 1 || logs[0].Action != "SET_BASE" {
		t.Fatalf("expected one same-target SET_BASE audit, got %+v", logs)
	}
	change := auditDiffField(t, logs[0], "id")
	if change.Old != float64(base.ID) || change.New != float64(base.ID) {
		t.Fatalf("same-target audit compared different entities: %+v", change)
	}
}

func TestSetBaseCurrencyRollsBackAllCurrenciesWhenAuditFails(t *testing.T) {
	testDB := openFinanceTransactionTestDB(t, false)
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	oldBase := models.Currency{Code: "CNY", Name: "Renminbi", Rate: 1, IsBase: true, Status: "Active"}
	newBase := models.Currency{Code: "USD", Name: "US Dollar", Rate: 7.2, Status: "Active"}
	if err := testDB.Create(&oldBase).Error; err != nil {
		t.Fatalf("create old base: %v", err)
	}
	if err := testDB.Create(&newBase).Error; err != nil {
		t.Fatalf("create new base: %v", err)
	}

	err := SetBaseCurrencyWithContext(financeTestContext(), fmt.Sprint(newBase.ID))
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "audit_logs") {
		t.Fatalf("expected missing audit_logs error, got %v", err)
	}
	var oldAfter, newAfter models.Currency
	if err := testDB.First(&oldAfter, oldBase.ID).Error; err != nil {
		t.Fatalf("reload old base: %v", err)
	}
	if err := testDB.First(&newAfter, newBase.ID).Error; err != nil {
		t.Fatalf("reload new base: %v", err)
	}
	if !oldAfter.IsBase || newAfter.IsBase || newAfter.Rate != newBase.Rate {
		t.Fatalf("base switch must roll back fully: old=%+v new=%+v", oldAfter, newAfter)
	}
}

func TestSetDefaultPaymentTermAuditsPreviousDefault(t *testing.T) {
	testDB := openFinanceTransactionTestDB(t, true)
	if err := testDB.AutoMigrate(&models.PaymentTerm{}); err != nil {
		t.Fatalf("migrate payment terms: %v", err)
	}
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	oldDefault := models.PaymentTerm{Code: "OLD", Name: "Old", IsDefault: true, Status: "Active", Version: 1}
	target := models.PaymentTerm{Code: "NEW", Name: "New", Status: "Active", Version: 1}
	if err := testDB.Create(&oldDefault).Error; err != nil {
		t.Fatalf("create old default term: %v", err)
	}
	if err := testDB.Create(&target).Error; err != nil {
		t.Fatalf("create target term: %v", err)
	}

	payload := map[string]json.RawMessage{
		"id":        json.RawMessage(fmt.Sprint(target.ID)),
		"isDefault": json.RawMessage("true"),
	}
	if _, err := SavePaymentTermFromJSONWithContext(financeTestContext(), payload, nil); err != nil {
		t.Fatalf("set default payment term: %v", err)
	}
	assertDefaultSelectionAudit(t, testDB, AuditModulePaymentTerm, oldDefault.ID, target.ID)
}

func TestSetDefaultPaymentMethodAuditsPreviousDefault(t *testing.T) {
	testDB := openFinanceTransactionTestDB(t, true)
	if err := testDB.AutoMigrate(&models.PaymentMethod{}); err != nil {
		t.Fatalf("migrate payment methods: %v", err)
	}
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	oldDefault := models.PaymentMethod{Code: "OLD", Name: "Old", IsDefault: true, Status: "Active", Version: 1}
	target := models.PaymentMethod{Code: "NEW", Name: "New", Status: "Active", Version: 1}
	if err := testDB.Create(&oldDefault).Error; err != nil {
		t.Fatalf("create old default method: %v", err)
	}
	if err := testDB.Create(&target).Error; err != nil {
		t.Fatalf("create target method: %v", err)
	}

	payload := map[string]json.RawMessage{
		"id":        json.RawMessage(fmt.Sprint(target.ID)),
		"isDefault": json.RawMessage("true"),
	}
	if _, err := SavePaymentMethodFromJSONWithContext(financeTestContext(), payload, nil); err != nil {
		t.Fatalf("set default payment method: %v", err)
	}
	assertDefaultSelectionAudit(t, testDB, AuditModulePaymentMethod, oldDefault.ID, target.ID)
}

func assertDefaultSelectionAudit(t *testing.T, testDB *gorm.DB, module string, oldID uint, targetID uint) {
	t.Helper()
	var logs []models.AuditLog
	if err := testDB.Where("module = ?", module).Find(&logs).Error; err != nil {
		t.Fatalf("load %s audit logs: %v", module, err)
	}
	if len(logs) != 2 {
		t.Fatalf("expected two %s audit logs, got %d", module, len(logs))
	}
	logsByTarget := make(map[string]models.AuditLog, len(logs))
	for _, log := range logs {
		logsByTarget[log.TargetID] = log
	}
	if logsByTarget[fmt.Sprint(oldID)].Action != "UNSET_DEFAULT" || logsByTarget[fmt.Sprint(targetID)].Action != "UPDATE" {
		t.Fatalf("unexpected %s default audit logs: %+v", module, logs)
	}
}

func TestDefaultSelectionRollsBackWhenAuditFails(t *testing.T) {
	t.Run("payment-term", func(t *testing.T) {
		testDB := openFinanceTransactionTestDB(t, false)
		if err := testDB.AutoMigrate(&models.PaymentTerm{}); err != nil {
			t.Fatalf("migrate payment terms: %v", err)
		}
		previousDB := appdb.DB
		appdb.DB = testDB
		t.Cleanup(func() { appdb.DB = previousDB })

		oldDefault := models.PaymentTerm{Code: "OLD", Name: "Old", IsDefault: true, Status: "Active", Version: 1}
		target := models.PaymentTerm{Code: "NEW", Name: "New", Status: "Active", Version: 1}
		if err := testDB.Create(&oldDefault).Error; err != nil {
			t.Fatalf("create old term: %v", err)
		}
		if err := testDB.Create(&target).Error; err != nil {
			t.Fatalf("create target term: %v", err)
		}
		payload := map[string]json.RawMessage{"id": json.RawMessage(fmt.Sprint(target.ID)), "isDefault": json.RawMessage("true")}
		_, err := SavePaymentTermFromJSONWithContext(financeTestContext(), payload, nil)
		if err == nil || !strings.Contains(strings.ToLower(err.Error()), "audit_logs") {
			t.Fatalf("expected missing audit_logs error, got %v", err)
		}
		assertDefaultSelectionState(t, testDB, &models.PaymentTerm{}, oldDefault.ID, target.ID)
	})

	t.Run("payment-method", func(t *testing.T) {
		testDB := openFinanceTransactionTestDB(t, false)
		if err := testDB.AutoMigrate(&models.PaymentMethod{}); err != nil {
			t.Fatalf("migrate payment methods: %v", err)
		}
		previousDB := appdb.DB
		appdb.DB = testDB
		t.Cleanup(func() { appdb.DB = previousDB })

		oldDefault := models.PaymentMethod{Code: "OLD", Name: "Old", IsDefault: true, Status: "Active", Version: 1}
		target := models.PaymentMethod{Code: "NEW", Name: "New", Status: "Active", Version: 1}
		if err := testDB.Create(&oldDefault).Error; err != nil {
			t.Fatalf("create old method: %v", err)
		}
		if err := testDB.Create(&target).Error; err != nil {
			t.Fatalf("create target method: %v", err)
		}
		payload := map[string]json.RawMessage{"id": json.RawMessage(fmt.Sprint(target.ID)), "isDefault": json.RawMessage("true")}
		_, err := SavePaymentMethodFromJSONWithContext(financeTestContext(), payload, nil)
		if err == nil || !strings.Contains(strings.ToLower(err.Error()), "audit_logs") {
			t.Fatalf("expected missing audit_logs error, got %v", err)
		}
		assertDefaultSelectionState(t, testDB, &models.PaymentMethod{}, oldDefault.ID, target.ID)
	})
}

func assertDefaultSelectionState(t *testing.T, testDB *gorm.DB, model any, oldID uint, targetID uint) {
	t.Helper()
	var oldDefault, target struct {
		ID        uint
		IsDefault bool
	}
	if err := testDB.Model(model).Select("id", "is_default").First(&oldDefault, oldID).Error; err != nil {
		t.Fatalf("reload old default: %v", err)
	}
	if err := testDB.Model(model).Select("id", "is_default").First(&target, targetID).Error; err != nil {
		t.Fatalf("reload target default: %v", err)
	}
	if !oldDefault.IsDefault || target.IsDefault {
		t.Fatalf("default selection must roll back: old=%+v target=%+v", oldDefault, target)
	}
}
