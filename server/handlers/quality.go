package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// --- 质量标准库 (Inspection Standards) ---

// GetInspectionStandardsHandler 获取标准库列表 (支持分页)
func GetInspectionStandardsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	typeFilter := strings.ToUpper(strings.TrimSpace(c.Query("type")))
	statusFilter := strings.ToUpper(strings.TrimSpace(c.Query("status")))
	keyword := strings.TrimSpace(c.Query("keyword"))

	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	scopedQuery := db.DB.Model(&models.InspectionStandard{})
	if typeFilter != "" && typeFilter != "ALL" {
		scopedQuery = scopedQuery.Where("type = ?", typeFilter)
	}
	if keyword != "" {
		keywordLike := "%" + strings.ToLower(keyword) + "%"
		scopedQuery = scopedQuery.Where(
			"LOWER(code) LIKE ? OR LOWER(name) LIKE ?",
			keywordLike,
			keywordLike,
		)
	}

	listQuery := scopedQuery.Session(&gorm.Session{})
	if statusFilter != "" && statusFilter != "ALL" {
		listQuery = listQuery.Where("status = ?", statusFilter)
	}

	var scopedTotal int64
	if err := scopedQuery.Session(&gorm.Session{}).Count(&scopedTotal).Error; err != nil {
		log.Printf("[ERROR] QualityStandards.StatsTotal Error: %v", err)
	}

	countByStatus := func(status string) int64 {
		var count int64
		if err := scopedQuery.Session(&gorm.Session{}).Where("status = ?", status).Count(&count).Error; err != nil {
			log.Printf("[ERROR] QualityStandards.StatusCount(%s) Error: %v", status, err)
			return 0
		}
		return count
	}

	publishedCount := countByStatus("PUBLISHED")
	draftCount := countByStatus("DRAFT")
	archivedCount := countByStatus("ARCHIVED")

	var total int64
	if err := listQuery.Count(&total).Error; err != nil {
		log.Printf("[ERROR] QualityStandards.Count Error: %v", err)
	}

	var standards []models.InspectionStandard
	if err := listQuery.Order("code asc, version desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&standards).Error; err != nil {
		log.Printf("[ERROR] QualityStandards.Find Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取品质标准失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, InspectionStandardsListResponse{
		Items:    mapInspectionStandardsToResponse(standards),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		Metadata: InspectionStandardsListMetadata{
			Pagination: InspectionStandardsListPaginationMetadata{
				Total:    total,
				Page:     page,
				PageSize: pageSize,
			},
			Stats: InspectionStandardsListStatsMetadata{
				Total:     scopedTotal,
				Published: publishedCount,
				Draft:     draftCount,
				Archived:  archivedCount,
			},
		},
	})
}

