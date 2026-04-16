package handlers

import (
	"net/http"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/numbering"

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
		generated, err := numbering.GenerateNextNumberTx(tx, ruleKey)
		if err != nil {
			return err
		}
		result = generated
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 生成单号失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"number":  result,
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
