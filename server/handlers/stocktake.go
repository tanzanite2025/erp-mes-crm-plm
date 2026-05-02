package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type pdaScanPayload = services.PDAScanPayload

type pdaSyncFailure = services.PDASyncFailure

func mapStocktakeItemResponse(item models.StocktakeItem) gin.H {
	difference := item.Difference
	if difference == 0 {
		difference = item.ActualQty - item.TheoryQty
	}

	return gin.H{
		"id":           item.ID,
		"createdAt":    item.CreatedAt,
		"updatedAt":    item.UpdatedAt,
		"taskId":       item.TaskID,
		"materialId":   item.MaterialID,
		"materialCode": item.MaterialCode,
		"materialName": item.MaterialName,
		"batchNo":      item.BatchNo,
		"theoryQty":    item.TheoryQty,
		"actualQty":    item.ActualQty,
		"difference":   difference,
		"uom":          item.UOM,
		"scannerId":    item.ScannerID,
		"scanTime":     item.ScanTime,
		"version":      optimisticVersionForResponse(item.UpdatedAt, item.CreatedAt),
	}
}

func mapStocktakeItemResponses(items []models.StocktakeItem) []gin.H {
	result := make([]gin.H, 0, len(items))
	for _, item := range items {
		result = append(result, mapStocktakeItemResponse(item))
	}
	return result
}

func GetStocktakeTasksHandler(c *gin.Context) {
	tasks, err := services.ListStocktakeTasks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取盘点任务失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

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

func GetStocktakeItemsHandler(c *gin.Context) {
	taskID := c.Param("id")
	items, err := services.ListStocktakeItems(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取盘点明细失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, mapStocktakeItemResponses(items))
}

func PatchStocktakeItemHandler(c *gin.Context) {
	id := c.Param("id")

	var req services.PatchInventoryHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid stocktake patch payload: " + err.Error()})
		return
	}
	if err := validateSupportedTopLevelDeltaKeys(req.Delta, "actualQty", "scannerId", "scanTime"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid stocktake delta: " + err.Error()})
		return
	}

	patch := services.PatchStocktakeItemRequest{ID: id, Version: req.Metadata.Version}
	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid stocktake delta item"})
			return
		}

		switch key {
		case "actualQty":
			var value float64
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] actualQty field is invalid"})
				return
			}
			patch.ActualQty = &value
		case "scannerId":
			patch.ScannerID = middleware.GetSafeUsernamePtr(c)
		case "scanTime":
			value, err := parseOptionalTimeValue(valueRaw)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] scanTime field is invalid"})
				return
			}
			patch.ScanTime = value
		}
	}

	deltaKeys := make([]string, 0, len(req.Delta))
	for key := range req.Delta {
		deltaKeys = append(deltaKeys, key)
	}

	updated, err := services.PatchStocktakeItem(id, patch, deltaKeys, middleware.GetSafeUsername(c), c.ClientIP())
	if err != nil {
		switch {
		case errors.Is(err, services.ErrStocktakeItemPatchVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrStocktakeItemNotFound), errors.Is(err, services.ErrStocktakeTaskNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[SERVER] stocktake item not found"})
		case errors.Is(err, services.ErrStocktakeTaskStatusUnsupported):
			c.JSON(http.StatusConflict, gin.H{"error": "[VALIDATION] stocktake task status does not allow editing"})
		default:
			status := http.StatusInternalServerError
			prefix := "[SERVER]"
			if strings.Contains(err.Error(), "[CRITICAL_LOGIC_ERROR]") || strings.Contains(err.Error(), "[VALIDATION]") {
				status = http.StatusBadRequest
				prefix = "[VALIDATION]"
			}
			c.JSON(status, gin.H{"error": prefix + " failed to patch stocktake item: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "stocktake item updated",
		"item":    mapStocktakeItemResponse(updated),
	})
}

func PDASubmitScanHandler(c *gin.Context) {
	var input services.PDAScanSubmitRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 扫描数据格式错误"})
		return
	}

	scannerID := middleware.GetSafeUsername(c)

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
