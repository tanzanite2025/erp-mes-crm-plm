// Package services - 采购订单事务编排中心。
//
// 此文件以与销售订单(sales_transaction_service.go)对称的 dispatcher 模式管理采购订单写操作:
//   - executePurchaseOrderUnifiedSaveTx        全量保存
//   - executePurchaseOrderLineAddTx            纯增行
//   - executePurchaseOrderLineRemoveTx         纯删行
//   - executePurchaseOrderLineContentChangeTx  改单行内容
//   - executePurchaseOrderSupplierChangeTx     改供应商
//   - executePurchaseOrderExpectedDateChangeTx 改预计到货日期
//
// 关键不变量:
//   - 所有写操作走 ExecutePurchaseOrderTransaction 单一入口,在同一 GORM 事务内完成
//   - 收货确认(receipt confirm)在 inventory 模块的 RecordInbound 路径里走,本文件不直接处理库存
//   - 头部 + 行联动重算 amount 字段调用 recalculatePurchaseOrderAuthorityCosts
//
// 命令解析(`parsePurchaseOrder*Payload`)集中在文件末尾。
package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"xdfc-server/models"
	statemachine "xdfc-server/services/state_machine"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	PurchaseTransactionIntentOrderSave              = "ORDER_SAVE"
	PurchaseTransactionIntentExpectedDateChange     = "ORDER_DELIVERY_DATE_CHANGE"
	PurchaseTransactionIntentSupplierChange         = "ORDER_SUPPLIER_CHANGE"
	PurchaseTransactionIntentOrderLineAdd           = "ORDER_LINE_ADD"
	PurchaseTransactionIntentOrderLineRemove        = "ORDER_LINE_REMOVE"
	PurchaseTransactionIntentOrderLineContentChange = "ORDER_LINE_CONTENT_CHANGE"
	PurchaseTransactionIntentReceiptConfirm         = "PURCHASE_CONFIRM"
)

var (
	ErrPurchaseTransactionUnsupportedIntent = errors.New("unsupported purchase transaction intent")
	ErrPurchaseTransactionInvalidPayload    = errors.New("invalid purchase transaction payload")
	ErrPurchaseTransactionVersionConflict   = errors.New("purchase transaction version conflict")
)

type PurchaseOrderTransactionRequest struct {
	Intent          string          `json:"intent"`
	ActorID         string          `json:"actorId"`
	ExpectedVersion int             `json:"expectedVersion"`
	Payload         json.RawMessage `json:"payload"`
}

type PurchaseOrderSavePayload struct {
	Delta     map[string]json.RawMessage `json:"delta"`
	FinalData PatchPurchaseOrderRequest  `json:"finalData"`
	Operator  string                     `json:"operator"`
}

func purchaseOrderLineStructureChanged(previousLines []models.PurchaseOrderLine, nextLines []models.PurchaseOrderLine) bool {
	previousLineNos := make([]int, 0, len(previousLines))
	for _, line := range previousLines {
		previousLineNos = append(previousLineNos, line.LineNo)
	}
	nextLineNos := make([]int, 0, len(nextLines))
	for _, line := range nextLines {
		nextLineNos = append(nextLineNos, line.LineNo)
	}
	if len(previousLineNos) != len(nextLineNos) {
		return true
	}
	for index := range previousLineNos {
		if previousLineNos[index] != nextLineNos[index] {
			return true
		}
	}
	return false
}

func purchaseOrderPureLineAdd(previousLines []models.PurchaseOrderLine, nextLines []models.PurchaseOrderLine) bool {
	if len(nextLines) <= len(previousLines) {
		return false
	}

	previousByLineNo := make(map[int]models.PurchaseOrderLine, len(previousLines))
	for _, line := range previousLines {
		previousByLineNo[line.LineNo] = line
	}

	addedCount := 0
	for _, line := range nextLines {
		previousLine, ok := previousByLineNo[line.LineNo]
		if !ok {
			addedCount++
			continue
		}

		previousJSON, _ := json.Marshal(previousLine)
		nextJSON, _ := json.Marshal(line)
		if string(previousJSON) != string(nextJSON) {
			return false
		}
	}

	return addedCount > 0
}

func purchaseOrderPureLineRemove(previousLines []models.PurchaseOrderLine, nextLines []models.PurchaseOrderLine) bool {
	if len(nextLines) >= len(previousLines) {
		return false
	}

	nextByLineNo := make(map[int]models.PurchaseOrderLine, len(nextLines))
	for _, line := range nextLines {
		nextByLineNo[line.LineNo] = line
	}

	removedCount := 0
	for _, line := range previousLines {
		nextLine, ok := nextByLineNo[line.LineNo]
		if !ok {
			removedCount++
			continue
		}

		previousJSON, _ := json.Marshal(line)
		nextJSON, _ := json.Marshal(nextLine)
		if string(previousJSON) != string(nextJSON) {
			return false
		}
	}

	return removedCount > 0
}

