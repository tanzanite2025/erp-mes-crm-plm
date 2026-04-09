package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func saveSalesOrderForBulkSync(tx *gorm.DB, order *models.SalesOrder) error {
	if order.ID == "" {
		return tx.Create(order).Error
	}

	var existing models.SalesOrder
	if err := tx.Where("id = ?", order.ID).First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return tx.Create(order).Error
		}
		return err
	}

	if order.OrderNo == "" {
		order.OrderNo = existing.OrderNo
	}
	if order.OrderName == "" {
		order.OrderName = existing.OrderName
	}
	if order.CustomerName == "" {
		order.CustomerName = existing.CustomerName
	}
	if order.CustomerID == "" {
		order.CustomerID = existing.CustomerID
	}
	if order.Type == "" {
		order.Type = existing.Type
	}
	if order.Currency == "" {
		order.Currency = existing.Currency
	}
	if order.Classification == "" {
		order.Classification = existing.Classification
	}
	if order.Status == "" {
		order.Status = existing.Status
	}
	if order.StatusNote == "" {
		order.StatusNote = existing.StatusNote
	}
	if order.OrderDate == "" {
		order.OrderDate = existing.OrderDate
	}
	if order.DeliveryDate == "" {
		order.DeliveryDate = existing.DeliveryDate
	}
	if order.PurchaseOrderNo == "" {
		order.PurchaseOrderNo = existing.PurchaseOrderNo
	}
	if order.Barcode == "" {
		order.Barcode = existing.Barcode
	}
	if order.Requirements == "" {
		order.Requirements = existing.Requirements
	}
	if order.WorkflowInstanceID == "" {
		order.WorkflowInstanceID = existing.WorkflowInstanceID
	}
	if order.UpdatedBy == "" {
		order.UpdatedBy = existing.UpdatedBy
	}
	if order.Version == 0 {
		order.Version = existing.Version
	}

	updates := map[string]interface{}{
		"order_no":             order.OrderNo,
		"order_name":           order.OrderName,
		"customer_name":        order.CustomerName,
		"customer_id":          order.CustomerID,
		"type":                 order.Type,
		"currency":             order.Currency,
		"classification":       order.Classification,
		"status":               order.Status,
		"status_note":          order.StatusNote,
		"amount":               order.Amount,
		"quantity":             order.Quantity,
		"order_date":           order.OrderDate,
		"delivery_date":        order.DeliveryDate,
		"purchase_order_no":    order.PurchaseOrderNo,
		"barcode":              order.Barcode,
		"requirements":         order.Requirements,
		"workflow_instance_id": order.WorkflowInstanceID,
		"updated_by":           order.UpdatedBy,
		"is_deleted":           order.IsDeleted,
		"version":              order.Version,
	}
	return tx.Model(&existing).Updates(updates).Error
}

// GetSalesOrdersHandler 获取所有销售订单 (已加成分页与性能优化)
func GetSalesOrdersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	withLines := strings.EqualFold(strings.TrimSpace(c.Query("withLines")), "true")
	statusFilterRaw := strings.TrimSpace(c.Query("status"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	var orders []models.SalesOrder
	var total int64

	query := db.DB.Model(&models.SalesOrder{}).Where("is_deleted = ?", false)
	if statusFilterRaw != "" {
		statuses := make([]string, 0)
		for _, item := range strings.Split(statusFilterRaw, ",") {
			status := strings.TrimSpace(item)
			if status != "" {
				statuses = append(statuses, status)
			}
		}
		if len(statuses) > 0 {
			query = query.Where("status IN ?", statuses)
		}
	}

	// 1. 获取总数
	query.Count(&total)

	// 2. 分页获取数据 (列表页移除 Preload("Lines") 以减小 JSON 大包体积)
	listQuery := query.Order("order_date desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize)
	if withLines {
		listQuery = listQuery.Preload("Lines")
	}
	if err := listQuery.Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取订单列表失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, services.SalesOrderListResponse{
		Items:    services.MapSalesOrdersToListItems(orders),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// GetSalesOrderHandler 获取单笔订单详情
func GetSalesOrderHandler(c *gin.Context) {
	id := c.Param("id")
	var order models.SalesOrder
	if err := db.DB.Preload("Lines").Where("id = ? AND is_deleted = ?", id, false).First(&order).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 订单 ID " + id + " 不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取订单详情失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, services.MapSalesOrderToResponse(order))
}

// GetSalesOrderByNoHandler 按单号获取订单详情 (用于同步流程)
func GetSalesOrderByNoHandler(c *gin.Context) {
	orderNo := c.Param("orderNo")
	var order models.SalesOrder
	if err := db.DB.Preload("Lines").Where("order_no = ? AND is_deleted = ?", orderNo, false).First(&order).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 订单号 " + orderNo + " 不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取单据失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, services.MapSalesOrderToResponse(order))
}

// SaveSalesOrderHandler 新增或更新订单 (及其明细)
func SaveSalesOrderHandler(c *gin.Context) {
	var req services.SaveSalesOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 订单数据格式错误: " + err.Error()})
		return
	}

	response, err := services.SaveSalesOrder(services.SaveSalesOrderCommand{
		Request:  req,
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})

	if err != nil {
		if err == ErrVersionConflict || errors.Is(err, services.ErrSalesTransactionVersionConflict) {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存订单失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// DeleteSalesOrderHandler 逻辑删除订单
func DeleteSalesOrderHandler(c *gin.Context) {
	id := c.Param("id")
	var order models.SalesOrder
	if err := db.DB.Preload("Lines").Where("id = ?", id).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 订单 ID " + id + " 不存在"})
		return
	}

	if order.Status != "Canceled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未作废订单不可直接删除，请先执行作废事务"})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		return tx.Model(&order).Updates(map[string]interface{}{
			"is_deleted": true,
			"version":    order.Version + 1,
		}).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除订单失败: " + err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// BulkSyncSalesOrdersHandler 批量同步销售订单 (数据抢救)
func BulkSyncSalesOrdersHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var input []services.SalesOrderSnapshotRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 订单同步数据错误: " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, payload := range input {
			order := services.MapSalesOrderSnapshotRequestToModel(payload)
			// 1. 保存/更新主表
			if err := saveSalesOrderForBulkSync(tx, &order); err != nil {
				return err
			}
			// 2. 强制同步明细行 (Replace 模式)
			if err := tx.Model(&order).Association("Lines").Replace(order.Lines); err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量同步订单失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, services.BulkSyncSalesOrdersResponse{Status: "success", Count: len(input)})
}
