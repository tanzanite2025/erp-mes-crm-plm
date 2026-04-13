package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetQuotesHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))

	response, err := services.ListQuotes(services.QuoteListQuery{
		Page:               page,
		PageSize:           pageSize,
		CustomerSegmentRaw: c.Query("customerSegment"),
		StatusRaw:          c.Query("status"),
		TypeRaw:            c.Query("type"),
		Keyword:            c.Query("q"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] failed to list quotes: " + err.Error(),
			"code":  "QUOTE_LIST_FETCH_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

func ConvertQuoteHandler(c *gin.Context) {
	id := c.Param("id")
	response, err := services.ConvertQuoteToSalesOrder(id, middleware.GetSafeUsername(c))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "[CRITICAL] quote not found: " + id,
				"code":  "QUOTE_CONVERT_NOT_FOUND",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] failed to convert quote: " + err.Error(),
			"code":  "QUOTE_CONVERT_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

func GetQuoteDetailHandler(c *gin.Context) {
	id := c.Param("id")
	response, err := services.GetQuoteDetail(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "[CRITICAL] quote not found: " + id,
				"code":  "QUOTE_DETAIL_NOT_FOUND",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] failed to load quote detail: " + err.Error(),
			"code":  "QUOTE_DETAIL_FETCH_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, response)
}