func executePurchaseOrderUnifiedSaveTx(tx *gorm.DB, current *models.PurchaseOrder, input ExecutePurchaseOrderTransactionInput) (*models.PurchaseOrder, error) {
	payload, err := parsePurchaseOrderSavePayload(input.Payload)
	if err != nil {
		return nil, err
	}
	previousStatus := current.Status

	operator := strings.TrimSpace(payload.Operator)
	if operator == "" {
		operator = strings.TrimSpace(input.Operator)
	}
	if operator == "" {
		operator = strings.TrimSpace(input.ActorID)
	}
	if operator == "" {
		operator = "unknown"
	}

	deltaKeys := make([]string, 0, len(payload.Delta))
	for key := range payload.Delta {
		deltaKeys = append(deltaKeys, key)
	}
	if len(deltaKeys) == 0 {
		return nil, fmt.Errorf("%w: delta is required", ErrPurchaseTransactionInvalidPayload)
	}

	nextOrder := MapPatchPurchaseOrderRequestToModel(payload.FinalData)
	nextLines := nextOrder.Lines
	if nextLines == nil {
		nextLines = []models.PurchaseOrderLine{}
	}
	currentStatus := statemachine.NormalizePurchaseOrderStatus(current.Status)
	nextStatus := statemachine.NormalizePurchaseOrderStatus(nextOrder.Status)
	if !statemachine.IsKnownPurchaseOrderStatus(currentStatus) || !statemachine.IsKnownPurchaseOrderStatus(nextStatus) {
		return nil, fmt.Errorf("%w: %s", ErrPurchaseTransactionInvalidPayload, statemachine.PurchaseOrderDenyUnknownStatus)
	}
	if currentStatus != nextStatus {
		if guard := statemachine.CanTransitionPurchaseOrderStatus(string(currentStatus), string(nextStatus)); !guard.Allowed {
			return nil, guard.Err()
		}
	}
	nextOrder.Status = string(nextStatus)

	isExpectedDateOnlyChange := true
	isSupplierOnlyChange := true
	isLinesOnlyChange := true
	for _, key := range deltaKeys {
		if key != "expectedDate" {
			isExpectedDateOnlyChange = false
		}
		if key != "supplierId" && key != "supplierName" {
			isSupplierOnlyChange = false
		}
		if key != "lines" && key != "amount" {
			isLinesOnlyChange = false
		}
	}

	if isExpectedDateOnlyChange {
		derivedPayload, _ := json.Marshal(PurchaseOrderExpectedDateChangePayload{
			ExpectedDate: payload.FinalData.ExpectedDate,
			Operator:     operator,
		})
		return executePurchaseOrderExpectedDateChangeTx(tx, current, ExecutePurchaseOrderTransactionInput{
			OrderID:         input.OrderID,
			Intent:          PurchaseTransactionIntentExpectedDateChange,
			ActorID:         input.ActorID,
			Operator:        operator,
			ExpectedVersion: input.ExpectedVersion,
			Payload:         derivedPayload,
			IP:              input.IP,
		})
	}

	if isSupplierOnlyChange {
		derivedPayload, _ := json.Marshal(PurchaseOrderSupplierChangePayload{
			SupplierID:   payload.FinalData.SupplierID,
			SupplierName: payload.FinalData.SupplierName,
			Operator:     operator,
		})
		return executePurchaseOrderSupplierChangeTx(tx, current, ExecutePurchaseOrderTransactionInput{
			OrderID:         input.OrderID,
			Intent:          PurchaseTransactionIntentSupplierChange,
			ActorID:         input.ActorID,
			Operator:        operator,
			ExpectedVersion: input.ExpectedVersion,
			Payload:         derivedPayload,
			IP:              input.IP,
		})
	}

	if isLinesOnlyChange {
		if !purchaseOrderLineStructureChanged(current.Lines, nextLines) {
			derivedPayload, _ := json.Marshal(PurchaseOrderLineContentChangePayload{Lines: payload.FinalData.Lines, Operator: operator})
			return executePurchaseOrderLineContentChangeTx(tx, current, ExecutePurchaseOrderTransactionInput{
				OrderID:         input.OrderID,
				Intent:          PurchaseTransactionIntentOrderLineContentChange,
				ActorID:         input.ActorID,
				Operator:        operator,
				ExpectedVersion: input.ExpectedVersion,
				Payload:         derivedPayload,
				IP:              input.IP,
			})
		}
		if purchaseOrderPureLineAdd(current.Lines, nextLines) {
			derivedPayload, _ := json.Marshal(PurchaseOrderLineAddPayload{Lines: payload.FinalData.Lines, Operator: operator})
			return executePurchaseOrderLineAddTx(tx, current, ExecutePurchaseOrderTransactionInput{
				OrderID:         input.OrderID,
				Intent:          PurchaseTransactionIntentOrderLineAdd,
				ActorID:         input.ActorID,
				Operator:        operator,
				ExpectedVersion: input.ExpectedVersion,
				Payload:         derivedPayload,
				IP:              input.IP,
			})
		}
		if purchaseOrderPureLineRemove(current.Lines, nextLines) {
			derivedPayload, _ := json.Marshal(PurchaseOrderLineRemovePayload{Lines: payload.FinalData.Lines, Operator: operator})
			return executePurchaseOrderLineRemoveTx(tx, current, ExecutePurchaseOrderTransactionInput{
				OrderID:         input.OrderID,
				Intent:          PurchaseTransactionIntentOrderLineRemove,
				ActorID:         input.ActorID,
				Operator:        operator,
				ExpectedVersion: input.ExpectedVersion,
				Payload:         derivedPayload,
				IP:              input.IP,
			})
		}
	}

	for _, line := range nextOrder.Lines {
		if strings.TrimSpace(line.MaterialID) == "" {
			continue
		}
		var material models.Material
		if err := tx.Where("id = ? AND status = ?", line.MaterialID, "Active").First(&material).Error; err != nil {
			return nil, errors.New("[CRITICAL_DATA_INTEGRITY] 采购单保存失败：明细行引用了无效或已停用的物料 ID: " + line.MaterialID)
		}
	}

	recalculatePurchaseOrderAuthorityCosts(&nextOrder)

	nextOrder.ID = current.ID
	nextOrder.Version = current.Version + 1
	if nextOrder.OrderNo == "" {
		nextOrder.OrderNo = current.OrderNo
	}
	if len(nextOrder.Evidences) == 0 {
		nextOrder.Evidences = encodeOrderEvidences(payload.FinalData.Evidences)
	}
	if nextOrder.SupplierName == "" {
		nextOrder.SupplierName = current.SupplierName
	}
	if nextOrder.SupplierID == "" {
		nextOrder.SupplierID = current.SupplierID
	}

	if err := tx.Model(current).Updates(map[string]any{
		"order_no":            nextOrder.OrderNo,
		"supplier_id":         nextOrder.SupplierID,
		"supplier_name":       nextOrder.SupplierName,
		"order_date":          nextOrder.OrderDate,
		"expected_date":       nextOrder.ExpectedDate,
		"status":              nextOrder.Status,
		"currency":            nextOrder.Currency,
		"amount":              nextOrder.Amount,
		"exchange_rate":       nextOrder.ExchangeRate,
		"purchaser":           nextOrder.Purchaser,
		"payment_method":      nextOrder.PaymentMethod,
		"payment_method_name": nextOrder.PaymentMethodName,
		"payment_term":        nextOrder.PaymentTerm,
		"payment_term_name":   nextOrder.PaymentTermName,
		"note":                nextOrder.Note,
		"evidences":           nextOrder.Evidences,
		"deleted_at":          nil,
		"version":             nextOrder.Version,
	}).Error; err != nil {
		return nil, err
	}
	if nextOrder.DeletedAt.Valid || nextOrder.IsDeleted {
		if err := tx.Model(current).Update("deleted_at", gorm.Expr("COALESCE(deleted_at, NOW())")).Error; err != nil {
			return nil, err
		}
	}

	if err := tx.Model(current).Association("Lines").Replace(nextOrder.Lines); err != nil {
		return nil, err
	}

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          PurchaseTransactionIntentOrderSave,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     nextOrder.Version,
		"payload": map[string]any{
			"deltaKeys":  deltaKeys,
			"lineCount":  len(nextOrder.Lines),
			"supplierId": nextOrder.SupplierID,
			"amount":     nextOrder.Amount,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "PurchaseOrder",
		TargetID: current.ID,
		Action:   PurchaseTransactionIntentOrderSave,
		Diff:     auditDiff,
		Operator: operator,
		IP:       strings.TrimSpace(input.IP),
	}); err != nil {
		return nil, err
	}

	if err := tx.Preload("Lines").First(current, "id = ?", current.ID).Error; err != nil {
		return nil, err
	}
	if err := DispatchPurchaseOrderStatusChangedTx(tx, *current, previousStatus, current.Status, input.ActorID, operator); err != nil {
		return nil, err
	}

	return current, nil
}