// GetInspectionStandardByIDHandler 获取单条品质标准详情
func GetInspectionStandardByIDHandler(c *gin.Context) {
	standardID := c.Param("id")

	var standard models.InspectionStandard
	if err := db.DB.First(&standard, "id = ?", standardID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 品质标准不存在"})
			return
		}

		log.Printf("[ERROR] QualityStandards.Detail Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取品质标准详情失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapInspectionStandardToResponse(standard))
}

func PatchInspectionStandardHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req InspectionStandardPatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的标准差量数据: " + err.Error()})
		return
	}

	if op := strings.ToUpper(strings.TrimSpace(req.Op)); op != "" && op != "PATCH" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 不支持的标准更新操作"})
		return
	}

	if strings.TrimSpace(req.Metadata.ID) != "" && strings.TrimSpace(req.Metadata.ID) != id {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 标准 ID 不匹配"})
		return
	}

	if err := validateSupportedTopLevelDeltaKeys(req.Delta, "code", "name", "type", "status", "items", "auditor", "auditTime", "remarks"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的标准差量字段: " + err.Error()})
		return
	}

	var updated models.InspectionStandard
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var standard models.InspectionStandard
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&standard, "id = ?", id).Error; err != nil {
			return err
		}

		if !qualityVersionMatches(standard.Version, req.Metadata.Version) {
			return ErrVersionConflict
		}

		next := standard
		for key, raw := range req.Delta {
			valueRaw, err := extractDeltaNewValue(raw)
			if err != nil {
				return errors.New("invalid quality standard delta item")
			}

			switch key {
			case "code":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid quality standard code payload")
				}
				next.Code = strings.TrimSpace(value)
			case "name":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid quality standard name payload")
				}
				next.Name = strings.TrimSpace(value)
			case "type":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid quality standard type payload")
				}
				next.Type = strings.TrimSpace(value)
			case "status":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid quality standard status payload")
				}
				next.Status = strings.TrimSpace(value)
			case "items":
				next.Items = append(json.RawMessage(nil), valueRaw...)
			case "auditor":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid quality standard auditor payload")
				}
				next.Auditor = strings.TrimSpace(value)
			case "auditTime":
				value, err := parseOptionalTimeValue(valueRaw)
				if err != nil {
					return errors.New("invalid quality standard auditTime payload")
				}
				next.AuditTime = value
			case "remarks":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid quality standard remarks payload")
				}
				next.Description = strings.TrimSpace(value)
			}
		}

		next.Version = nextQualityStandardVersion(standard.Version)
		updates := map[string]interface{}{
			"code":        next.Code,
			"name":        next.Name,
			"type":        next.Type,
			"version":     next.Version,
			"status":      next.Status,
			"items":       next.Items,
			"auditor":     next.Auditor,
			"audit_time":  next.AuditTime,
			"description": next.Description,
		}

		if err := tx.Model(&standard).Updates(updates).Error; err != nil {
			return err
		}

		return tx.First(&updated, "id = ?", id).Error
	})

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 品质标准不存在"})
			return
		}
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}

		log.Printf("[ERROR] QualityStandards.Patch Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新品质标准失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapInspectionStandardToResponse(updated))
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
			if err := tx.First(&existing, "id = ?", standard.ID).Error; err == nil {
				standard.Version = nextQualityStandardVersion(existing.Version)
				log.Printf("[INFO] Incrementing Standard %s Version to %.1f", standard.Code, standard.Version)
			}
		} else {
			standard.Version = 1.0
		}

		if standard.ID != "" {
			if err := tx.Model(&existing).Omit("CreatedAt", "CreatedBy").Updates(standard).Error; err != nil {
				return err
			}
			return tx.First(&standard, "id = ?", existing.ID).Error
		} else {
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

func nextQualityStandardVersion(current float64) float64 {
	return math.Round((current+0.1)*10) / 10
}

func qualityVersionMatches(current float64, expected float64) bool {
	return math.Abs(current-expected) < 0.000001
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

// GetInspectionStatsHandler returns authoritative inspection task counts by result.
func GetInspectionStatsHandler(c *gin.Context) {
	countByResult := func(result string) (int64, error) {
		var count int64
		err := db.DB.Model(&models.InspectionTask{}).Where("result = ?", result).Count(&count).Error
		return count, err
	}

	pendingCount, err := countByResult("PENDING")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to count pending inspection tasks: " + err.Error()})
		return
	}

	passCount, err := countByResult("PASS")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to count passed inspection tasks: " + err.Error()})
		return
	}

	failCount, err := countByResult("FAIL")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to count failed inspection tasks: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, InspectionStatsResponse{
		PendingCount: pendingCount,
		PassCount:    passCount,
		FailCount:    failCount,
	})
}

// SaveInspectionTaskHandler submits an inspection result and creates an abnormality when it fails.
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
			// [SECURITY] 更新模式：校验原始记录归属与标准绑定不可变性
			var existing models.InspectionTask
			if err := tx.First(&existing, "id = ?", task.ID).Error; err != nil {
				return errors.New("[NOT_FOUND] 检验任务不存在")
			}

			// 归属校验：只有原始检验员或管理员可以修改已有记录
			currentUser := middleware.GetSafeUsername(c)
			isAdmin := middleware.HasAnyPermission(c, "perm_manage")
			if strings.TrimSpace(existing.Inspector) != "" &&
				!strings.EqualFold(existing.Inspector, currentUser) &&
				!isAdmin {
				log.Printf("[QUALITY_SECURITY] Denied task update: taskId=%s owner=%s requestor=%s ip=%s",
					task.ID, existing.Inspector, currentUser, c.ClientIP())
				return errors.New("[SECURITY] 仅原始检验员或管理员可修改此检验记录")
			}

			// 标准绑定不可变：禁止将已有任务重新绑定到不同的检验标准
			if strings.TrimSpace(existing.StandardID) != "" &&
				strings.TrimSpace(task.StandardID) != "" &&
				existing.StandardID != task.StandardID {
				return errors.New("[SECURITY] 检验标准绑定后不可变更，请创建新检验任务")
			}

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
		status := mapDomainErrorToHTTPStatus(err)
		c.JSON(status, gin.H{"error": err.Error()})
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
