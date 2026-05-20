package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/repositories"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetMaintenanceRecordsHandler godoc
// @Summary 获取维保记录列表
// @Description 查询维保记录列表,支持分页、筛选、搜索
// @Tags 维保记录
// @Accept json
// @Produce json
// @Param assetType query string false "资产类型" Enums(MOLD, FURNACE)
// @Param assetId query string false "资产ID"
// @Param status query string false "状态" Enums(OPEN, IN_PROGRESS, COMPLETED, CANCELLED)
// @Param priority query string false "优先级(逗号分隔)" example(HIGH,CRITICAL)
// @Param type query string false "维保类型" Enums(PREVENTIVE, CORRECTIVE, INSPECTION)
// @Param dateFrom query string false "开始日期" example(2026-01-01)
// @Param dateTo query string false "结束日期" example(2026-12-31)
// @Param search query string false "搜索关键词(标题/序列号,最少2个字符)"
// @Param limit query int false "每页数量" default(100) maximum(1000)
// @Param offset query int false "偏移量" default(0)
// @Success 200 {object} map[string]interface{} "成功返回记录列表"
// @Failure 400 {object} map[string]string "参数错误"
// @Failure 500 {object} map[string]string "服务器错误"
// @Security BearerAuth
// @Router /maintenance-records [get]
func GetMaintenanceRecordsHandler(c *gin.Context) {
	// 解析查询参数
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if limit < 1 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}
	if offset < 0 {
		offset = 0
	}

	// 解析优先级（支持逗号分隔）
	var priorities []string
	if priority := c.Query("priority"); priority != "" {
		for _, p := range strings.Split(priority, ",") {
			priorities = append(priorities, strings.TrimSpace(p))
		}
	}

	params := repositories.ListParams{
		AssetType:  c.Query("assetType"),
		AssetID:    c.Query("assetId"),
		Status:     c.Query("status"),
		Priorities: priorities,
		Type:       c.Query("type"),
		DateFrom:   c.Query("dateFrom"),
		DateTo:     c.Query("dateTo"),
		Search:     c.Query("search"),
		Limit:      limit,
		Offset:     offset,
	}

	// 调用 service 层
	svc := services.NewMaintenanceRecordService(db.DB)
	result, err := svc.ListRecords(params)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"records": result.Records,
		"total":   result.Total,
		"limit":   limit,
		"offset":  offset,
	})
}

// GetMaintenanceRecordStatsHandler godoc
// @Summary 获取维保记录统计
// @Description 返回按状态分组的维保记录统计数据
// @Tags 维保记录
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "统计数据"
// @Failure 500 {object} map[string]string "服务器错误"
// @Security BearerAuth
// @Router /maintenance-records/stats [get]
func GetMaintenanceRecordStatsHandler(c *gin.Context) {
	svc := services.NewMaintenanceRecordService(db.DB)
	stats, err := svc.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取统计数据失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"open":       stats.Open,
		"inProgress": stats.InProgress,
		"completed":  stats.Completed,
		"cancelled":  stats.Cancelled,
		"total":      stats.Total,
	})
}

// GetMaintenanceRecordHandler godoc
// @Summary 获取单条维保记录
// @Description 根据ID获取维保记录详情
// @Tags 维保记录
// @Accept json
// @Produce json
// @Param id path string true "记录ID"
// @Success 200 {object} map[string]interface{} "维保记录详情"
// @Failure 404 {object} map[string]string "记录不存在"
// @Failure 500 {object} map[string]string "服务器错误"
// @Security BearerAuth
// @Router /maintenance-records/{id} [get]
func GetMaintenanceRecordHandler(c *gin.Context) {
	id := c.Param("id")

	svc := services.NewMaintenanceRecordService(db.DB)
	record, err := svc.GetByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 维保记录不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取维保记录失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, record)
}

