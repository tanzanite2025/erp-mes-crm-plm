package services

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const CuttingEngineConfigKey = "cutting_engine_config_v1"

type CuttingEngineRuleStrategy struct {
	MustFulfillMode   string `json:"mustFulfillMode"`
	MixingStrategy    string `json:"mixingStrategy"`
	OrderStrategy     string `json:"orderStrategy"`
	DirectionStrategy string `json:"directionStrategy"`
}

type CuttingEngineConfig struct {
	SplitPenaltyWeight           string                    `json:"splitPenaltyWeight"`
	MustFulfillPenaltyWeight     string                    `json:"mustFulfillPenaltyWeight"`
	DirectionSwitchPenaltyWeight string                    `json:"directionSwitchPenaltyWeight"`
	SameDirectionPreferred       bool                      `json:"sameDirectionPreferred"`
	AngleMixMode                 string                    `json:"angleMixMode"`
	RuleStrategy                 CuttingEngineRuleStrategy `json:"ruleStrategy"`
	KnifeGapMm                   string                    `json:"knifeGapMm"`
	EdgeTrimMm                   string                    `json:"edgeTrimMm"`
	MaxSolveDurationSeconds      string                    `json:"maxSolveDurationSeconds"`
	MinSupportedLengthMm         string                    `json:"minSupportedLengthMm"`
	MaxSupportedLengthMm         string                    `json:"maxSupportedLengthMm"`
	FixedDecisionLengthMm        string                    `json:"fixedDecisionLengthMm"`
}

type CuttingEngineConfigInput struct {
	SplitPenaltyWeight           string                    `json:"splitPenaltyWeight"`
	MustFulfillPenaltyWeight     string                    `json:"mustFulfillPenaltyWeight"`
	DirectionSwitchPenaltyWeight string                    `json:"directionSwitchPenaltyWeight"`
	SameDirectionPreferred       *bool                     `json:"sameDirectionPreferred"`
	AngleMixMode                 string                    `json:"angleMixMode"`
	RuleStrategy                 CuttingEngineRuleStrategy `json:"ruleStrategy"`
	KnifeGapMm                   string                    `json:"knifeGapMm"`
	EdgeTrimMm                   string                    `json:"edgeTrimMm"`
	MaxSolveDurationSeconds      string                    `json:"maxSolveDurationSeconds"`
	MinSupportedLengthMm         string                    `json:"minSupportedLengthMm"`
	MaxSupportedLengthMm         string                    `json:"maxSupportedLengthMm"`
	FixedDecisionLengthMm        string                    `json:"fixedDecisionLengthMm"`
}

func DefaultCuttingEngineConfig() CuttingEngineConfig {
	return CuttingEngineConfig{
		SplitPenaltyWeight:           "6",
		MustFulfillPenaltyWeight:     "6000",
		DirectionSwitchPenaltyWeight: "4",
		SameDirectionPreferred:       true,
		AngleMixMode:                 "prefer-same-angle",
		RuleStrategy: CuttingEngineRuleStrategy{
			MustFulfillMode:   "soft-penalty",
			MixingStrategy:    "sameGroupOnly",
			OrderStrategy:     "softPenalty",
			DirectionStrategy: "sameDirectionPreferred",
		},
		KnifeGapMm:              "2.0",
		EdgeTrimMm:              "10.0",
		MaxSolveDurationSeconds: "30",
		MinSupportedLengthMm:    "80.0",
		MaxSupportedLengthMm:    "1200.0",
		FixedDecisionLengthMm:   "91.0",
	}
}

func normalizeCuttingEngineNumberText(value string, fallback string, allowZero bool) string {
	text := strings.TrimSpace(value)
	if text == "" {
		return fallback
	}

	parsed, err := strconv.ParseFloat(text, 64)
	if err != nil {
		return fallback
	}
	if allowZero {
		if parsed < 0 {
			return fallback
		}
	} else if parsed <= 0 {
		return fallback
	}

	return text
}

func cuttingEngineFloatValue(value string) float64 {
	parsed, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
	if err != nil {
		return 0
	}
	return parsed
}

func cuttingEngineTextInRange(value, minValue, maxValue string) bool {
	parsed := cuttingEngineFloatValue(value)
	return parsed >= cuttingEngineFloatValue(minValue) && parsed <= cuttingEngineFloatValue(maxValue)
}

