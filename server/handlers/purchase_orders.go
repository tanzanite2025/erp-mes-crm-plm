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

// GetPurchaseOrdersHandler 获取所有采购订单 (分页优化)
func GetPurchaseOrdersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	var orders []models.PurchaseOrder
	var total int64

	db.DB.Model(&models.PurchaseOrder{}).Where("is_deleted = ?", false).Count(&total)

	if err := db.DB.Where("is_deleted = ?", false).
		Order("updated_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&orders).Error; err != nil {
		respondPurchaseOrderError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, services.PurchaseOrderListResponse{
		Items:    services.MapPurchaseOrdersToListItems(orders),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// GetPurchaseOrderHandler 获取单个采购订单
func GetPurchaseOrderHandler(c *gin.Context) {
	id := c.Param("id")
	var order models.PurchaseOrder
	if err := db.DB.Preload("Lines").First(&order, "id = ?", id).Error; err != nil {
		respondPurchaseOrderError(c, http.StatusNotFound, "采购订单不存在")
		return
	}
	c.JSON(http.StatusOK, services.MapPurchaseOrderToResponse(order))
}

// SavePurchaseOrderHandler 保存/更新采购订单
func SavePurchaseOrderHandler(c *gin.Context) {
	var req services.SavePurchaseOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
		return
	}

	order := services.MapSavePurchaseOrderRequestToModel(req)

	// 【ID 规范加固】如果前端传来的 ID 不是有效的 UUID 格式 (如遗留的 PO...),
	// 则将其视为新记录，主键 ID 置空交由 DB 自动生成，同时确保业务单号 OrderNo 得到保留。
	isNew := order.ID == "" || len(order.ID) < 36
	originalID := order.ID
	if isNew {
		order.ID = "" // 触发 PostgreSQL 的 gen_random_uuid()
	}
	requesterID := middleware.GetSafeUserID(c)

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// 1. 【审计校验】强制校验明细行引用的物料 ID 是否合法且为激活状态
		for _, line := range order.Lines {
			var material models.Material
			// Material 模型使用 Status 字段和 GORM 默认的 DeletedAt，不区分 is_deleted 物理列
			if err := tx.Where("id = ? AND status = ?", line.MaterialID, "Active").First(&material).Error; err != nil {
				return errors.New("[CRITICAL_DATA_INTEGRITY] 采购单保存失败：明细行引用了无效或已停用的物料 ID: " + line.MaterialID)
			}
		}

		// 2. 检查是更新还是新增
		if !isNew {
			var existing models.PurchaseOrder
			if err := tx.Preload("Lines").Where("id = ?", order.ID).First(&existing).Error; err == nil {
				// 版本冲突检查
				if order.Version != 0 && order.Version != existing.Version {
					return ErrVersionConflict
				}
				order.Version = existing.Version + 1

				// 更新主表
				if err := tx.Model(&existing).Updates(order).Error; err != nil {
					return err
				}
				// 同步明细行 (Replace 模式)
				return tx.Model(&existing).Association("Lines").Replace(order.Lines)
			}
		}

		// 新增逻辑
		order.Version = 1
		if order.OrderNo == "" && originalID != "" {
			order.OrderNo = originalID
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		workflowInstance, err := services.CreateWorkflowInstanceForDocumentTx(
			tx,
			services.WorkflowModulePurchaseOrder,
			"PURCHASE_ORDER",
			order.ID,
			requesterID,
		)
		if err != nil {
			return err
		}

		order.WorkflowInstanceID = workflowInstance.ID
		return tx.Model(&order).Update("workflow_instance_id", workflowInstance.ID).Error
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		if errors.Is(err, services.ErrWorkflowDefinitionMissing) {
			respondPurchaseOrderError(c, http.StatusBadRequest, "未找到可用流程定义，请先配置并启用采购单工作流")
			return
		}
		respondPurchaseOrderError(c, http.StatusInternalServerError, err.Error())
		return
	}

	db.DB.Preload("Lines").First(&order, "id = ?", order.ID)
	c.JSON(http.StatusOK, services.MapPurchaseOrderToResponse(order))
}

// PatchPurchaseOrderHandler 局部更新采购订单
func PatchPurchaseOrderHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.PatchDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
		return
	}

	var existing models.PurchaseOrder
	if err := db.DB.Preload("Lines").First(&existing, "id = ?", id).Error; err != nil {
		respondPurchaseOrderError(c, http.StatusNotFound, "采购订单不存在")
		return
	}

	patch := services.MapPurchaseOrderToResponse(existing)
	patchReq := services.PatchPurchaseOrderRequest{
		ID:                 patch.ID,
		OrderNo:            patch.OrderNo,
		SupplierID:         patch.SupplierID,
		SupplierName:       patch.SupplierName,
		OrderDate:          patch.OrderDate,
		ExpectedDate:       patch.ExpectedDate,
		Status:             patch.Status,
		Currency:           patch.Currency,
		Amount:             patch.Amount,
		ExchangeRate:       patch.ExchangeRate,
		Purchaser:          patch.Purchaser,
		PaymentTerm:        patch.PaymentTerm,
		Note:               patch.Note,
		WorkflowInstanceID: patch.WorkflowInstanceID,
		IsDeleted:          patch.IsDeleted,
		Version:            req.Metadata.Version,
		Lines:              make([]services.PurchaseOrderLineRequest, 0, len(patch.Lines)),
	}
	for _, line := range patch.Lines {
		patchReq.Lines = append(patchReq.Lines, services.PurchaseOrderLineRequest{
			ID:            line.ID,
			LineNo:        line.LineNo,
			MaterialID:    line.MaterialID,
			MaterialCode:  line.MaterialCode,
			MaterialName:  line.MaterialName,
			Specification: line.Specification,
			Qty:           line.Qty,
			UOM:           line.UOM,
			Price:         line.Price,
			Amount:        line.Amount,
			ReceivedQty:   line.ReceivedQty,
			Status:        line.Status,
		})
	}

	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			respondPurchaseOrderError(c, http.StatusBadRequest, "无效的采购订单差量数据")
			return
		}
		switch key {
		case "orderNo":
			if err := json.Unmarshal(valueRaw, &patchReq.OrderNo); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "orderNo 字段错误")
				return
			}
		case "supplierId":
			if err := json.Unmarshal(valueRaw, &patchReq.SupplierID); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "supplierId 字段错误")
				return
			}
		case "supplierName":
			if err := json.Unmarshal(valueRaw, &patchReq.SupplierName); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "supplierName 字段错误")
				return
			}
		case "orderDate":
			if err := json.Unmarshal(valueRaw, &patchReq.OrderDate); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "orderDate 字段错误")
				return
			}
		case "expectedDate":
			if err := json.Unmarshal(valueRaw, &patchReq.ExpectedDate); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "expectedDate 字段错误")
				return
			}
		case "status":
			if err := json.Unmarshal(valueRaw, &patchReq.Status); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "status 字段错误")
				return
			}
		case "currency":
			if err := json.Unmarshal(valueRaw, &patchReq.Currency); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "currency 字段错误")
				return
			}
		case "amount":
			if err := json.Unmarshal(valueRaw, &patchReq.Amount); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "amount 字段错误")
				return
			}
		case "exchangeRate":
			if err := json.Unmarshal(valueRaw, &patchReq.ExchangeRate); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "exchangeRate 字段错误")
				return
			}
		case "purchaser":
			if err := json.Unmarshal(valueRaw, &patchReq.Purchaser); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "purchaser 字段错误")
				return
			}
		case "paymentTerm":
			if err := json.Unmarshal(valueRaw, &patchReq.PaymentTerm); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "paymentTerm 字段错误")
				return
			}
		case "note":
			if err := json.Unmarshal(valueRaw, &patchReq.Note); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "note 字段错误")
				return
			}
		case "workflowInstanceId":
			if err := json.Unmarshal(valueRaw, &patchReq.WorkflowInstanceID); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "workflowInstanceId 字段错误")
				return
			}
		case "isDeleted":
			if err := json.Unmarshal(valueRaw, &patchReq.IsDeleted); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "isDeleted 字段错误")
				return
			}
		case "lines":
			if err := json.Unmarshal(valueRaw, &patchReq.Lines); err != nil {
				respondPurchaseOrderError(c, http.StatusBadRequest, "lines 字段错误")
				return
			}
		}
	}

	order := services.MapPatchPurchaseOrderRequestToModel(patchReq)
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, line := range order.Lines {
			var material models.Material
			if err := tx.Where("id = ? AND status = ?", line.MaterialID, "Active").First(&material).Error; err != nil {
				return errors.New("[CRITICAL_DATA_INTEGRITY] 采购单保存失败：明细行引用了无效或已停用的物料 ID: " + line.MaterialID)
			}
		}

		var current models.PurchaseOrder
		if err := tx.Preload("Lines").Where("id = ?", id).First(&current).Error; err != nil {
			return err
		}
		if order.Version != 0 && order.Version != current.Version {
			return ErrVersionConflict
		}
		order.Version = current.Version + 1
		if err := tx.Model(&current).Updates(order).Error; err != nil {
			return err
		}
		return tx.Model(&current).Association("Lines").Replace(order.Lines)
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		respondPurchaseOrderError(c, http.StatusInternalServerError, err.Error())
		return
	}

	db.DB.Preload("Lines").First(&order, "id = ?", id)
	c.JSON(http.StatusOK, services.MapPurchaseOrderToResponse(order))
}

