// Package handlers - 物流服务商对接 + Webhook 推送回调。
//
// 此文件聚焦"对接外部物流商"全链路:
//   - Provider CRUD: GetLogisticsProvidersHandler / SaveLogisticsProviderHandler /
//     VerifyLogisticsProviderHandler / DeleteLogisticsProviderHandler
//   - 单号查询代理: GetDeliveryOrdersHandler / GetDeliveryTrackingHandler(失效条件 shouldRefreshDeliveryTracking)
//   - Webhook 接收: HandlePushCallbackHandler(物流商主动推单)
//
// 安全关键点:
//   - Enabled 配置才可接收回调；验证结果不等于实际回调已开通
//   - Webhook 校验签名；当前协议无 timestamp/nonce，不能宣称防重放
//   - 共用事务服务以轨迹唯一键去重，并按事实时间保护主单投影
//   - applyVerificationReset 改密钥后强制重新验证
package handlers

import (
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// =========================================================================
// 承运商配置、签名及 HTTP 适配；轨迹写入由服务层统一负责。
// =========================================================================

var refreshDeliveryTracking = services.RefreshDeliveryTracking

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
	if !db.DB.Migrator().HasTable(&models.DeliveryOrder{}) {
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

	configChanged := existing.AppKey != input.AppKey ||
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
	allowedTypes := make([]string, 0, 3)
	if middleware.HasAnyPermission(c, authz.MenuTrading) {
		allowedTypes = append(allowedTypes, "sales", "")
	}
	if middleware.HasAnyPermission(c, authz.MenuPurchase) {
		allowedTypes = append(allowedTypes, "purchase")
	}
	if len(allowedTypes) == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		return
	}
	query := db.DB.Where("LOWER(TRIM(biz_type)) IN ?", allowedTypes).Order("updated_at desc")

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
	refreshRequested := shouldRefreshDeliveryTracking(c.Query("refresh"))

	var order models.DeliveryOrder
	if err := db.DB.Where("tracking_no = ?", trackingNo).First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[LOGISTICS-PUSH] 单号不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 读取主单失败"})
		return
	}
	if !canReadDeliveryOrderBusinessType(
		order.BizType,
		middleware.HasAnyPermission(c, authz.MenuTrading),
		middleware.HasAnyPermission(c, authz.MenuPurchase),
	) {
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		return
	}

	var refreshResult *services.LogisticsTrackingRefreshResult
	if refreshRequested {
		result, err := refreshDeliveryTracking(trackingNo)
		if err != nil {
			if errors.Is(err, services.ErrDeliveryTrackingOrderNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "[LOGISTICS-PUSH] 单号不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 实时查询失败"})
			return
		}
		refreshResult = &result
		if err := db.DB.Where("tracking_no = ?", trackingNo).First(&order).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 刷新后读取主单失败"})
			return
		}
	}

	var details []models.DeliveryTrackingDetail
	if err := db.DB.Where("delivery_order_id = ?", order.ID).Order("time desc, id desc").Find(&details).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 读取轨迹失败"})
		return
	}

	response := gin.H{
		"order":  order,
		"traces": details,
	}
	if refreshResult != nil {
		response["refresh"] = refreshResult
	}
	c.JSON(http.StatusOK, response)
}

func shouldRefreshDeliveryTracking(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "y", "on":
		return true
	default:
		return false
	}
}

// =========================================================================
// Handler 层：Webhook 回调适配（当前挂载于认证路由，并非公网入口）
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

func normalizeWebhookSignature(value string) string {
	normalized := strings.TrimSpace(value)
	normalized = strings.TrimPrefix(normalized, "sha256=")
	normalized = strings.TrimPrefix(normalized, "SHA256=")
	normalized = strings.TrimPrefix(normalized, "md5=")
	normalized = strings.TrimPrefix(normalized, "MD5=")
	return strings.ToLower(strings.TrimSpace(normalized))
}

func logisticsWebhookSignatureFromRequest(c *gin.Context) string {
	for _, key := range []string{
		"X-XDFC-Logistics-Signature",
		"X-XDFC-Signature",
		"X-Logistics-Signature",
		"X-Signature",
		"Sign",
	} {
		if value := strings.TrimSpace(c.GetHeader(key)); value != "" {
			return normalizeWebhookSignature(value)
		}
	}
	for _, key := range []string{"signature", "sign"} {
		if value := strings.TrimSpace(c.Query(key)); value != "" {
			return normalizeWebhookSignature(value)
		}
	}
	return ""
}

