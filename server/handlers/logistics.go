package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetLogisticsRecordsHandler 获取物流记录 (支持分页与过滤)
func GetLogisticsRecordsHandler(c *gin.Context) {
	orderNo := c.Query("orderNo")
	shipmentID := c.Query("shipmentId")
	purchaseOrderID := c.Query("purchaseOrderId")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	query := db.DB.Where("is_deleted = ?", false)
	if orderNo != "" {
		query = query.Where("order_no = ?", orderNo)
	}
	if shipmentID != "" {
		query = query.Where("shipment_id = ?", shipmentID)
	}
	if purchaseOrderID != "" {
		query = query.Where("purchase_order_id = ?", purchaseOrderID)
	}

	var records []models.LogisticsRecord
	var total int64
	query.Model(&models.LogisticsRecord{}).Count(&total)

	if err := query.Preload("PurchaseOrder").Order("updated_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取物流记录失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    records,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// GetLogisticsRecordHandler 获取单条物流详情
func GetLogisticsRecordHandler(c *gin.Context) {
	id := c.Param("id")
	var record models.LogisticsRecord
	if err := db.DB.First(&record, "id = ? AND is_deleted = ?", id, false).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[VALIDATION] 记录不找到"})
		return
	}
	c.JSON(http.StatusOK, record)
}

// SaveLogisticsRecordHandler 保存或更新物流记录
func SaveLogisticsRecordHandler(c *gin.Context) {
	var input models.LogisticsRecord
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 物流数据格式错误"})
		return
	}

	input.OrderNo = strings.TrimSpace(input.OrderNo)
	input.Carrier = strings.TrimSpace(input.Carrier)
	input.TrackingNo = strings.TrimSpace(input.TrackingNo)
	input.LastLocation = strings.TrimSpace(input.LastLocation)
	input.ShipmentID = strings.TrimSpace(input.ShipmentID)

	salesOrderID, err := normalizeOptionalUUIDString(input.SalesOrderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] salesOrderId 鏍煎紡閿欒"})
		return
	}
	input.SalesOrderID = salesOrderID

	purchaseOrderID, err := normalizeOptionalUUIDString(input.PurchaseOrderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] purchaseOrderId 鏍煎紡閿欒"})
		return
	}
	input.PurchaseOrderID = purchaseOrderID

	productID, err := normalizeOptionalUUIDString(input.ProductID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] productId 鏍煎紡閿欒"})
		return
	}
	input.ProductID = productID

	if input.ID != "" {
		// 更新逻辑
		var existing models.LogisticsRecord
		if err := db.DB.First(&existing, "id = ?", input.ID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
			return
		}
		updateTx := db.DB.Model(&existing)
		if input.SalesOrderID == "" {
			updateTx = updateTx.Omit("SalesOrderID")
		}
		if input.PurchaseOrderID == "" {
			updateTx = updateTx.Omit("PurchaseOrderID")
		}
		if input.ProductID == "" {
			updateTx = updateTx.Omit("ProductID")
		}
		if err := updateTx.Updates(input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
			return
		}
		if input.SalesOrderID == "" {
			if err := db.DB.Model(&existing).Update("sales_order_id", nil).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "鏇存柊澶辫触"})
				return
			}
		}
		if input.PurchaseOrderID == "" {
			if err := db.DB.Model(&existing).Update("purchase_order_id", nil).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "鏇存柊澶辫触"})
				return
			}
		}
		if input.ProductID == "" {
			if err := db.DB.Model(&existing).Update("product_id", nil).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "鏇存柊澶辫触"})
				return
			}
		}
		c.JSON(http.StatusOK, existing)
	} else {
		// 创建逻辑前增加唯一性检查
		var duplicate models.LogisticsRecord
		if err := db.DB.Where("carrier = ? AND tracking_no = ? AND is_deleted = ?",
			input.Carrier, input.TrackingNo, false).First(&duplicate).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "[BLOCKING] 该单号已在系统中绑定到订单: " + duplicate.OrderNo})
			return
		}

		input.UpdatedAt = time.Now()

		// 如果有单号，自动追加初始状态
		if input.TrackingNo != "" && (len(input.Events) == 0 || string(input.Events) == "null") {
			initialEvent := `[{"id":"evt-init","time":"` + time.Now().Format(time.RFC3339) + `","location":"系统","description":"物流单号已绑定，等待揽收","status":"Pending"}]`
			input.Events = []byte(initialEvent)
		}

		createTx := db.DB
		if input.SalesOrderID == "" {
			createTx = createTx.Omit("SalesOrderID")
		}
		if input.PurchaseOrderID == "" {
			createTx = createTx.Omit("PurchaseOrderID")
		}
		if input.ProductID == "" {
			createTx = createTx.Omit("ProductID")
		}
		if err := createTx.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建失败"})
			return
		}
		c.JSON(http.StatusOK, input)
	}
}

// UpdateLogisticsStatusHandler 更新物流状态并追加事件 (加固：乐观锁 + 审计)
func UpdateLogisticsStatusHandler(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status      string `json:"status"`
		Location    string `json:"location"`
		Description string `json:"description"`
		EventsJSON  []byte `json:"events"`
		Version     int    `json:"version"` // 乐观锁版本号
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	var record models.LogisticsRecord
	if err := db.DB.First(&record, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// 1. 更新主记录 (执行乐观锁检查)
		res := tx.Model(&record).
			Where("version = ?", req.Version).
			Updates(map[string]interface{}{
				"status":        req.Status,
				"last_location": req.Location,
				"events":        req.EventsJSON,
				"version":       req.Version + 1,
				"updated_at":    time.Now(),
			})

		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return gorm.ErrInvalidTransaction // 模拟版本冲突
		}

		record.Status = req.Status
		if err := services.SyncLogisticsBusinessDocumentTx(tx, &record, req.Status); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		if err == gorm.ErrInvalidTransaction {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, record)
}

func DeleteLogisticsRecordHandler(c *gin.Context) {
	id := c.Param("id")

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.LogisticsRecord{}).Where("id = ?", id).Updates(map[string]interface{}{
			"is_deleted": true,
			"status":     "Canceled",
			"updated_at": time.Now(),
		}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}
	c.Status(http.StatusNoContent)
}
