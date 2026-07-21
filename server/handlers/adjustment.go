package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// SubmitAdjustmentApprovalHandler creates an inventory adjustment from a stocktake task.
func SubmitAdjustmentApprovalHandler(c *gin.Context) {
	taskID := c.Param("taskId")
	err := services.SubmitAdjustmentApproval(auditContextFromGin(c), taskID, middleware.GetSafeUsername(c))
	if err != nil {
		switch {
		case errors.Is(err, services.ErrStocktakeTaskNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "盘点任务不存在"})
		case errors.Is(err, services.ErrAdjustmentTaskInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{"error": "该盘点任务当前状态不支持生成调账单"})
		case errors.Is(err, services.ErrAdjustmentPendingExists):
			c.JSON(http.StatusBadRequest, gin.H{"error": "该任务已存在待处理调账单，请勿重复操作"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 生成调账单失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "调账单已生成"})
}

// ExecuteAdjustmentHandler executes an inventory adjustment.
func ExecuteAdjustmentHandler(c *gin.Context) {
	id := c.Param("id")
	err := services.ExecuteAdjustment(auditContextFromGin(c), id, middleware.GetSafeUsername(c))
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

// GetAdjustmentHistoryHandler returns inventory adjustment history.
func GetAdjustmentHistoryHandler(c *gin.Context) {
	results, err := services.ListAdjustmentHistory()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取调账历史失败"})
		return
	}
	c.JSON(http.StatusOK, results)
}
