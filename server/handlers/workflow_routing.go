package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// GetCommandsHandler 获取指令模板列表
func GetCommandsHandler(c *gin.Context) {
	commands, err := services.ListStandardCommands()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取指令模板列表失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, services.MapStandardCommandsToResponse(commands))
}

// SaveCommandHandler 保存(创建)指令模板
func SaveCommandHandler(c *gin.Context) {
	var input services.StandardCommandRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 指令模板数据格式错误: " + err.Error()})
		return
	}

	command := services.MapStandardCommandRequestToModel(input)
	saved, err := services.CreateStandardCommand(command)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存指令模板失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, services.MapStandardCommandToResponse(saved))
}

// UpdateCommandHandler 更新指令模板
func UpdateCommandHandler(c *gin.Context) {
	id := c.Param("id")
	var input services.StandardCommandRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 指令模板数据格式错误: " + err.Error()})
		return
	}

	command := services.MapStandardCommandRequestToModel(input)
	updated, err := services.UpdateStandardCommand(id, command)
	if err != nil {
		if errors.Is(err, services.ErrStandardCommandNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 指令模板 ID " + id + " 不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新指令模板失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, services.MapStandardCommandToResponse(updated))
}

// DeleteCommandHandler 删除指令模板
func DeleteCommandHandler(c *gin.Context) {
	id := c.Param("id")
	if err := services.DeleteStandardCommand(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除指令模板失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// GetRulesHandler 获取通知规则列表
func GetRulesHandler(c *gin.Context) {
	rules, err := services.ListNotificationRules()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取通知规则列表失败: " + err.Error()})
		return
	}
	response, err := services.MapNotificationRulesToResponse(rules)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 解析通知规则失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// SaveRuleHandler 保存(创建)通知规则
func SaveRuleHandler(c *gin.Context) {
	var input services.NotificationRuleRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 通知规则数据格式错误: " + err.Error()})
		return
	}

	rule, err := services.MapNotificationRuleRequestToModel(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 通知规则数据校验失败: " + err.Error()})
		return
	}
	saved, err := services.CreateNotificationRule(rule)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存通知规则失败: " + err.Error()})
		return
	}
	response, err := services.MapNotificationRuleToResponse(saved)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 解析通知规则失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// UpdateRuleHandler 更新通知规则
func UpdateRuleHandler(c *gin.Context) {
	id := c.Param("id")
	var input services.NotificationRuleRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 通知规则数据格式错误: " + err.Error()})
		return
	}

	rule, err := services.MapNotificationRuleRequestToModel(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 通知规则数据校验失败: " + err.Error()})
		return
	}
	updated, err := services.UpdateNotificationRule(id, rule)
	if err != nil {
		if errors.Is(err, services.ErrNotificationRuleNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 通知规则 ID " + id + " 不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新通知规则失败: " + err.Error()})
		return
	}

	response, err := services.MapNotificationRuleToResponse(updated)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 解析通知规则失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// DeleteRuleHandler 删除通知规则
func DeleteRuleHandler(c *gin.Context) {
	id := c.Param("id")
	if err := services.DeleteNotificationRule(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除通知规则失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
