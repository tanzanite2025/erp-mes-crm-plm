package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services/trading_audit"

	"gorm.io/gorm"
)

type SavePurchaseOrderCommand struct {
	Request  SavePurchaseOrderRequest
	ActorID  string
	Operator string
	IP       string
}

type PatchPurchaseOrderCommand struct {
	OrderID  string
	Patch    PatchPurchaseOrderRequest
	DeltaReq SDRTSDeltaHandlerRequest
	ActorID  string
	Operator string
	IP       string
}

func SavePurchaseOrder(command SavePurchaseOrderCommand) (PurchaseOrderResponse, error) {
	order := MapSavePurchaseOrderRequestToModel(command.Request)
	isNew := order.ID == "" || len(order.ID) < 36
	originalID := order.ID
	if isNew {
		order.ID = ""
	}

	if isNew {
		created, err := createPurchaseOrderTx(order, originalID, strings.TrimSpace(command.ActorID), strings.TrimSpace(command.Operator), strings.TrimSpace(command.IP))
		if err != nil {
			return PurchaseOrderResponse{}, err
		}
		return MapPurchaseOrderToResponse(*created), nil
	}

	payload, err := json.Marshal(PurchaseOrderSavePayload{
		Delta:     buildPurchaseOrderSaveDelta(command.Request),
		FinalData: MapSavePurchaseOrderRequestToPatchRequest(command.Request),
		Operator:  strings.TrimSpace(command.Operator),
	})
	if err != nil {
		return PurchaseOrderResponse{}, err
	}

	result, err := ExecutePurchaseOrderTransaction(ExecutePurchaseOrderTransactionInput{
		OrderID:         order.ID,
		Intent:          PurchaseTransactionIntentOrderSave,
		ActorID:         strings.TrimSpace(command.ActorID),
		Operator:        strings.TrimSpace(command.Operator),
		ExpectedVersion: order.Version,
		Payload:         payload,
		IP:              strings.TrimSpace(command.IP),
	})
	if err != nil {
		return PurchaseOrderResponse{}, err
	}
	if err := recordAuditEventTx(db.DB, trading_audit.BuildPurchaseOrderStatusChangeEvent(result.ID, "", result.Status, audit.AuditActor{UserID: strings.TrimSpace(command.ActorID), Username: strings.TrimSpace(command.Operator), IP: strings.TrimSpace(command.IP), Source: "http"})); err != nil {
		return PurchaseOrderResponse{}, err
	}
	return result, nil
}

func PatchPurchaseOrder(command PatchPurchaseOrderCommand) (PurchaseOrderResponse, error) {
	patch := command.Patch
	if len(command.DeltaReq.Delta) > 0 {
		assembled, err := BuildPurchaseOrderPatchRequest(strings.TrimSpace(command.OrderID), command.DeltaReq)
		if err != nil {
			return PurchaseOrderResponse{}, err
		}
		patch = assembled
	}

	payload, err := json.Marshal(PurchaseOrderSavePayload{
		Delta:     buildPurchaseOrderPatchDelta(patch),
		FinalData: patch,
		Operator:  strings.TrimSpace(command.Operator),
	})
	if err != nil {
		return PurchaseOrderResponse{}, err
	}

	result, err := ExecutePurchaseOrderTransaction(ExecutePurchaseOrderTransactionInput{
		OrderID:         strings.TrimSpace(command.OrderID),
		Intent:          PurchaseTransactionIntentOrderSave,
		ActorID:         strings.TrimSpace(command.ActorID),
		Operator:        strings.TrimSpace(command.Operator),
		ExpectedVersion: patch.Version,
		Payload:         payload,
		IP:              strings.TrimSpace(command.IP),
	})
	if err != nil {
		return PurchaseOrderResponse{}, err
	}
	if err := recordAuditEventTx(db.DB, trading_audit.BuildPurchaseOrderStatusChangeEvent(result.ID, patch.Status, result.Status, audit.AuditActor{UserID: strings.TrimSpace(command.ActorID), Username: strings.TrimSpace(command.Operator), IP: strings.TrimSpace(command.IP), Source: "http"})); err != nil {
		return PurchaseOrderResponse{}, err
	}
	return result, nil
}

