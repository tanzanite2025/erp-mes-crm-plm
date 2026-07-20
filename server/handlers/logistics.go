package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetLogisticsRecordsHandler 获取物流记录 (支持分页与过滤)
func GetLogisticsRecordsHandler(c *gin.Context) {
	orderNo := c.Query("orderNo")
	shipmentID := c.Query("shipmentId")
	purchaseOrderID := c.Query("purchaseOrderId")
	recordType, scopeErr := resolveLogisticsRecordTypeScope(
		c.Query("type"),
		middleware.HasAnyPermission(c, authz.MenuTrading),
		middleware.HasAnyPermission(c, authz.MenuPurchase),
	)
	if scopeErr != nil {
		if errors.Is(scopeErr, errInvalidLogisticsRecordType) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] type 必须为 Receipt 或 Shipment"})
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	query := db.DB.Where("is_deleted = ?", false)
	if orderNo != "" {
		query = query.Where("order_no = ?", orderNo)
	}
	if shipmentID != "" {
		query = query.Where("shipment_id = ?", shipmentID)
	}
	if purchaseOrderID != "" {
		query = query.Where("purchase_order_id = ?", purchaseOrderID)
	}
	if recordType != "" {
		query = query.Where("type = ?", recordType)
	}

	var records []models.LogisticsRecord
	var total int64
	query.Model(&models.LogisticsRecord{}).Count(&total)

	if err := query.Preload("PurchaseOrder").Order("updated_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取物流记录失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, services.LogisticsRecordListResponse{
		Items:    services.MapLogisticsRecordsToResponse(records),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// GetLogisticsRecordHandler 获取单条物流详情
func GetLogisticsRecordHandler(c *gin.Context) {
	id := c.Param("id")
	var record models.LogisticsRecord
	if err := db.DB.Preload("PurchaseOrder").First(&record, "id = ? AND is_deleted = ?", id, false).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[VALIDATION] 记录不找到"})
		return
	}
	recordType := strings.TrimSpace(record.Type)
	if recordType == "" {
		recordType = "Shipment"
	}
	if _, err := resolveLogisticsRecordTypeScope(
		recordType,
		middleware.HasAnyPermission(c, authz.MenuTrading),
		middleware.HasAnyPermission(c, authz.MenuPurchase),
	); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		return
	}
	c.JSON(http.StatusOK, services.MapLogisticsRecordToResponse(record))
}

// SaveLogisticsRecordHandler 保存或更新物流记录
func SaveLogisticsRecordHandler(c *gin.Context) {
	var input models.LogisticsRecord
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 物流数据格式错误"})
		return
	}

	input.OrderNo = strings.TrimSpace(input.OrderNo)
	input.Carrier = strings.TrimSpace(input.Carrier)
	input.TrackingNo = strings.TrimSpace(input.TrackingNo)
	input.LastLocation = strings.TrimSpace(input.LastLocation)
	input.ShipmentID = strings.TrimSpace(input.ShipmentID)

	salesOrderID, err := normalizeOptionalUUIDString(input.SalesOrderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] salesOrderId 鏍煎紡閿欒"})
		return
	}
	input.SalesOrderID = salesOrderID

	purchaseOrderID, err := normalizeOptionalUUIDString(input.PurchaseOrderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] purchaseOrderId 鏍煎紡閿欒"})
		return
	}
	input.PurchaseOrderID = purchaseOrderID

	productID, err := normalizeOptionalUUIDString(input.ProductID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] productId 鏍煎紡閿欒"})
		return
	}
	input.ProductID = productID

	record, err := services.SaveLogisticsRecord(auditContextFromGin(c), input)
	if err != nil {
		var conflictErr *services.LogisticsTrackingNoConflictError
		switch {
		case errors.As(err, &conflictErr):
			c.JSON(http.StatusConflict, gin.H{"error": conflictErr.Error()})
			return
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
			return
		default:
			if strings.TrimSpace(input.ID) != "" {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建失败"})
			return
		}
	}
	c.JSON(http.StatusOK, services.MapLogisticsRecordToResponse(record))
}

// UpdateLogisticsStatusHandler 更新物流状态并追加事件 (加固：乐观锁 + 审计)
func UpdateLogisticsStatusHandler(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status      string `json:"status"`
		Location    string `json:"location"`
		Description string `json:"description"`
		EventsJSON  []byte `json:"events"`
		Version     int    `json:"version"` // 乐观锁版本号
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	var record models.LogisticsRecord
	if err := db.DB.First(&record, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
		return
	}

	updated, err := services.UpdateLogisticsStatus(auditContextFromGin(c), id, services.UpdateLogisticsStatusInput{
		Status:      req.Status,
		Location:    req.Location,
		Description: req.Description,
		EventsJSON:  req.EventsJSON,
		Version:     req.Version,
	})
	if err != nil {
		if errors.Is(err, services.ErrLogisticsStatusVersionConflict) {
			respondVersionConflict(c)
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, services.MapLogisticsRecordToResponse(updated))
}

func DeleteLogisticsRecordHandler(c *gin.Context) {
	id := c.Param("id")

	if err := services.DeleteLogisticsRecord(auditContextFromGin(c), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}
	c.Status(http.StatusNoContent)
}
