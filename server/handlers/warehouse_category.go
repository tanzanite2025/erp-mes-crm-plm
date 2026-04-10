package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var errWarehouseCategoryCodeExists = errors.New("warehouse category code already exists")

// GetWarehouseCategoriesHandler returns the management list payload for warehouse categories.
func GetWarehouseCategoriesHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	query := db.DB.Model(&models.WarehouseCategory{})

	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to count warehouse categories: " + err.Error()})
		return
	}

	var items []models.WarehouseCategory
	if err := query.Order("sort_order asc, code asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load warehouse categories: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, WarehouseCategoryListResponse{
		Items:    mapWarehouseCategoriesToResponse(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// GetWarehouseCategoryOptionsHandler returns readonly options for business forms.
func GetWarehouseCategoryOptionsHandler(c *gin.Context) {
	var categories []models.WarehouseCategory
	if err := db.DB.
		Where("active = ?", true).
		Order("sort_order asc, code asc").
		Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load warehouse category options: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapWarehouseCategoryOptions(categories))
}

// SaveWarehouseCategoryHandler creates a new warehouse category.
func SaveWarehouseCategoryHandler(c *gin.Context) {
	var input WarehouseCategoryRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid warehouse category payload"})
		return
	}

	category := mapWarehouseCategoryRequestToModel(input)
	category.Name = strings.TrimSpace(category.Name)
	category.Code = strings.ToUpper(strings.TrimSpace(category.Code))
	category.Description = strings.TrimSpace(category.Description)
	category.IsSystem = false
	normalizeWarehouseCategoryConfig(&category)

	if category.Name == "" || category.Code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "warehouse category name/code is required"})
		return
	}

	var existing models.WarehouseCategory
	err := db.DB.Where("code = ?", category.Code).First(&existing).Error
	switch {
	case err == nil:
		c.JSON(http.StatusBadRequest, gin.H{"error": "warehouse category code already exists"})
		return
	case !errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to validate warehouse category uniqueness: " + err.Error()})
		return
	}

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&category).Error; err != nil {
			return err
		}
		return syncWarehouseCategoryDefaults(tx, category.ID, category)
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to create warehouse category: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapWarehouseCategoryToResponse(category))
}

// PatchWarehouseCategoryHandler applies SDRTS delta updates to a warehouse category.
func PatchWarehouseCategoryHandler(c *gin.Context) {
	id := c.Param("id")

	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid warehouse category patch payload: " + err.Error()})
		return
	}
	if err := validateSupportedTopLevelDeltaKeys(
		req.Delta,
		"name",
		"code",
		"description",
		"active",
		"sortOrder",
		"allowInbound",
		"allowShipment",
		"allowStocktake",
		"allowPurchaseReceipt",
		"defaultForProductInbound",
		"defaultForMaterialInbound",
		"defaultForPurchaseReceipt",
	); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid warehouse category delta: " + err.Error()})
		return
	}

	var updated models.WarehouseCategory
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var category models.WarehouseCategory
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&category, "id = ?", id).Error; err != nil {
			return err
		}

		if int64(optimisticVersionForResponse(category.UpdatedAt, category.CreatedAt)) != req.Metadata.Version {
			return ErrVersionConflict
		}

		next := category
		for key, raw := range req.Delta {
			valueRaw, err := extractDeltaNewValue(raw)
			if err != nil {
				return errors.New("invalid warehouse category delta item")
			}

			switch key {
			case "name":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid warehouse category name payload")
				}
				next.Name = strings.TrimSpace(value)
			case "code":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid warehouse category code payload")
				}
				next.Code = strings.ToUpper(strings.TrimSpace(value))
			case "description":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid warehouse category description payload")
				}
				next.Description = strings.TrimSpace(value)
			case "active":
				var value bool
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid warehouse category active payload")
				}
				next.Active = value
			case "sortOrder":
				var value int
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid warehouse category sortOrder payload")
				}
				next.SortOrder = value
			case "allowInbound":
				var value bool
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid warehouse category allowInbound payload")
				}
				next.AllowInbound = value
			case "allowShipment":
				var value bool
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid warehouse category allowShipment payload")
				}
				next.AllowShipment = value
			case "allowStocktake":
				var value bool
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid warehouse category allowStocktake payload")
				}
				next.AllowStocktake = value
			case "allowPurchaseReceipt":
				var value bool
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid warehouse category allowPurchaseReceipt payload")
				}
				next.AllowPurchaseReceipt = value
			case "defaultForProductInbound":
				var value bool
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid warehouse category defaultForProductInbound payload")
				}
				next.DefaultForProductInbound = value
			case "defaultForMaterialInbound":
				var value bool
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid warehouse category defaultForMaterialInbound payload")
				}
				next.DefaultForMaterialInbound = value
			case "defaultForPurchaseReceipt":
				var value bool
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return errors.New("invalid warehouse category defaultForPurchaseReceipt payload")
				}
				next.DefaultForPurchaseReceipt = value
			}
		}

		normalizeWarehouseCategoryConfig(&next)
		if next.Name == "" {
			return errors.New("warehouse category name is required")
		}
		if next.Code == "" {
			return errors.New("warehouse category code is required")
		}

		var duplicateCount int64
		if err := tx.Model(&models.WarehouseCategory{}).
			Where("code = ? AND id <> ?", next.Code, id).
			Count(&duplicateCount).Error; err != nil {
			return err
		}
		if duplicateCount > 0 {
			return errWarehouseCategoryCodeExists
		}

		updates := diffWarehouseCategoryFields(category, next)
		if len(updates) == 0 {
			updated = category
			return nil
		}

		if err := tx.Model(&category).Updates(updates).Error; err != nil {
			return err
		}
		if err := syncWarehouseCategoryDefaults(tx, category.ID, next); err != nil {
			return err
		}
		return tx.First(&updated, "id = ?", id).Error
	})

	switch {
	case err == nil:
		c.JSON(http.StatusOK, mapWarehouseCategoryToResponse(updated))
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "warehouse category not found"})
	case errors.Is(err, ErrVersionConflict):
		respondVersionConflict(c)
	case errors.Is(err, errWarehouseCategoryCodeExists):
		c.JSON(http.StatusBadRequest, gin.H{"error": "warehouse category code already exists"})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "[SERVER] failed to patch warehouse category: " + err.Error()})
	}
}