// CreateMaintenanceRecordHandler godoc
// @Summary 创建维保记录
// @Description 创建新的维保记录
// @Tags 维保记录
// @Accept json
// @Produce json
// @Param body body object true "维保记录信息"
// @Success 200 {object} map[string]interface{} "创建成功"
// @Failure 400 {object} map[string]string "参数错误"
// @Failure 500 {object} map[string]string "服务器错误"
// @Security BearerAuth
// @Router /maintenance-records [post]
func CreateMaintenanceRecordHandler(c *gin.Context) {
	var input struct {
		AssetType   string     `json:"assetType"`
		AssetID     string     `json:"assetId"`
		AssetSN     string     `json:"assetSn"`
		Type        string     `json:"type"`
		Title       string     `json:"title"`
		Description string     `json:"description"`
		Priority    string     `json:"priority"`
		StartedAt   *time.Time `json:"startedAt"`
		CompletedAt *time.Time `json:"completedAt"`
		Cost        float64    `json:"cost"`
		Remarks     string     `json:"remarks"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 数据格式错误: " + err.Error()})
		return
	}

	// 构建 service 输入
	createInput := services.CreateInput{
		AssetType:   input.AssetType,
		AssetID:     input.AssetID,
		AssetSN:     input.AssetSN,
		Type:        input.Type,
		Title:       input.Title,
		Description: input.Description,
		Priority:    input.Priority,
		StartedAt:   input.StartedAt,
		CompletedAt: input.CompletedAt,
		Cost:        input.Cost,
		Remarks:     input.Remarks,
		Operator:    middleware.GetSafeUsername(c),
		UserID:      middleware.GetSafeUserID(c),
		ClientIP:    c.ClientIP(),
	}

	// 调用 service 层
	svc := services.NewMaintenanceRecordService(db.DB)
	record, err := svc.Create(createInput)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, record)
}

// PatchMaintenanceRecordHandler godoc
// @Summary 更新维保记录
// @Description 差分更新维保记录(SDRTS Delta 格式)
// @Tags 维保记录
// @Accept json
// @Produce json
// @Param id path string true "记录ID"
// @Param body body object true "更新数据(Delta格式)"
// @Success 200 {object} map[string]interface{} "更新成功"
// @Failure 400 {object} map[string]string "参数错误"
// @Failure 404 {object} map[string]string "记录不存在"
// @Failure 409 {object} map[string]string "版本冲突"
// @Failure 422 {object} map[string]string "状态流转错误"
// @Failure 500 {object} map[string]string "服务器错误"
// @Security BearerAuth
// @Router /maintenance-records/{id} [patch]
func PatchMaintenanceRecordHandler(c *gin.Context) {
	id := c.Param("id")

	var input services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的更新数据"})
		return
	}

	// 构建 service 输入
	patchInput := services.PatchInput{
		ID:       id,
		Delta:    input.Delta,
		Version:  int(input.Metadata.Version),
		Operator: middleware.GetSafeUsername(c),
		UserID:   middleware.GetSafeUserID(c),
		ClientIP: c.ClientIP(),
	}

	// 调用 service 层
	svc := services.NewMaintenanceRecordService(db.DB)
	record, err := svc.Patch(patchInput)
	if err != nil {
		// 检查是否是版本冲突
		if strings.Contains(err.Error(), "[CONFLICT]") {
			respondVersionConflict(c)
			return
		}
		// 检查是否是状态转换错误（422）
		if strings.Contains(err.Error(), "不允许") {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, record)
}

// DeleteMaintenanceRecordHandler godoc
// @Summary 删除维保记录
// @Description 软删除维保记录
// @Tags 维保记录
// @Accept json
// @Produce json
// @Param id path string true "记录ID"
// @Success 200 {object} map[string]string "删除成功"
// @Failure 404 {object} map[string]string "记录不存在"
// @Failure 500 {object} map[string]string "服务器错误"
// @Security BearerAuth
// @Router /maintenance-records/{id} [delete]
func DeleteMaintenanceRecordHandler(c *gin.Context) {
	id := c.Param("id")

	svc := services.NewMaintenanceRecordService(db.DB)
	err := svc.Delete(
		id,
		middleware.GetSafeUsername(c),
		middleware.GetSafeUserID(c),
		c.ClientIP(),
	)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 维保记录不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除维保记录失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// respondError 统一错误响应处理
func respondError(c *gin.Context, err error) {
	errMsg := err.Error()

	// 根据错误前缀判断 HTTP 状态码
	if strings.HasPrefix(errMsg, "[VALIDATION]") {
		c.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
	} else if strings.HasPrefix(errMsg, "[NOT_FOUND]") {
		c.JSON(http.StatusNotFound, gin.H{"error": errMsg})
	} else if strings.HasPrefix(errMsg, "[SERVER]") {
		c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] " + errMsg})
	}
}
