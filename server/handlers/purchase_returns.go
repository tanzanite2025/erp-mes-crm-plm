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

func GetPurchaseReturnsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	response, err := services.ListPurchaseReturns(services.PurchaseReturnListQuery{
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		respondPurchaseOrderError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}

func CreatePurchaseReturnHandler(c *gin.Context) {
	purchaseOrderID := strings.TrimSpace(c.Param("id"))
	if purchaseOrderID == "" {
		respondPurchaseOrderError(c, http.StatusBadRequest, "采购订单ID不能为空")
		return
	}

	var req services.CreatePurchaseReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
		return
	}

	operator := strings.TrimSpace(req.Operator)
	if operator == "" {
		operator = middleware.GetSafeUsername(c)
	}

	response, err := services.CreatePurchaseReturn(
		services.MapCreatePurchaseReturnRequestToInput(req, purchaseOrderID, operator),
	)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			respondPurchaseOrderError(c, http.StatusNotFound, "采购订单不存在")
		default:
			respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	c.JSON(http.StatusOK, response)
}
