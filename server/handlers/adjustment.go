package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// SubmitAdjustmentApprovalHandler 提交盘点调账审批
func SubmitAdjustmentApprovalHandler(c *gin.Context) {
	taskID := c.Param("taskId")
	err := services.SubmitAdjustmentApproval(taskID, middleware.GetSafeUsername(c))
	if err != nil {
		switch {
		case errors.Is(err, services.ErrStocktakeTaskNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "盘点任务不存在"})
		case errors.Is(err, services.ErrAdjustmentTaskInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{"error": "该盘点任务当前状态不支持调账提报"})
		case errors.Is(err, services.ErrAdjustmentPendingExists):
			c.JSON(http.StatusBadRequest, gin.H{"error": "该任务已存在待处理的调账申请，请勿重复操作"})
		case errors.Is(err, services.ErrAdjustmentApprovalConfigMiss):
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 提交审批失败: 系统未配置 [Warehouse:ADJUST] 审批职责"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 提交审批失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "调账单已生成且审批已发起"})
}

// ExecuteAdjustmentHandler 执行调账
func ExecuteAdjustmentHandler(c *gin.Context) {
	id := c.Param("id")
	err := services.ExecuteAdjustment(id, middleware.GetSafeUsername(c))
	if err != nil {
		switch {
		case errors.Is(err, services.ErrAdjustmentNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "调账记录不存在"})
		case errors.Is(err, services.ErrAdjustmentAlreadyExecuted):
			c.JSON(http.StatusConflict, gin.H{"error": "该调账单已经执行过，请勿重复操作"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 调账失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "调账执行成功，库存已更新"})
}

// GetAdjustmentHistoryHandler 获取调账历史报表
func GetAdjustmentHistoryHandler(c *gin.Context) {
	results, err := services.ListAdjustmentHistory()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取调账历史失败"})
		return
	}
	c.JSON(http.StatusOK, results)
}
