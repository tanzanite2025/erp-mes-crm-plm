package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"
	"xdfc-server/services/trading_audit"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func GetCustomersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	isOptions := c.Query("options") == "true"
	response, err := services.ListCustomers(services.CustomerListQuery{
		Page:           page,
		PageSize:       pageSize,
		Options:        isOptions,
		Search:         c.Query("search"),
		IncludeDeleted: c.Query("includeDeleted") == "true",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] 获取客户列表失败: " + err.Error(),
			"code":  "CUSTOMER_LIST_FETCH_FAILED",
		})
		return
	}
	if isOptions {
		c.JSON(http.StatusOK, response.Items)
		return
	}
	c.JSON(http.StatusOK, response)
}

func SaveCustomerHandler(c *gin.Context) {
	var req CustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 客户数据格式错误: " + err.Error(),
			"code":  "CUSTOMER_SAVE_VALIDATION_FAILED",
		})
		return
	}

	response, err := services.SaveCustomer(services.SaveCustomerRequest(req), middleware.GetSafeUserID(c), middleware.GetSafeUsername(c), c.ClientIP())
	if err != nil {
		if errors.Is(err, services.ErrCustomerTransactionVersionConflict) || err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] 保存客户失败: " + err.Error(),
			"code":  "CUSTOMER_SAVE_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

func PatchCustomerHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 客户更新数据格式错误: " + err.Error(),
			"code":  "CUSTOMER_PATCH_VALIDATION_FAILED",
		})
		return
	}

	if err := validateSupportedTopLevelDeltaKeys(req.Delta, "name", "code", "contactPerson", "contactPhone", "wechat", "whatsapp", "facebook", "instagram", "telegram", "email", "address", "status", "creditLimit", "balance"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] customer delta is invalid: " + err.Error(),
			"code":  "CUSTOMER_PATCH_VALIDATION_FAILED",
		})
		return
	}

	patch := services.PatchCustomerRequest{ID: id, Version: int(req.Metadata.Version)}
	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "[VALIDATION] 无效的客户差量数据",
				"code":  "CUSTOMER_PATCH_VALIDATION_FAILED",
			})
			return
		}

		switch key {
		case "name", "code", "contactPerson", "contactPhone", "wechat", "whatsapp", "facebook", "instagram", "telegram", "email", "address", "status":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "[VALIDATION] 客户字段格式错误: " + key,
					"code":  "CUSTOMER_PATCH_VALIDATION_FAILED",
				})
				return
			}
			switch key {
			case "name":
				patch.Name = &value
			case "code":
				patch.Code = &value
			case "contactPerson":
				patch.ContactPerson = &value
			case "contactPhone":
				patch.ContactPhone = &value
			case "wechat":
				patch.WeChat = &value
			case "whatsapp":
				patch.WhatsApp = &value
			case "facebook":
				patch.Facebook = &value
			case "instagram":
				patch.Instagram = &value
			case "telegram":
				patch.Telegram = &value
			case "email":
				patch.Email = &value
			case "address":
				patch.Address = &value
			case "status":
				patch.Status = &value
			}
		case "creditLimit", "balance":
			var value float64
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "[VALIDATION] 客户字段格式错误: " + key,
					"code":  "CUSTOMER_PATCH_VALIDATION_FAILED",
				})
				return
			}
			if key == "creditLimit" {
				patch.CreditLimit = &value
			} else {
				patch.Balance = &value
			}
		}
	}

	response, err := services.PatchCustomer(patch, middleware.GetSafeUserID(c), middleware.GetSafeUsername(c), c.ClientIP())
	if err != nil {
		if errors.Is(err, services.ErrCustomerTransactionVersionConflict) || err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] 更新客户失败: " + err.Error(),
			"code":  "CUSTOMER_PATCH_FAILED",
		})
		return
	}
	c.JSON(http.StatusOK, response)
}

func DeleteCustomerHandler(c *gin.Context) {
	id := c.Param("id")

	var orderCount int64
	db.DB.Model(&models.SalesOrder{}).
		Where("customer_id = ? AND status NOT IN (?)", id, []string{"Done", "Canceled"}).
		Count(&orderCount)

	if orderCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error": "[BLOCKING] 无法删除客户：该客户尚有关联的未完成业务订单。",
			"code":  "CUSTOMER_DELETE_BLOCKED",
		})
		return
	}

	if err := services.DeleteCustomer(id, middleware.GetSafeUserID(c), middleware.GetSafeUsername(c), c.ClientIP()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] 删除客户失败: " + err.Error(),
			"code":  "CUSTOMER_DELETE_FAILED",
		})
		return
	}
	c.Status(http.StatusNoContent)
}

func BulkSyncCustomersHandler(c *gin.Context) {
	if !enforceBulkSyncPermissions(c) {
		return
	}

	var input []BulkSyncCustomerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 批量同步数据错误: " + err.Error(),
			"code":  "CUSTOMER_BULK_SYNC_VALIDATION_FAILED",
		})
		return
	}

	customers := make([]models.Customer, 0, len(input))
	for _, item := range input {
		customers = append(customers, mapBulkSyncCustomerRequestToModel(item))
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, cust := range customers {
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "code"}},
				UpdateAll: true,
			}).Create(&cust).Error; err != nil {
				return err
			}
			if err := services.RecordAuditEventTx(tx, trading_audit.BuildCustomerCreateEvent(cust, audit.AuditActor{UserID: middleware.GetSafeUserID(c), Username: middleware.GetSafeUsername(c), IP: c.ClientIP(), Source: "bulk-sync"})); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] 批量同步失败: " + err.Error(),
			"code":  "CUSTOMER_BULK_SYNC_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(customers)})
}
