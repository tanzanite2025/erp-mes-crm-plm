package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetOutsourceOrdersHandler(c *gin.Context) {
	response, err := services.ListOutsourceOrders(services.OutsourceOrderListQuery{
		Search:     c.Query("search"),
		Status:     c.Query("status"),
		SourceType: c.Query("sourceType"),
		PartnerID:  c.Query("partnerId"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch outsource orders"})
		return
	}
	c.JSON(http.StatusOK, response)
}

func CreateOutsourceOrderHandler(c *gin.Context) {
	var input services.OutsourceOrderDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	order, err := services.CreateOutsourceOrder(services.SaveOutsourceOrderRequest{
		Order:    input,
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		respondOutsourceOrderError(c, err, "Failed to create outsource order")
		return
	}

	c.JSON(http.StatusOK, order)
}

func UpdateOutsourceOrderHandler(c *gin.Context) {
	var input services.OutsourceOrderDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	order, err := services.UpdateOutsourceOrder(services.UpdateOutsourceOrderRequest{
		ID:       c.Param("id"),
		Order:    input,
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		respondOutsourceOrderError(c, err, "Failed to update outsource order")
		return
	}

	c.JSON(http.StatusOK, order)
}

func DeleteOutsourceOrderHandler(c *gin.Context) {
	err := services.DeleteOutsourceOrder(services.DeleteOutsourceOrderRequest{
		ID:       c.Param("id"),
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		respondOutsourceOrderError(c, err, "Failed to delete outsource order")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted successfully"})
}

func ReleaseOutsourceOrderHandler(c *gin.Context) {
	order, err := services.ReleaseOutsourceOrder(services.ReleaseOutsourceOrderRequest{
		ID:       c.Param("id"),
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		respondOutsourceOrderError(c, err, "Failed to release outsource order")
		return
	}

	c.JSON(http.StatusOK, order)
}

func respondOutsourceOrderError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, services.ErrInvalidOutsourceOrder):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrOutsourceOrderDuplicateNo):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrOutsourceOrderVersionConflict):
		respondVersionConflict(c)
	case errors.Is(err, services.ErrOutsourceOrderNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": fallback + ": " + err.Error()})
	}
}
