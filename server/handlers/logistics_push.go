package handlers

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// =========================================================================
// 物流 API 推送制 · Gin 原生适配层 (Hot-Pluggable)
// 该文件与旧 logistics.go 完全独立，可安全删除
// =========================================================================

// --- 状态常量 ---

const (
	DOStatusPending    = "Pending"
	DOStatusCollected  = "Collected"
	DOStatusInTransit  = "InTransit"
	DOStatusDelivering = "Delivering"
	DOStatusSigned     = "Signed"
	DOStatusException  = "Exception"
	DOStatusReturned   = "Returned"
)

// --- 幂等性哈希工具 ---

func generateTrackingHash(trackingNo string, eventTime time.Time, context string) string {
	raw := fmt.Sprintf("%s|%s|%s", trackingNo, eventTime.Format(time.RFC3339), context)
	hash := md5.Sum([]byte(raw))
	return fmt.Sprintf("%x", hash)
}

// =========================================================================
// Handler 层：物流服务商管理
// =========================================================================

// GetLogisticsProvidersHandler 获取所有物流服务商配置
func GetLogisticsProvidersHandler(c *gin.Context) {
	var providers []models.LogisticsAPIProvider
	if err := db.DB.Order("created_at desc").Find(&providers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 获取服务商列表失败: " + err.Error()})
		return
	}
	for index := range providers {
		referenceCount, refErr := countProviderReferencesByCode(providers[index].Code)
		if refErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 引用统计失败: " + refErr.Error()})
			return
		}
		providers[index].ReferenceCount = referenceCount
	}
	c.JSON(http.StatusOK, providers)
}

func normalizeLogisticsProviderInput(input *models.LogisticsAPIProvider) {
	input.Name = strings.TrimSpace(input.Name)
	input.Code = strings.ToUpper(strings.TrimSpace(input.Code))
	input.Category = strings.TrimSpace(input.Category)
	input.Website = strings.TrimSpace(input.Website)
	input.Contact = strings.TrimSpace(input.Contact)
	input.Phone = strings.TrimSpace(input.Phone)
	input.Note = strings.TrimSpace(input.Note)
	input.AppKey = strings.TrimSpace(input.AppKey)
	input.AppSecret = strings.TrimSpace(input.AppSecret)
	input.CustomerID = strings.TrimSpace(input.CustomerID)
	input.CheckWord = strings.TrimSpace(input.CheckWord)
	input.Endpoint = strings.TrimSpace(input.Endpoint)
	input.Status = strings.TrimSpace(input.Status)
	normalizedCapabilities := make(models.StringList, 0, len(input.Capabilities))
	seenCapabilities := make(map[string]struct{}, len(input.Capabilities))
	for _, capability := range input.Capabilities {
		normalizedCapability := strings.TrimSpace(strings.ToLower(capability))
		if normalizedCapability == "" {
			continue
		}
		if _, exists := seenCapabilities[normalizedCapability]; exists {
			continue
		}
		seenCapabilities[normalizedCapability] = struct{}{}
		normalizedCapabilities = append(normalizedCapabilities, normalizedCapability)
	}
	input.Capabilities = normalizedCapabilities

	if input.Category == "" {
		input.Category = "domestic"
	}
	if input.Status == "" {
		input.Status = "Enabled"
	}
	if strings.TrimSpace(input.LastVerificationAction) != "" {
		input.LastVerificationAction = strings.TrimSpace(input.LastVerificationAction)
	}
}

func parseLogisticsProviderPayload(c *gin.Context) (models.LogisticsAPIProvider, map[string]json.RawMessage, error) {
	var input models.LogisticsAPIProvider
	providedFields := make(map[string]json.RawMessage)

	rawBody, err := c.GetRawData()
	if err != nil {
		return input, nil, err
	}

	if err := json.Unmarshal(rawBody, &providedFields); err != nil {
		return input, nil, err
	}

	if err := json.Unmarshal(rawBody, &input); err != nil {
		return input, nil, err
	}

	return input, providedFields, nil
}

