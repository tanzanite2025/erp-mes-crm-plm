package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GetBOMsHandler 鑾峰彇鎵€鏈?BOM 娓呭崟 (鏀寔鍒嗛〉)
func GetBOMsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	productID := c.Query("productId")

	query := db.DB.Model(&models.BOM{})
	if productID != "" {
		query = query.Where("product_id = ?", productID)
	}

	if isOptions {
		var boms []models.BOM
		if err := query.Order("created_at desc").Find(&boms).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇 BOM 閫夐」澶辫触: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, boms)
		return
	}

	var total int64
	query.Count(&total)

	var items []models.BOM
	if err := query.
		Preload("ChangeOrder").
		Preload("Items").
		Preload("Items.Substitutes").
		Preload("Items.Substitutes.Material").
		Order("created_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇 BOM 鍒楄〃澶辫触: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// GetBOMHandler 鑾峰彇鍗曟潯 BOM 璇︽儏
func GetBOMHandler(c *gin.Context) {
	id := c.Param("id")
	var bom models.BOM
	if err := db.DB.
		Preload("ChangeOrder").
		Preload("Items").
		Preload("Items.Substitutes").
		Preload("Items.Substitutes.Material").
		First(&bom, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] BOM ID " + id + " 涓嶅瓨鍦?"})
		return
	}
	c.JSON(http.StatusOK, bom)
}

func validateBOMReferences(tx *gorm.DB, input *models.BOM) error {
	if input.ChangeOrderID != nil {
		changeOrderID := strings.TrimSpace(*input.ChangeOrderID)
		if changeOrderID == "" {
			input.ChangeOrderID = nil
		} else {
			var order models.ChangeOrder
			if err := tx.Where("id = ?", changeOrderID).First(&order).Error; err != nil {
				return gin.Error{Err: err, Type: gin.ErrorTypePublic}
			}
			if order.ProductID != nil && input.ProductID != "" && *order.ProductID != input.ProductID {
				return fmt.Errorf("[VALIDATION] selected change order is not valid for this product")
			}
			if order.Status == "obsolete" {
				return fmt.Errorf("[LOCKED_ASSET] selected change order is obsolete")
			}
		}
	}

	if input.ProductID != "" {
		var p models.Product
		if err := tx.Where("id = ?", input.ProductID).First(&p).Error; err != nil {
			return gin.Error{Err: err, Type: gin.ErrorTypePublic}
		}
	}

	for _, item := range input.Items {
		if item.MaterialID != "" {
			var m models.Material
			if err := tx.Where("id = ?", item.MaterialID).First(&m).Error; err != nil {
				return gin.Error{Err: err, Type: gin.ErrorTypePublic}
			}
			if m.Status == "Archived" || m.Status == "Inactive" {
				return fmt.Errorf("[LOCKED_ASSET] BOM contains disabled material (%s - %s)", m.Code, m.Name)
			}
		}

		for _, substitute := range item.Substitutes {
			if strings.TrimSpace(substitute.MaterialID) == "" {
				return fmt.Errorf("[VALIDATION] substitute material is required")
			}
			if substitute.MaterialID == item.MaterialID {
				return fmt.Errorf("[VALIDATION] substitute material cannot equal primary material")
			}

			var alt models.Material
			if err := tx.Where("id = ?", substitute.MaterialID).First(&alt).Error; err != nil {
				return gin.Error{Err: err, Type: gin.ErrorTypePublic}
			}
			if alt.Status == "Archived" || alt.Status == "Inactive" {
				return fmt.Errorf("[LOCKED_ASSET] substitute material is disabled (%s - %s)", alt.Code, alt.Name)
			}
		}
	}

	return nil
}

func mergeBOMFromChangeOrder(input *models.BOM, order *models.ChangeOrder, defaultRevision string) {
	if order == nil {
		input.MasterDataControl.Normalize(defaultRevision)
		return
	}

	if strings.TrimSpace(input.ChangeOrderNo) == "" {
		input.ChangeOrderNo = order.ChangeOrderNo
	}
	if strings.TrimSpace(input.ChangeType) == "" || input.ChangeType == "MANUAL" {
		input.ChangeType = order.ChangeType
	}
	if strings.TrimSpace(input.SiteCode) == "" {
		input.SiteCode = order.SiteCode
		input.IsDefaultSite = order.IsDefaultSite
	}
	if strings.TrimSpace(input.RevisionNo) == "" {
		input.RevisionNo = order.RevisionNo
	}
	if input.EffectiveFrom == nil {
		input.EffectiveFrom = order.EffectiveFrom
	}
	if input.EffectiveTo == nil {
		input.EffectiveTo = order.EffectiveTo
	}

	input.MasterDataControl.Normalize(defaultRevision)
}

