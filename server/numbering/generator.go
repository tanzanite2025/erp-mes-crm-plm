package numbering

import (
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func GenerateNextNumberTx(tx *gorm.DB, ruleKey string) (string, error) {
	normalizedRuleKey := strings.TrimSpace(ruleKey)
	if normalizedRuleKey == "" {
		return "", fmt.Errorf("ruleKey is required")
	}

	var rule models.NumberingRule
	if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("rule_key = ?", normalizedRuleKey).First(&rule).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			if strings.HasPrefix(normalizedRuleKey, "CONTRACT_") {
				parts := strings.Split(normalizedRuleKey, "_")
				var prefix string
				if len(parts) >= 2 {
					prefix = parts[1]
				}
				if len(parts) >= 3 {
					prefix += parts[2]
				}

				rule = models.NumberingRule{
					BaseModel:   models.BaseModel{ID: uuid.NewString()},
					RuleKey:     normalizedRuleKey,
					Prefix:      prefix,
					Pattern:     "{PREFIX}{YYMM}{SEQ}",
					CurrentSeq:  0,
					Padding:     4,
					ResetPeriod: "MONTHLY",
				}
				if err := tx.Create(&rule).Error; err != nil {
					return "", err
				}
			} else {
				return "", fmt.Errorf("未找到规则定义 (RuleKey: %s)", normalizedRuleKey)
			}
		} else {
			return "", err
		}
	}

	now := time.Now()
	yymm := now.Format("0601")
	yy := now.Format("06")
	resetTag := "GLOBAL"
	switch rule.ResetPeriod {
	case "MONTHLY":
		resetTag = yymm
	case "YEARLY":
		resetTag = yy
	case "NEVER":
		resetTag = "GLOBAL"
	}

	if rule.ResetPeriod != "NEVER" && rule.LastReset != resetTag {
		rule.CurrentSeq = 0
		rule.LastReset = resetTag
	}

	rule.CurrentSeq++
	if err := tx.Model(&rule).Updates(map[string]interface{}{
		"current_seq": rule.CurrentSeq,
		"last_reset":  rule.LastReset,
	}).Error; err != nil {
		return "", err
	}

	if !strings.Contains(rule.Pattern, "{SEQ}") {
		return "", fmt.Errorf("[CONFIG] 规则 Pattern 定义错误，必须包含 {SEQ} 占位符")
	}

	seqStr := fmt.Sprintf("%0*d", rule.Padding, rule.CurrentSeq)
	result := rule.Pattern
	result = strings.ReplaceAll(result, "{PREFIX}", rule.Prefix)
	result = strings.ReplaceAll(result, "{YYMM}", yymm)
	result = strings.ReplaceAll(result, "{YY}", yy)
	result = strings.ReplaceAll(result, "{SEQ}", seqStr)
	return result, nil
}