func mergeLogisticsProviderInput(target *models.LogisticsAPIProvider, input *models.LogisticsAPIProvider, providedFields map[string]json.RawMessage) {
	if _, ok := providedFields["name"]; ok {
		target.Name = input.Name
	}
	if _, ok := providedFields["code"]; ok {
		target.Code = input.Code
	}
	if _, ok := providedFields["category"]; ok {
		target.Category = input.Category
	}
	if _, ok := providedFields["website"]; ok {
		target.Website = input.Website
	}
	if _, ok := providedFields["contact"]; ok {
		target.Contact = input.Contact
	}
	if _, ok := providedFields["phone"]; ok {
		target.Phone = input.Phone
	}
	if _, ok := providedFields["note"]; ok {
		target.Note = input.Note
	}
	if _, ok := providedFields["appKey"]; ok {
		target.AppKey = input.AppKey
	}
	if _, ok := providedFields["appSecret"]; ok {
		target.AppSecret = input.AppSecret
	}
	if _, ok := providedFields["customerId"]; ok {
		target.CustomerID = input.CustomerID
	}
	if _, ok := providedFields["checkWord"]; ok {
		target.CheckWord = input.CheckWord
	}
	if _, ok := providedFields["endpoint"]; ok {
		target.Endpoint = input.Endpoint
	}
	if _, ok := providedFields["status"]; ok {
		target.Status = input.Status
	}
	if _, ok := providedFields["capabilities"]; ok {
		target.Capabilities = input.Capabilities
	}
	if _, ok := providedFields["quotaTotal"]; ok {
		target.QuotaTotal = input.QuotaTotal
	}
	if _, ok := providedFields["quotaUsed"]; ok {
		target.QuotaUsed = input.QuotaUsed
	}
	if _, ok := providedFields["quotaAlertAt"]; ok {
		target.QuotaAlertAt = input.QuotaAlertAt
	}
}

func buildLogisticsProviderPersistenceUpdates(provider *models.LogisticsAPIProvider) map[string]interface{} {
	return map[string]interface{}{
		"name":                      provider.Name,
		"code":                      provider.Code,
		"category":                  provider.Category,
		"website":                   provider.Website,
		"contact":                   provider.Contact,
		"phone":                     provider.Phone,
		"note":                      provider.Note,
		"app_key":                   provider.AppKey,
		"app_secret":                provider.AppSecret,
		"customer_id":               provider.CustomerID,
		"check_word":                provider.CheckWord,
		"endpoint":                  provider.Endpoint,
		"status":                    provider.Status,
		"capabilities":              provider.Capabilities,
		"verification_status":       provider.VerificationStatus,
		"last_verified_at":          provider.LastVerifiedAt,
		"last_verification_message": provider.LastVerificationMessage,
		"last_verification_action":  provider.LastVerificationAction,
		"quota_total":               provider.QuotaTotal,
		"quota_used":                provider.QuotaUsed,
		"quota_alert_at":            provider.QuotaAlertAt,
	}
}

func countProviderReferencesByCode(code string) (int64, error) {
	if strings.TrimSpace(code) == "" {
		return 0, nil
	}

	var count int64
	err := db.DB.Model(&models.DeliveryOrder{}).Where("carrier_code = ?", strings.TrimSpace(code)).Count(&count).Error
	return count, err
}