func BuildPurchaseOrderPatchRequest(orderID string, req SDRTSDeltaHandlerRequest) (PatchPurchaseOrderRequest, error) {
	if err := validateSupportedTopLevelDeltaKeys(req.Delta, "orderNo", "supplierId", "supplierName", "orderDate", "expectedDate", "status", "currency", "amount", "exchangeRate", "purchaser", "paymentMethod", "paymentMethodName", "paymentTerm", "paymentTermName", "note", "evidences", "workflowInstanceId", "isDeleted", "lines"); err != nil {
		return PatchPurchaseOrderRequest{}, fmt.Errorf("invalid purchase order delta: %w", err)
	}

	var existing models.PurchaseOrder
	if err := db.DB.Preload("Lines").First(&existing, "id = ?", strings.TrimSpace(orderID)).Error; err != nil {
		return PatchPurchaseOrderRequest{}, err
	}

	patch := MapPurchaseOrderToResponse(existing)
	patchReq := PatchPurchaseOrderRequest{
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
		PaymentMethod:      patch.PaymentMethod,
		PaymentMethodName:  patch.PaymentMethodName,
		PaymentTerm:        patch.PaymentTerm,
		PaymentTermName:    patch.PaymentTermName,
		Note:               patch.Note,
		Evidences:          patch.Evidences,
		WorkflowInstanceID: patch.WorkflowInstanceID,
		IsDeleted:          patch.IsDeleted,
		Version:            int(req.Metadata.Version),
		Lines:              make([]PurchaseOrderLineRequest, 0, len(patch.Lines)),
	}
	for _, line := range patch.Lines {
		patchReq.Lines = append(patchReq.Lines, PurchaseOrderLineRequest{
			ID:            line.ID,
			Version:       line.Version,
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
			ReturnedQty:   line.ReturnedQty,
			Status:        line.Status,
		})
	}

	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return PatchPurchaseOrderRequest{}, fmt.Errorf("invalid delta item: %w", err)
		}
		switch key {
		case "orderNo":
			if err := json.Unmarshal(valueRaw, &patchReq.OrderNo); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("orderNo 字段错误")
			}
		case "supplierId":
			if err := json.Unmarshal(valueRaw, &patchReq.SupplierID); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("supplierId 字段错误")
			}
		case "supplierName":
			if err := json.Unmarshal(valueRaw, &patchReq.SupplierName); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("supplierName 字段错误")
			}
		case "orderDate":
			if err := json.Unmarshal(valueRaw, &patchReq.OrderDate); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("orderDate 字段错误")
			}
		case "expectedDate":
			if err := json.Unmarshal(valueRaw, &patchReq.ExpectedDate); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("expectedDate 字段错误")
			}
		case "status":
			if err := json.Unmarshal(valueRaw, &patchReq.Status); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("status 字段错误")
			}
		case "currency":
			if err := json.Unmarshal(valueRaw, &patchReq.Currency); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("currency 字段错误")
			}
		case "amount":
			if err := json.Unmarshal(valueRaw, &patchReq.Amount); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("amount 字段错误")
			}
		case "exchangeRate":
			if err := json.Unmarshal(valueRaw, &patchReq.ExchangeRate); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("exchangeRate 字段错误")
			}
		case "purchaser":
			if err := json.Unmarshal(valueRaw, &patchReq.Purchaser); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("purchaser 字段错误")
			}
		case "paymentMethod":
			if err := json.Unmarshal(valueRaw, &patchReq.PaymentMethod); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("paymentMethod 字段错误")
			}
		case "paymentMethodName":
			if err := json.Unmarshal(valueRaw, &patchReq.PaymentMethodName); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("paymentMethodName 字段错误")
			}
		case "paymentTerm":
			if err := json.Unmarshal(valueRaw, &patchReq.PaymentTerm); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("paymentTerm 字段错误")
			}
		case "paymentTermName":
			if err := json.Unmarshal(valueRaw, &patchReq.PaymentTermName); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("paymentTermName 字段错误")
			}
		case "note":
			if err := json.Unmarshal(valueRaw, &patchReq.Note); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("note 字段错误")
			}
		case "evidences":
			if err := json.Unmarshal(valueRaw, &patchReq.Evidences); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("evidences 字段错误")
			}
		case "workflowInstanceId":
			if err := json.Unmarshal(valueRaw, &patchReq.WorkflowInstanceID); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("workflowInstanceId 字段错误")
			}
		case "isDeleted":
			if err := json.Unmarshal(valueRaw, &patchReq.IsDeleted); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("isDeleted 字段错误")
			}
		case "lines":
			if err := json.Unmarshal(valueRaw, &patchReq.Lines); err != nil {
				return PatchPurchaseOrderRequest{}, fmt.Errorf("lines 字段错误")
			}
		}
	}

	return patchReq, nil
}