func normalizeCuttingEngineAngleMixMode(value string) string {
	switch strings.TrimSpace(value) {
	case "allow", "prefer-same-angle", "strict-same-angle":
		return strings.TrimSpace(value)
	default:
		return DefaultCuttingEngineConfig().AngleMixMode
	}
}

func normalizeCuttingEngineMustFulfillMode(value string) string {
	switch strings.TrimSpace(value) {
	case "strict", "soft-penalty", "ignore":
		return strings.TrimSpace(value)
	default:
		return DefaultCuttingEngineConfig().RuleStrategy.MustFulfillMode
	}
}

func normalizeCuttingEngineMixingStrategy(value string) string {
	switch strings.TrimSpace(value) {
	case "allow", "sameGroupOnly", "strictNoMix":
		return strings.TrimSpace(value)
	default:
		return DefaultCuttingEngineConfig().RuleStrategy.MixingStrategy
	}
}

func normalizeCuttingEngineOrderStrategy(value string) string {
	switch strings.TrimSpace(value) {
	case "respectOrder", "softPenalty", "ignore":
		return strings.TrimSpace(value)
	default:
		return DefaultCuttingEngineConfig().RuleStrategy.OrderStrategy
	}
}

func normalizeCuttingEngineDirectionStrategy(value string) string {
	switch strings.TrimSpace(value) {
	case "sameDirectionPreferred", "sameDirectionRequired", "allowSwitch":
		return strings.TrimSpace(value)
	default:
		return DefaultCuttingEngineConfig().RuleStrategy.DirectionStrategy
	}
}

func NormalizeCuttingEngineRuleStrategy(input CuttingEngineRuleStrategy) CuttingEngineRuleStrategy {
	return CuttingEngineRuleStrategy{
		MustFulfillMode:   normalizeCuttingEngineMustFulfillMode(input.MustFulfillMode),
		MixingStrategy:    normalizeCuttingEngineMixingStrategy(input.MixingStrategy),
		OrderStrategy:     normalizeCuttingEngineOrderStrategy(input.OrderStrategy),
		DirectionStrategy: normalizeCuttingEngineDirectionStrategy(input.DirectionStrategy),
	}
}

func NormalizeCuttingEngineConfig(input CuttingEngineConfigInput) CuttingEngineConfig {
	defaults := DefaultCuttingEngineConfig()
	sameDirectionPreferred := defaults.SameDirectionPreferred
	if input.SameDirectionPreferred != nil {
		sameDirectionPreferred = *input.SameDirectionPreferred
	}

	minSupportedLengthMm := normalizeCuttingEngineNumberText(
		input.MinSupportedLengthMm,
		defaults.MinSupportedLengthMm,
		false,
	)
	rawMaxSupportedLengthMm := normalizeCuttingEngineNumberText(
		input.MaxSupportedLengthMm,
		defaults.MaxSupportedLengthMm,
		false,
	)
	maxSupportedLengthMm := rawMaxSupportedLengthMm
	if cuttingEngineFloatValue(maxSupportedLengthMm) < cuttingEngineFloatValue(minSupportedLengthMm) {
		maxSupportedLengthMm = minSupportedLengthMm
	}

	rawFixedDecisionLengthMm := normalizeCuttingEngineNumberText(
		input.FixedDecisionLengthMm,
		defaults.FixedDecisionLengthMm,
		false,
	)
	defaultFixedDecisionLengthMm := defaults.FixedDecisionLengthMm
	if !cuttingEngineTextInRange(defaultFixedDecisionLengthMm, minSupportedLengthMm, maxSupportedLengthMm) {
		defaultFixedDecisionLengthMm = minSupportedLengthMm
	}
	fixedDecisionLengthMm := rawFixedDecisionLengthMm
	if !cuttingEngineTextInRange(fixedDecisionLengthMm, minSupportedLengthMm, maxSupportedLengthMm) {
		fixedDecisionLengthMm = defaultFixedDecisionLengthMm
	}

	return CuttingEngineConfig{
		SplitPenaltyWeight: normalizeCuttingEngineNumberText(
			input.SplitPenaltyWeight,
			defaults.SplitPenaltyWeight,
			true,
		),
		MustFulfillPenaltyWeight: normalizeCuttingEngineNumberText(
			input.MustFulfillPenaltyWeight,
			defaults.MustFulfillPenaltyWeight,
			true,
		),
		DirectionSwitchPenaltyWeight: normalizeCuttingEngineNumberText(
			input.DirectionSwitchPenaltyWeight,
			defaults.DirectionSwitchPenaltyWeight,
			true,
		),
		SameDirectionPreferred:  sameDirectionPreferred,
		AngleMixMode:            normalizeCuttingEngineAngleMixMode(input.AngleMixMode),
		RuleStrategy:            NormalizeCuttingEngineRuleStrategy(input.RuleStrategy),
		KnifeGapMm:              normalizeCuttingEngineNumberText(input.KnifeGapMm, defaults.KnifeGapMm, false),
		EdgeTrimMm:              normalizeCuttingEngineNumberText(input.EdgeTrimMm, defaults.EdgeTrimMm, true),
		MaxSolveDurationSeconds: normalizeCuttingEngineNumberText(input.MaxSolveDurationSeconds, defaults.MaxSolveDurationSeconds, false),
		MinSupportedLengthMm:    minSupportedLengthMm,
		MaxSupportedLengthMm:    maxSupportedLengthMm,
		FixedDecisionLengthMm:   fixedDecisionLengthMm,
	}
}

