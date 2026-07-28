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

func GetSalesReturnsHandler(c *gin.Context) {
	page, pageSize := parsePageQuery(c, 50)

	response, err := services.ListSalesReturns(services.SalesReturnListQuery{
		Page:            page,
		PageSize:        pageSize,
		CustomerID:      strings.TrimSpace(c.Query("customerId")),
		StatusFilterRaw: queryStatusFilter(c),
		Keyword:         strings.TrimSpace(c.Query("keyword")),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to list sales returns: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

func GetSalesReturnActualAmountRecordsHandler(c *gin.Context) {
	salesReturnID := strings.TrimSpace(c.Param("id"))
	if salesReturnID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "销售退货ID不能为空"})
		return
	}

	response, err := services.ListSalesReturnActualAmountRecords(salesReturnID)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "销售退货单不存在"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func PatchSalesReturnHandler(c *gin.Context) {
	salesReturnID := strings.TrimSpace(c.Param("id"))
	if salesReturnID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "销售退货ID不能为空"})
		return
	}

	var req services.PatchSalesReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operator := strings.TrimSpace(req.Operator)
	if operator == "" {
		operator = middleware.GetSafeUsername(c)
	}

	response, err := services.PatchSalesReturn(
		services.MapPatchSalesReturnRequestToInput(req, salesReturnID, operator),
	)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "销售退货单不存在"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func PatchSalesReturnLogisticsHandler(c *gin.Context) {
	salesReturnID := strings.TrimSpace(c.Param("id"))
	if salesReturnID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "销售退货ID不能为空"})
		return
	}

	var req services.PatchSalesReturnLogisticsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operator := strings.TrimSpace(req.Operator)
	if operator == "" {
		operator = middleware.GetSafeUsername(c)
	}

	response, err := services.PatchSalesReturnLogistics(
		services.MapPatchSalesReturnLogisticsRequestToInput(req, salesReturnID, operator),
	)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "销售退货单不存在"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func PatchSalesReturnActualAmountEntryHandler(c *gin.Context) {
	salesReturnID := strings.TrimSpace(c.Param("id"))
	if salesReturnID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "销售退货ID不能为空"})
		return
	}

	var req services.PatchSalesReturnActualAmountEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operator := strings.TrimSpace(req.Operator)
	if operator == "" {
		operator = middleware.GetSafeUsername(c)
	}

	response, err := services.PatchSalesReturnActualAmountEntry(
		services.MapPatchSalesReturnActualAmountEntryRequestToInput(req, salesReturnID, operator),
	)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "销售退货单不存在"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func BindSalesReturnLineBarcodesHandler(c *gin.Context) {
	salesReturnID := strings.TrimSpace(c.Param("id"))
	if salesReturnID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "销售退货ID不能为空"})
		return
	}

	var req services.BindSalesReturnLineBarcodesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operator := strings.TrimSpace(req.Operator)
	if operator == "" {
		operator = middleware.GetSafeUsername(c)
	}

	response, err := services.BindSalesReturnLineBarcodes(
		services.MapBindSalesReturnLineBarcodesRequestToInput(req, salesReturnID, operator),
	)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "销售退货单不存在"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func ConfirmSalesReturnInboundHandler(c *gin.Context) {
	salesReturnID := strings.TrimSpace(c.Param("id"))
	if salesReturnID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "销售退货ID不能为空"})
		return
	}

	var req services.ConfirmSalesReturnInboundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operator := strings.TrimSpace(req.Operator)
	if operator == "" {
		operator = middleware.GetSafeUsername(c)
	}

	response, err := services.ConfirmSalesReturnInbound(
		services.MapConfirmSalesReturnInboundRequestToInput(req, salesReturnID, operator),
	)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "销售退货单不存在"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func DeleteSalesReturnHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "销售退货ID不能为空"})
		return
	}

	err := services.DeleteSalesReturn(id)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "销售退货单不存在"})
		case errors.Is(err, services.ErrSalesReturnDeleteRequiresCreated):
			c.JSON(http.StatusBadRequest, gin.H{"error": "只有尚未进入执行链的已创建退货单可以删除"})
		case errors.Is(err, services.ErrSalesReturnDeleteHasActualAmountRecords):
			c.JSON(http.StatusBadRequest, gin.H{"error": "该销售退货单已有实际退款记录，禁止删除"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除销售退货单失败: " + err.Error()})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

func GetSalesReturnHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	response, err := services.GetSalesReturnByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] sales return not found: " + id})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load sales return: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func CreateSalesReturnHandler(c *gin.Context) {
	salesOrderID := strings.TrimSpace(c.Param("id"))
	if salesOrderID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "销售订单ID不能为空"})
		return
	}

	var req services.CreateSalesReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operator := strings.TrimSpace(req.Operator)
	if operator == "" {
		operator = middleware.GetSafeUsername(c)
	}

	response, err := services.CreateSalesReturn(
		services.MapCreateSalesReturnRequestToInput(req, salesOrderID, operator),
	)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "销售订单不存在"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}
