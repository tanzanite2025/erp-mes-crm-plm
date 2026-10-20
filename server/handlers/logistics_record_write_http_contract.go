package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// The HTTP contract uses a JSON array, rather than Go []byte's base64 format.
type LogisticsRecordWriteRequest struct {
	ID              string          `json:"id"`
	OrderNo         string          `json:"orderNo"`
	SalesOrderID    string          `json:"salesOrderId"`
	PurchaseOrderID string          `json:"purchaseOrderId"`
	ProductID       string          `json:"productId"`
	ShipmentID      string          `json:"shipmentId"`
	Type            string          `json:"type"`
	Carrier         string          `json:"carrier"`
	TrackingNo      string          `json:"trackingNo"`
	Status          string          `json:"status"`
	LastLocation    string          `json:"lastLocation"`
	Events          json.RawMessage `json:"events"`
	Version         int             `json:"version"`
}

func mapLogisticsRecordWriteRequestToModel(request LogisticsRecordWriteRequest) models.LogisticsRecord {
	return models.LogisticsRecord{
		BaseModel: models.BaseModel{ID: strings.TrimSpace(request.ID)},
		OrderNo:   request.OrderNo, SalesOrderID: request.SalesOrderID, PurchaseOrderID: request.PurchaseOrderID,
		ProductID: request.ProductID, ShipmentID: request.ShipmentID, Type: request.Type,
		Carrier: request.Carrier, TrackingNo: request.TrackingNo, Status: request.Status,
		LastLocation: request.LastLocation, Events: request.Events, Version: request.Version,
	}
}

func authorizeLogisticsRecordWriteTypeScope(c *gin.Context, id, requestedType string) bool {
	recordType := strings.TrimSpace(requestedType)
	if id != "" {
		var record models.LogisticsRecord
		if err := db.DB.Where("id = ? AND is_deleted = ?", id, false).First(&record).Error; err != nil {
			respondLogisticsRecordWriteError(c, err)
			return false
		}
		recordType = record.Type
	} else if recordType == "" {
		recordType = "Shipment"
	}
	_, err := resolveLogisticsRecordTypeScope(recordType,
		middleware.HasAnyPermission(c, authz.MenuTrading), middleware.HasAnyPermission(c, authz.MenuPurchase))
	if err != nil {
		status := http.StatusForbidden
		if errors.Is(err, errInvalidLogisticsRecordType) {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": "无权访问该采购/销售物流类型或类型无效"})
		return false
	}
	return true
}

// A full save must not bypass the action permission on the dedicated status endpoint.
func authorizeLogisticsRecordFullSaveStatusChange(c *gin.Context, input models.LogisticsRecord) bool {
	if middleware.HasAnyPermission(c, authz.ActionTradingLogisticsStatusUpdate) {
		return true
	}
	previousStatus := "Pending"
	nextStatus := strings.TrimSpace(input.Status)
	if input.ID != "" {
		var current models.LogisticsRecord
		if err := db.DB.Where("id = ? AND is_deleted = ?", input.ID, false).First(&current).Error; err != nil {
			respondLogisticsRecordWriteError(c, err)
			return false
		}
		previousStatus = current.Status
	} else if nextStatus == "" {
		nextStatus = "Pending"
	}
	if previousStatus != nextStatus {
		c.JSON(http.StatusForbidden, gin.H{"error": "更新物流状态需要物流状态操作权限"})
		return false
	}
	return true
}

func respondLogisticsRecordWriteError(c *gin.Context, err error) {
	var trackingConflict *services.LogisticsTrackingNoConflictError
	switch {
	case errors.Is(err, services.ErrLogisticsStatusVersionConflict):
		respondVersionConflict(c)
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "物流记录不存在"})
	case errors.As(err, &trackingConflict):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	default:
		respondDomainError(c, err, "保存物流记录失败: ")
	}
}

func PatchLogisticsRecordDetailsHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var request services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的物流编辑数据"})
		return
	}
	if request.Op != "PATCH" || request.Metadata.ID != id || request.Metadata.Version < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "物流编辑操作、ID 或版本无效"})
		return
	}
	if err := validateSupportedTopLevelDeltaKeys(request.Delta, "orderNo", "salesOrderId", "purchaseOrderId", "productId", "shipmentId", "carrier", "trackingNo", "lastLocation"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	changes := map[string]string{}
	for key, raw := range request.Delta {
		value, err := extractDeltaNewValue(raw)
		var text string
		if err != nil || json.Unmarshal(value, &text) != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的物流编辑字段: " + key})
			return
		}
		changes[key] = text
	}
	if !authorizeLogisticsRecordWriteTypeScope(c, id, "") {
		return
	}
	updated, err := services.PatchLogisticsRecordDetails(auditContextFromGin(c), id, int(request.Metadata.Version), changes)
	if err != nil {
		respondLogisticsRecordWriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, services.MapLogisticsRecordToResponse(updated))
}
