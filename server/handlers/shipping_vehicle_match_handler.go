package handlers

import (
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetShippingVehicleMatchItemsHandler(c *gin.Context) {
	items, err := services.ListShippingVehicleMatchItems()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取待匹配发货列表失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}
