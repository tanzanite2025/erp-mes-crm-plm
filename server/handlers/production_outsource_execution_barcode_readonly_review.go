package handlers

import (
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductionOutsourceExecutionBarcodeReviewHandler(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	for key, values := range c.Request.URL.Query() {
		if (key != "action" && key != "productBarcode") || len(values) != 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "委外扫码核对参数不正确"})
			return
		}
	}
	response, err := services.ReviewProductionOutsourceExecutionBarcode(c.Param("lineId"), c.Query("productBarcode"), c.Query("action"))
	if err != nil {
		respondOutsourceOrderError(c, err, "委外产品条码核对失败")
		return
	}
	c.JSON(http.StatusOK, response)
}
