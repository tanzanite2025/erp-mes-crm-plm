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

func GetCustomerQuoteSummaryHandler(c *gin.Context) {
	customerID := strings.TrimSpace(c.Query("customerId"))
	if customerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[CLIENT] customerId is required",
			"code":  "QUOTE_CUSTOMER_SUMMARY_CUSTOMER_ID_REQUIRED",
		})
		return
	}

	response, err := services.ListCustomerQuoteSummary(services.CustomerQuoteSummaryQuery{CustomerID: customerID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] failed to load customer quote summary: " + err.Error(),
			"code":  "QUOTE_CUSTOMER_SUMMARY_FETCH_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

func ConvertQuoteHandler(c *gin.Context) {
	id := c.Param("id")
	response, err := services.ConvertQuoteToSalesOrder(id, middleware.GetSafeUsername(c))
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": "[CRITICAL] quote not found: " + id,
				"code":  "QUOTE_CONVERT_NOT_FOUND",
			})
		case errors.Is(err, services.ErrQuoteConversionNotAllowed):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
				"code":  "QUOTE_CONVERT_REJECTED",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "[SERVER] failed to convert quote: " + err.Error(),
				"code":  "QUOTE_CONVERT_FAILED",
			})
		}
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

func PatchQuoteHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "quote id is required",
			"code":  "QUOTE_PATCH_ID_REQUIRED",
		})
		return
	}

	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] invalid quote patch payload: " + err.Error(),
			"code":  "QUOTE_PATCH_INVALID_PAYLOAD",
		})
		return
	}

	response, err := services.PatchQuoteDraft(id, req, middleware.GetSafeUsername(c))
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": "[CRITICAL] quote not found: " + id,
				"code":  "QUOTE_PATCH_NOT_FOUND",
			})
		case errors.Is(err, services.ErrQuotePatchConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrQuotePatchNotEditable),
			strings.Contains(err.Error(), "invalid quote patch"):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
				"code":  "QUOTE_PATCH_REJECTED",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "[SERVER] failed to patch quote: " + err.Error(),
				"code":  "QUOTE_PATCH_FAILED",
			})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}
