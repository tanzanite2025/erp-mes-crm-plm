package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func saveSalesOrderForBulkSync(tx *gorm.DB, order *models.SalesOrder) error {
	if order.ID == "" {
		return tx.Create(order).Error
	}

	var existing models.SalesOrder
	if err := tx.Where("id = ?", order.ID).First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return tx.Create(order).Error
		}
		return err
	}

	if order.OrderNo == "" {
		order.OrderNo = existing.OrderNo
	}
	if order.OrderName == "" {
		order.OrderName = existing.OrderName
	}
	if order.CustomerName == "" {
		order.CustomerName = existing.CustomerName
	}
	if order.CustomerID == "" {
		order.CustomerID = existing.CustomerID
	}
	if order.Type == "" {
		order.Type = existing.Type
	}
	if order.Currency == "" {
		order.Currency = existing.Currency
	}
	if order.Classification == "" {
		order.Classification = existing.Classification
	}
	if order.Status == "" {
		order.Status = existing.Status
	}
	if order.StatusNote == "" {
		order.StatusNote = existing.StatusNote
	}
	if order.OrderDate == "" {
		order.OrderDate = existing.OrderDate
	}
	if order.DeliveryDate == "" {
		order.DeliveryDate = existing.DeliveryDate
	}
	if order.PurchaseOrderNo == "" {
		order.PurchaseOrderNo = existing.PurchaseOrderNo
	}
	if order.Barcode == "" {
		order.Barcode = existing.Barcode
	}
	if order.Requirements == "" {
		order.Requirements = existing.Requirements
	}
	if order.WorkflowInstanceID == "" {
		order.WorkflowInstanceID = existing.WorkflowInstanceID
	}
	if order.UpdatedBy == "" {
		order.UpdatedBy = existing.UpdatedBy
	}
	if order.Version == 0 {
		order.Version = existing.Version
	}

	updates := map[string]interface{}{
		"order_no":             order.OrderNo,
		"order_name":           order.OrderName,
		"customer_name":        order.CustomerName,
		"customer_id":          order.CustomerID,
		"type":                 order.Type,
		"currency":             order.Currency,
		"classification":       order.Classification,
		"status":               order.Status,
		"status_note":          order.StatusNote,
		"amount":               order.Amount,
		"quantity":             order.Quantity,
		"order_date":           order.OrderDate,
		"delivery_date":        order.DeliveryDate,
		"purchase_order_no":    order.PurchaseOrderNo,
		"barcode":              order.Barcode,
		"requirements":         order.Requirements,
		"workflow_instance_id": order.WorkflowInstanceID,
		"updated_by":           order.UpdatedBy,
		"is_deleted":           order.IsDeleted,
		"version":              order.Version,
	}
	return tx.Model(&existing).Updates(updates).Error
}

// GetSalesOrdersHandler 获取所有销售订单 (已加成分页与性能优化)
func GetSalesOrdersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	var orders []models.SalesOrder
	var total int64

	// 1. 获取总数
	db.DB.Model(&models.SalesOrder{}).Where("is_deleted = ?", false).Count(&total)

	// 2. 分页获取数据 (列表页移除 Preload("Lines") 以减小 JSON 大包体积)
	if err := db.DB.Where("is_deleted = ?", false).
		Order("order_date desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取订单列表失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, services.SalesOrderListResponse{
		Items:    services.MapSalesOrdersToListItems(orders),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// GetSalesOrderHandler 获取单笔订单详情
func GetSalesOrderHandler(c *gin.Context) {
	id := c.Param("id")
	var order models.SalesOrder
	if err := db.DB.Preload("Lines").Where("id = ? AND is_deleted = ?", id, false).First(&order).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 订单 ID " + id + " 不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取订单详情失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, services.MapSalesOrderToResponse(order))
}

// GetSalesOrderByNoHandler 按单号获取订单详情 (用于同步流程)
func GetSalesOrderByNoHandler(c *gin.Context) {
	orderNo := c.Param("orderNo")
	var order models.SalesOrder
	if err := db.DB.Preload("Lines").Where("order_no = ? AND is_deleted = ?", orderNo, false).First(&order).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 订单号 " + orderNo + " 不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取单据失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, services.MapSalesOrderToResponse(order))
}

