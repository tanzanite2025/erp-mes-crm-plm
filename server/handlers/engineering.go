package handlers

import (
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetEngineeringSpecsHandler 鑾峰彇鎵€鏈夊伐绋嬭鏍?(鏀寔鍒嗛〉)
func GetEngineeringSpecsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	specType := c.Query("type")

	query := db.DB.Model(&models.EngineeringSpec{})
	if specType != "" {
		query = query.Where("type = ?", specType)
	}

	if isOptions {
		var specs []models.EngineeringSpec
		if err := query.Order("type asc, code asc").Find(&specs).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇瑙勬牸閫夐」澶辫触: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, specs)
		return
	}

	var total int64
	query.Count(&total)

	var items []models.EngineeringSpec
	if err := query.Order("type asc, code asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇瑙勬牸鍒楄〃澶辫触: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// GetEngineeringSpecHandler 鑾峰彇鍗曟潯瑙勬牸
func GetEngineeringSpecHandler(c *gin.Context) {
	id := c.Param("id")
	var spec models.EngineeringSpec
	if err := db.DB.First(&spec, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 瑙勬牸 ID " + id + " 涓嶅瓨鍦?"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇瑙勬牸澶辫触: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, spec)
}

// SaveEngineeringSpecHandler 淇濆瓨鎴栨洿鏂拌鏍?(JSONB)
func SaveEngineeringSpecHandler(c *gin.Context) {
	var input models.EngineeringSpec
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 瑙勬牸鏁版嵁鏍煎紡閿欒: " + err.Error()})
		return
	}

	var saved models.EngineeringSpec
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if input.ID != "" {
			var existing models.EngineeringSpec
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
			return tx.First(&saved, "id = ?", existing.ID).Error
		}

		input.MasterDataControl.Normalize("R1")
		input.Version = 1
		if err := tx.Create(&input).Error; err != nil {
			return err
		}
		saved = input
		return nil
	})

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 鏃犳硶鏇存柊锛氳鏍?ID " + input.ID + " 鍦ㄦ暟鎹簱涓笉瀛樺湪"})
			return
		}
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER_ERROR] 淇濆瓨瑙勬牸澶辫触: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, saved)
}

// BulkSyncEngineeringSpecsHandler 鎵归噺鍚屾瑙勬牸 (鍘熷瓙鍖栨姠鏁?
func BulkSyncEngineeringSpecsHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var input []models.EngineeringSpec
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 鍚屾鏁版嵁鏍煎紡闈炴硶: " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, spec := range input {
			if spec.Name == "" || spec.Code == "" {
				return gin.Error{Err: http.ErrAbortHandler, Type: gin.ErrorTypePublic}
			}
			spec.MasterDataControl.Normalize("R1")
			
			if spec.ID != "" {
				// 更新模式：锁定审计保护
				if err := tx.Model(&models.EngineeringSpec{}).Where("id = ?", spec.ID).Omit("CreatedAt", "BaseModel.CreatedAt").Updates(&spec).Error; err != nil {
					return err
				}
			} else {
				// 新增模式
				if err := tx.Create(&spec).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_SYNC_FAILED] 鍏ㄩ噺鍚屾澶辫触锛屽凡鍥炴粴浜嬪姟: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(input)})
}

// DeleteEngineeringSpecHandler 鍒犻櫎瑙勬牸 (鍏ㄥ煙寮曠敤瀹¤)
func DeleteEngineeringSpecHandler(c *gin.Context) {
	id := c.Param("id")

	var pCount int64
	db.DB.Model(&models.Product{}).Where("engineering_spec_id = ?", id).Count(&pCount)
	if pCount > 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] 鏃犳硶鍒犻櫎锛氬凡鏈変骇鍝佹。妗堟寕杞戒簡姝よ鏍?"})
		return
	}

	var bCount int64
	db.DB.Model(&models.BOM{}).Where("description LIKE ?", "%"+id+"%").Count(&bCount)
	if bCount > 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] 鏃犳硶鍒犻櫎锛欱OM 澶囨敞/宸ヨ壓涓粛鎸佹湁姝よ鏍煎紩鐢?"})
		return
	}

	if err := db.DB.Delete(&models.EngineeringSpec{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER_ERROR] 鍒犻櫎瑙勬牸澶辫触: " + err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