func parseStoredCuttingEngineConfig(raw string) CuttingEngineConfig {
	if strings.TrimSpace(raw) == "" {
		return DefaultCuttingEngineConfig()
	}

	var stored CuttingEngineConfigInput
	if err := json.Unmarshal([]byte(raw), &stored); err != nil {
		return DefaultCuttingEngineConfig()
	}
	return NormalizeCuttingEngineConfig(stored)
}

func LoadCuttingEngineConfig(database *gorm.DB) (CuttingEngineConfig, error) {
	defaults := DefaultCuttingEngineConfig()
	if database == nil {
		return defaults, errors.New("[SERVER] database is required")
	}

	var record models.SystemConfig
	err := database.Where("key = ?", CuttingEngineConfigKey).First(&record).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return defaults, nil
	}
	if err != nil {
		return defaults, err
	}

	return parseStoredCuttingEngineConfig(record.Value), nil
}

func buildCuttingEngineConfigAuditDiff(before *CuttingEngineConfig, payload CuttingEngineConfig) (json.RawMessage, error) {
	diffPayload := map[string]any{
		"before":  nil,
		"payload": payload,
	}
	if before != nil {
		diffPayload["before"] = *before
	}
	return json.Marshal(diffPayload)
}

func SaveCuttingEngineConfig(ctx context.Context, database *gorm.DB, input CuttingEngineConfigInput) (CuttingEngineConfig, error) {
	normalized := NormalizeCuttingEngineConfig(input)
	if database == nil {
		return normalized, errors.New("[SERVER] database is required")
	}

	actor, ok := audit.ActorFromContext(ctx)
	if !ok || strings.TrimSpace(actor.UserID) == "" {
		return normalized, errors.New("[CRITICAL] Identity required for cutting engine config update")
	}

	payload, err := json.Marshal(normalized)
	if err != nil {
		return normalized, err
	}

	err = database.Transaction(func(tx *gorm.DB) error {
		record := models.SystemConfig{
			Key:         CuttingEngineConfigKey,
			Value:       string(payload),
			Label:       "Cutting Engine Config",
			Description: "Persisted cutting engine rule and physical constraint config used by raw material cutting simulation.",
		}

		var existing models.SystemConfig
		err := tx.Where("key = ?", CuttingEngineConfigKey).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := tx.Create(&record).Error; err != nil {
				return err
			}
			diff, err := buildCuttingEngineConfigAuditDiff(nil, normalized)
			if err != nil {
				return err
			}
			return recordLegacyAuditEntryWithContext(ctx, tx, AuditModuleCuttingEngineConfig, CuttingEngineConfigKey, string(audit.AuditActionCreate), diff)
		}
		if err != nil {
			return err
		}

		if strings.TrimSpace(existing.Value) == record.Value {
			return nil
		}

		before := parseStoredCuttingEngineConfig(existing.Value)
		if err := tx.Model(&existing).Updates(map[string]interface{}{
			"value":       record.Value,
			"label":       record.Label,
			"description": record.Description,
		}).Error; err != nil {
			return err
		}

		diff, err := buildCuttingEngineConfigAuditDiff(&before, normalized)
		if err != nil {
			return err
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, AuditModuleCuttingEngineConfig, CuttingEngineConfigKey, string(audit.AuditActionUpdate), diff)
	})

	return normalized, err
}