func executePurchaseOrderSupplierChangeTx(tx *gorm.DB, current *models.PurchaseOrder, input ExecutePurchaseOrderTransactionInput) (*models.PurchaseOrder, error) {
	payload, err := parsePurchaseOrderSupplierChangePayload(input.Payload)
	if err != nil {
		return nil, err
	}

	operator := strings.TrimSpace(payload.Operator)
	if operator == "" {
		operator = strings.TrimSpace(input.Operator)
	}
	if operator == "" {
		operator = strings.TrimSpace(input.ActorID)
	}
	if operator == "" {
		operator = "unknown"
	}

	supplierID := strings.TrimSpace(payload.SupplierID)
	supplierName := strings.TrimSpace(payload.SupplierName)
	if supplierID == strings.TrimSpace(current.SupplierID) && supplierName == strings.TrimSpace(current.SupplierName) {
		return nil, fmt.Errorf("%w: supplier unchanged", ErrPurchaseTransactionInvalidPayload)
	}

	var supplier models.Supplier
	if err := tx.Where("id = ?", supplierID).First(&supplier).Error; err != nil {
		return nil, errors.New("[CRITICAL_DATA_INTEGRITY] 采购单保存失败：供应商不存在或已停用: " + supplierID)
	}
	if supplierName == "" {
		supplierName = strings.TrimSpace(supplier.Name)
	}

	if err := tx.Model(current).Updates(map[string]any{
		"supplier_id":   supplierID,
		"supplier_name": supplierName,
		"version":       current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.SupplierID = supplierID
	current.SupplierName = supplierName
	current.Version = current.Version + 1

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          PurchaseTransactionIntentSupplierChange,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"supplierId":   supplierID,
			"supplierName": supplierName,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "PurchaseOrder",
		TargetID: current.ID,
		Action:   PurchaseTransactionIntentSupplierChange,
		Diff:     auditDiff,
		Operator: operator,
		IP:       strings.TrimSpace(input.IP),
	}); err != nil {
		return nil, err
	}

	if err := tx.Preload("Lines").First(current, "id = ?", current.ID).Error; err != nil {
		return nil, err
	}

	return current, nil
}

