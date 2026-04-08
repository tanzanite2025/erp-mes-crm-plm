package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	PurchaseTransactionIntentExpectedDateChange     = "ORDER_DELIVERY_DATE_CHANGE"
	PurchaseTransactionIntentOrderLineAdd           = "ORDER_LINE_ADD"
	PurchaseTransactionIntentOrderLineRemove        = "ORDER_LINE_REMOVE"
	PurchaseTransactionIntentOrderLineContentChange = "ORDER_LINE_CONTENT_CHANGE"
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

type PurchaseOrderExpectedDateChangePayload struct {
	ExpectedDate string `json:"expectedDate"`
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

	return response, nil
}

func executePurchaseOrderTransactionTx(tx *gorm.DB, input ExecutePurchaseOrderTransactionInput) (*models.PurchaseOrder, error) {
	if tx == nil {
		return nil, errors.New("transaction is required")
	}

	intent := strings.TrimSpace(input.Intent)
	if intent != PurchaseTransactionIntentExpectedDateChange && intent != PurchaseTransactionIntentOrderLineAdd && intent != PurchaseTransactionIntentOrderLineRemove && intent != PurchaseTransactionIntentOrderLineContentChange {
		return nil, ErrPurchaseTransactionUnsupportedIntent
	}

	var current models.PurchaseOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Lines").Where("id = ? AND is_deleted = ?", strings.TrimSpace(input.OrderID), false).First(&current).Error; err != nil {
		return nil, err
	}

	if input.ExpectedVersion != current.Version {
		return nil, ErrPurchaseTransactionVersionConflict
	}

	switch intent {
	case PurchaseTransactionIntentExpectedDateChange:
		return executePurchaseOrderExpectedDateChangeTx(tx, &current, input)
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

	totalAmount := 0.0
	for _, line := range nextLines {
		totalAmount += line.Amount
	}

	if err := tx.Model(current).Updates(map[string]any{
		"amount":  totalAmount,
		"version": current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Lines = nextLines
	current.Amount = totalAmount
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
			"amount":           totalAmount,
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

	totalAmount := 0.0
	for _, line := range nextLines {
		totalAmount += line.Amount
	}

	if err := tx.Model(current).Updates(map[string]any{
		"amount":  totalAmount,
		"version": current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Lines = nextLines
	current.Amount = totalAmount
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
			"amount":         totalAmount,
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

	totalAmount := 0.0
	for _, line := range nextLines {
		totalAmount += line.Amount
	}

	if err := tx.Model(current).Updates(map[string]any{
		"amount":  totalAmount,
		"version": current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Lines = nextLines
	current.Amount = totalAmount
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
			"amount":    totalAmount,
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
