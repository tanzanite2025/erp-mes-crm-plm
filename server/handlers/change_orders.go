package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetChangeOrdersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	items, total, err := services.ListChangeOrders(services.ChangeOrderListQuery{
		Page:       page,
		PageSize:   pageSize,
		Options:    isOptions,
		ProductID:  c.Query("productId"),
		ChangeType: c.Query("changeType"),
		Status:     c.Query("status"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load change orders: " + err.Error()})
		return
	}

	if isOptions {
		c.JSON(http.StatusOK, toChangeOrderOptionsApiDTOs(items))
		return
	}

	c.JSON(http.StatusOK, ChangeOrderListPageApiDTO{
		Items:    toChangeOrderApiDTOs(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

func SaveChangeOrderHandler(c *gin.Context) {
	var input services.SaveChangeOrderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid change order payload: " + err.Error()})
		return
	}

	if strings.TrimSpace(input.ChangeOrderNo) == "" || strings.TrimSpace(input.Title) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] change order number and title are required"})
		return
	}

	saved, err := services.SaveChangeOrder(input)
	if err != nil {
		if errors.Is(err, services.ErrChangeOrderVersionConflict) {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to save change order: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, toChangeOrderApiDTO(saved))
}

func DeleteChangeOrderHandler(c *gin.Context) {
	id := c.Param("id")
	if strings.TrimSpace(id) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] change order id is required"})
		return
	}

	err := services.DeleteChangeOrder(id)
	if err != nil {
		if errors.Is(err, services.ErrChangeOrderLinkedToBOM) {
			c.JSON(http.StatusConflict, gin.H{"error": "[VALIDATION] change order is already linked to BOM records"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete change order: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "change order deleted"})
}