type PurchaseOrderExpectedDateChangePayload struct {
	ExpectedDate string `json:"expectedDate"`
	Operator     string `json:"operator"`
}

type PurchaseOrderSupplierChangePayload struct {
	SupplierID   string `json:"supplierId"`
	SupplierName string `json:"supplierName"`
	Operator     string `json:"operator"`
}

type PurchaseOrderLineContentChangePayload struct {
	Lines    []PurchaseOrderLineRequest `json:"lines"`
	Operator string                     `json:"operator"`
}

type PurchaseOrderLineAddPayload struct {
	Lines    []PurchaseOrderLineRequest `json:"lines"`
	Operator string                     `json:"operator"`
}

type PurchaseOrderLineRemovePayload struct {
	Lines    []PurchaseOrderLineRequest `json:"lines"`
	Operator string                     `json:"operator"`
}

type PurchaseOrderReceiptConfirmLinePayload struct {
	PurchaseOrderLineID uint    `json:"purchaseOrderLineId"`
	OrderLineVersion    int     `json:"orderLineVersion"`
	MaterialID          string  `json:"materialId"`
	Quantity            float64 `json:"quantity"`
	PurchasePrice       float64 `json:"purchasePrice"`
	BatchNo             string  `json:"batchNo"`
	TargetCategory      string  `json:"targetCategory"`
}

type PurchaseOrderReceiptConfirmPayload struct {
	Operator    string                                   `json:"operator"`
	Remarks     string                                   `json:"remarks"`
	ReceiptDate string                                   `json:"receiptDate"`
	Lines       []PurchaseOrderReceiptConfirmLinePayload `json:"lines"`
}

type ExecutePurchaseOrderTransactionInput struct {
	OrderID         string
	Intent          string
	ActorID         string
	Operator        string
	ExpectedVersion int
	Payload         json.RawMessage
	IP              string
}

func ExecutePurchaseOrderTransaction(input ExecutePurchaseOrderTransactionInput) (PurchaseOrderResponse, error) {
	var response PurchaseOrderResponse

	err := defaultServiceRuntime().txManager.WithinTransaction(func(tx *gorm.DB) error {
		updated, err := executePurchaseOrderTransactionTx(tx, input)
		if err != nil {
			return err
		}
		response = MapPurchaseOrderToResponse(*updated)
		return nil
	})
	if err != nil {
		return PurchaseOrderResponse{}, err
	}

	syncPurchaseOrderToSearch(response)
	return response, nil
}

func executePurchaseOrderTransactionTx(tx *gorm.DB, input ExecutePurchaseOrderTransactionInput) (*models.PurchaseOrder, error) {
	if tx == nil {
		return nil, errors.New("transaction is required")
	}

	intent := strings.TrimSpace(input.Intent)
	if intent != PurchaseTransactionIntentOrderSave && intent != PurchaseTransactionIntentExpectedDateChange && intent != PurchaseTransactionIntentSupplierChange && intent != PurchaseTransactionIntentOrderLineAdd && intent != PurchaseTransactionIntentOrderLineRemove && intent != PurchaseTransactionIntentOrderLineContentChange && intent != PurchaseTransactionIntentReceiptConfirm {
		return nil, ErrPurchaseTransactionUnsupportedIntent
	}

	var current models.PurchaseOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Lines").Where("id = ?", strings.TrimSpace(input.OrderID)).First(&current).Error; err != nil {
		return nil, err
	}

	if input.ExpectedVersion != 0 && input.ExpectedVersion != current.Version {
		return nil, ErrPurchaseTransactionVersionConflict
	}

	switch intent {
	case PurchaseTransactionIntentOrderSave:
		return executePurchaseOrderUnifiedSaveTx(tx, &current, input)
	case PurchaseTransactionIntentExpectedDateChange:
		return executePurchaseOrderExpectedDateChangeTx(tx, &current, input)
	case PurchaseTransactionIntentSupplierChange:
		return executePurchaseOrderSupplierChangeTx(tx, &current, input)
	case PurchaseTransactionIntentOrderLineAdd:
		return executePurchaseOrderLineAddTx(tx, &current, input)
	case PurchaseTransactionIntentOrderLineRemove:
		return executePurchaseOrderLineRemoveTx(tx, &current, input)
	case PurchaseTransactionIntentOrderLineContentChange:
		return executePurchaseOrderLineContentChangeTx(tx, &current, input)
	default:
		return nil, ErrPurchaseTransactionUnsupportedIntent
	}
}