func applyVerificationReset(existing *models.LogisticsAPIProvider, input *models.LogisticsAPIProvider) {
	if strings.TrimSpace(input.Status) == "Disabled" {
		now := time.Now()
		input.VerificationStatus = "disabled"
		input.LastVerifiedAt = &now
		input.LastVerificationMessage = "provider is disabled"
		input.LastVerificationAction = "如需重新测试，请先启用该物流服务商。"
		return
	}

	if existing == nil {
		input.VerificationStatus = "unverified"
		input.LastVerifiedAt = nil
		input.LastVerificationMessage = "awaiting first verification"
		input.LastVerificationAction = "请先执行一次测试连接，再判断平台是否可用。"
		return
	}

	configChanged := existing.Endpoint != input.Endpoint ||
		existing.AppKey != input.AppKey ||
		existing.AppSecret != input.AppSecret ||
		existing.CustomerID != input.CustomerID ||
		existing.CheckWord != input.CheckWord ||
		existing.Status != input.Status ||
		existing.Code != input.Code

	if configChanged {
		input.VerificationStatus = "unverified"
		input.LastVerifiedAt = nil
		input.LastVerificationMessage = "configuration updated, verification required"
		input.LastVerificationAction = "配置已变更，请重新执行测试连接。"
		return
	}

	input.VerificationStatus = existing.VerificationStatus
	input.LastVerifiedAt = existing.LastVerifiedAt
	input.LastVerificationMessage = existing.LastVerificationMessage
	input.LastVerificationAction = existing.LastVerificationAction
}

// SaveLogisticsProviderHandler 保存/更新物流服务商
func SaveLogisticsProviderHandler(c *gin.Context) {
	input, providedFields, err := parseLogisticsProviderPayload(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 数据格式错误"})
		return
	}

	if input.ID != 0 {
		var existing models.LogisticsAPIProvider
		if err := db.DB.First(&existing, input.ID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "[LOGISTICS-PUSH] 物流服务商不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 读取现有服务商失败: " + err.Error()})
			return
		}

		candidate := existing
		mergeLogisticsProviderInput(&candidate, &input, providedFields)
		normalizeLogisticsProviderInput(&candidate)
		if candidate.Name == "" || candidate.Code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 厂商名称和编码不能为空"})
			return
		}

		duplicateQuery := db.DB.Model(&models.LogisticsAPIProvider{}).
			Where("code = ? OR LOWER(name) = LOWER(?)", candidate.Code, candidate.Name).
			Where("id <> ?", existing.ID)

		var duplicate models.LogisticsAPIProvider
		if err := duplicateQuery.First(&duplicate).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "[LOGISTICS-PUSH] 已存在相同编码或名称的物流服务商"})
			return
		} else if err != gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 重复性校验失败: " + err.Error()})
			return
		}

		if existing.Code != candidate.Code {
			referenceCount, refErr := countProviderReferencesByCode(existing.Code)
			if refErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 引用校验失败: " + refErr.Error()})
				return
			}
			if referenceCount > 0 {
				c.JSON(http.StatusConflict, gin.H{"error": "[LOGISTICS-PUSH] 当前服务商已被物流订单引用，禁止修改关键编码，请改为停用/归档"})
				return
			}
		}

		applyVerificationReset(&existing, &candidate)
		if err := db.DB.Model(&models.LogisticsAPIProvider{}).Where("id = ?", existing.ID).Updates(buildLogisticsProviderPersistenceUpdates(&candidate)).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
			return
		}
		if err := db.DB.First(&candidate, existing.ID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 读取更新后的服务商失败: " + err.Error()})
			return
		}
		referenceCount, refErr := countProviderReferencesByCode(candidate.Code)
		if refErr == nil {
			candidate.ReferenceCount = referenceCount
		}
		c.JSON(http.StatusOK, candidate)
		return
	} else {
		normalizeLogisticsProviderInput(&input)
		if input.Name == "" || input.Code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 厂商名称和编码不能为空"})
			return
		}

		duplicateQuery := db.DB.Model(&models.LogisticsAPIProvider{}).
			Where("code = ? OR LOWER(name) = LOWER(?)", input.Code, input.Name)

		var duplicate models.LogisticsAPIProvider
		if err := duplicateQuery.First(&duplicate).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "[LOGISTICS-PUSH] 已存在相同编码或名称的物流服务商"})
			return
		} else if err != gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 重复性校验失败: " + err.Error()})
			return
		}

		applyVerificationReset(nil, &input)
		if err := db.DB.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建失败"})
			return
		}
		input.ReferenceCount = 0
	}
	c.JSON(http.StatusOK, input)
}

