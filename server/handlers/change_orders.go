package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func normalizeOptionalUUID(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func normalizeChangeOrder(input *models.ChangeOrder) {
	input.ProductID = normalizeOptionalUUID(input.ProductID)
	input.ChangeOrderNo = strings.TrimSpace(input.ChangeOrderNo)
	input.Title = strings.TrimSpace(input.Title)
	input.ChangeType = strings.ToUpper(strings.TrimSpace(input.ChangeType))
	input.SiteCode = strings.ToUpper(strings.TrimSpace(input.SiteCode))
	input.RevisionNo = strings.TrimSpace(input.RevisionNo)
	input.Status = strings.ToLower(strings.TrimSpace(input.Status))
	input.Description = strings.TrimSpace(input.Description)

	if input.ChangeType == "" {
		input.ChangeType = "ECO"
	}
	if input.RevisionNo == "" {
		input.RevisionNo = "R1"
	}
	if input.Status == "" {
		input.Status = "draft"
	}
	if input.SiteCode == "" {
		input.IsDefaultSite = true
	}
}

func validateChangeOrderReferences(tx *gorm.DB, input *models.ChangeOrder) error {
	if input.ProductID == nil {
		return nil
	}

	var product models.Product
	if err := tx.Where("id = ?", *input.ProductID).First(&product).Error; err != nil {
		return gin.Error{Err: err, Type: gin.ErrorTypePublic}
	}
	return nil
}

// GetChangeOrdersHandler returns formal ECO/ECN records with optional filtering.
func GetChangeOrdersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	productID := strings.TrimSpace(c.Query("productId"))
	changeType := strings.ToUpper(strings.TrimSpace(c.Query("changeType")))
	status := strings.ToLower(strings.TrimSpace(c.Query("status")))

	query := db.DB.Model(&models.ChangeOrder{})
	if productID != "" {
		query = query.Where("(product_id = ? OR product_id IS NULL)", productID)
	}
	if changeType != "" && changeType != "ALL" {
		query = query.Where("change_type = ?", changeType)
	}
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	orderExpr := "effective_from desc nulls last, created_at desc"

	if isOptions {
		var items []models.ChangeOrder
		if err := query.Order(orderExpr).Find(&items).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load change orders: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, items)
		return
	}

	var total int64
	query.Count(&total)

	var items []models.ChangeOrder
	if err := query.
		Preload("Product").
		Order(orderExpr).
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load change orders: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// SaveChangeOrderHandler creates or updates ECO/ECN master records.
func SaveChangeOrderHandler(c *gin.Context) {
	var input models.ChangeOrder
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid change order payload: " + err.Error()})
		return
	}

	normalizeChangeOrder(&input)
	if input.ChangeOrderNo == "" || input.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] change order number and title are required"})
		return
	}

	var saved models.ChangeOrder
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := validateChangeOrderReferences(tx, &input); err != nil {
			return err
		}

		if input.ID != "" {
			var existing models.ChangeOrder
			if err := tx.Where("id = ?", input.ID).First(&existing).Error; err != nil {
				return err
			}
			if input.Version != existing.Version {
				return ErrVersionConflict
			}

			updates := map[string]interface{}{
				"change_order_no": input.ChangeOrderNo,
				"title":           input.Title,
				"change_type":     input.ChangeType,
				"product_id":      input.ProductID,
				"site_code":       input.SiteCode,
				"is_default_site": input.IsDefaultSite,
				"revision_no":     input.RevisionNo,
				"effective_from":  input.EffectiveFrom,
				"effective_to":    input.EffectiveTo,
				"status":          input.Status,
				"description":     input.Description,
				"version":         existing.Version + 1,
			}

			if err := tx.Model(&existing).Updates(updates).Error; err != nil {
				return err
			}
			return tx.Preload("Product").First(&saved, "id = ?", existing.ID).Error
		}

		input.Version = 1
		if err := tx.Create(&input).Error; err != nil {
			return err
		}
		return tx.Preload("Product").First(&saved, "id = ?", input.ID).Error
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to save change order: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, saved)
}

// DeleteChangeOrderHandler removes a change order if it is not referenced by any BOM.
func DeleteChangeOrderHandler(c *gin.Context) {
	id := c.Param("id")
	if strings.TrimSpace(id) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] change order id is required"})
		return
	}

	var linkedCount int64
	if err := db.DB.Model(&models.BOM{}).Where("change_order_id = ?", id).Count(&linkedCount).Error; err == nil && linkedCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "[VALIDATION] change order is already linked to BOM records"})
		return
	}

	if err := db.DB.Delete(&models.ChangeOrder{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete change order: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "change order deleted"})
}
