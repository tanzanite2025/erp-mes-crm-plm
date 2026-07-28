package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"xdfc-server/audit"
	appdb "xdfc-server/db"
	"xdfc-server/models"
)

func prepareExchangeRateSyncTest(t *testing.T, withAuditLog bool) (*httptest.Server, models.Currency) {
	t.Helper()

	testDB := openFinanceTransactionTestDB(t, withAuditLog)
	if err := testDB.AutoMigrate(&models.SystemConfig{}); err != nil {
		t.Fatalf("migrate exchange rate config: %v", err)
	}
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	base := models.Currency{Code: "CNY", Name: "Renminbi", Symbol: "CNY", Rate: 1, Precision: 2, IsBase: true, Status: "Active"}
	foreign := models.Currency{Code: "USD", Name: "US Dollar", Symbol: "$", Rate: 7.2, Precision: 2, Status: "Active"}
	if err := testDB.Create(&base).Error; err != nil {
		t.Fatalf("create base currency: %v", err)
	}
	if err := testDB.Create(&foreign).Error; err != nil {
		t.Fatalf("create foreign currency: %v", err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"result":"success","base_code":"CNY","conversion_rates":{"USD":0.125}}`))
	}))
	t.Cleanup(server.Close)

	config := ExchangeRateSyncConfig{
		Enabled: true,
		Providers: []ExchangeRateSyncProviderConfig{{
			ID:                 "test-provider",
			Provider:           defaultExchangeRateProvider,
			Enabled:            true,
			Priority:           1,
			APIBaseURL:         server.URL,
			APIKey:             "test-key",
			LatestPathTemplate: "/latest/{baseCode}?key={apiKey}",
		}},
	}
	payload, err := json.Marshal(config)
	if err != nil {
		t.Fatalf("encode exchange rate config: %v", err)
	}
	if err := testDB.Create(&models.SystemConfig{Key: exchangeRateSyncConfigConfigKey, Value: string(payload)}).Error; err != nil {
		t.Fatalf("create exchange rate config: %v", err)
	}

	return server, foreign
}

func TestLoadLegacyExchangeRateSyncConfigDefaultsDisabledWithoutAPIKey(t *testing.T) {
	t.Setenv("EXCHANGERATE_API_KEY", "")

	testDB := openFinanceTransactionTestDB(t, false)
	if err := testDB.AutoMigrate(&models.SystemConfig{}); err != nil {
		t.Fatalf("migrate exchange rate config: %v", err)
	}

	config, err := loadLegacyExchangeRateSyncConfig(testDB)
	if err != nil {
		t.Fatalf("load legacy exchange rate config: %v", err)
	}
	if config.Enabled {
		t.Fatal("expected exchange rate sync to default to disabled without an API key")
	}
	if len(config.Providers) != 1 || config.Providers[0].APIKey != "" {
		t.Fatalf("expected one provider without an API key, got %+v", config.Providers)
	}
}

func TestSyncExchangeRatesWithContextPreservesActorAndAuditsEachRate(t *testing.T) {
	_, foreign := prepareExchangeRateSyncTest(t, true)
	ctx := audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "manual-user-id",
		Username: "manual-user",
		IP:       "192.0.2.10",
		Source:   "http",
	})

	count, err := SyncExchangeRatesWithContext(ctx)
	if err != nil {
		t.Fatalf("sync exchange rates: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one updated currency, got %d", count)
	}

	var updated models.Currency
	if err := appdb.DB.First(&updated, foreign.ID).Error; err != nil {
		t.Fatalf("reload currency: %v", err)
	}
	if updated.Rate != 8 {
		t.Fatalf("expected normalized rate 8, got %v", updated.Rate)
	}

	var logs []models.AuditLog
	if err := appdb.DB.Where("module = ? AND target_id = ?", AuditModuleCurrency, fmt.Sprint(foreign.ID)).Find(&logs).Error; err != nil {
		t.Fatalf("load rate audit logs: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected one per-currency audit log, got %d", len(logs))
	}
	if logs[0].Action != "UPDATE" || logs[0].Operator != "manual-user" || logs[0].IP != "192.0.2.10" {
		t.Fatalf("manual actor was not preserved: %+v", logs[0])
	}
}

func TestSyncExchangeRatesWithContextRecordsExplicitSystemActor(t *testing.T) {
	_, foreign := prepareExchangeRateSyncTest(t, true)
	ctx := audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "system",
		Username: "system",
		Source:   "cron",
	})

	if _, err := SyncExchangeRatesWithContext(ctx); err != nil {
		t.Fatalf("sync exchange rates as system: %v", err)
	}

	var log models.AuditLog
	if err := appdb.DB.Where("module = ? AND target_id = ?", AuditModuleCurrency, fmt.Sprint(foreign.ID)).First(&log).Error; err != nil {
		t.Fatalf("load system rate audit log: %v", err)
	}
	if log.Operator != "system" || log.IP != "system" {
		t.Fatalf("unexpected system actor: %+v", log)
	}
}

func TestSyncExchangeRatesRollsBackRateWhenAuditWriteFails(t *testing.T) {
	_, foreign := prepareExchangeRateSyncTest(t, false)

	_, err := SyncExchangeRatesWithContext(financeTestContext())
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "audit_logs") {
		t.Fatalf("expected missing audit_logs error, got %v", err)
	}

	var unchanged models.Currency
	if err := appdb.DB.First(&unchanged, foreign.ID).Error; err != nil {
		t.Fatalf("reload rolled-back currency: %v", err)
	}
	if unchanged.Rate != foreign.Rate {
		t.Fatalf("currency rate must roll back with audit failure: before=%v after=%v", foreign.Rate, unchanged.Rate)
	}
}
