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

// GetPurchaseOrdersHandler 获取所有采购订单 (分页优化)
func GetPurchaseOrdersHandler(c *gin.Context) {
	page, pageSize := parsePageQuery(c, 50)

	response, err := services.ListPurchaseOrders(services.PurchaseOrderListQuery{
		Page:            page,
		PageSize:        pageSize,
		Deleted:         false,
		WithLines:       queryIncludesLines(c),
		StatusFilterRaw: queryStatusFilter(c),
	})
	if err != nil {
		respondPurchaseOrderError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetPurchaseOrderHandler 获取单个采购订单
func GetPurchaseOrderHandler(c *gin.Context) {
	id := c.Param("id")
	response, err := services.GetPurchaseOrderByID(id)
	if err != nil {
		respondPurchaseOrderError(c, http.StatusNotFound, "采购订单不存在")
		return
	}
	c.JSON(http.StatusOK, response)
}

// SavePurchaseOrderHandler 保存/更新采购订单
func SavePurchaseOrderHandler(c *gin.Context) {
	var req services.SavePurchaseOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
		return
	}

	response, err := services.SavePurchaseOrder(services.SavePurchaseOrderCommand{
		Request:  req,
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})

	if err != nil {
		if err == ErrVersionConflict || errors.Is(err, services.ErrPurchaseTransactionVersionConflict) {
			respondVersionConflict(c)
			return
		}
		respondPurchaseOrderError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}

// PatchPurchaseOrderHandler 局部更新采购订单
func PatchPurchaseOrderHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
		return
	}

	response, err := services.PatchPurchaseOrder(services.PatchPurchaseOrderCommand{
		OrderID:  id,
		DeltaReq: req,
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})

	if err != nil {
		if strings.Contains(err.Error(), "invalid purchase order delta") || strings.Contains(err.Error(), "字段错误") {
			respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
			return
		}
		if err == ErrVersionConflict || errors.Is(err, services.ErrPurchaseTransactionVersionConflict) {
			respondVersionConflict(c)
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondPurchaseOrderError(c, http.StatusNotFound, "采购订单不存在")
			return
		}
		respondPurchaseOrderError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}

func ConfirmPurchaseReceiptHandler(c *gin.Context) {
	purchaseOrderID := strings.TrimSpace(c.Param("id"))
	if purchaseOrderID == "" {
		respondPurchaseOrderError(c, http.StatusBadRequest, "采购订单ID不能为空")
		return
	}

	var req services.ConfirmPurchaseReceiptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
		return
	}

	operator := middleware.GetSafeUsername(c)

	payload, err := services.MarshalPurchaseOrderReceiptConfirmPayload(req, operator)
	if err != nil {
		respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
		return
	}
	parsedPayload, err := services.ParsePurchaseOrderReceiptConfirmPayload(payload)
	if err != nil {
		respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := services.ExecutePurchaseOrderReceiptConfirmation(services.ExecutePurchaseOrderReceiptConfirmationCommand{
		OrderID:         purchaseOrderID,
		ActorID:         middleware.GetSafeUserID(c),
		Operator:        operator,
		ExpectedVersion: 0,
		Payload:         parsedPayload,
		IP:              c.ClientIP(),
	})
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			respondPurchaseOrderError(c, http.StatusNotFound, "采购订单不存在")
		default:
			respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	c.JSON(http.StatusOK, result)
}

// DeletePurchaseOrderHandler 删除采购订单 (逻辑删除)
func DeletePurchaseOrderHandler(c *gin.Context) {
	id := c.Param("id")
	if err := services.DeletePurchaseOrder(id); err != nil {
		respondPurchaseOrderError(c, http.StatusInternalServerError, err.Error())
		return
	}
	c.Status(http.StatusNoContent)
}

// GetDeletedPurchaseOrdersHandler 获取已作废的采购订单 (审计日志)
func GetDeletedPurchaseOrdersHandler(c *gin.Context) {
	page, pageSize := parsePageQuery(c, 50)

	response, err := services.ListPurchaseOrders(services.PurchaseOrderListQuery{
		Page:            page,
		PageSize:        pageSize,
		Deleted:         true,
		WithLines:       queryIncludesLines(c),
		StatusFilterRaw: queryStatusFilter(c),
	})
	if err != nil {
		respondPurchaseOrderError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}
