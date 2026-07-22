package services

import (
	"errors"
	"strings"
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func openAIPolicyTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open ai policy test db: %v", err)
	}
	if err := database.AutoMigrate(&models.SystemConfig{}); err != nil {
		t.Fatalf("migrate system configs: %v", err)
	}
	return database
}

func testAIPolicyWithKey(apiKey string) AIPolicy {
	return AIPolicy{
		Enabled:            true,
		AllowedPermissions: []string{},
		API: AIGatewayConfig{
			Provider: "gemini",
			APIKey:   apiKey,
			BaseURL:  "https://generativelanguage.googleapis.com",
			Model:    "gemini-1.5-flash",
		},
	}
}

func TestSaveAIPolicyStoresAPIKeyAsEncryptedBackendSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-jwt-secret-for-ai-secret-encryption")
	database := openAIPolicyTestDB(t)

	if _, err := SaveAIPolicy(database, testAIPolicyWithKey("test-ai-key")); err != nil {
		t.Fatalf("save ai policy: %v", err)
	}

	var policyConfig models.SystemConfig
	if err := database.First(&policyConfig, "key = ?", AIPolicyConfigKey).Error; err != nil {
		t.Fatalf("load ai policy config: %v", err)
	}
	if strings.Contains(policyConfig.Value, "test-ai-key") {
		t.Fatalf("policy config leaked plaintext API key: %s", policyConfig.Value)
	}

	var secretConfig models.SystemConfig
	if err := database.First(&secretConfig, "key = ?", AIGatewaySecretConfigKey).Error; err != nil {
		t.Fatalf("load ai gateway secret config: %v", err)
	}
	if strings.Contains(secretConfig.Value, "test-ai-key") {
		t.Fatalf("secret config leaked plaintext API key: %s", secretConfig.Value)
	}

	loaded, err := LoadAIPolicy(database)
	if err != nil {
		t.Fatalf("load ai policy: %v", err)
	}
	if loaded.API.APIKey != "test-ai-key" {
		t.Fatalf("expected decrypted API key, got %q", loaded.API.APIKey)
	}
	if !BuildAIRuntimePolicy(loaded).API.Configured {
		t.Fatal("expected runtime policy to report configured gateway")
	}
}

func TestSaveAIPolicyRejectsProviderChangeWithoutNewAPIKey(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-jwt-secret-for-ai-secret-encryption")
	database := openAIPolicyTestDB(t)

	if _, err := SaveAIPolicy(database, testAIPolicyWithKey("test-ai-key")); err != nil {
		t.Fatalf("save ai policy: %v", err)
	}

	nextPolicy := AIPolicy{
		Enabled:            true,
		AllowedPermissions: []string{},
		API: AIGatewayConfig{
			Provider: "openai",
			BaseURL:  "https://api.openai.com",
			Model:    "gpt-4o-mini",
		},
	}
	_, err := SaveAIPolicy(database, nextPolicy)
	if !errors.Is(err, ErrAIPolicyInvalidPayload) {
		t.Fatalf("expected invalid payload for provider change without key, got %v", err)
	}
}
