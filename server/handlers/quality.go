package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// --- 质量标准库 (Inspection Standards) ---

// GetInspectionStandardsHandler 获取标准库列表 (支持分页)
func GetInspectionStandardsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	typeFilter := c.Query("type")

	// 使用 Clone() 确保 Session 隔离，防止 Count 污染 Find
	baseQuery := db.DB.Model(&models.InspectionStandard{})
	if typeFilter != "" && typeFilter != "ALL" {
		baseQuery = baseQuery.Where("type = ?", typeFilter)
	}

	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		log.Printf("[ERROR] QualityStandards.Count Error: %v", err)
	}

	var standards []models.InspectionStandard
	if err := baseQuery.Order("code asc, version desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&standards).Error; err != nil {
		log.Printf("[ERROR] QualityStandards.Find Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取品质标准失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, InspectionStandardsListResponse{
		Items:    mapInspectionStandardsToResponse(standards),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// SaveInspectionStandardHandler 保存/更新检验标准 (版本受控)
func SaveInspectionStandardHandler(c *gin.Context) {
	var input InspectionStandardRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的标准数据: " + err.Error()})
		return
	}

	standard := mapInspectionStandardRequestToModel(input)

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.InspectionStandard
		if standard.ID != "" {
			// 如果是编辑现有标准，自动递增版本号 (0.1)
			if err := tx.First(&existing, "id = ?", standard.ID).Error; err == nil {
				standard.Version = existing.Version + 0.1
				log.Printf("[INFO] Incrementing Standard %s Version to %.1f", standard.Code, standard.Version)
			}
		} else {
			// 新增标准，默认 VER 1.0
			standard.Version = 1.0
		}

		if standard.ID != "" {
			// 编辑模式：使用 Updates 仅同步非零值，手动排除 CreatedAt 保护审计信息
			if err := tx.Model(&existing).Omit("CreatedAt", "CreatedBy").Updates(standard).Error; err != nil {
				return err
			}
			return tx.First(&standard, "id = ?", existing.ID).Error
		} else {
			// 新增模式：保持使用 Save/Create
			if err := tx.Save(&standard).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存品质标准失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, mapInspectionStandardToResponse(standard))
}

// --- 检验执行流水 (Inspection Tasks) ---

// GetInspectionTasksHandler 获取检验历史/任务
func GetInspectionTasksHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	batchNo := c.Query("batchNo")

	query := db.DB.Model(&models.InspectionTask{}).Preload("Standard")
	if batchNo != "" {
		query = query.Where("batch_no LIKE ?", "%"+batchNo+"%")
	}

	var total int64
	query.Count(&total)

	var tasks []models.InspectionTask
	if err := query.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取检验记录失败"})
		return
	}

	c.JSON(http.StatusOK, InspectionTasksListResponse{
		Items:    mapInspectionTasksToResponse(tasks),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// SaveInspectionTaskHandler 提交检验结果 (Triggering Abnormality if failed)
func SaveInspectionTaskHandler(c *gin.Context) {
	var input InspectionTaskRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的检验数据"})
		return
	}

	task := mapInspectionTaskRequestToModel(input)

	now := time.Now()
	task.CompletedAt = &now
	task.Inspector = middleware.GetSafeUsername(c)

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if task.ID != "" {
			// 更新模式：基于 ID 局部更新
			if err := tx.Model(&models.InspectionTask{}).Where("id = ?", task.ID).Updates(task).Error; err != nil {
				return err
			}
			if err := tx.Preload("Standard").First(&task, "id = ?", task.ID).Error; err != nil {
				return err
			}
		} else {
			// 新增模式
			if err := tx.Save(&task).Error; err != nil {
				return err
			}
			if err := tx.Preload("Standard").First(&task, "id = ?", task.ID).Error; err != nil {
				return err
			}
		}

		// 判定逻辑：如果判定不通过，自动生成质量异常单 (QualityAbnormality)
		if task.Result == "FAIL" {
			abnormality := models.QualityAbnormality{
				TaskID:      task.ID,
				Severity:    "MAJOR",
				Description: "[AUTO_GEN] 检验判定不通过: " + task.Remarks,
				Status:      "OPEN",
			}
			if err := tx.Create(&abnormality).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 提交检验失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, mapInspectionTaskToResponse(task))
}

// --- 质量异常管理 (Quality Abnormalities) ---

// GetAbnormalitiesHandler 获取异常报告
func GetAbnormalitiesHandler(c *gin.Context) {
	var items []models.QualityAbnormality
	if err := db.DB.Preload("InspectionTask").Order("created_at desc").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取异常数据失败"})
		return
	}
	c.JSON(http.StatusOK, mapQualityAbnormalitiesToResponse(items))
}
