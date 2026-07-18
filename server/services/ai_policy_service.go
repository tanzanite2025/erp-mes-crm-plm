package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const AIPolicyConfigKey = "ai_capability_policy"

var ErrAIPolicyInvalidPayload = errors.New("AI policy payload is invalid")

type AIGatewayConfig struct {
	Provider string `json:"provider"`
	APIKey   string `json:"apiKey"`
	BaseURL  string `json:"baseUrl"`
	Model    string `json:"model"`
	GroupID  string `json:"groupId,omitempty"`
}

type AIPolicy struct {
	Enabled            bool            `json:"enabled"`
	AllowedPermissions []string        `json:"allowedPermissions"`
	AllowedUsers       []string        `json:"allowedUsers,omitempty"`
	API                AIGatewayConfig `json:"api"`
}

type AIRuntimeGatewayConfig struct {
	Provider   string `json:"provider"`
	Model      string `json:"model"`
	Configured bool   `json:"configured"`
}

type AIRuntimePolicy struct {
	Enabled            bool                   `json:"enabled"`
	AllowedPermissions []string               `json:"allowedPermissions"`
	API                AIRuntimeGatewayConfig `json:"api"`
}

func defaultAIGatewayConfig(provider string) AIGatewayConfig {
	normalizedProvider := strings.ToLower(strings.TrimSpace(provider))
	if normalizedProvider == "" {
		normalizedProvider = "gemini"
	}

	switch normalizedProvider {
	case "gemini":
		return AIGatewayConfig{
			Provider: normalizedProvider,
			BaseURL:  "https://generativelanguage.googleapis.com",
			Model:    "gemini-1.5-flash",
		}
	case "openai", "custom":
		return AIGatewayConfig{
			Provider: normalizedProvider,
			BaseURL:  "https://api.openai.com",
			Model:    "gpt-4o-mini",
		}
	default:
		return AIGatewayConfig{Provider: normalizedProvider}
	}
}

func defaultAIPolicy() AIPolicy {
	return AIPolicy{
		Enabled:            true,
		AllowedPermissions: []string{"perm_manage"},
		AllowedUsers:       []string{},
		API:                defaultAIGatewayConfig("gemini"),
	}
}

func normalizeAIPolicyIDs(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	normalized := make([]string, 0, len(values))
	for _, value := range values {
		permissionID := strings.ToLower(strings.TrimSpace(value))
		if permissionID == "" {
			continue
		}
		if _, exists := seen[permissionID]; exists {
			continue
		}
		seen[permissionID] = struct{}{}
		normalized = append(normalized, permissionID)
	}
	return normalized
}

func normalizeAIPolicy(policy AIPolicy) (AIPolicy, error) {
	provider := strings.ToLower(strings.TrimSpace(policy.API.Provider))
	if provider == "" {
		provider = "gemini"
	}
	if provider != "gemini" && provider != "openai" && provider != "custom" {
		return AIPolicy{}, fmt.Errorf("unsupported AI gateway provider %q", provider)
	}

	defaults := defaultAIGatewayConfig(provider)
	policy.AllowedPermissions = normalizeAIPolicyIDs(policy.AllowedPermissions)
	policy.AllowedUsers = normalizeAIPolicyIDs(policy.AllowedUsers)
	policy.API.Provider = provider
	policy.API.APIKey = strings.TrimSpace(policy.API.APIKey)
	policy.API.BaseURL = strings.TrimRight(strings.TrimSpace(policy.API.BaseURL), "/")
	policy.API.Model = strings.TrimSpace(policy.API.Model)
	policy.API.GroupID = strings.TrimSpace(policy.API.GroupID)
	if policy.API.BaseURL == "" {
		policy.API.BaseURL = defaults.BaseURL
	}
	if policy.API.Model == "" {
		policy.API.Model = defaults.Model
	}
	return policy, nil
}

func LoadAIPolicy(database *gorm.DB) (AIPolicy, error) {
	if database == nil {
		return AIPolicy{}, gorm.ErrInvalidDB
	}

	var config models.SystemConfig
	err := database.Where("key = ?", AIPolicyConfigKey).First(&config).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return defaultAIPolicy(), nil
	}
	if err != nil {
		return AIPolicy{}, err
	}
	if strings.TrimSpace(config.Value) == "" {
		return defaultAIPolicy(), nil
	}

	var policy AIPolicy
	if err := json.Unmarshal([]byte(config.Value), &policy); err != nil {
		return AIPolicy{}, err
	}
	return normalizeAIPolicy(policy)
}

func BuildAIRuntimePolicy(policy AIPolicy) AIRuntimePolicy {
	return AIRuntimePolicy{
		Enabled:            policy.Enabled,
		AllowedPermissions: append([]string(nil), policy.AllowedPermissions...),
		API: AIRuntimeGatewayConfig{
			Provider:   policy.API.Provider,
			Model:      policy.API.Model,
			Configured: strings.TrimSpace(policy.API.APIKey) != "",
		},
	}
}

func validateAIPolicyForSave(policy AIPolicy) error {
	for _, permissionID := range policy.AllowedPermissions {
		if (!strings.HasPrefix(permissionID, "page_") && !strings.HasPrefix(permissionID, "tab_")) || !authz.IsSupportedPermissionID(permissionID) {
			return fmt.Errorf("%w: unsupported route permission %s", ErrAIPolicyInvalidPayload, permissionID)
		}
	}

	parsedBaseURL, err := url.Parse(policy.API.BaseURL)
	if err != nil || !strings.EqualFold(parsedBaseURL.Scheme, "https") || strings.TrimSpace(parsedBaseURL.Hostname()) == "" {
		return fmt.Errorf("%w: gateway base URL must use HTTPS", ErrAIPolicyInvalidPayload)
	}
	return nil
}

func SaveAIPolicy(database *gorm.DB, input AIPolicy) (AIPolicy, error) {
	if database == nil {
		return AIPolicy{}, gorm.ErrInvalidDB
	}

	if strings.TrimSpace(input.API.APIKey) == "" {
		currentPolicy, err := LoadAIPolicy(database)
		if err != nil {
			return AIPolicy{}, err
		}
		if strings.TrimSpace(currentPolicy.API.APIKey) != "" &&
			!strings.EqualFold(strings.TrimSpace(currentPolicy.API.Provider), strings.TrimSpace(input.API.Provider)) {
			return AIPolicy{}, fmt.Errorf("%w: a new API key is required when changing provider", ErrAIPolicyInvalidPayload)
		}
		input.API.APIKey = currentPolicy.API.APIKey
	}
	input.AllowedUsers = []string{}

	normalized, err := normalizeAIPolicy(input)
	if err != nil {
		return AIPolicy{}, fmt.Errorf("%w: %v", ErrAIPolicyInvalidPayload, err)
	}
	if err := validateAIPolicyForSave(normalized); err != nil {
		return AIPolicy{}, err
	}

	serialized, err := json.Marshal(normalized)
	if err != nil {
		return AIPolicy{}, err
	}
	config := models.SystemConfig{
		Key:         AIPolicyConfigKey,
		Value:       string(serialized),
		Label:       "AI capability policy",
		Description: "Backend authoritative AI governance policy",
	}
	if err := database.Where("key = ?", AIPolicyConfigKey).
		Assign(map[string]any{
			"value":       config.Value,
			"label":       config.Label,
			"description": config.Description,
		}).
		FirstOrCreate(&config).Error; err != nil {
		return AIPolicy{}, err
	}
	return normalized, nil
}
