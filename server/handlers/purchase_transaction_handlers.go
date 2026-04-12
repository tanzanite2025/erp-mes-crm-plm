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

func ExecutePurchaseOrderTransactionHandler(c *gin.Context) {
	orderID := strings.TrimSpace(c.Param("id"))
	if orderID == "" {
		respondPurchaseOrderError(c, http.StatusBadRequest, "采购订单ID不能为空")
		return
	}

	var req services.PurchaseOrderTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondPurchaseOrderError(c, http.StatusBadRequest, "[VALIDATION] transaction 数据格式错误: "+err.Error())
		return
	}

	actorID := strings.TrimSpace(req.ActorID)
	if actorID == "" {
		actorID = middleware.GetSafeUserID(c)
	}

	if strings.TrimSpace(req.Intent) == services.PurchaseTransactionIntentReceiptConfirm {
		payload, err := services.ParsePurchaseOrderReceiptConfirmPayload(req.Payload)
		if err != nil {
			respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
			return
		}

		result, err := services.ExecutePurchaseOrderReceiptConfirmation(services.ExecutePurchaseOrderReceiptConfirmationCommand{
			OrderID:         orderID,
			ActorID:         actorID,
			Operator:        middleware.GetSafeUsername(c),
			ExpectedVersion: req.ExpectedVersion,
			Payload:         payload,
			IP:              c.ClientIP(),
		})
		if err != nil {
			switch {
			case errors.Is(err, gorm.ErrRecordNotFound):
				respondPurchaseOrderError(c, http.StatusNotFound, "采购订单不存在")
			case errors.Is(err, services.ErrPurchaseTransactionVersionConflict):
				respondVersionConflict(c)
			default:
				respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
			}
			return
		}

		c.JSON(http.StatusOK, result)
		return
	}

	result, err := services.ExecutePurchaseOrderTransaction(services.ExecutePurchaseOrderTransactionInput{
		OrderID:         orderID,
		Intent:          req.Intent,
		ActorID:         actorID,
		Operator:        middleware.GetSafeUsername(c),
		ExpectedVersion: req.ExpectedVersion,
		Payload:         req.Payload,
		IP:              c.ClientIP(),
	})
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			respondPurchaseOrderError(c, http.StatusNotFound, "采购订单不存在")
		case errors.Is(err, services.ErrPurchaseTransactionVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrPurchaseTransactionUnsupportedIntent), errors.Is(err, services.ErrPurchaseTransactionInvalidPayload):
			respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
		default:
			respondPurchaseOrderError(c, http.StatusInternalServerError, "[SERVER] 执行采购事务失败: "+err.Error())
		}
		return
	}

	c.JSON(http.StatusOK, result)
}
