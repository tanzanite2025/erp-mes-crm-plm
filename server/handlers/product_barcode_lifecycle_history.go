package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

const productBarcodeLifecycleHistoryNotFoundErrorCode = "PRODUCT_BARCODE_LIFECYCLE_NOT_FOUND"

func GetProductBarcodeLifecycleHistoryHandler(c *gin.Context) {
	limit, err := parseProductBarcodeLifecycleHistoryQueryInteger(c, "limit")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] limit must be an integer"})
		return
	}
	offset, err := parseProductBarcodeLifecycleHistoryQueryInteger(c, "offset")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] offset must be an integer"})
		return
	}

	response, err := services.GetProductBarcodeLifecycleHistory(services.ProductBarcodeLifecycleHistoryQuery{
		ProductBarcode: c.Param("productBarcode"),
		Limit:          limit,
		Offset:         offset,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrProductBarcodeStateNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":  productBarcodeLifecycleHistoryNotFoundErrorCode,
				"error": "[NOT_FOUND] 产品编码生命周期不存在",
			})
		case errors.Is(err, services.ErrInvalidProductBarcodeState):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 产品编码生命周期查询失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func parseProductBarcodeLifecycleHistoryQueryInteger(c *gin.Context, name string) (int, error) {
	value := c.Query(name)
	if value == "" {
		return 0, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, err
	}
	return parsed, nil
}