// DeleteWarehouseCategoryHandler deletes a user-defined warehouse category.
func DeleteWarehouseCategoryHandler(c *gin.Context) {
	id := c.Param("id")
	var category models.WarehouseCategory
	if err := db.DB.Where("id = ?", id).First(&category).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "warehouse category not found"})
		return
	}

	if category.IsSystem {
		c.JSON(http.StatusForbidden, gin.H{"error": "system warehouse categories cannot be deleted"})
		return
	}

	if err := db.DB.Delete(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete warehouse category: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "warehouse category deleted"})
}

func normalizeWarehouseCategoryConfig(category *models.WarehouseCategory) {
	if !category.Active {
		category.DefaultForProductInbound = false
		category.DefaultForMaterialInbound = false
		category.DefaultForPurchaseReceipt = false
	}

	if !category.AllowInbound {
		category.DefaultForProductInbound = false
		category.DefaultForMaterialInbound = false
	}
	if !category.AllowPurchaseReceipt {
		category.DefaultForPurchaseReceipt = false
	}

	if category.DefaultForProductInbound || category.DefaultForMaterialInbound {
		category.AllowInbound = true
		category.Active = true
	}
	if category.DefaultForPurchaseReceipt {
		category.AllowPurchaseReceipt = true
		category.Active = true
	}
}

func diffWarehouseCategoryFields(current models.WarehouseCategory, next models.WarehouseCategory) map[string]interface{} {
	updates := map[string]interface{}{}
	if current.Name != next.Name {
		updates["name"] = next.Name
	}
	if current.Code != next.Code {
		updates["code"] = next.Code
	}
	if current.Description != next.Description {
		updates["description"] = next.Description
	}
	if current.Active != next.Active {
		updates["active"] = next.Active
	}
	if current.SortOrder != next.SortOrder {
		updates["sort_order"] = next.SortOrder
	}
	if current.AllowInbound != next.AllowInbound {
		updates["allow_inbound"] = next.AllowInbound
	}
	if current.AllowShipment != next.AllowShipment {
		updates["allow_shipment"] = next.AllowShipment
	}
	if current.AllowStocktake != next.AllowStocktake {
		updates["allow_stocktake"] = next.AllowStocktake
	}
	if current.AllowPurchaseReceipt != next.AllowPurchaseReceipt {
		updates["allow_purchase_receipt"] = next.AllowPurchaseReceipt
	}
	if current.DefaultForProductInbound != next.DefaultForProductInbound {
		updates["default_for_product_inbound"] = next.DefaultForProductInbound
	}
	if current.DefaultForMaterialInbound != next.DefaultForMaterialInbound {
		updates["default_for_material_inbound"] = next.DefaultForMaterialInbound
	}
	if current.DefaultForPurchaseReceipt != next.DefaultForPurchaseReceipt {
		updates["default_for_purchase_receipt"] = next.DefaultForPurchaseReceipt
	}
	return updates
}

func syncWarehouseCategoryDefaults(tx *gorm.DB, currentID string, category models.WarehouseCategory) error {
	if category.DefaultForProductInbound {
		if err := tx.Model(&models.WarehouseCategory{}).
			Where("id <> ?", currentID).
			Update("default_for_product_inbound", false).Error; err != nil {
			return err
		}
	}
	if category.DefaultForMaterialInbound {
		if err := tx.Model(&models.WarehouseCategory{}).
			Where("id <> ?", currentID).
			Update("default_for_material_inbound", false).Error; err != nil {
			return err
		}
	}
	if category.DefaultForPurchaseReceipt {
		if err := tx.Model(&models.WarehouseCategory{}).
			Where("id <> ?", currentID).
			Update("default_for_purchase_receipt", false).Error; err != nil {
			return err
		}
	}
	return nil
}