// VerifyLogisticsProviderHandler 手动验证物流服务商配置
func VerifyLogisticsProviderHandler(c *gin.Context) {
	id := c.Param("id")
	var provider models.LogisticsAPIProvider
	if err := db.DB.First(&provider, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[LOGISTICS-PUSH] 物流服务商不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 读取服务商失败: " + err.Error()})
		return
	}

	result := services.VerifyLogisticsProvider(provider)
	provider.VerificationStatus = result.Status
	provider.LastVerifiedAt = &result.CheckedAt
	provider.LastVerificationMessage = result.Message
	provider.LastVerificationAction = result.Action

	if err := db.DB.Model(&provider).Updates(map[string]interface{}{
		"verification_status":       provider.VerificationStatus,
		"last_verified_at":          provider.LastVerifiedAt,
		"last_verification_message": provider.LastVerificationMessage,
		"last_verification_action":  provider.LastVerificationAction,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 写入验证结果失败: " + err.Error()})
		return
	}
	referenceCount, refErr := countProviderReferencesByCode(provider.Code)
	if refErr == nil {
		provider.ReferenceCount = referenceCount
	}

	c.JSON(http.StatusOK, provider)
}

// DeleteLogisticsProviderHandler 删除服务商
func DeleteLogisticsProviderHandler(c *gin.Context) {
	id := c.Param("id")
	var provider models.LogisticsAPIProvider
	if err := db.DB.First(&provider, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[LOGISTICS-PUSH] 物流服务商不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 读取服务商失败: " + err.Error()})
		return
	}

	referenceCount, refErr := countProviderReferencesByCode(provider.Code)
	if refErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 引用校验失败: " + refErr.Error()})
		return
	}
	if referenceCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "[LOGISTICS-PUSH] 当前服务商已被物流订单引用，禁止直接删除，请改为停用/归档"})
		return
	}

	if err := db.DB.Delete(&models.LogisticsAPIProvider{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}
	c.Status(http.StatusNoContent)
}

// =========================================================================
// Handler 层：物流订单与轨迹
// =========================================================================

// GetDeliveryOrdersHandler 获取推送制物流订单列表
func GetDeliveryOrdersHandler(c *gin.Context) {
	var orders []models.DeliveryOrder
	query := db.DB.Order("updated_at desc")

	if bizNo := c.Query("bizOrderNo"); bizNo != "" {
		query = query.Where("biz_order_no = ?", bizNo)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 查询失败"})
		return
	}
	c.JSON(http.StatusOK, orders)
}

// GetDeliveryTrackingHandler 获取单票轨迹明细
func GetDeliveryTrackingHandler(c *gin.Context) {
	trackingNo := c.Param("trackingNo")

	var order models.DeliveryOrder
	if err := db.DB.Where("tracking_no = ?", trackingNo).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[LOGISTICS-PUSH] 单号不存在"})
		return
	}

	var details []models.DeliveryTrackingDetail
	db.DB.Where("delivery_order_id = ?", order.ID).Order("time desc").Find(&details)

	c.JSON(http.StatusOK, gin.H{
		"order":  order,
		"traces": details,
	})
}

// =========================================================================
// Handler 层：Webhook 回调接收 (公网入口)
// =========================================================================

type webhookPayload struct {
	TrackingNo  string      `json:"trackingNo"`
	CarrierCode string      `json:"carrierCode"`
	Status      string      `json:"status"`
	Traces      []traceItem `json:"traces"`
}

type traceItem struct {
	Time     string `json:"time"`
	Context  string `json:"context"`
	Location string `json:"location"`
}

