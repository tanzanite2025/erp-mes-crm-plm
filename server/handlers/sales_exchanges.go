package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetSalesExchangesHandler(c *gin.Context) {
	page, pageSize := parsePageQuery(c, 50)

	response, err := services.ListSalesExchanges(services.SalesExchangeListQuery{
		Page:            page,
		PageSize:        pageSize,
		CustomerID:      strings.TrimSpace(c.Query("customerId")),
		StatusFilterRaw: queryStatusFilter(c),
		Keyword:         strings.TrimSpace(c.Query("keyword")),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to list sales exchanges: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

func GetSalesExchangeHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	response, err := services.GetSalesExchangeByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] sales exchange not found: " + id})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load sales exchange: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func PatchSalesExchangeOldItemLogisticsHandler(c *gin.Context) {
	salesExchangeID := strings.TrimSpace(c.Param("id"))
	if salesExchangeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales exchange id is required"})
		return
	}

	var req services.PatchSalesExchangeOldItemLogisticsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operator := strings.TrimSpace(req.Operator)
	if operator == "" {
		operator = middleware.GetSafeUsername(c)
	}

	response, err := services.PatchSalesExchangeOldItemLogistics(
		services.MapPatchSalesExchangeOldItemLogisticsRequestToInput(
			req,
			salesExchangeID,
			operator,
		),
	)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "sales exchange not found"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func CreateSalesExchangeHandler(c *gin.Context) {
	salesOrderID := strings.TrimSpace(c.Param("id"))
	if salesOrderID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales order id is required"})
		return
	}

	var req services.CreateSalesExchangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operator := strings.TrimSpace(req.Operator)
	if operator == "" {
		operator = middleware.GetSafeUsername(c)
	}

	response, err := services.CreateSalesExchange(
		services.MapCreateSalesExchangeRequestToInput(req, salesOrderID, operator),
	)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "sales order not found"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func DeleteSalesExchangeHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales exchange id is required"})
		return
	}

	err := services.DeleteSalesExchange(id)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "sales exchange not found"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

func ConfirmSalesExchangeOldItemInboundHandler(c *gin.Context) {
	salesExchangeID := strings.TrimSpace(c.Param("id"))
	if salesExchangeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales exchange id is required"})
		return
	}

	var req services.ConfirmSalesExchangeOldItemInboundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operator := strings.TrimSpace(req.Operator)
	if operator == "" {
		operator = middleware.GetSafeUsername(c)
	}

	response, err := services.ConfirmSalesExchangeOldItemInbound(
		services.MapConfirmSalesExchangeOldItemInboundRequestToInput(req, salesExchangeID, operator),
	)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "sales exchange not found"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func ConfirmSalesExchangeReplacementShipmentHandler(c *gin.Context) {
	salesExchangeID := strings.TrimSpace(c.Param("id"))
	if salesExchangeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales exchange id is required"})
		return
	}

	var req services.ConfirmSalesExchangeReplacementShipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operator := strings.TrimSpace(req.Operator)
	if operator == "" {
		operator = middleware.GetSafeUsername(c)
	}

	response, err := services.ConfirmSalesExchangeReplacementShipment(
		services.MapConfirmSalesExchangeReplacementShipmentRequestToInput(req, salesExchangeID, operator),
	)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "sales exchange not found"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func VoidSalesExchangeReplacementShipmentHandler(c *gin.Context) {
	salesExchangeID := strings.TrimSpace(c.Param("id"))
	shipmentID := strings.TrimSpace(c.Param("shipmentId"))
	if salesExchangeID == "" || shipmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales exchange id and shipment id are required"})
		return
	}

	var req services.VoidSalesExchangeReplacementShipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operator := strings.TrimSpace(req.Operator)
	if operator == "" {
		operator = middleware.GetSafeUsername(c)
	}

	result, err := services.VoidSalesExchangeReplacementShipment(
		services.MapVoidSalesExchangeReplacementShipmentRequestToInput(
			req,
			salesExchangeID,
			shipmentID,
			operator,
		),
	)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound),
			errors.Is(err, services.ErrSalesExchangeReplacementShipmentNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "sales exchange replacement shipment not found"})
		case errors.Is(err, services.ErrSalesExchangeReplacementShipmentAlreadyVoided):
			c.JSON(http.StatusConflict, gin.H{"error": "sales exchange replacement shipment is already voided"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, services.MapVoidSalesExchangeReplacementShipmentResultToResponse(result))
}
