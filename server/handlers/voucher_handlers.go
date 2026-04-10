package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// GetFinancialVouchersHandler returns voucher headers by filters.
func GetFinancialVouchersHandler(c *gin.Context) {
	sourceType := strings.ToUpper(strings.TrimSpace(c.Query("sourceType")))
	sourceRefID := strings.TrimSpace(c.Query("sourceRefId"))
	status := strings.ToUpper(strings.TrimSpace(c.Query("status")))
	includeEntriesRaw := strings.TrimSpace(c.Query("includeEntries"))

	includeEntries := false
	if includeEntriesRaw != "" {
		parsed, err := strconv.ParseBool(includeEntriesRaw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "includeEntries 参数非法，应为 true/false"})
			return
		}
		includeEntries = parsed
	}

	vouchers, err := services.ListFinancialVouchers(services.FinancialVoucherQueryRequest{
		SourceType:     sourceType,
		SourceRefID:    sourceRefID,
		Status:         status,
		IncludeEntries: includeEntries,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrFinancialVoucherInvalidSourceType):
			c.JSON(http.StatusBadRequest, gin.H{"error": "sourceType 鍙傛暟闈炴硶"})
		case errors.Is(err, services.ErrFinancialVoucherInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{"error": "status 鍙傛暟闈炴硶"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "鑾峰彇鍑瘉鍒楄〃澶辫触"})
		}
		return
	}

	c.JSON(http.StatusOK, vouchers)
}

// GetFinancialVoucherHandler returns one voucher with entries.
func GetFinancialVoucherHandler(c *gin.Context) {
	voucher, err := services.GetFinancialVoucher(c.Param("id"))
	if err != nil {
		switch {
		case errors.Is(err, services.ErrFinancialVoucherIDRequired):
			c.JSON(http.StatusBadRequest, gin.H{"error": "id 涓嶈兘涓虹┖"})
		case errors.Is(err, services.ErrFinancialVoucherNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "鍑瘉涓嶅瓨鍦?"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "鑾峰彇鍑瘉璇︽儏澶辫触"})
		}
		return
	}

	c.JSON(http.StatusOK, voucher)
}
