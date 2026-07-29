package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetRuleExecutionLogsHandler(c *gin.Context) {
	page, pageSize := parsePageAndSize(c, 1, 20)
	query := services.RuleExecutionLogListQuery{
		Page:            page,
		PageSize:        pageSize,
		EventKey:        strings.TrimSpace(c.Query("eventKey")),
		Entity:          strings.TrimSpace(c.Query("entity")),
		SourceCode:      strings.TrimSpace(c.Query("sourceCode")),
		ActionCode:      strings.TrimSpace(c.Query("actionCode")),
		StatusCode:      strings.TrimSpace(c.Query("statusCode")),
		RuleID:          strings.TrimSpace(c.Query("ruleId")),
		SegmentID:       strings.TrimSpace(c.Query("segmentId")),
		ExecutionType:   strings.TrimSpace(c.Query("executionType")),
		ExecutionStatus: strings.TrimSpace(c.Query("executionStatus")),
	}

	items, total, err := services.ListRuleExecutionLogs(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取规则执行日志失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, services.RuleExecutionLogListResponse{
		Items:    services.MapRuleExecutionLogsToResponse(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

func SaveRuleExecutionLogHandler(c *gin.Context) {
	var input services.RuleExecutionLogRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 规则执行日志数据格式错误: " + err.Error()})
		return
	}

	logEntry, err := services.MapRuleExecutionLogRequestToModel(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 规则执行日志数据校验失败: " + err.Error()})
		return
	}

	saved, err := services.CreateRuleExecutionLog(logEntry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存规则执行日志失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, services.MapRuleExecutionLogToResponse(saved))
}

func RetryRuleExecutionNotificationLogHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	retried, err := services.RetryRuleExecutionNotificationLog(id)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrRuleExecutionLogNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 规则执行日志不存在"})
		case errors.Is(err, services.ErrRuleExecutionLogNotRetryable):
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] 只有失败的通知执行日志可以重试"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 重试通知失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, services.MapRuleExecutionLogToResponse(retried))
}