func ConfirmPurchaseReceiptHandler(c *gin.Context) {
	purchaseOrderID := strings.TrimSpace(c.Param("id"))
	if purchaseOrderID == "" {
		respondPurchaseOrderError(c, http.StatusBadRequest, "采购订单ID不能为空")
		return
	}

	var req services.ConfirmPurchaseReceiptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
		return
	}

	operator := strings.TrimSpace(req.Operator)
	if operator == "" {
		operator = middleware.GetSafeUsername(c)
	}

	result, err := services.ConfirmPurchaseReceipt(services.MapConfirmPurchaseReceiptRequestToInput(req, purchaseOrderID, operator, req.ReceiptDate))
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			respondPurchaseOrderError(c, http.StatusNotFound, "采购订单不存在")
		default:
			respondPurchaseOrderError(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	c.JSON(http.StatusOK, result)
}

// DeletePurchaseOrderHandler 删除采购订单 (逻辑删除)
func DeletePurchaseOrderHandler(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Model(&models.PurchaseOrder{}).Where("id = ?", id).Update("is_deleted", true).Error; err != nil {
		respondPurchaseOrderError(c, http.StatusInternalServerError, err.Error())
		return
	}
	c.Status(http.StatusNoContent)
}

// GetDeletedPurchaseOrdersHandler 获取已作废的采购订单 (审计日志)
func GetDeletedPurchaseOrdersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	var orders []models.PurchaseOrder
	var total int64

	// 仅查询已标记为删除的订单
	db.DB.Model(&models.PurchaseOrder{}).Where("is_deleted = ?", true).Count(&total)

	if err := db.DB.Preload("Lines").Where("is_deleted = ?", true).
		Order("updated_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&orders).Error; err != nil {
		respondPurchaseOrderError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, services.PurchaseOrderListResponse{
		Items:    services.MapPurchaseOrdersToListItems(orders),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}
