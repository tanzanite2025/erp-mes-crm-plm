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
	"xdfc-server/services"

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

	standardIDs := make([]string, 0, len(standards))
	for _, standard := range standards {
		if strings.TrimSpace(standard.ID) == "" {
			continue
		}
		standardIDs = append(standardIDs, standard.ID)
	}
	approvalSummaryMap, err := services.GetLatestApprovalRequestSummariesByTargetIDs(standardIDs)
	if err != nil {
		log.Printf("[ERROR] QualityStandards.ApprovalSummaryMap Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取品质标准审批摘要失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, InspectionStandardsListResponse{
		Items:    mapInspectionStandardsToResponse(standards, approvalSummaryMap),
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

	approvalSummary, err := services.GetLatestApprovalRequestSummaryByTargetID(standard.ID)
	if err != nil {
		log.Printf("[ERROR] QualityStandards.DetailApprovalSummary Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取品质标准审批摘要失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapInspectionStandardToResponse(standard, approvalSummary))
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

	if err := validateSupportedTopLevelDeltaKeys(req.Delta, "code", "name", "productId", "productName", "type", "status", "items", "auditor", "auditTime", "remarks"); err != nil {
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
			case "productId":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid quality standard productId payload")
				}
				productID, err := normalizeOptionalUUIDString(value)
				if err != nil {
					return errors.New("invalid quality standard productId payload")
				}
				next.ProductID = productID
			case "productName":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid quality standard productName payload")
				}
				next.ProductName = strings.TrimSpace(value)
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
				next.Auditor = middleware.GetSafeUsername(c)
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
		if err := services.SaveInspectionStandard(auditContextFromGin(c), &next); err != nil {
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

	approvalSummary, summaryErr := services.GetLatestApprovalRequestSummaryByTargetID(updated.ID)
	if summaryErr != nil {
		log.Printf("[ERROR] QualityStandards.PatchApprovalSummary Error: %v", summaryErr)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取品质标准审批摘要失败: " + summaryErr.Error()})
		return
	}

	c.JSON(http.StatusOK, mapInspectionStandardToResponse(updated, approvalSummary))
}

// SaveInspectionStandardHandler 保存/更新检验标准 (版本受控)
func SaveInspectionStandardHandler(c *gin.Context) {
	var input InspectionStandardRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的标准数据: " + err.Error()})
		return
	}

	input.Code = strings.TrimSpace(input.Code)
	input.Name = strings.TrimSpace(input.Name)
	input.ProductName = strings.TrimSpace(input.ProductName)
	productID, err := normalizeOptionalUUIDString(input.ProductID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] productId 格式错误"})
		return
	}
	input.ProductID = productID

	standard := mapInspectionStandardRequestToModel(input)
	if err := services.SaveInspectionStandard(auditContextFromGin(c), &standard); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存品质标准失败: " + err.Error()})
		return
	}

	approvalSummary, err := services.GetLatestApprovalRequestSummaryByTargetID(standard.ID)
	if err != nil {
		log.Printf("[ERROR] QualityStandards.SaveApprovalSummary Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取品质标准审批摘要失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapInspectionStandardToResponse(standard, approvalSummary))
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

	if err := services.SaveInspectionTask(auditContextFromGin(c), &task); err != nil {
		status := mapDomainErrorToHTTPStatus(err)
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, mapInspectionTaskToResponse(task))
}

func ClaimInspectionTaskHandler(c *gin.Context) {
	task, err := services.ClaimInspectionTask(
		auditContextFromGin(c),
		c.Param("id"),
	)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrQualityInspectionTaskNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 检验任务不存在"})
		case errors.Is(err, services.ErrQualityInspectionTaskClaimed):
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] 检验任务已被其他人员领取"})
		default:
			respondDomainError(c, err, "[SERVER] 领取检验任务失败: ")
		}
		return
	}
	c.JSON(http.StatusOK, mapInspectionTaskToResponse(task))
}

func ConfirmQualityBatchQuantitySettlementHandler(c *gin.Context) {
	var input QualityBatchQuantitySettlementRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的质量批次数量结算数据: " + err.Error()})
		return
	}

	confirmed, err := services.ConfirmQualityBatchQuantitySettlement(
		auditContextFromGin(c),
		&models.QualityBatchQuantitySettlement{
			ProductionPlanID:  input.ProductionPlanID,
			OrderID:           input.OrderID,
			ProductID:         input.ProductID,
			BatchNo:           input.BatchNo,
			InspectionTaskID:  input.InspectionTaskID,
			InputQuantity:     input.InputQuantity,
			QualifiedQuantity: input.QualifiedQuantity,
			RejectedQuantity:  input.RejectedQuantity,
			ReworkQuantity:    input.ReworkQuantity,
			QuantityUnit:      input.QuantityUnit,
			OccurredAt:        input.OccurredAt,
		},
	)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 保存质量批次数量结算失败: ")
		return
	}

	c.JSON(http.StatusOK, mapQualityBatchQuantitySettlementToResponse(confirmed))
}

func GetQualityBatchQuantitySettlementByTaskHandler(c *gin.Context) {
	settlement, err := services.GetQualityBatchQuantitySettlementByTask(
		c.Request.Context(),
		c.Param("taskId"),
	)
	if err != nil {
		if errors.Is(err, services.ErrQualityQuantitySettlementNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 该检验任务尚未确认质量数量"})
			return
		}
		respondDomainError(c, err, "[SERVER] 获取质量批次数量结算失败: ")
		return
	}

	c.JSON(http.StatusOK, mapQualityBatchQuantitySettlementToResponse(settlement))
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

// RecordQualityAbnormalityDisposalHandler records the quality-owned disposal
// fact. SCRAP requires quantity, unit, and stable production linkage when
// available; legacy rows remain readable until they are explicitly completed.
func RecordQualityAbnormalityDisposalHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var input QualityAbnormalityDisposalRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的品质异常处置数据: " + err.Error()})
		return
	}

	updated, err := services.RecordQualityAbnormalityDisposal(
		auditContextFromGin(c),
		id,
		&models.QualityAbnormality{
			DisposalMethod:   input.DisposalMethod,
			ScrapQuantity:    input.ScrapQuantity,
			ScrapUnit:        input.ScrapUnit,
			ProductionPlanID: input.ProductionPlanID,
			OrderID:          input.OrderID,
			ProductID:        input.ProductID,
			BatchNo:          input.BatchNo,
			OccurredAt:       input.OccurredAt,
		},
	)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 保存品质异常处置失败: ")
		return
	}

	c.JSON(http.StatusOK, mapQualityAbnormalityToResponse(updated))
}
