package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/url"
	"os"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	AIPolicyConfigKey             = "ai_capability_policy"
	AIGatewaySecretConfigKey      = "ai_capability_gateway_secret"
	AISecretEncryptionKeyEnv      = "AI_SECRET_ENCRYPTION_KEY"
	aiGatewaySecretRecordVersion  = "v1"
	aiGatewaySecretConfigLabel    = "AI gateway API key secret"
	aiGatewaySecretConfigDescribe = "Encrypted backend-only API key for the configured AI gateway provider."
	maxAIPolicyPermissionCount    = 500
	maxAIGatewayAPIKeyLength      = 8 * 1024
	maxAIGatewayBaseURLLength     = 512
	maxAIGatewayModelLength       = 160
	maxAIGatewayGroupIDLength     = 160
)

var ErrAIPolicyInvalidPayload = errors.New("AI policy payload is invalid")
var ErrAISecretEncryptionKeyMissing = errors.New("AI secret encryption key is not configured")

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
	API                AIGatewayConfig `json:"api"`
}

type AIGatewaySecretRecord struct {
	Version    string `json:"version"`
	Provider   string `json:"provider"`
	Ciphertext string `json:"ciphertext"`
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
		Enabled:            false,
		AllowedPermissions: []string{},
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

func resolveAISecretEncryptionKey() ([]byte, error) {
	secretSeed := strings.TrimSpace(os.Getenv(AISecretEncryptionKeyEnv))
	if secretSeed == "" {
		secretSeed = strings.TrimSpace(os.Getenv("JWT_SECRET"))
	}
	if secretSeed == "" {
		return nil, ErrAISecretEncryptionKeyMissing
	}

	sum := sha256.Sum256([]byte(secretSeed))
	return sum[:], nil
}

func encryptAISecret(plaintext string) (string, error) {
	key, err := resolveAISecretEncryptionKey()
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	sealed := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(sealed), nil
}

func decryptAISecret(ciphertext string) (string, error) {
	key, err := resolveAISecretEncryptionKey()
	if err != nil {
		return "", err
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(ciphertext))
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := gcm.NonceSize()
	if len(raw) <= nonceSize {
		return "", fmt.Errorf("AI gateway secret ciphertext is malformed")
	}
	nonce := raw[:nonceSize]
	sealed := raw[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, sealed, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

func loadAIGatewaySecretRecord(database *gorm.DB) (AIGatewaySecretRecord, bool, error) {
	var config models.SystemConfig
	err := database.Where("key = ?", AIGatewaySecretConfigKey).First(&config).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return AIGatewaySecretRecord{}, false, nil
	}
	if err != nil {
		return AIGatewaySecretRecord{}, false, err
	}
	if strings.TrimSpace(config.Value) == "" {
		return AIGatewaySecretRecord{}, false, nil
	}

	var record AIGatewaySecretRecord
	if err := json.Unmarshal([]byte(config.Value), &record); err != nil {
		return AIGatewaySecretRecord{}, false, err
	}
	record.Version = strings.TrimSpace(record.Version)
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.Ciphertext = strings.TrimSpace(record.Ciphertext)
	if record.Version == "" || record.Provider == "" || record.Ciphertext == "" {
		return AIGatewaySecretRecord{}, false, nil
	}
	return record, true, nil
}

func buildAIGatewaySecretRecord(provider string, apiKey string) (AIGatewaySecretRecord, error) {
	ciphertext, err := encryptAISecret(apiKey)
	if err != nil {
		return AIGatewaySecretRecord{}, err
	}
	return AIGatewaySecretRecord{
		Version:    aiGatewaySecretRecordVersion,
		Provider:   strings.ToLower(strings.TrimSpace(provider)),
		Ciphertext: ciphertext,
	}, nil
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
	normalized, err := normalizeAIPolicy(policy)
	if err != nil {
		return AIPolicy{}, err
	}

	secretRecord, exists, err := loadAIGatewaySecretRecord(database)
	if err != nil {
		return AIPolicy{}, err
	}
	if exists && strings.EqualFold(secretRecord.Provider, normalized.API.Provider) {
		decrypted, err := decryptAISecret(secretRecord.Ciphertext)
		if err != nil {
			log.Printf("[AI_POLICY][WARN] failed to decrypt gateway secret: %v", err)
		} else {
			normalized.API.APIKey = strings.TrimSpace(decrypted)
		}
	}
	return normalized, nil
}

func BuildAIRuntimePolicy(policy AIPolicy) AIRuntimePolicy {
	return AIRuntimePolicy{
		Enabled:            policy.Enabled,
		AllowedPermissions: cloneAIPolicyAllowedPermissions(policy.AllowedPermissions),
		API: AIRuntimeGatewayConfig{
			Provider:   policy.API.Provider,
			Model:      policy.API.Model,
			Configured: strings.TrimSpace(policy.API.APIKey) != "",
		},
	}
}

func cloneAIPolicyAllowedPermissions(values []string) []string {
	if len(values) == 0 {
		return []string{}
	}
	return append([]string{}, values...)
}

func validateAIPolicyForSave(policy AIPolicy) error {
	if len(policy.AllowedPermissions) > maxAIPolicyPermissionCount {
		return fmt.Errorf("%w: too many AI route permissions", ErrAIPolicyInvalidPayload)
	}
	for _, permissionID := range policy.AllowedPermissions {
		if (!strings.HasPrefix(permissionID, "page_") && !strings.HasPrefix(permissionID, "tab_")) || !authz.IsSupportedPermissionID(permissionID) {
			return fmt.Errorf("%w: unsupported route permission %s", ErrAIPolicyInvalidPayload, permissionID)
		}
	}

	if len(policy.API.APIKey) > maxAIGatewayAPIKeyLength {
		return fmt.Errorf("%w: gateway API key is too long", ErrAIPolicyInvalidPayload)
	}
	if len(policy.API.BaseURL) > maxAIGatewayBaseURLLength {
		return fmt.Errorf("%w: gateway base URL is too long", ErrAIPolicyInvalidPayload)
	}
	if len(policy.API.Model) > maxAIGatewayModelLength {
		return fmt.Errorf("%w: gateway model is too long", ErrAIPolicyInvalidPayload)
	}
	if len(policy.API.GroupID) > maxAIGatewayGroupIDLength {
		return fmt.Errorf("%w: gateway group ID is too long", ErrAIPolicyInvalidPayload)
	}

	parsedBaseURL, err := url.Parse(policy.API.BaseURL)
	if err != nil || !strings.EqualFold(parsedBaseURL.Scheme, "https") || strings.TrimSpace(parsedBaseURL.Hostname()) == "" {
		return fmt.Errorf("%w: gateway base URL must use HTTPS", ErrAIPolicyInvalidPayload)
	}
	if parsedBaseURL.User != nil || parsedBaseURL.RawQuery != "" || parsedBaseURL.Fragment != "" {
		return fmt.Errorf("%w: gateway base URL must not include credentials, query, or fragment", ErrAIPolicyInvalidPayload)
	}
	if parsedBaseURL.Port() != "" && parsedBaseURL.Port() != "443" {
		return fmt.Errorf("%w: gateway base URL port must be 443", ErrAIPolicyInvalidPayload)
	}
	if isMiniMaxGatewayBaseURL(policy.API.BaseURL) && policy.API.GroupID == "" {
		return fmt.Errorf("%w: MiniMax gateway group ID is required", ErrAIPolicyInvalidPayload)
	}
	return nil
}

func isMiniMaxGatewayBaseURL(baseURL string) bool {
	normalized := strings.ToLower(strings.TrimSpace(baseURL))
	return strings.Contains(normalized, "minimaxi.com") || strings.Contains(normalized, "minimax.io")
}

func SaveAIPolicy(database *gorm.DB, input AIPolicy) (AIPolicy, error) {
	if database == nil {
		return AIPolicy{}, gorm.ErrInvalidDB
	}

	normalized, err := normalizeAIPolicy(input)
	if err != nil {
		return AIPolicy{}, fmt.Errorf("%w: %v", ErrAIPolicyInvalidPayload, err)
	}
	if err := validateAIPolicyForSave(normalized); err != nil {
		return AIPolicy{}, err
	}

	currentPolicy, err := LoadAIPolicy(database)
	if err != nil {
		return AIPolicy{}, err
	}
	secretRecord, secretExists, err := loadAIGatewaySecretRecord(database)
	if err != nil {
		return AIPolicy{}, err
	}

	apiKeyToPersist := strings.TrimSpace(input.API.APIKey)
	if apiKeyToPersist == "" {
		if strings.TrimSpace(currentPolicy.API.APIKey) != "" &&
			!strings.EqualFold(strings.TrimSpace(currentPolicy.API.Provider), normalized.API.Provider) {
			return AIPolicy{}, fmt.Errorf("%w: a new API key is required when changing provider", ErrAIPolicyInvalidPayload)
		}
		if secretExists && !strings.EqualFold(secretRecord.Provider, normalized.API.Provider) {
			return AIPolicy{}, fmt.Errorf("%w: a new API key is required when changing provider", ErrAIPolicyInvalidPayload)
		}
		apiKeyToPersist = strings.TrimSpace(currentPolicy.API.APIKey)
	}

	policyToPersist := normalized
	policyToPersist.API.APIKey = ""
	serialized, err := json.Marshal(policyToPersist)
	if err != nil {
		return AIPolicy{}, err
	}

	if err := database.Transaction(func(tx *gorm.DB) error {
		if err := upsertSystemConfigRecord(
			tx,
			AIPolicyConfigKey,
			string(serialized),
			"AI capability policy",
			"Backend authoritative AI governance policy",
		); err != nil {
			return err
		}

		if apiKeyToPersist == "" {
			return nil
		}
		secretRecord, err := buildAIGatewaySecretRecord(normalized.API.Provider, apiKeyToPersist)
		if err != nil {
			return err
		}
		secretPayload, err := json.Marshal(secretRecord)
		if err != nil {
			return err
		}
		return upsertSystemConfigRecord(
			tx,
			AIGatewaySecretConfigKey,
			string(secretPayload),
			aiGatewaySecretConfigLabel,
			aiGatewaySecretConfigDescribe,
		)
	}); err != nil {
		return AIPolicy{}, err
	}
	return normalized, nil
}
