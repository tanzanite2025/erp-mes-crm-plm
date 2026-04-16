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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to list sales orders: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

func GetSalesOrderHandler(c *gin.Context) {
	id := c.Param("id")
	response, err := services.GetSalesOrderByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] sales order not found: " + id})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load sales order: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func GetSalesOrderByNoHandler(c *gin.Context) {
	orderNo := c.Param("orderNo")
	response, err := services.GetSalesOrderByNo(orderNo)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] sales order not found by orderNo: " + orderNo})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load sales order by orderNo: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func SaveSalesOrderHandler(c *gin.Context) {
	var req services.SaveSalesOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid sales order payload: " + err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to save sales order: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

func PatchSalesOrderHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid sales order patch payload: " + err.Error()})
		return
	}

	response, err := services.PatchSalesOrder(services.PatchSalesOrderCommand{
		OrderID:  id,
		DeltaReq: req,
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		switch {
		case strings.Contains(err.Error(), "invalid sales order delta"):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case err == ErrVersionConflict || errors.Is(err, services.ErrSalesTransactionVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] sales order not found: " + id})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to patch sales order: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func DeleteSalesOrderHandler(c *gin.Context) {
	id := c.Param("id")
	err := services.DeleteSalesOrder(id)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] sales order not found: " + id})
		case errors.Is(err, services.ErrSalesOrderDeleteRequiresCanceled):
			c.JSON(http.StatusBadRequest, gin.H{"error": "sales order must be canceled before delete"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete sales order: " + err.Error()})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

func BulkSyncSalesOrdersHandler(c *gin.Context) {
	if !enforceBulkSyncPermissions(c) {
		return
	}

	var input []services.SalesOrderSnapshotRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid sales order sync payload: " + err.Error()})
		return
	}

	if err := services.BulkSyncSalesOrders(input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to bulk sync sales orders: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, services.BulkSyncSalesOrdersResponse{Status: "success", Count: len(input)})
}