func saveBOMItems(tx *gorm.DB, bomID string, items []models.BOMItem) error {
	for idx := range items {
		if strings.TrimSpace(items[idx].ID) == "" {
			items[idx].ID = uuid.NewString()
		}
		items[idx].BOMID = bomID
		for subIdx := range items[idx].Substitutes {
			if strings.TrimSpace(items[idx].Substitutes[subIdx].ID) == "" {
				items[idx].Substitutes[subIdx].ID = uuid.NewString()
			}
			items[idx].Substitutes[subIdx].BOMItemID = items[idx].ID
			if items[idx].Substitutes[subIdx].ConversionRate == 0 {
				items[idx].Substitutes[subIdx].ConversionRate = 1
			}
			if items[idx].Substitutes[subIdx].Priority == 0 {
				items[idx].Substitutes[subIdx].Priority = subIdx + 1
			}
		}
		if err := tx.Session(&gorm.Session{FullSaveAssociations: true}).Create(&items[idx]).Error; err != nil {
			return err
		}
	}
	return nil
}

// SaveBOMHandler 淇濆瓨鎴栨洿鏂?BOM (鍚槑缁嗚)
func SaveBOMHandler(c *gin.Context) {
	var input models.BOM
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] BOM 鏁版嵁鏍煎紡閿欒: " + err.Error()})
		return
	}

	var saved models.BOM
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := validateBOMReferences(tx, &input); err != nil {
			return err
		}

		defaultRevision := input.VersionText
		if strings.TrimSpace(defaultRevision) == "" {
			defaultRevision = "V1.0"
		}

		var linkedChangeOrder *models.ChangeOrder
		if input.ChangeOrderID != nil && strings.TrimSpace(*input.ChangeOrderID) != "" {
			linkedChangeOrder = &models.ChangeOrder{}
			if err := tx.Where("id = ?", *input.ChangeOrderID).First(linkedChangeOrder).Error; err != nil {
				return err
			}
		}

		if input.ID != "" {
			var existing models.BOM
			if err := tx.Preload("Items").Where("id = ?", input.ID).First(&existing).Error; err != nil {
				return err
			}

			input.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, defaultRevision)
			mergeBOMFromChangeOrder(&input, linkedChangeOrder, defaultRevision)
			if strings.TrimSpace(input.VersionText) == "" {
				input.VersionText = existing.VersionText
			}
			if err := tx.Model(&existing).Omit("Items").Updates(input).Error; err != nil {
				return err
			}
			if err := tx.Where("bom_id = ?", existing.ID).Delete(&models.BOMItem{}).Error; err != nil {
				return err
			}
			if err := saveBOMItems(tx, existing.ID, input.Items); err != nil {
				return err
			}
			return tx.
				Preload("ChangeOrder").
				Preload("Items").
				Preload("Items.Substitutes").
				Preload("Items.Substitutes.Material").
				First(&saved, "id = ?", existing.ID).Error
		}

		mergeBOMFromChangeOrder(&input, linkedChangeOrder, defaultRevision)
		items := input.Items
		input.Items = nil
		if err := tx.Create(&input).Error; err != nil {
			return err
		}
		if err := saveBOMItems(tx, input.ID, items); err != nil {
			return err
		}
		return tx.
			Preload("ChangeOrder").
			Preload("Items").
			Preload("Items.Substitutes").
			Preload("Items.Substitutes.Material").
			First(&saved, "id = ?", input.ID).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_DATA_FAILURE] 淇濆瓨 BOM 澶辫触鎴栨。妗堟牎楠屼笉閫氳繃: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, saved)
}

// DeleteBOMHandler 鍒犻櫎 BOM 鍙婂叾鍏宠仈鐨勯」
func DeleteBOMHandler(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] BOM ID 涓嶈兘涓虹┖"})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var bom models.BOM
		if err := tx.Where("id = ?", id).First(&bom).Error; err != nil {
			return err
		}

		if err := tx.Where("bom_id = ?", id).Delete(&models.BOMItem{}).Error; err != nil {
			return err
		}

		return tx.Delete(&bom).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_DATA_FAILURE] 鍒犻櫎 BOM 澶辫触: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "BOM 宸插畨鍏ㄧЩ闄?"})
}
