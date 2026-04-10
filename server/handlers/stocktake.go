package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type pdaScanPayload = services.PDAScanPayload

type pdaSyncFailure = services.PDASyncFailure

// GetStocktakeTasksHandler 获取所有盘点任务
func GetStocktakeTasksHandler(c *gin.Context) {
	tasks, err := services.ListStocktakeTasks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取盘点任务失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// CreateStocktakeTaskHandler 发起盘点任务并生成快照
func CreateStocktakeTaskHandler(c *gin.Context) {
	var input services.CreateStocktakeTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 盘点参数错误"})
		return
	}

	if err := services.CreateStocktakeTask(input, middleware.GetSafeUsername(c)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 发起盘点失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "盘点任务已启动，快照已生成"})
}

// GetStocktakeItemsHandler 获取任务下的所有明细
func GetStocktakeItemsHandler(c *gin.Context) {
	taskID := c.Param("id")
	items, err := services.ListStocktakeItems(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取盘点明细失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

// PDASubmitScanHandler PDA 单条扫描提交
func PDASubmitScanHandler(c *gin.Context) {
	var input services.PDAScanSubmitRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 扫描数据格式错误"})
		return
	}

	scannerID := strings.TrimSpace(input.ScannerID)
	if scannerID == "" {
		scannerID = middleware.GetSafeUsername(c)
	}

	if err := services.SubmitPDAScanRequest(input, scannerID); err != nil {
		status := mapPDAScanErrorToStatus(err)
		prefix := "[SERVER]"
		if status < http.StatusInternalServerError {
			prefix = "[VALIDATION]"
		}
		c.JSON(status, gin.H{"error": prefix + " 提交扫描结果失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "扫描结果已记录"})
}

// PDASyncResultsHandler PDA 批量同步接口
func PDASyncResultsHandler(c *gin.Context) {
	var scans []services.PDASyncScanRequest
	if err := c.ShouldBindJSON(&scans); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 同步数据格式错误"})
		return
	}
	if len(scans) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 同步数据为空"})
		return
	}

	result, err := services.SyncPDAScans(scans, middleware.GetSafeUsername(c))
	if err != nil {
		status := mapPDAScanErrorToStatus(err)
		prefix := "[SERVER]"
		if status < http.StatusInternalServerError {
			prefix = "[VALIDATION]"
		}
		c.JSON(status, gin.H{"error": prefix + " 同步扫描结果失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func processPDAScan(scan pdaScanPayload, scannerID string) error {
	return services.SubmitPDAScan(scan, scannerID)
}

func mapPDAScanErrorToStatus(err error) int {
	switch {
	case errors.Is(err, services.ErrPDAScanTaskStatusConflict):
		return http.StatusConflict
	case errors.Is(err, services.ErrStocktakeTaskNotFound),
		errors.Is(err, services.ErrPDAScanInvalidPayload),
		errors.Is(err, services.ErrPDAScanUnknownMaterial):
		return http.StatusBadRequest
	default:
		msg := strings.ToLower(err.Error())
		if strings.Contains(msg, "taskid") || strings.Contains(msg, "materialcode") || strings.Contains(msg, "scannedqty") || strings.Contains(msg, "unknown material") {
			return http.StatusBadRequest
		}
		return http.StatusInternalServerError
	}
}