func createPurchaseOrderTx(order models.PurchaseOrder, originalID, requesterID, operator, ip string) (*models.PurchaseOrder, error) {
	var created models.PurchaseOrder
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, line := range order.Lines {
			var material models.Material
			if err := tx.Where("id = ? AND status = ?", line.MaterialID, "Active").First(&material).Error; err != nil {
				return errors.New("[CRITICAL_DATA_INTEGRITY] 采购单保存失败：明细行引用了无效或已停用的物料 ID: " + line.MaterialID)
			}
		}

		order.Version = 1
		if order.OrderNo == "" && originalID != "" {
			order.OrderNo = originalID
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		if err := recordAuditEventTx(tx, trading_audit.BuildPurchaseOrderCreateEvent(order, audit.AuditActor{UserID: requesterID, Username: operator, IP: ip, Source: "http"})); err != nil {
			return err
		}

		workflowInstance, err := CreateWorkflowInstanceForDocumentTx(
			tx,
			WorkflowModulePurchaseOrder,
			"PURCHASE_ORDER",
			order.ID,
			requesterID,
		)
		if err != nil {
			return err
		}

		order.WorkflowInstanceID = workflowInstance.ID
		if err := tx.Model(&order).Update("workflow_instance_id", workflowInstance.ID).Error; err != nil {
			return err
		}
		if err := recordAuditEventTx(tx, trading_audit.BuildPurchaseOrderWorkflowEvent(order.ID, workflowInstance.ID, audit.AuditActor{UserID: requesterID, Username: operator, IP: ip, Source: "workflow"})); err != nil {
			return err
		}
		created = order
		return nil
	})
	if err != nil {
		return nil, err
	}
	if err := db.DB.Preload("Lines").First(&created, "id = ?", created.ID).Error; err != nil {
		return nil, err
	}
	return &created, nil
}

func MapSavePurchaseOrderRequestToPatchRequest(input SavePurchaseOrderRequest) PatchPurchaseOrderRequest {
	return PatchPurchaseOrderRequest{
		ID:                 input.ID,
		OrderNo:            input.OrderNo,
		SupplierID:         input.SupplierID,
		SupplierName:       input.SupplierName,
		OrderDate:          input.OrderDate,
		ExpectedDate:       input.ExpectedDate,
		Status:             input.Status,
		Currency:           input.Currency,
		Amount:             input.Amount,
		ExchangeRate:       input.ExchangeRate,
		Purchaser:          input.Purchaser,
		PaymentMethod:      input.PaymentMethod,
		PaymentMethodName:  input.PaymentMethodName,
		PaymentTerm:        input.PaymentTerm,
		PaymentTermName:    input.PaymentTermName,
		Note:               input.Note,
		Evidences:          input.Evidences,
		WorkflowInstanceID: input.WorkflowInstanceID,
		IsDeleted:          input.IsDeleted,
		Version:            input.Version,
		Lines:              input.Lines,
	}
}

func buildPurchaseOrderSaveDelta(request SavePurchaseOrderRequest) map[string]json.RawMessage {
	payload, _ := json.Marshal(request)
	var raw map[string]json.RawMessage
	_ = json.Unmarshal(payload, &raw)
	delete(raw, "id")
	delete(raw, "workflowInstanceId")
	delete(raw, "version")
	return raw
}

func buildPurchaseOrderPatchDelta(request PatchPurchaseOrderRequest) map[string]json.RawMessage {
	payload, _ := json.Marshal(request)
	var raw map[string]json.RawMessage
	_ = json.Unmarshal(payload, &raw)
	delete(raw, "id")
	delete(raw, "workflowInstanceId")
	delete(raw, "version")
	return raw
}
