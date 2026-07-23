package services

import (
	"context"
	"testing"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func openCuttingEngineConfigTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open cutting engine config test db: %v", err)
	}
	if err := database.AutoMigrate(&models.SystemConfig{}, &models.AuditLog{}); err != nil {
		t.Fatalf("migrate cutting engine config test db: %v", err)
	}
	return database
}

func cuttingEngineConfigTestContext() context.Context {
	return audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "test-user-id",
		Username: "test-user",
		IP:       "127.0.0.1",
		Source:   "http",
	})
}

func TestLoadCuttingEngineConfigReturnsDefaultsWhenMissing(t *testing.T) {
	database := openCuttingEngineConfigTestDB(t)

	config, err := LoadCuttingEngineConfig(database)
	if err != nil {
		t.Fatalf("load default cutting engine config: %v", err)
	}
	if config != DefaultCuttingEngineConfig() {
		t.Fatalf("expected default config, got %+v", config)
	}
}

func TestSaveCuttingEngineConfigPersistsNormalizedConfigAndAuditLog(t *testing.T) {
	database := openCuttingEngineConfigTestDB(t)

	saved, err := SaveCuttingEngineConfig(cuttingEngineConfigTestContext(), database, CuttingEngineConfigInput{
		SplitPenaltyWeight:       "0",
		MustFulfillPenaltyWeight: "not-a-number",
		MinSupportedLengthMm:     "150",
		MaxSupportedLengthMm:     "120",
		FixedDecisionLengthMm:    "91",
	})
	if err != nil {
		t.Fatalf("save cutting engine config: %v", err)
	}
	if saved.SplitPenaltyWeight != "0" {
		t.Fatalf("expected zero split penalty to be preserved, got %q", saved.SplitPenaltyWeight)
	}
	if saved.MustFulfillPenaltyWeight != DefaultCuttingEngineConfig().MustFulfillPenaltyWeight {
		t.Fatalf("expected invalid penalty to fall back, got %q", saved.MustFulfillPenaltyWeight)
	}
	if saved.MaxSupportedLengthMm != "150" || saved.FixedDecisionLengthMm != "150" {
		t.Fatalf("length boundaries should be normalized, got max=%q fixed=%q", saved.MaxSupportedLengthMm, saved.FixedDecisionLengthMm)
	}

	loaded, err := LoadCuttingEngineConfig(database)
	if err != nil {
		t.Fatalf("load saved cutting engine config: %v", err)
	}
	if loaded != saved {
		t.Fatalf("loaded config mismatch: loaded=%+v saved=%+v", loaded, saved)
	}

	var logs []models.AuditLog
	if err := database.Where("module = ? AND target_id = ?", AuditModuleCuttingEngineConfig, CuttingEngineConfigKey).Find(&logs).Error; err != nil {
		t.Fatalf("load cutting engine config audit logs: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected one audit log, got %d", len(logs))
	}
	if logs[0].Operator != "test-user" || logs[0].IP != "127.0.0.1" {
		t.Fatalf("audit actor not preserved: %+v", logs[0])
	}
}
