package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GenerateNextNumberHandler 生成下一个业务序列号
func GenerateNextNumberHandler(c *gin.Context) {
	ruleKey := c.Query("ruleKey")
	if ruleKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 缺少 ruleKey 参数"})
		return
	}

	var result string
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var rule models.NumberingRule
		// 1. 获取规则并加上行锁
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("rule_key = ?", ruleKey).First(&rule).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				// 自动初始化逻辑 (加固: 仅针对特定前缀，且此处应记录审计)
				if strings.HasPrefix(ruleKey, "CONTRACT_") {
					parts := strings.Split(ruleKey, "_")
					var prefix string
					if len(parts) >= 2 { prefix = parts[1] }
					if len(parts) >= 3 { prefix += parts[2] }
					
					rule = models.NumberingRule{
						RuleKey:     ruleKey,
						Prefix:      prefix,
						Pattern:     "{PREFIX}{YYMM}{SEQ}",
						CurrentSeq:  0,
						Padding:     4,
						ResetPeriod: "MONTHLY",
					}
					if err := tx.Create(&rule).Error; err != nil { return err }
				} else {
					return fmt.Errorf("未找到规则定义 (RuleKey: %s)", ruleKey)
				}
			} else {
				return err
			}
		}

		// 2. 周期重置逻辑
		now := time.Now()
		var resetTag string
		yymm := now.Format("0601") // YYMM
		yy := now.Format("06")     // YY
		
		switch rule.ResetPeriod {
		case "MONTHLY":
			resetTag = yymm
		case "YEARLY":
			resetTag = yy
		default:
			resetTag = "GLOBAL"
		}

		if rule.ResetPeriod != "NEVER" && rule.LastReset != resetTag {
			rule.CurrentSeq = 0
			rule.LastReset = resetTag
		}

		// 3. 递增并按需更新，防止并发时意外覆盖核心配置
		rule.CurrentSeq++
		if err := tx.Model(&rule).Updates(map[string]interface{}{
			"current_seq": rule.CurrentSeq,
			"last_reset":  rule.LastReset,
		}).Error; err != nil {
			return err
		}

		// 4. 字符串格式化渲染
		seqStr := fmt.Sprintf("%0*d", rule.Padding, rule.CurrentSeq)
		
		// 校验 Pattern
		if !strings.Contains(rule.Pattern, "{SEQ}") {
			return fmt.Errorf("[CONFIG] 规则 Pattern 定义错误，必须包含 {SEQ} 占位符")
		}

		res := rule.Pattern
		res = strings.ReplaceAll(res, "{PREFIX}", rule.Prefix)
		res = strings.ReplaceAll(res, "{YYMM}", yymm)
		res = strings.ReplaceAll(res, "{YY}", yy)
		res = strings.ReplaceAll(res, "{SEQ}", seqStr)
		
		result = res

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 生成单号失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"number": result,
		"ruleKey": ruleKey,
	})
}

// GetNumberingRulesHandler 获取所有规则
func GetNumberingRulesHandler(c *gin.Context) {
	var rules []models.NumberingRule
	if err := db.DB.Order("rule_key asc").Find(&rules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取规则失败"})
		return
	}
	c.JSON(http.StatusOK, rules)
}

// SaveNumberingRuleHandler 保存/更新规则 (管理员权限)
func SaveNumberingRuleHandler(c *gin.Context) {
	var input models.NumberingRule
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "输入格式错误"})
		return
	}

	// 强制校验 Pattern
	if !strings.Contains(input.Pattern, "{SEQ}") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pattern 必须包含 {SEQ} 占位符"})
		return
	}

	if input.ID != "" {
		if err := db.DB.Model(&models.NumberingRule{}).Where("id = ?", input.ID).Updates(input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
			return
		}
	} else {
		if err := db.DB.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建失败"})
			return
		}
	}

	c.JSON(http.StatusOK, input)
}