// SaveSalesOrderHandler 新增或更新订单 (及其明细)
func SaveSalesOrderHandler(c *gin.Context) {
	var req services.SaveSalesOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 订单数据格式错误: " + err.Error()})
		return
	}

	input := services.MapSaveSalesOrderRequestToModel(req)

	operator := middleware.GetSafeUsername(c)
	input.UpdatedBy = operator

	// 【ID 规范加固】如果前端传来的 ID 不是有效的 UUID 格式 (如遗留的 SO...),
	// 则将其视为新记录，主键 ID 置空交由 DB 自动生成，同时确保业务单号 OrderNo 得到保留。
	isNew := input.ID == "" || len(input.ID) < 36
	originalID := input.ID
	if isNew {
		input.ID = "" // 触发 PostgreSQL 的 gen_random_uuid()
	}
	requesterID := middleware.GetSafeUserID(c)

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// 1. 【审计加固】强制校验所有明细行的物料/产品是否存在 (Referential Integrity)
		for _, line := range input.Lines {
			var product models.Product
			if err := tx.Where("id = ?", line.ProductID).First(&product).Error; err != nil {
				// 同时尝试从 Material 表查找
				var material models.Material
				if errM := tx.Where("id = ?", line.ProductID).First(&material).Error; errM != nil {
					return errors.New("[CRITICAL_DATA_INTEGRITY] 订单保存失败：明细行物料 ID " + line.ProductID + " 不存在")
				}
			}
		}

		// 2. 检查是更新还是新增
		if !isNew {
			var existing models.SalesOrder
			if err := tx.Preload("Lines").Where("id = ?", input.ID).First(&existing).Error; err == nil {
				// 乐观锁版本校验
				if input.Version != existing.Version {
					return ErrVersionConflict
				}

				input.Version = existing.Version + 1
				// 更新主表
				if err := tx.Model(&existing).Updates(input).Error; err != nil {
					return err
				}
				// 同步明细行 (Replace 模式)
				return tx.Model(&existing).Association("Lines").Replace(input.Lines)
			}
		}

		// 新增逻辑 (处理从新 ID 映射而来的情况)
		input.Version = 1
		if input.OrderNo == "" && originalID != "" {
			input.OrderNo = originalID
		}
		if err := tx.Create(&input).Error; err != nil {
			return err
		}

		workflowInstance, err := services.CreateWorkflowInstanceForDocumentTx(
			tx,
			services.WorkflowModuleSalesOrder,
			"SALES_ORDER",
			input.ID,
			requesterID,
		)
		if err != nil {
			return err
		}

		input.WorkflowInstanceID = workflowInstance.ID
		return tx.Model(&input).Update("workflow_instance_id", workflowInstance.ID).Error
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		if errors.Is(err, services.ErrWorkflowDefinitionMissing) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "未找到可用流程定义，请先配置并启用销售单工作流"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存订单失败: " + err.Error()})
		return
	}

	// 【加固】重新加载完整对象，确保 CreatedAt, ID 等数据库生成的字段准确返回给前端
	db.DB.Preload("Lines").First(&input, "id = ?", input.ID)
	c.JSON(http.StatusOK, services.MapSalesOrderToResponse(input))
}

// DeleteSalesOrderHandler 逻辑删除订单
func DeleteSalesOrderHandler(c *gin.Context) {
	id := c.Param("id")
	var order models.SalesOrder
	if err := db.DB.Where("id = ?", id).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 订单 ID " + id + " 不存在"})
		return
	}

	// 执行逻辑删除
	if err := db.DB.Model(&order).Update("is_deleted", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除订单失败: " + err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// BulkSyncSalesOrdersHandler 批量同步销售订单 (数据抢救)
func BulkSyncSalesOrdersHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var input []services.PatchSalesOrderRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 订单同步数据错误: " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, payload := range input {
			order := services.MapPatchSalesOrderRequestToModel(payload)
			// 1. 保存/更新主表
			if err := saveSalesOrderForBulkSync(tx, &order); err != nil {
				return err
			}
			// 2. 强制同步明细行 (Replace 模式)
			if err := tx.Model(&order).Association("Lines").Replace(order.Lines); err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量同步订单失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, services.BulkSyncSalesOrdersResponse{Status: "success", Count: len(input)})
}
