package handlers

import (
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func SaveProductionOutsourceOrderLineOptionalBarcodeRegistrationHandler(c *gin.Context) {
	var input services.SaveProductionOutsourceOrderLineOptionalBarcodeRegistrationRequest
	if err := c.ShouldBindJSON(&input); err != nil || input.ProductBarcodes == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提交条码列表（允许空列表）和明细版本"})
		return
	}
	input.LineID = c.Param("lineId")
	input.ActorID = middleware.GetSafeUserID(c)
	input.Operator = middleware.GetSafeUsername(c)
	input.IP = c.ClientIP()
	response, err := services.SaveProductionOutsourceOrderLineOptionalBarcodeRegistration(input)
	if err != nil {
		respondOutsourceOrderError(c, err, "委外条码登记保存失败")
		return
	}
	c.JSON(http.StatusOK, response)
}