// HandlePushCallbackHandler 接收物流平台推送回调
func HandlePushCallbackHandler(c *gin.Context) {
	var payload webhookPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid callback payload"})
		return
	}

	// 查找主单
	var order models.DeliveryOrder
	if err := db.DB.Where("tracking_no = ?", payload.TrackingNo).First(&order).Error; err != nil {
		log.Printf("[LOGISTICS-PUSH][WARN] Callback for unknown tracking: %s", payload.TrackingNo)
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// 幂等写入轨迹
	inserted := 0
	for _, t := range payload.Traces {
		eventTime, parseErr := time.Parse("2006-01-02 15:04:05", t.Time)
		if parseErr != nil {
			continue
		}

		hashKey := generateTrackingHash(payload.TrackingNo, eventTime, t.Context)
		detail := models.DeliveryTrackingDetail{
			DeliveryOrderID: order.ID,
			Time:            eventTime,
			Context:         t.Context,
			Location:        t.Location,
			HashKey:         hashKey,
		}

		res := db.DB.Where("hash_key = ?", hashKey).FirstOrCreate(&detail)
		if res.RowsAffected > 0 {
			inserted++
		}
	}

	// 更新主表状态
	now := time.Now()
	updates := map[string]interface{}{
		"status":       mapPushStatus(payload.Status),
		"last_push_at": now,
	}
	if len(payload.Traces) > 0 {
		last := payload.Traces[len(payload.Traces)-1]
		updates["last_event"] = last.Context
		updates["last_location"] = last.Location
	}
	if mapPushStatus(payload.Status) == DOStatusSigned {
		updates["signed_at"] = now
	}

	db.DB.Model(&order).Updates(updates)

	c.JSON(http.StatusOK, gin.H{"result": "success", "insertedTraces": inserted})
}

func mapPushStatus(s string) string {
	switch s {
	case "0", "Pending":
		return DOStatusPending
	case "1", "Collected":
		return DOStatusCollected
	case "2", "InTransit":
		return DOStatusInTransit
	case "3", "Delivering":
		return DOStatusDelivering
	case "4", "Signed":
		return DOStatusSigned
	case "5", "Exception":
		return DOStatusException
	case "6", "Returned":
		return DOStatusReturned
	default:
		return DOStatusInTransit
	}
}

// =========================================================================
// 补偿任务：漏抓取自动对冲 (由 main.go Cron 调用)
// =========================================================================

// RunLogisticsCompensation 扫描失联订单并主动查询补偿
func RunLogisticsCompensation() {
	log.Println("[LOGISTICS-JANITOR] Starting compensation scan...")

	threshold := time.Now().Add(-12 * time.Hour)
	var staleOrders []models.DeliveryOrder
	result := db.DB.Where(
		"status NOT IN (?, ?, ?) AND (last_push_at IS NULL OR last_push_at < ?)",
		DOStatusSigned, DOStatusException, DOStatusReturned,
		threshold,
	).Limit(100).Find(&staleOrders)

	if result.Error != nil {
		log.Printf("[LOGISTICS-JANITOR][CRITICAL] Query failed: %v", result.Error)
		return
	}

	if len(staleOrders) == 0 {
		log.Println("[LOGISTICS-JANITOR] No stale orders. System healthy.")
		return
	}

	log.Printf("[LOGISTICS-JANITOR] Found %d stale order(s). Initiating polling...", len(staleOrders))

	for _, order := range staleOrders {
		var provider models.LogisticsAPIProvider
		if err := db.DB.Where("code = ? AND status = 'Enabled'", order.CarrierCode).First(&provider).Error; err != nil {
			log.Printf("[LOGISTICS-JANITOR] Provider %s not found, skipping %s", order.CarrierCode, order.TrackingNo)
			continue
		}

		// 砂箱占位：正式并网时替换为真实 HTTP 调用
		log.Printf("[LOGISTICS-JANITOR][STUB] Would poll %s for %s", provider.Name, order.TrackingNo)

		// 记录额度消耗
		db.DB.Model(&provider).Update("quota_used", gorm.Expr("quota_used + 1"))

		// 额度告警
		remaining := provider.QuotaTotal - provider.QuotaUsed
		if remaining <= provider.QuotaAlertAt && provider.QuotaTotal > 0 {
			log.Printf("[LOGISTICS-JANITOR][WARNING] API quota LOW for %s: remaining=%d", provider.Name, remaining)
		}
	}

	log.Println("[LOGISTICS-JANITOR] Compensation scan complete.")
}
