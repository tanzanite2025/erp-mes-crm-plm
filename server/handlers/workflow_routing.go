package handlers

import (
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

// --- 指令模板 (StandardCommand) ---

// GetCommandsHandler 获取指令模板列表
func GetCommandsHandler(c *gin.Context) {
	var commands []models.StandardCommand
	if err := db.DB.Order("created_at desc").Find(&commands).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取指令模板列表失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, commands)
}

// SaveCommandHandler 保存(创建)指令模板
func SaveCommandHandler(c *gin.Context) {
	var input models.StandardCommand
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 指令模板数据格式错误: " + err.Error()})
		return
	}

	if err := db.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存指令模板失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, input)
}

// UpdateCommandHandler 更新指令模板
func UpdateCommandHandler(c *gin.Context) {
	id := c.Param("id")
	var input models.StandardCommand
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 指令模板数据格式错误: " + err.Error()})
		return
	}

	var existing models.StandardCommand
	if err := db.DB.Where("id = ?", id).First(&existing).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 指令模板 ID " + id + " 不存在"})
		return
	}

	if err := db.DB.Model(&existing).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新指令模板失败: " + err.Error()})
		return
	}

	db.DB.First(&existing, "id = ?", id)
	c.JSON(http.StatusOK, existing)
}

// DeleteCommandHandler 删除指令模板
func DeleteCommandHandler(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where("id = ?", id).Delete(&models.StandardCommand{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除指令模板失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// --- 通知规则 (NotificationRule) ---

// GetRulesHandler 获取通知规则列表
func GetRulesHandler(c *gin.Context) {
	var rules []models.NotificationRule
	if err := db.DB.Order("created_at desc").Find(&rules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取通知规则列表失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, rules)
}

// SaveRuleHandler 保存(创建)通知规则
func SaveRuleHandler(c *gin.Context) {
	var input models.NotificationRule
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 通知规则数据格式错误: " + err.Error()})
		return
	}

	if err := db.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存通知规则失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, input)
}

// UpdateRuleHandler 更新通知规则
func UpdateRuleHandler(c *gin.Context) {
	id := c.Param("id")
	var input models.NotificationRule
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 通知规则数据格式错误: " + err.Error()})
		return
	}

	var existing models.NotificationRule
	if err := db.DB.Where("id = ?", id).First(&existing).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 通知规则 ID " + id + " 不存在"})
		return
	}

	if err := db.DB.Model(&existing).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新通知规则失败: " + err.Error()})
		return
	}

	db.DB.First(&existing, "id = ?", id)
	c.JSON(http.StatusOK, existing)
}

// DeleteRuleHandler 删除通知规则
func DeleteRuleHandler(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where("id = ?", id).Delete(&models.NotificationRule{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除通知规则失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
