package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func ListCurrentAccountSystemNotificationInboxHandler(c *gin.Context) {
	limit := 30
	if raw := c.Query("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "通知分页参数无效"})
			return
		}
		limit = parsed
	}
	permissions, _ := c.Get("permissions")
	response, err := services.ListSystemNotificationInboxForAccount(c.Request.Context(), db.DB, services.SystemNotificationInboxListQuery{
		RecipientUserID: middleware.GetSafeUserID(c), PermissionIDs: normalizePermissionContext(permissions),
		Scope: c.DefaultQuery("scope", "active"), Cursor: c.Query("cursor"), Limit: limit,
	})
	if err != nil {
		respondSystemNotificationInboxError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func UpdateCurrentAccountSystemNotificationInboxStateHandler(c *gin.Context) {
	var input struct {
		IDs    []string `json:"ids" binding:"required,min=1,max=100"`
		Action string   `json:"action" binding:"required,oneof=read archive"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请选择有效通知和阅读或归档操作"})
		return
	}
	permissions, _ := c.Get("permissions")
	err := services.UpdateSystemNotificationInboxAccountState(c.Request.Context(), db.DB, middleware.GetSafeUserID(c), normalizePermissionContext(permissions), input.IDs, input.Action)
	if err != nil {
		respondSystemNotificationInboxError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func respondSystemNotificationInboxError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrSystemNotificationInboxInputInvalid):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrSystemNotificationInboxEntryNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "通知数据暂时不可用，请稍后重试"})
	}
}

func GetSystemNotificationDeliveryQueueDiagnosticsHandler(c *gin.Context) {
	response, err := services.GetSystemNotificationDeliveryQueueDiagnostics(c.Request.Context(), db.DB)
	if err != nil {
		respondSystemNotificationInboxError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func RetrySystemNotificationDeliveryQueueTaskHandler(c *gin.Context) {
	err := services.RetryOriginalSystemNotificationDeliveryQueueTask(auditContextFromGin(c), db.DB, c.Param("id"))
	if errors.Is(err, services.ErrRuleExecutionLogNotRetryable) {
		c.JSON(http.StatusConflict, gin.H{"error": "投递任务已完成、已失效或无需重试"})
		return
	}
	if err != nil {
		respondSystemNotificationInboxError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
