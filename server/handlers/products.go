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

func normalizeEngineeringSpecID(raw string) string {
	return strings.TrimSpace(raw)
}

// GetProductsHandler 鑾峰彇浜у搧鍒楄〃 (鏀寔鍒嗛〉)
func GetProductsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	query := db.DB.Model(&models.Product{})

	if isOptions {
		var products []models.Product
		if err := query.Order("sku asc").Find(&products).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇浜у搧閫夐」澶辫触: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, products)
		return
	}

	var total int64
	query.Count(&total)

	var items []models.Product
	if err := query.Order("sku asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇浜у搧鍒楄〃澶辫触: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// GetProductHandler 鑾峰彇鍗曟潯浜у搧璇︽儏
func GetProductHandler(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if err := db.DB.First(&product, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 浜у搧 ID " + id + " 涓嶅瓨鍦?"})
		return
	}
	c.JSON(http.StatusOK, product)
}

// SaveProductHandler 淇濆瓨鎴栨洿鏂颁骇鍝?
func SaveProductHandler(c *gin.Context) {
	var input models.Product
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 浜у搧鏁版嵁鏍煎紡閿欒: " + err.Error()})
		return
	}

	var saved models.Product
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		input.EngineeringSpecID = normalizeEngineeringSpecID(input.EngineeringSpecID)
		if input.EngineeringSpecID != "" {
			var spec models.EngineeringSpec
			if err := tx.Where("id = ?", input.EngineeringSpecID).First(&spec).Error; err != nil {
				return gin.Error{Err: err, Type: gin.ErrorTypePublic}
			}
		}

		if input.ID != "" {
			var existing models.Product
			if err := tx.Where("id = ?", input.ID).First(&existing).Error; err != nil {
				if err != gorm.ErrRecordNotFound {
					return err
				}
				return gorm.ErrRecordNotFound
			}
			if input.Version != existing.Version {
				return ErrVersionConflict
			}

			input.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, "R1")
			input.Version = existing.Version + 1
			if err := tx.Model(&existing).Updates(input).Error; err != nil {
				return err
			}
			if input.EngineeringSpecID == "" {
				if err := tx.Model(&existing).Update("engineering_spec_id", nil).Error; err != nil {
					return err
				}
			}
			return tx.First(&saved, "id = ?", existing.ID).Error
		}

		input.MasterDataControl.Normalize("R1")
		input.Version = 1
		createTx := tx
		if input.EngineeringSpecID == "" {
			createTx = createTx.Omit("EngineeringSpecID")
		}
		if err := createTx.Create(&input).Error; err != nil {
			return err
		}
		saved = input
		return nil
	})

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 鏃犳硶鏇存柊锛氫骇鍝?ID " + input.ID + " 涓嶅瓨鍦?"})
			return
		}
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_DATA_FAILURE] 淇濆瓨浜у搧澶辫触鎴栧叧鑱斿璁″け璐? " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, saved)
}

// BulkSyncProductsHandler 鎵归噺鍚屾浜у搧 (鍘熷瓙鍖栧璁?
func BulkSyncProductsHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var input []models.Product
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 鍚屽鏁版嵁鏍煎紡闈炴硶: " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, p := range input {
			p.EngineeringSpecID = normalizeEngineeringSpecID(p.EngineeringSpecID)
			if p.EngineeringSpecID != "" {
				var spec models.EngineeringSpec
				if err := tx.Where("id = ?", p.EngineeringSpecID).First(&spec).Error; err != nil {
					return err
				}
			}
			p.MasterDataControl.Normalize("R1")
			saveTx := tx
			if p.EngineeringSpecID == "" {
				saveTx = saveTx.Omit("EngineeringSpecID")
			}
			
			if p.ID != "" {
				// 更新模式：局部更新，锁定审计元数据
				if err := saveTx.Model(&models.Product{}).Where("id = ?", p.ID).Omit("CreatedAt", "BaseModel.CreatedAt").Updates(&p).Error; err != nil {
					return err
				}
			} else {
				// 新增模式
				if err := saveTx.Create(&p).Error; err != nil {
					return err
				}
			}
			if p.ID != "" && p.EngineeringSpecID == "" {
				if err := tx.Model(&models.Product{}).Where("id = ?", p.ID).Update("engineering_spec_id", nil).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_SYNC_FAILED] 鍏ㄩ噺鍚屾澶辫触锛屽凡鍥炴粴浜嬪姟 (鍙兘瀛樺湪鏃犳晥鐨勫閿紩鐢?: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(input)})
}
