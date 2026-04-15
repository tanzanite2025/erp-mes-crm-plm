package handlers

import (
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetVehicleSpecsCatalogHandler(c *gin.Context) {
	response, err := services.GetVehicleSpecsCatalog()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取车型规格库失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}
