package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type pdaScanPayload struct {
	TaskID       string
	MaterialCode string
	BatchNo      string
	ScannedQty   float64
	ScanTime     *time.Time
}

type pdaSyncFailure struct {
	Index        int     `json:"index"`
	TaskID       string  `json:"taskId"`
	MaterialCode string  `json:"materialCode"`
	BatchNo      string  `json:"batchNo"`
	ScannedQty   float64 `json:"scannedQty"`
	Error        string  `json:"error"`
}

// GetStocktakeTasksHandler 获取所有盘点任务
func GetStocktakeTasksHandler(c *gin.Context) {
	var tasks []models.StocktakeTask
	if err := db.DB.Order("created_at desc").Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取盘点任务失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// CreateStocktakeTaskHandler 发起盘点任务并生成快照
func CreateStocktakeTaskHandler(c *gin.Context) {
	var input struct {
		Title                 string `json:"title" binding:"required"`
		WarehouseCategoryCode string `json:"warehouseCategoryCode" binding:"required"`
		Remarks               string `json:"remarks"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 盘点参数错误"})
		return
	}

	username := middleware.GetSafeUsername(c)
	now := time.Now()

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// 1. 创建任务主表
		task := models.StocktakeTask{
			Title:                 input.Title,
			WarehouseCategoryCode: input.WarehouseCategoryCode,
			Status:                "IN_PROGRESS",
			CreatedBy:             username,
			StartTime:             &now,
			Remarks:               input.Remarks,
		}
		if err := tx.Create(&task).Error; err != nil {
			return err
		}

		// 2. 生成库存快照 (Snapshot)
		var inventory []models.Inventory
		if err := tx.Where("category_code = ?", input.WarehouseCategoryCode).Find(&inventory).Error; err != nil {
			return err
		}

		if len(inventory) == 0 {
			return errors.New("所选仓库类别下没有可盘点的实物库存")
		}

		for _, inv := range inventory {
			item := models.StocktakeItem{
				TaskID:       task.ID,
				MaterialID:   inv.MaterialID,
				MaterialCode: inv.MaterialCode,
				MaterialName: inv.MaterialName,
				BatchNo:      inv.BatchNo,
				TheoryQty:    inv.Quantity,
				ActualQty:    0, // 初始实盘为 0
				UOM:          inv.UOM,
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 发起盘点失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "盘点任务已启动，快照已生成"})
}

// GetStocktakeItemsHandler 获取任务下的所有明细 (供 Web 编辑或差异对比)
func GetStocktakeItemsHandler(c *gin.Context) {
	taskId := c.Param("id")
	var items []models.StocktakeItem
	if err := db.DB.Where("task_id = ?", taskId).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取盘点明细失败: " + err.Error()})
		return
	}

	// 计算差异字段 (非存储字段)
	for i := range items {
		items[i].Difference = items[i].ActualQty - items[i].TheoryQty
	}

	c.JSON(http.StatusOK, items)
}

// PDASubmitScanHandler PDA 单条扫描提交 (支持累加)
func PDASubmitScanHandler(c *gin.Context) {
	var input struct {
		TaskID       string  `json:"taskId" binding:"required"`
		MaterialCode string  `json:"materialCode" binding:"required"`
		BatchNo      string  `json:"batchNo"` // DM 码扫描出的批次
		ScannedQty   float64 `json:"scannedQty"`
		ScannerID    string  `json:"scannerId"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 扫描数据格式错误"})
		return
	}

	scannerID := strings.TrimSpace(input.ScannerID)
	if scannerID == "" {
		scannerID = middleware.GetSafeUsername(c)
	}

	err := processPDAScan(pdaScanPayload{
		TaskID:       input.TaskID,
		MaterialCode: input.MaterialCode,
		BatchNo:      input.BatchNo,
		ScannedQty:   input.ScannedQty,
	}, scannerID)

	if err != nil {
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

// PDASyncResultsHandler PDA 批量同步接口 (离线支持的核心)
func PDASyncResultsHandler(c *gin.Context) {
	var scans []struct {
		TaskID       string    `json:"taskId"`
		MaterialCode string    `json:"materialCode"`
		BatchNo      string    `json:"batchNo"`
		ScannedQty   float64   `json:"scannedQty"`
		ScanTime     time.Time `json:"scanTime"`
	}

	if err := c.ShouldBindJSON(&scans); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 同步数据格式错误"})
		return
	}
	if len(scans) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 同步数据为空"})
		return
	}

	scannerID := middleware.GetSafeUsername(c)
	successCount := 0
	failures := make([]pdaSyncFailure, 0)

	// 批量处理每个扫描记录
	for idx, scan := range scans {
		currentScanTime := scan.ScanTime
		err := processPDAScan(pdaScanPayload{
			TaskID:       scan.TaskID,
			MaterialCode: scan.MaterialCode,
			BatchNo:      scan.BatchNo,
			ScannedQty:   scan.ScannedQty,
			ScanTime:     &currentScanTime,
		}, scannerID)

		if err != nil {
			failures = append(failures, pdaSyncFailure{
				Index:        idx,
				TaskID:       scan.TaskID,
				MaterialCode: scan.MaterialCode,
				BatchNo:      scan.BatchNo,
				ScannedQty:   scan.ScannedQty,
				Error:        err.Error(),
			})
			continue
		}
		successCount++
	}

	failedCount := len(failures)
	message := "离线数据同步完成"
	if failedCount > 0 {
		message = "离线数据部分同步失败，请修复后重试"
	}

	c.JSON(http.StatusOK, gin.H{
		"count":        len(scans),
		"successCount": successCount,
		"failedCount":  failedCount,
		"failures":     failures,
		"message":      message,
	})
}

func processPDAScan(scan pdaScanPayload, scannerID string) error {
	taskID := strings.TrimSpace(scan.TaskID)
	materialCode := strings.ToUpper(strings.TrimSpace(scan.MaterialCode))
	batchNo := strings.TrimSpace(scan.BatchNo)

	if taskID == "" || materialCode == "" {
		return fmt.Errorf("扫描数据缺失 taskId 或 materialCode")
	}
	if scan.ScannedQty <= 0 {
		return fmt.Errorf("扫描数量必须大于 0")
	}

	scanTime := time.Now()
	if scan.ScanTime != nil && !scan.ScanTime.IsZero() {
		scanTime = scan.ScanTime.UTC()
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		var task models.StocktakeTask
		if err := tx.Select("id", "status").Where("id = ?", taskID).First(&task).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("盘点任务不存在: %s", taskID)
			}
			return err
		}
		if task.Status != "IN_PROGRESS" {
			return fmt.Errorf("盘点任务状态为 %s，禁止继续扫描", task.Status)
		}

		var item models.StocktakeItem
		err := tx.Where("task_id = ? AND material_code = ? AND batch_no = ?", taskID, materialCode, batchNo).First(&item).Error

		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 如果是“账外物料”（Snapshot 中没有），则新建一条 Theoretical 为 0 的记录
			// 先找物料主数据以补全名称
			var material models.Material
			if err := tx.Where("code = ?", materialCode).First(&material).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return fmt.Errorf("扫描到未知物料，且物料档案中不存在该编码: %s", materialCode)
				}
				return err
			}

			newItem := models.StocktakeItem{
				TaskID:       taskID,
				MaterialID:   material.ID,
				MaterialCode: material.Code,
				MaterialName: material.Name,
				BatchNo:      batchNo,
				TheoryQty:    0,
				ActualQty:    scan.ScannedQty,
				UOM:          material.UOM,
				ScannerID:    scannerID,
				ScanTime:     &scanTime,
			}
			return tx.Create(&newItem).Error
		}
		if err != nil {
			return err
		}

		// 已存在明细：使用原子 SQL 累加，避免并发扫描发生覆盖
		updates := map[string]interface{}{
			"actual_qty": gorm.Expr("actual_qty + ?", scan.ScannedQty),
			"scan_time":  scanTime,
		}
		if scannerID != "" {
			updates["scanner_id"] = scannerID
		}
		return tx.Model(&models.StocktakeItem{}).Where("id = ?", item.ID).Updates(updates).Error
	})
}

func mapPDAScanErrorToStatus(err error) int {
	msg := err.Error()
	switch {
	case strings.Contains(msg, "盘点任务状态"):
		return http.StatusConflict
	case strings.Contains(msg, "盘点任务不存在"),
		strings.Contains(msg, "扫描数据"),
		strings.Contains(msg, "扫描数量"),
		strings.Contains(msg, "未知物料"):
		return http.StatusBadRequest
	default:
		return http.StatusInternalServerError
	}
}