func ParsePurchaseOrderReceiptConfirmPayload(raw json.RawMessage) (PurchaseOrderReceiptConfirmPayload, error) {
	if len(raw) == 0 {
		return PurchaseOrderReceiptConfirmPayload{}, fmt.Errorf("%w: payload is required", ErrPurchaseTransactionInvalidPayload)
	}

	var payload PurchaseOrderReceiptConfirmPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return PurchaseOrderReceiptConfirmPayload{}, fmt.Errorf("%w: %v", ErrPurchaseTransactionInvalidPayload, err)
	}
	if len(payload.Lines) == 0 {
		return PurchaseOrderReceiptConfirmPayload{}, fmt.Errorf("%w: lines is required", ErrPurchaseTransactionInvalidPayload)
	}

	return payload, nil
}

func mapReceiptConfirmPayloadLines(lines []PurchaseOrderReceiptConfirmLinePayload) []ConfirmPurchaseReceiptLineInput {
	items := make([]ConfirmPurchaseReceiptLineInput, 0, len(lines))
	for _, line := range lines {
		items = append(items, ConfirmPurchaseReceiptLineInput{
			PurchaseOrderLineID: line.PurchaseOrderLineID,
			OrderLineVersion:    line.OrderLineVersion,
			MaterialID:          line.MaterialID,
			Quantity:            line.Quantity,
			PurchasePrice:       line.PurchasePrice,
			BatchNo:             line.BatchNo,
			TargetCategory:      line.TargetCategory,
		})
	}
	return items
}

func executePurchaseOrderLineRemoveTx(tx *gorm.DB, current *models.PurchaseOrder, input ExecutePurchaseOrderTransactionInput) (*models.PurchaseOrder, error) {
	payload, err := parsePurchaseOrderLineRemovePayload(input.Payload)
	if err != nil {
		return nil, err
	}

	operator := strings.TrimSpace(payload.Operator)
	if operator == "" {
		operator = strings.TrimSpace(input.Operator)
	}
	if operator == "" {
		operator = strings.TrimSpace(input.ActorID)
	}
	if operator == "" {
		operator = "unknown"
	}

	if len(payload.Lines) >= len(current.Lines) {
		return nil, fmt.Errorf("%w: no line remove detected", ErrPurchaseTransactionInvalidPayload)
	}

	currentLineNos := make(map[int]models.PurchaseOrderLine, len(current.Lines))
	for _, line := range current.Lines {
		currentLineNos[line.LineNo] = line
	}

	nextLines := make([]models.PurchaseOrderLine, 0, len(payload.Lines))
	for _, lineReq := range payload.Lines {
		if strings.TrimSpace(lineReq.MaterialID) != "" {
			var material models.Material
			if err := tx.Where("id = ? AND status = ?", lineReq.MaterialID, "Active").First(&material).Error; err != nil {
				return nil, errors.New("[CRITICAL_DATA_INTEGRITY] 采购单保存失败：明细行引用了无效或已停用的物料 ID: " + lineReq.MaterialID)
			}
		}

		existing, ok := currentLineNos[lineReq.LineNo]
		if !ok {
			return nil, fmt.Errorf("%w: line add detected during line remove", ErrPurchaseTransactionInvalidPayload)
		}

		mappedLine := mapPurchaseOrderLineRequestToModel(lineReq)
		existingJSON, _ := json.Marshal(existing)
		mappedJSON, _ := json.Marshal(mappedLine)
		if string(existingJSON) != string(mappedJSON) {
			return nil, fmt.Errorf("%w: existing lines changed during line remove", ErrPurchaseTransactionInvalidPayload)
		}

		nextLines = append(nextLines, mappedLine)
	}

	removedLineCount := len(current.Lines) - len(nextLines)
	if removedLineCount <= 0 {
		return nil, fmt.Errorf("%w: no line remove detected", ErrPurchaseTransactionInvalidPayload)
	}

	// [BACKEND_AUTHORITY] 强制重算权威金额与汇总，忽略前端传入值
	current.Lines = nextLines
	recalculatePurchaseOrderAuthorityCosts(current)

	if err := tx.Model(current).Updates(map[string]any{
		"amount":  current.Amount,
		"version": current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Version = current.Version + 1

	if err := tx.Model(current).Association("Lines").Replace(nextLines); err != nil {
		return nil, err
	}

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          PurchaseTransactionIntentOrderLineRemove,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"lineCount":        len(nextLines),
			"removedLineCount": removedLineCount,
			"amount":           current.Amount,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "PurchaseOrder",
		TargetID: current.ID,
		Action:   PurchaseTransactionIntentOrderLineRemove,
		Diff:     auditDiff,
		Operator: operator,
		IP:       strings.TrimSpace(input.IP),
	}); err != nil {
		return nil, err
	}

	if err := tx.Preload("Lines").First(current, "id = ?", current.ID).Error; err != nil {
		return nil, err
	}

	return current, nil
}

