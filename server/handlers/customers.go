package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func GetCustomersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	query := db.DB.Model(&models.Customer{}).Where("is_deleted = ?", false)

	if isOptions {
		var customers []models.Customer
		if err := query.Order("name asc").Find(&customers).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "[SERVER] 获取客户选项失败: " + err.Error(),
				"code":  "CUSTOMER_OPTIONS_FETCH_FAILED",
			})
			return
		}

		c.JSON(http.StatusOK, customers)
		return
	}

	var total int64
	query.Count(&total)

	var items []models.Customer
	if err := query.Order("name asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] 获取客户列表失败: " + err.Error(),
			"code":  "CUSTOMER_LIST_FETCH_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func SaveCustomerHandler(c *gin.Context) {
	var input models.Customer
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 客户数据格式错误: " + err.Error(),
			"code":  "CUSTOMER_SAVE_VALIDATION_FAILED",
		})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if input.ID != "" {
			var existing models.Customer
			if err := tx.Where("id = ?", input.ID).First(&existing).Error; err == nil {
				if input.Version != existing.Version {
					return ErrVersionConflict
				}

				input.Version = existing.Version + 1
				return tx.Model(&existing).Select("*").Updates(input).Error
			}
		}

		input.Version = 1
		return tx.Create(&input).Error
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] 保存客户失败: " + err.Error(),
			"code":  "CUSTOMER_SAVE_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, input)
}

func PatchCustomerHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.PatchDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 客户更新数据格式错误: " + err.Error(),
			"code":  "CUSTOMER_PATCH_VALIDATION_FAILED",
		})
		return
	}

	updates := make(map[string]interface{})
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
		case "name", "code", "contactPerson", "contactPhone", "email", "address", "status":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "[VALIDATION] 客户字段格式错误: " + key,
					"code":  "CUSTOMER_PATCH_VALIDATION_FAILED",
				})
				return
			}
			updates[key] = value
		case "creditLimit", "balance":
			var value float64
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "[VALIDATION] 客户字段格式错误: " + key,
					"code":  "CUSTOMER_PATCH_VALIDATION_FAILED",
				})
				return
			}
			updates[key] = value
		}
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.Customer
		if err := tx.Where("id = ? AND is_deleted = ?", id, false).First(&existing).Error; err != nil {
			return err
		}
		if req.Metadata.Version != existing.Version {
			return ErrVersionConflict
		}

		updates["version"] = existing.Version + 1
		return tx.Model(&existing).Updates(updates).Error
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] 更新客户失败: " + err.Error(),
			"code":  "CUSTOMER_PATCH_FAILED",
		})
		return
	}

	var customer models.Customer
	if err := db.DB.Where("id = ?", id).First(&customer).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] 获取更新后的客户失败: " + err.Error(),
			"code":  "CUSTOMER_PATCH_FETCH_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, customer)
}

func DeleteCustomerHandler(c *gin.Context) {
	id := c.Param("id")

	var orderCount int64
	db.DB.Model(&models.SalesOrder{}).
		Where("customer_id = ? AND is_deleted = ? AND status NOT IN (?)", id, false, []string{"Done", "Canceled"}).
		Count(&orderCount)

	if orderCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error": "[BLOCKING] 无法删除客户：该客户尚有关联的未完成业务订单。",
			"code":  "CUSTOMER_DELETE_BLOCKED",
		})
		return
	}

	if err := db.DB.Model(&models.Customer{}).Where("id = ?", id).Update("is_deleted", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "[SERVER] 删除客户失败: " + err.Error(),
			"code":  "CUSTOMER_DELETE_FAILED",
		})
		return
	}

	c.Status(http.StatusNoContent)
}

func BulkSyncCustomersHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var customers []models.Customer
	if err := c.ShouldBindJSON(&customers); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "[VALIDATION] 批量同步数据错误: " + err.Error(),
			"code":  "CUSTOMER_BULK_SYNC_VALIDATION_FAILED",
		})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, cust := range customers {
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "code"}},
				UpdateAll: true,
			}).Create(&cust).Error; err != nil {
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
