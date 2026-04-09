package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetSalesOrdersHandler 获取所有销售订单 (已加成分页与性能优化)
func GetSalesOrdersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	withLines := strings.EqualFold(strings.TrimSpace(c.Query("withLines")), "true")
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	response, err := services.ListSalesOrders(services.SalesOrderListQuery{
		Page:            page,
		PageSize:        pageSize,
		WithLines:       withLines,
		StatusFilterRaw: c.Query("status"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取订单列表失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetSalesOrderHandler 获取单笔订单详情
func GetSalesOrderHandler(c *gin.Context) {
	id := c.Param("id")
	response, err := services.GetSalesOrderByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 订单 ID " + id + " 不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取订单详情失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// GetSalesOrderByNoHandler 按单号获取订单详情 (用于同步流程)
func GetSalesOrderByNoHandler(c *gin.Context) {
	orderNo := c.Param("orderNo")
	response, err := services.GetSalesOrderByNo(orderNo)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 订单号 " + orderNo + " 不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取单据失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
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
	err := services.DeleteSalesOrder(id)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 订单 ID " + id + " 不存在"})
		case errors.Is(err, services.ErrSalesOrderDeleteRequiresCanceled):
			c.JSON(http.StatusBadRequest, gin.H{"error": "未作废订单不可直接删除，请先执行作废事务"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除订单失败: " + err.Error()})
		}
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

	if err := services.BulkSyncSalesOrders(input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量同步订单失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, services.BulkSyncSalesOrdersResponse{Status: "success", Count: len(input)})
}