func executePurchaseOrderLineAddTx(tx *gorm.DB, current *models.PurchaseOrder, input ExecutePurchaseOrderTransactionInput) (*models.PurchaseOrder, error) {
	payload, err := parsePurchaseOrderLineAddPayload(input.Payload)
	if err != nil {
		return nil, err
	}

	operator := strings.TrimSpace(payload.Operator)
	if operator == "" {
		operator = strings.TrimSpace(input.Operator)
	}
	if operator == "" {
		operator = strings.TrimSpace(input.ActorID)
	}
	if operator == "" {
		operator = "unknown"
	}

	if len(payload.Lines) <= len(current.Lines) {
		return nil, fmt.Errorf("%w: no line add detected", ErrPurchaseTransactionInvalidPayload)
	}

	currentLineNos := make(map[int]models.PurchaseOrderLine, len(current.Lines))
	for _, line := range current.Lines {
		currentLineNos[line.LineNo] = line
	}

	nextLines := make([]models.PurchaseOrderLine, 0, len(payload.Lines))
	newLineCount := 0
	for _, lineReq := range payload.Lines {
		if strings.TrimSpace(lineReq.MaterialID) != "" {
			var material models.Material
			if err := tx.Where("id = ? AND status = ?", lineReq.MaterialID, "Active").First(&material).Error; err != nil {
				return nil, errors.New("[CRITICAL_DATA_INTEGRITY] 采购单保存失败：明细行引用了无效或已停用的物料 ID: " + lineReq.MaterialID)
			}
		}

		mappedLine := mapPurchaseOrderLineRequestToModel(lineReq)
		if existing, ok := currentLineNos[lineReq.LineNo]; ok {
			existingJSON, _ := json.Marshal(existing)
			mappedJSON, _ := json.Marshal(mappedLine)
			if string(existingJSON) != string(mappedJSON) {
				return nil, fmt.Errorf("%w: existing lines changed during line add", ErrPurchaseTransactionInvalidPayload)
			}
		} else {
			newLineCount++
		}
		nextLines = append(nextLines, mappedLine)
	}

	if newLineCount == 0 {
		return nil, fmt.Errorf("%w: no line add detected", ErrPurchaseTransactionInvalidPayload)
	}

	for _, line := range current.Lines {
		found := false
		for _, nextLine := range nextLines {
			if nextLine.LineNo == line.LineNo {
				found = true
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("%w: existing lines removed during line add", ErrPurchaseTransactionInvalidPayload)
		}
	}

	// [BACKEND_AUTHORITY] 强制重算权威金额与汇总，忽略前端传入值
	current.Lines = nextLines
	recalculatePurchaseOrderAuthorityCosts(current)

	if err := tx.Model(current).Updates(map[string]any{
		"amount":  current.Amount,
		"version": current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Version = current.Version + 1

	if err := tx.Model(current).Association("Lines").Replace(nextLines); err != nil {
		return nil, err
	}

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          PurchaseTransactionIntentOrderLineAdd,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"lineCount":      len(nextLines),
			"addedLineCount": newLineCount,
			"amount":         current.Amount,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "PurchaseOrder",
		TargetID: current.ID,
		Action:   PurchaseTransactionIntentOrderLineAdd,
		Diff:     auditDiff,
		Operator: operator,
		IP:       strings.TrimSpace(input.IP),
	}); err != nil {
		return nil, err
	}

	if err := tx.Preload("Lines").First(current, "id = ?", current.ID).Error; err != nil {
		return nil, err
	}

	return current, nil
}

func executePurchaseOrderLineContentChangeTx(tx *gorm.DB, current *models.PurchaseOrder, input ExecutePurchaseOrderTransactionInput) (*models.PurchaseOrder, error) {
	payload, err := parsePurchaseOrderLineContentChangePayload(input.Payload)
	if err != nil {
		return nil, err
	}

	operator := strings.TrimSpace(payload.Operator)
	if operator == "" {
		operator = strings.TrimSpace(input.Operator)
	}
	if operator == "" {
		operator = strings.TrimSpace(input.ActorID)
	}
	if operator == "" {
		operator = "unknown"
	}

	if len(payload.Lines) != len(current.Lines) {
		return nil, fmt.Errorf("%w: line add/remove is not allowed in content change", ErrPurchaseTransactionInvalidPayload)
	}

	currentLineNos := make(map[int]struct{}, len(current.Lines))
	for _, line := range current.Lines {
		currentLineNos[line.LineNo] = struct{}{}
	}

	nextLines := make([]models.PurchaseOrderLine, 0, len(payload.Lines))
	for _, lineReq := range payload.Lines {
		if _, ok := currentLineNos[lineReq.LineNo]; !ok {
			return nil, fmt.Errorf("%w: line add/remove is not allowed in content change", ErrPurchaseTransactionInvalidPayload)
		}
		if strings.TrimSpace(lineReq.MaterialID) != "" {
			var material models.Material
			if err := tx.Where("id = ? AND status = ?", lineReq.MaterialID, "Active").First(&material).Error; err != nil {
				return nil, errors.New("[CRITICAL_DATA_INTEGRITY] 采购单保存失败：明细行引用了无效或已停用的物料 ID: " + lineReq.MaterialID)
			}
		}
		nextLines = append(nextLines, mapPurchaseOrderLineRequestToModel(lineReq))
	}

	currentLinesJSON, _ := json.Marshal(current.Lines)
	nextLinesJSON, _ := json.Marshal(nextLines)
	if string(currentLinesJSON) == string(nextLinesJSON) {
		return nil, fmt.Errorf("%w: lines unchanged", ErrPurchaseTransactionInvalidPayload)
	}

	// [BACKEND_AUTHORITY] 强制重算权威金额与汇总，忽略前端传入值
	current.Lines = nextLines
	recalculatePurchaseOrderAuthorityCosts(current)

	if err := tx.Model(current).Updates(map[string]any{
		"amount":  current.Amount,
		"version": current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Version = current.Version + 1

	if err := tx.Model(current).Association("Lines").Replace(nextLines); err != nil {
		return nil, err
	}

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          PurchaseTransactionIntentOrderLineContentChange,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"lineCount": len(nextLines),
			"amount":    current.Amount,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "PurchaseOrder",
		TargetID: current.ID,
		Action:   PurchaseTransactionIntentOrderLineContentChange,
		Diff:     auditDiff,
		Operator: operator,
		IP:       strings.TrimSpace(input.IP),
	}); err != nil {
		return nil, err
	}

	if err := tx.Preload("Lines").First(current, "id = ?", current.ID).Error; err != nil {
		return nil, err
	}

	return current, nil
}

func executePurchaseOrderExpectedDateChangeTx(tx *gorm.DB, current *models.PurchaseOrder, input ExecutePurchaseOrderTransactionInput) (*models.PurchaseOrder, error) {
	payload, err := parsePurchaseOrderExpectedDateChangePayload(input.Payload)
	if err != nil {
		return nil, err
	}

	operator := strings.TrimSpace(payload.Operator)
	if operator == "" {
		operator = strings.TrimSpace(input.Operator)
	}
	if operator == "" {
		operator = strings.TrimSpace(input.ActorID)
	}
	if operator == "" {
		operator = "unknown"
	}

	expectedDate := strings.TrimSpace(payload.ExpectedDate)
	if expectedDate == strings.TrimSpace(current.ExpectedDate) {
		return nil, fmt.Errorf("%w: expectedDate unchanged", ErrPurchaseTransactionInvalidPayload)
	}

	if err := tx.Model(current).Updates(map[string]any{
		"expected_date": expectedDate,
		"version":       current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.ExpectedDate = expectedDate
	current.Version = current.Version + 1

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          PurchaseTransactionIntentExpectedDateChange,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"expectedDate": expectedDate,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "PurchaseOrder",
		TargetID: current.ID,
		Action:   PurchaseTransactionIntentExpectedDateChange,
		Diff:     auditDiff,
		Operator: operator,
		IP:       strings.TrimSpace(input.IP),
	}); err != nil {
		return nil, err
	}

	if err := tx.Preload("Lines").First(current, "id = ?", current.ID).Error; err != nil {
		return nil, err
	}

	return current, nil
}

func parsePurchaseOrderExpectedDateChangePayload(raw json.RawMessage) (PurchaseOrderExpectedDateChangePayload, error) {
	if len(raw) == 0 {
		return PurchaseOrderExpectedDateChangePayload{}, fmt.Errorf("%w: payload is required", ErrPurchaseTransactionInvalidPayload)
	}

	var payload PurchaseOrderExpectedDateChangePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return PurchaseOrderExpectedDateChangePayload{}, fmt.Errorf("%w: %v", ErrPurchaseTransactionInvalidPayload, err)
	}
	if strings.TrimSpace(payload.ExpectedDate) == "" {
		return PurchaseOrderExpectedDateChangePayload{}, fmt.Errorf("%w: expectedDate is required", ErrPurchaseTransactionInvalidPayload)
	}

	return payload, nil
}

