package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var allowedVoucherSourceTypes = map[string]struct{}{
	models.FinancialVoucherSourceInbound:  {},
	models.FinancialVoucherSourceShipment: {},
}

var allowedVoucherStatuses = map[string]struct{}{
	models.FinancialVoucherStatusDraft:  {},
	models.FinancialVoucherStatusPosted: {},
	models.FinancialVoucherStatusVoid:   {},
}

// GetFinancialVouchersHandler returns voucher headers by filters.
func GetFinancialVouchersHandler(c *gin.Context) {
	sourceType := strings.ToUpper(strings.TrimSpace(c.Query("sourceType")))
	sourceRefID := strings.TrimSpace(c.Query("sourceRefId"))
	status := strings.ToUpper(strings.TrimSpace(c.Query("status")))
	includeEntriesRaw := strings.TrimSpace(c.Query("includeEntries"))

	if sourceType != "" {
		if _, ok := allowedVoucherSourceTypes[sourceType]; !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "sourceType 参数非法"})
			return
		}
	}
	if status != "" {
		if _, ok := allowedVoucherStatuses[status]; !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "status 参数非法"})
			return
		}
	}

	includeEntries := false
	if includeEntriesRaw != "" {
		parsed, err := strconv.ParseBool(includeEntriesRaw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "includeEntries 参数非法，应为 true/false"})
			return
		}
		includeEntries = parsed
	}

	query := db.DB.Model(&models.FinancialVoucher{})
	if includeEntries {
		query = query.Preload("Entries")
	}
	if sourceType != "" {
		query = query.Where("source_type = ?", sourceType)
	}
	if sourceRefID != "" {
		query = query.Where("source_ref_id = ?", sourceRefID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var vouchers []models.FinancialVoucher
	if err := query.Order("created_at desc").Find(&vouchers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取凭证列表失败"})
		return
	}
	if vouchers == nil {
		vouchers = make([]models.FinancialVoucher, 0)
	}

	c.JSON(http.StatusOK, services.MapFinancialVouchersToResponse(vouchers))
}

// GetFinancialVoucherHandler returns one voucher with entries.
func GetFinancialVoucherHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id 不能为空"})
		return
	}

	var voucher models.FinancialVoucher
	err := db.DB.Preload("Entries").First(&voucher, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "凭证不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取凭证详情失败"})
		return
	}

	c.JSON(http.StatusOK, services.MapFinancialVoucherToResponse(voucher))
}
