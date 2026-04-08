package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
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
	withLines := strings.EqualFold(strings.TrimSpace(c.Query("withLines")), "true")
	statusFilterRaw := strings.TrimSpace(c.Query("status"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	var orders []models.SalesOrder
	var total int64

	query := db.DB.Model(&models.SalesOrder{}).Where("is_deleted = ?", false)
	if statusFilterRaw != "" {
		statuses := make([]string, 0)
		for _, item := range strings.Split(statusFilterRaw, ",") {
			status := strings.TrimSpace(item)
			if status != "" {
				statuses = append(statuses, status)
			}
		}
		if len(statuses) > 0 {
			query = query.Where("status IN ?", statuses)
		}
	}

	// 1. 获取总数
	query.Count(&total)

	// 2. 分页获取数据 (列表页移除 Preload("Lines") 以减小 JSON 大包体积)
	listQuery := query.Order("order_date desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize)
	if withLines {
		listQuery = listQuery.Preload("Lines")
	}
	if err := listQuery.Find(&orders).Error; err != nil {
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
				if err := tx.Model(&existing).Association("Lines").Replace(input.Lines); err != nil {
					return err
				}
				_, err := services.RecalculateSalesOrderStatusTx(tx, existing.ID)
				return err
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
		if _, err := services.RecalculateSalesOrderStatusTx(tx, input.ID); err != nil {
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

// PatchSalesOrderHandler 局部更新销售订单
func PatchSalesOrderHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.PatchDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 订单更新数据格式错误: " + err.Error()})
		return
	}

	var existing models.SalesOrder
	if err := db.DB.Preload("Lines").Where("id = ? AND is_deleted = ?", id, false).First(&existing).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 订单 ID " + id + " 不存在"})
		return
	}

	current := services.MapSalesOrderToResponse(existing)
	patchReq := services.PatchSalesOrderRequest{
		ID:                 current.ID,
		OrderNo:            current.OrderNo,
		OrderName:          current.OrderName,
		CustomerName:       current.CustomerName,
		CustomerID:         current.CustomerID,
		Type:               current.Type,
		Currency:           current.Currency,
		Classification:     current.Classification,
		Status:             current.Status,
		StatusNote:         current.StatusNote,
		Amount:             current.Amount,
		Quantity:           current.Quantity,
		OrderDate:          current.OrderDate,
		DeliveryDate:       current.DeliveryDate,
		PurchaseOrderNo:    current.PurchaseOrderNo,
		Barcode:            current.Barcode,
		Requirements:       current.Requirements,
		WorkflowInstanceID: current.WorkflowInstanceID,
		UpdatedBy:          middleware.GetSafeUsername(c),
		IsDeleted:          current.IsDeleted,
		Version:            req.Metadata.Version,
		Lines:              make([]services.SalesOrderLineRequest, 0, len(current.Lines)),
	}
	for _, line := range current.Lines {
		patchReq.Lines = append(patchReq.Lines, services.SalesOrderLineRequest{
			ID:             line.ID,
			LineNo:         line.LineNo,
			ProductID:      line.ProductID,
			ProductModel:   line.ProductModel,
			ProductCode:    line.ProductCode,
			Specification:  line.Specification,
			Description:    line.Description,
			Qty:            line.Qty,
			UOM:            line.UOM,
			Price:          line.Price,
			Amount:         line.Amount,
			DeliveredQty:   line.DeliveredQty,
			CustomerPartNo: line.CustomerPartNo,
			JobNo:          line.JobNo,
			Note:           line.Note,
			DrillingPlanID: line.DrillingPlanID,
			LabelingPlanID: line.LabelingPlanID,
			HoleCount:      line.HoleCount,
			Route:          line.Route,
			OrderDate:      line.OrderDate,
			Status:         line.Status,
			ClaimedBy:      line.ClaimedBy,
			ClaimedAt:      line.ClaimedAt,
		})
	}

	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的订单差量数据"})
			return
		}
		switch key {
		case "orderNo":
			if err := json.Unmarshal(valueRaw, &patchReq.OrderNo); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] orderNo 字段错误"})
				return
			}
		case "orderName":
			if err := json.Unmarshal(valueRaw, &patchReq.OrderName); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] orderName 字段错误"})
				return
			}
		case "customerName":
			if err := json.Unmarshal(valueRaw, &patchReq.CustomerName); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] customerName 字段错误"})
				return
			}
		case "customerId":
			if err := json.Unmarshal(valueRaw, &patchReq.CustomerID); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] customerId 字段错误"})
				return
			}
		case "type":
			if err := json.Unmarshal(valueRaw, &patchReq.Type); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] type 字段错误"})
				return
			}
		case "currency":
			if err := json.Unmarshal(valueRaw, &patchReq.Currency); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] currency 字段错误"})
				return
			}
		case "classification":
			if err := json.Unmarshal(valueRaw, &patchReq.Classification); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] classification 字段错误"})
				return
			}
		case "status":
			if err := json.Unmarshal(valueRaw, &patchReq.Status); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] status 字段错误"})
				return
			}
		case "statusNote":
			if err := json.Unmarshal(valueRaw, &patchReq.StatusNote); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] statusNote 字段错误"})
				return
			}
		case "amount":
			if err := json.Unmarshal(valueRaw, &patchReq.Amount); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] amount 字段错误"})
				return
			}
		case "quantity":
			if err := json.Unmarshal(valueRaw, &patchReq.Quantity); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] quantity 字段错误"})
				return
			}
		case "orderDate":
			if err := json.Unmarshal(valueRaw, &patchReq.OrderDate); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] orderDate 字段错误"})
				return
			}
		case "deliveryDate":
			if err := json.Unmarshal(valueRaw, &patchReq.DeliveryDate); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] deliveryDate 字段错误"})
				return
			}
		case "purchaseOrderNo":
			if err := json.Unmarshal(valueRaw, &patchReq.PurchaseOrderNo); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] purchaseOrderNo 字段错误"})
				return
			}
		case "barcode":
			if err := json.Unmarshal(valueRaw, &patchReq.Barcode); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] barcode 字段错误"})
				return
			}
		case "requirements":
			if err := json.Unmarshal(valueRaw, &patchReq.Requirements); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] requirements 字段错误"})
				return
			}
		case "workflowInstanceId":
			if err := json.Unmarshal(valueRaw, &patchReq.WorkflowInstanceID); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] workflowInstanceId 字段错误"})
				return
			}
		case "isDeleted":
			if err := json.Unmarshal(valueRaw, &patchReq.IsDeleted); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] isDeleted 字段错误"})
				return
			}
		case "lines":
			if err := json.Unmarshal(valueRaw, &patchReq.Lines); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] lines 字段错误"})
				return
			}
		}
	}

	input := services.MapPatchSalesOrderRequestToModel(patchReq)
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, line := range input.Lines {
			var product models.Product
			if err := tx.Where("id = ?", line.ProductID).First(&product).Error; err != nil {
				var material models.Material
				if errM := tx.Where("id = ?", line.ProductID).First(&material).Error; errM != nil {
					return errors.New("[CRITICAL_DATA_INTEGRITY] 订单保存失败：明细行物料 ID " + line.ProductID + " 不存在")
				}
			}
		}
		var current models.SalesOrder
		if err := tx.Preload("Lines").Where("id = ?", id).First(&current).Error; err != nil {
			return err
		}
		if input.Version != current.Version {
			return ErrVersionConflict
		}
		input.Version = current.Version + 1
		if err := tx.Model(&current).Updates(input).Error; err != nil {
			return err
		}
		if err := tx.Model(&current).Association("Lines").Replace(input.Lines); err != nil {
			return err
		}
		_, err := services.RecalculateSalesOrderStatusTx(tx, current.ID)
		return err
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存订单失败: " + err.Error()})
		return
	}

	db.DB.Preload("Lines").First(&input, "id = ?", id)
	c.JSON(http.StatusOK, services.MapSalesOrderToResponse(input))
}

// DeleteSalesOrderHandler 逻辑删除订单
func DeleteSalesOrderHandler(c *gin.Context) {
	id := c.Param("id")
	var order models.SalesOrder
	if err := db.DB.Preload("Lines").Where("id = ?", id).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 订单 ID " + id + " 不存在"})
		return
	}

	if order.Status != "Canceled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未作废订单不可直接删除，请先执行作废事务"})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		return tx.Model(&order).Updates(map[string]interface{}{
			"is_deleted": true,
			"version":    order.Version + 1,
		}).Error
	})
	if err != nil {
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