func parsePurchaseOrderSavePayload(raw json.RawMessage) (PurchaseOrderSavePayload, error) {
	if len(raw) == 0 {
		return PurchaseOrderSavePayload{}, fmt.Errorf("%w: payload is required", ErrPurchaseTransactionInvalidPayload)
	}

	var payload PurchaseOrderSavePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return PurchaseOrderSavePayload{}, fmt.Errorf("%w: %v", ErrPurchaseTransactionInvalidPayload, err)
	}
	if payload.FinalData.ID == "" {
		return PurchaseOrderSavePayload{}, fmt.Errorf("%w: finalData.id is required", ErrPurchaseTransactionInvalidPayload)
	}
	if len(payload.Delta) == 0 {
		return PurchaseOrderSavePayload{}, fmt.Errorf("%w: delta is required", ErrPurchaseTransactionInvalidPayload)
	}
	if err := validateSupportedTopLevelDeltaKeys(payload.Delta, "orderNo", "supplierId", "supplierName", "orderDate", "expectedDate", "status", "currency", "amount", "exchangeRate", "purchaser", "paymentMethod", "paymentMethodName", "paymentTerm", "paymentTermName", "note", "evidences", "isDeleted", "lines"); err != nil {
		return PurchaseOrderSavePayload{}, fmt.Errorf("%w: %v", ErrPurchaseTransactionInvalidPayload, err)
	}

	return payload, nil
}

