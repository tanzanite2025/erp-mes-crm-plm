package numbering

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func GenerateNextNumberTx(tx *gorm.DB, ruleKey string) (string, error) {
	numbers, err := GenerateNumberBatchTx(tx, ruleKey, 1)
	if err != nil {
		return "", err
	}
	return numbers[0], nil
}

func GenerateNumberBatchTx(tx *gorm.DB, ruleKey string, quantity int) ([]string, error) {
	normalizedRuleKey := strings.TrimSpace(ruleKey)
	if normalizedRuleKey == "" {
		return nil, fmt.Errorf("ruleKey is required")
	}
	if quantity <= 0 {
		return nil, fmt.Errorf("quantity must be greater than 0")
	}

	var rule models.NumberingRule
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("rule_key = ?", normalizedRuleKey).First(&rule).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		defaultRule, ok := buildDefaultNumberingRule(normalizedRuleKey)
		if !ok {
			return nil, fmt.Errorf("未找到规则定义 (RuleKey: %s)", normalizedRuleKey)
		}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&defaultRule).Error; err != nil {
			return nil, err
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("rule_key = ?", normalizedRuleKey).First(&rule).Error; err != nil {
			return nil, err
		}
	}
	if !strings.Contains(rule.Pattern, "{SEQ}") {
		return nil, fmt.Errorf("[CONFIG] 规则 Pattern 定义错误，必须包含 {SEQ} 占位符")
	}
	if rule.Padding <= 0 || rule.Padding > 18 {
		return nil, fmt.Errorf("[CONFIG] 规则 Padding 必须在 1 到 18 之间")
	}

	now := time.Now()
	resetTag := resolveResetTag(rule.ResetPeriod, now)

	if rule.ResetPeriod != "NEVER" && rule.LastReset != resetTag {
		rule.CurrentSeq = 0
		rule.LastReset = resetTag
	}

	nextSequence := rule.CurrentSeq + int64(quantity)
	maxSequence := int64(math.Pow10(rule.Padding)) - 1
	if nextSequence > maxSequence {
		return nil, fmt.Errorf("[NUMBERING_EXHAUSTED] 规则 %s 已达到 %d 位流水号上限", normalizedRuleKey, rule.Padding)
	}

	numbers := make([]string, 0, quantity)
	for sequence := rule.CurrentSeq + 1; sequence <= nextSequence; sequence++ {
		numbers = append(numbers, formatNumberingRuleValue(rule, sequence, now))
	}

	if err := tx.Model(&rule).Updates(map[string]interface{}{
		"current_seq": nextSequence,
		"last_reset":  rule.LastReset,
	}).Error; err != nil {
		return nil, err
	}
	return numbers, nil
}

func buildDefaultNumberingRule(ruleKey string) (models.NumberingRule, bool) {
	if ruleKey == "PURCHASE_SUPPLIER" {
		return models.NumberingRule{
			BaseModel:   models.BaseModel{ID: uuid.NewString()},
			RuleKey:     ruleKey,
			Pattern:     "XD-S-{YYYYMMDD}-{SEQ}",
			CurrentSeq:  0,
			Padding:     4,
			ResetPeriod: "DAILY",
		}, true
	}

	if ruleKey == "LINEAR_BARCODE_WHEEL" {
		return models.NumberingRule{
			BaseModel:   models.BaseModel{ID: uuid.NewString()},
			RuleKey:     ruleKey,
			Pattern:     "{SEQ}",
			CurrentSeq:  0,
			Padding:     4,
			ResetPeriod: "MONTHLY",
		}, true
	}

	if !strings.HasPrefix(ruleKey, "CONTRACT_") {
		return models.NumberingRule{}, false
	}

	parts := strings.Split(ruleKey, "_")
	var prefix string
	if len(parts) >= 2 {
		prefix = parts[1]
	}
	if len(parts) >= 3 {
		prefix += parts[2]
	}
	return models.NumberingRule{
		BaseModel:   models.BaseModel{ID: uuid.NewString()},
		RuleKey:     ruleKey,
		Prefix:      prefix,
		Pattern:     "{PREFIX}{YYMM}{SEQ}",
		CurrentSeq:  0,
		Padding:     4,
		ResetPeriod: "MONTHLY",
	}, true
}

func resolveResetTag(resetPeriod string, now time.Time) string {
	switch resetPeriod {
	case "DAILY":
		return now.Format("20060102")
	case "MONTHLY":
		return now.Format("0601")
	case "YEARLY":
		return now.Format("06")
	default:
		return "GLOBAL"
	}
}

func formatNumberingRuleValue(rule models.NumberingRule, sequence int64, now time.Time) string {
	seqStr := fmt.Sprintf("%0*d", rule.Padding, sequence)
	result := rule.Pattern
	result = strings.ReplaceAll(result, "{PREFIX}", rule.Prefix)
	result = strings.ReplaceAll(result, "{YYYYMMDD}", now.Format("20060102"))
	result = strings.ReplaceAll(result, "{YYMM}", now.Format("0601"))
	result = strings.ReplaceAll(result, "{YY}", now.Format("06"))
	result = strings.ReplaceAll(result, "{SEQ}", seqStr)
	return result
}