func hmacSHA256Hex(secret string, payload []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

func md5Hex(parts ...string) string {
	hash := md5.New()
	for _, part := range parts {
		hash.Write([]byte(part))
	}
	return hex.EncodeToString(hash.Sum(nil))
}

func verifyLogisticsWebhookSignature(provider models.LogisticsAPIProvider, rawBody []byte, signature string) bool {
	signature = normalizeWebhookSignature(signature)
	if signature == "" {
		return false
	}

	body := string(rawBody)
	expected := make([]string, 0, 6)
	if secret := strings.TrimSpace(provider.AppSecret); secret != "" {
		expected = append(expected,
			hmacSHA256Hex(secret, rawBody),
			md5Hex(body, secret),
			md5Hex(strings.TrimSpace(provider.AppKey), body, secret),
		)
	}
	if checkWord := strings.TrimSpace(provider.CheckWord); checkWord != "" {
		expected = append(expected,
			hmacSHA256Hex(checkWord, rawBody),
			md5Hex(body, checkWord),
			md5Hex(strings.TrimSpace(provider.AppKey), body, checkWord),
		)
	}

	for _, candidate := range expected {
		normalizedCandidate := normalizeWebhookSignature(candidate)
		if len(signature) == len(normalizedCandidate) && hmac.Equal([]byte(signature), []byte(normalizedCandidate)) {
			return true
		}
	}
	return false
}

// HandlePushCallbackHandler 接收物流平台推送回调
func HandlePushCallbackHandler(c *gin.Context) {
	var payload webhookPayload
	rawBody, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid callback payload"})
		return
	}
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid callback payload"})
		return
	}
	payload.TrackingNo = strings.TrimSpace(payload.TrackingNo)
	payload.CarrierCode = strings.ToUpper(strings.TrimSpace(payload.CarrierCode))
	payload.Status = strings.TrimSpace(payload.Status)
	if payload.TrackingNo == "" || payload.CarrierCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "trackingNo and carrierCode are required"})
		return
	}

	var provider models.LogisticsAPIProvider
	if err := db.DB.Where("code = ? AND status = ?", payload.CarrierCode, "Enabled").First(&provider).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Callback provider could not be read"})
			return
		}
		log.Printf("[LOGISTICS-PUSH][WARN] Callback for disabled or unknown provider: carrier=%s tracking=%s", payload.CarrierCode, payload.TrackingNo)
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid callback provider"})
		return
	}
	signature := logisticsWebhookSignatureFromRequest(c)
	if !verifyLogisticsWebhookSignature(provider, rawBody, signature) {
		log.Printf("[LOGISTICS-PUSH][WARN] Callback signature rejected: carrier=%s tracking=%s", payload.CarrierCode, payload.TrackingNo)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid callback signature"})
		return
	}

	status := normalizeDeliveryTrackingCallbackStatus(payload.Status)
	if status == "" || len(payload.Traces) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A recognized status and dated traces are required"})
		return
	}
	traces := make([]services.DeliveryTrackingTrace, 0, len(payload.Traces))
	for _, trace := range payload.Traces {
		eventTime, valid := services.ParseDeliveryTrackingEventTime(trace.Time)
		if !valid || strings.TrimSpace(trace.Context) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Every trace requires a valid time and context"})
			return
		}
		traces = append(traces, services.DeliveryTrackingTrace{Time: eventTime, Context: trace.Context, Location: trace.Location})
	}
	inserted, err := services.PersistDeliveryOrderTrackingObservation(c.Request.Context(), services.DeliveryOrderTrackingObservation{
		TrackingNo: payload.TrackingNo, CarrierCode: payload.CarrierCode, ReportedStatus: status,
		Traces: traces, ObservedAt: time.Now().UTC(),
	})
	if err != nil {
		if errors.Is(err, services.ErrDeliveryTrackingOrderNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
			return
		}
		if errors.Is(err, services.ErrInvalidDeliveryTrackingObservation) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tracking observation"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Tracking could not be saved"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"result": "success", "insertedTraces": inserted})
}

func normalizeDeliveryTrackingCallbackStatus(status string) string {
	switch status {
	case "0", "Pending":
		return "Pending"
	case "1", "Collected":
		return "Collected"
	case "2", "InTransit":
		return "InTransit"
	case "3", "Delivering":
		return "Delivering"
	case "4", "Signed":
		return "Signed"
	case "5", "Exception":
		return "Exception"
	case "6", "Returned":
		return "Returned"
	default:
		return ""
	}
}
