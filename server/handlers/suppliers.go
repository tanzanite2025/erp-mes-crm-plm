package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// GetSuppliersHandler 获取供应商列表 (支持分页)
func GetSuppliersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	isOptions := c.Query("options") == "true"
	response, err := services.ListSuppliers(services.SupplierListQuery{
		Page:     page,
		PageSize: pageSize,
		Options:  isOptions,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取供应商列表失败: " + err.Error()})
		return
	}
	if isOptions {
		c.JSON(http.StatusOK, response.Items)
		return
	}
	c.JSON(http.StatusOK, response)
}

// SaveSupplierHandler 新增或更新供应商
func SaveSupplierHandler(c *gin.Context) {
	var req services.SaveSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 供应商数据格式错误: " + err.Error()})
		return
	}

	response, err := services.SaveSupplier(req, middleware.GetSafeUserID(c), middleware.GetSafeUsername(c), c.ClientIP())
	if err != nil {
		if errors.Is(err, services.ErrSupplierTransactionVersionConflict) || err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存供应商失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// PatchSupplierHandler 局部更新供应商
func PatchSupplierHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 供应商更新数据格式错误: " + err.Error()})
		return
	}

	if err := validateSupportedTopLevelDeltaKeys(req.Delta, "name", "code", "category", "mainProducts", "contactPerson", "contactPhone", "email", "address", "status", "rating"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid supplier delta: " + err.Error()})
		return
	}

	var patch services.PatchSupplierRequest
	patch.ID = id
	patch.Version = int(req.Metadata.Version)

	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的供应商差量数据"})
			return
		}
		switch key {
		case "name":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] name 字段错误"})
				return
			}
			patch.Name = &value
		case "code":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] code 字段错误"})
				return
			}
			patch.Code = &value
		case "category":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] category 字段错误"})
				return
			}
			patch.Category = &value
		case "mainProducts":
			var values []string
			if err := json.Unmarshal(valueRaw, &values); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] mainProducts 字段错误"})
				return
			}
			encoded, err := json.Marshal(values)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] mainProducts 编码失败"})
				return
			}
			value := string(encoded)
			patch.MainProducts = &value
		case "contactPerson":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] contactPerson 字段错误"})
				return
			}
			patch.ContactPerson = &value
		case "contactPhone":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] contactPhone 字段错误"})
				return
			}
			patch.ContactPhone = &value
		case "email":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] email 字段错误"})
				return
			}
			patch.Email = &value
		case "address":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] address 字段错误"})
				return
			}
			patch.Address = &value
		case "status":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] status 字段错误"})
				return
			}
			patch.Status = &value
		case "rating":
			var value float64
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] rating 字段错误"})
				return
			}
			patch.Rating = &value
		}
	}

	response, err := services.PatchSupplier(patch, middleware.GetSafeUserID(c), middleware.GetSafeUsername(c), c.ClientIP())
	if err != nil {
		if errors.Is(err, services.ErrSupplierTransactionVersionConflict) || err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新供应商失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// DeleteSupplierHandler 逻辑删除供应商
func DeleteSupplierHandler(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Model(&models.Supplier{}).Where("id = ?", id).Update("is_deleted", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除供应商失败: " + err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// BulkSyncSuppliersHandler 批量同步供应商 (数据抢救)
func BulkSyncSuppliersHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var input []BulkSyncSupplierRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 批量同步数据错误: " + err.Error()})
		return
	}

	suppliers := make([]models.Supplier, 0, len(input))
	for _, item := range input {
		suppliers = append(suppliers, mapBulkSyncSupplierRequestToModel(item))
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, s := range suppliers {
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "code"}},
				UpdateAll: true,
			}).Create(&s).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量同步失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(suppliers)})
}
