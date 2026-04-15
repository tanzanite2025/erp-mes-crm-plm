package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func SaveVehicleSpecPhotoHandler(c *gin.Context) {
	vehicleID := strings.TrimSpace(c.Param("id"))
	var input services.SaveVehiclePhotoRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 车型图片数据格式错误: " + err.Error()})
		return
	}

	entry, err := services.SaveVehiclePhoto(vehicleID, input)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrVehiclePhotoSpecNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 未找到对应车型规格，无法绑定图片"})
		case errors.Is(err, services.ErrVehiclePhotoURLRequired), errors.Is(err, services.ErrVehiclePhotoViewTypeInvalid):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存车型图片失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, entry)
}