func parsePurchaseOrderSupplierChangePayload(raw json.RawMessage) (PurchaseOrderSupplierChangePayload, error) {
	if len(raw) == 0 {
		return PurchaseOrderSupplierChangePayload{}, fmt.Errorf("%w: payload is required", ErrPurchaseTransactionInvalidPayload)
	}

	var payload PurchaseOrderSupplierChangePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return PurchaseOrderSupplierChangePayload{}, fmt.Errorf("%w: %v", ErrPurchaseTransactionInvalidPayload, err)
	}
	if strings.TrimSpace(payload.SupplierID) == "" {
		return PurchaseOrderSupplierChangePayload{}, fmt.Errorf("%w: supplierId is required", ErrPurchaseTransactionInvalidPayload)
	}

	return payload, nil
}

func parsePurchaseOrderLineAddPayload(raw json.RawMessage) (PurchaseOrderLineAddPayload, error) {
	if len(raw) == 0 {
		return PurchaseOrderLineAddPayload{}, fmt.Errorf("%w: payload is required", ErrPurchaseTransactionInvalidPayload)
	}

	var payload PurchaseOrderLineAddPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return PurchaseOrderLineAddPayload{}, fmt.Errorf("%w: %v", ErrPurchaseTransactionInvalidPayload, err)
	}
	if len(payload.Lines) == 0 {
		return PurchaseOrderLineAddPayload{}, fmt.Errorf("%w: lines is required", ErrPurchaseTransactionInvalidPayload)
	}

	return payload, nil
}

func parsePurchaseOrderLineRemovePayload(raw json.RawMessage) (PurchaseOrderLineRemovePayload, error) {
	if len(raw) == 0 {
		return PurchaseOrderLineRemovePayload{}, fmt.Errorf("%w: payload is required", ErrPurchaseTransactionInvalidPayload)
	}

	var payload PurchaseOrderLineRemovePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return PurchaseOrderLineRemovePayload{}, fmt.Errorf("%w: %v", ErrPurchaseTransactionInvalidPayload, err)
	}
	if len(payload.Lines) == 0 {
		return PurchaseOrderLineRemovePayload{}, fmt.Errorf("%w: lines is required", ErrPurchaseTransactionInvalidPayload)
	}

	return payload, nil
}

func parsePurchaseOrderLineContentChangePayload(raw json.RawMessage) (PurchaseOrderLineContentChangePayload, error) {
	if len(raw) == 0 {
		return PurchaseOrderLineContentChangePayload{}, fmt.Errorf("%w: payload is required", ErrPurchaseTransactionInvalidPayload)
	}

	var payload PurchaseOrderLineContentChangePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return PurchaseOrderLineContentChangePayload{}, fmt.Errorf("%w: %v", ErrPurchaseTransactionInvalidPayload, err)
	}
	if len(payload.Lines) == 0 {
		return PurchaseOrderLineContentChangePayload{}, fmt.Errorf("%w: lines is required", ErrPurchaseTransactionInvalidPayload)
	}

	return payload, nil
}

// [BACKEND_AUTHORITY] 采购订单权威计算引擎。
func recalculatePurchaseOrderAuthorityCosts(order *models.PurchaseOrder) {
	totalAmount := 0.0

	for i := range order.Lines {
		line := &order.Lines[i]
		// 计算单行金额，保留两位小数精度
		line.Amount = math.Round(line.Qty*line.Price*100) / 100
		totalAmount += line.Amount
	}

	order.Amount = math.Round(totalAmount*100) / 100
}
