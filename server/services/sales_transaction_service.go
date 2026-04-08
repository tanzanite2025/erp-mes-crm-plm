package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	SalesTransactionIntentClassificationTypeChange = "ORDER_CLASSIFICATION_TYPE_CHANGE"
	SalesTransactionIntentCustomerChange           = "ORDER_CUSTOMER_CHANGE"
	SalesTransactionIntentDeliveryDateChange       = "ORDER_DELIVERY_DATE_CHANGE"
	SalesTransactionIntentOrderLineAdd             = "ORDER_LINE_ADD"
	SalesTransactionIntentOrderLineRemove          = "ORDER_LINE_REMOVE"
	SalesTransactionIntentOrderLineContentChange   = "ORDER_LINE_CONTENT_CHANGE"
	SalesTransactionIntentOrderLinesChange         = "ORDER_LINES_CHANGE"
	SalesTransactionIntentOrderLineClaim           = "ORDER_LINE_CLAIM"
	SalesTransactionIntentOrderCancel              = "ORDER_CANCEL"
	SalesTransactionIntentStatusTransition         = "ORDER_STATUS_TRANSITION"
)

var (
	ErrSalesTransactionUnsupportedIntent = errors.New("unsupported sales transaction intent")
	ErrSalesTransactionInvalidPayload    = errors.New("invalid sales transaction payload")
	ErrSalesTransactionVersionConflict   = errors.New("sales transaction version conflict")
)

type SalesOrderTransactionRequest struct {
	Intent          string          `json:"intent"`
	ActorID         string          `json:"actorId"`
	ExpectedVersion int             `json:"expectedVersion"`
	Payload         json.RawMessage `json:"payload"`
}

func executeOrderLineRemoveTx(tx *gorm.DB, current *models.SalesOrder, input ExecuteSalesOrderTransactionInput) (*models.SalesOrder, error) {
	payload, err := parseSalesOrderLineRemovePayload(input.Payload)
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
		return nil, fmt.Errorf("%w: no line remove detected", ErrSalesTransactionInvalidPayload)
	}

	currentLineNos := make(map[int]models.SalesOrderLine, len(current.Lines))
	for _, line := range current.Lines {
		currentLineNos[line.LineNo] = line
	}

	nextLines := make([]models.SalesOrderLine, 0, len(payload.Lines))
	for _, lineReq := range payload.Lines {
		if strings.TrimSpace(lineReq.ProductID) != "" {
			var product models.Product
			if err := tx.Where("id = ?", lineReq.ProductID).First(&product).Error; err != nil {
				var material models.Material
				if errM := tx.Where("id = ?", lineReq.ProductID).First(&material).Error; errM != nil {
					return nil, errors.New("[CRITICAL_DATA_INTEGRITY] 订单保存失败：明细行物料 ID " + lineReq.ProductID + " 不存在")
				}
			}
		}

		existing, ok := currentLineNos[lineReq.LineNo]
		if !ok {
			return nil, fmt.Errorf("%w: line add detected during line remove", ErrSalesTransactionInvalidPayload)
		}

		mappedLine := mapSalesOrderLineRequestToModel(lineReq)
		existingJSON, _ := json.Marshal(existing)
		mappedJSON, _ := json.Marshal(mappedLine)
		if string(existingJSON) != string(mappedJSON) {
			return nil, fmt.Errorf("%w: existing lines changed during line remove", ErrSalesTransactionInvalidPayload)
		}

		nextLines = append(nextLines, mappedLine)
	}

	removedLineCount := len(current.Lines) - len(nextLines)
	if removedLineCount <= 0 {
		return nil, fmt.Errorf("%w: no line remove detected", ErrSalesTransactionInvalidPayload)
	}

	totalQuantity := 0.0
	totalAmount := 0.0
	for _, line := range nextLines {
		totalQuantity += line.Qty
		totalAmount += line.Amount
	}

	if err := tx.Model(current).Updates(map[string]interface{}{
		"quantity":   totalQuantity,
		"amount":     totalAmount,
		"updated_by": operator,
		"version":    current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Lines = nextLines
	current.Quantity = totalQuantity
	current.Amount = totalAmount
	current.UpdatedBy = operator
	current.Version = current.Version + 1

	if err := tx.Model(current).Association("Lines").Replace(nextLines); err != nil {
		return nil, err
	}
	if _, err := RecalculateSalesOrderStatusTx(tx, current.ID); err != nil {
		return nil, err
	}

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          SalesTransactionIntentOrderLineRemove,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"lineCount":        len(nextLines),
			"removedLineCount": removedLineCount,
			"quantity":         totalQuantity,
			"amount":           totalAmount,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "SalesOrder",
		TargetID: current.ID,
		Action:   SalesTransactionIntentOrderLineRemove,
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

func executeOrderLineAddTx(tx *gorm.DB, current *models.SalesOrder, input ExecuteSalesOrderTransactionInput) (*models.SalesOrder, error) {
	payload, err := parseSalesOrderLineAddPayload(input.Payload)
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
		return nil, fmt.Errorf("%w: no line add detected", ErrSalesTransactionInvalidPayload)
	}

	currentLineNos := make(map[int]models.SalesOrderLine, len(current.Lines))
	for _, line := range current.Lines {
		currentLineNos[line.LineNo] = line
	}

	nextLines := make([]models.SalesOrderLine, 0, len(payload.Lines))
	newLineCount := 0
	for _, lineReq := range payload.Lines {
		if strings.TrimSpace(lineReq.ProductID) != "" {
			var product models.Product
			if err := tx.Where("id = ?", lineReq.ProductID).First(&product).Error; err != nil {
				var material models.Material
				if errM := tx.Where("id = ?", lineReq.ProductID).First(&material).Error; errM != nil {
					return nil, errors.New("[CRITICAL_DATA_INTEGRITY] 订单保存失败：明细行物料 ID " + lineReq.ProductID + " 不存在")
				}
			}
		}

		mappedLine := mapSalesOrderLineRequestToModel(lineReq)
		if existing, ok := currentLineNos[lineReq.LineNo]; ok {
			existingJSON, _ := json.Marshal(existing)
			mappedJSON, _ := json.Marshal(mappedLine)
			if string(existingJSON) != string(mappedJSON) {
				return nil, fmt.Errorf("%w: existing lines changed during line add", ErrSalesTransactionInvalidPayload)
			}
		} else {
			newLineCount++
		}
		nextLines = append(nextLines, mappedLine)
	}

	if newLineCount == 0 {
		return nil, fmt.Errorf("%w: no line add detected", ErrSalesTransactionInvalidPayload)
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
			return nil, fmt.Errorf("%w: existing lines removed during line add", ErrSalesTransactionInvalidPayload)
		}
	}

	totalQuantity := 0.0
	totalAmount := 0.0
	for _, line := range nextLines {
		totalQuantity += line.Qty
		totalAmount += line.Amount
	}

	if err := tx.Model(current).Updates(map[string]interface{}{
		"quantity":   totalQuantity,
		"amount":     totalAmount,
		"updated_by": operator,
		"version":    current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Lines = nextLines
	current.Quantity = totalQuantity
	current.Amount = totalAmount
	current.UpdatedBy = operator
	current.Version = current.Version + 1

	if err := tx.Model(current).Association("Lines").Replace(nextLines); err != nil {
		return nil, err
	}
	if _, err := RecalculateSalesOrderStatusTx(tx, current.ID); err != nil {
		return nil, err
	}

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          SalesTransactionIntentOrderLineAdd,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"lineCount":      len(nextLines),
			"addedLineCount": newLineCount,
			"quantity":       totalQuantity,
			"amount":         totalAmount,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "SalesOrder",
		TargetID: current.ID,
		Action:   SalesTransactionIntentOrderLineAdd,
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

func executeOrderLineContentChangeTx(tx *gorm.DB, current *models.SalesOrder, input ExecuteSalesOrderTransactionInput) (*models.SalesOrder, error) {
	payload, err := parseSalesOrderLineContentChangePayload(input.Payload)
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
		return nil, fmt.Errorf("%w: line add/remove is not allowed in content change", ErrSalesTransactionInvalidPayload)
	}

	currentLineNos := make(map[int]struct{}, len(current.Lines))
	for _, line := range current.Lines {
		currentLineNos[line.LineNo] = struct{}{}
	}

	nextLines := make([]models.SalesOrderLine, 0, len(payload.Lines))
	for _, lineReq := range payload.Lines {
		if _, ok := currentLineNos[lineReq.LineNo]; !ok {
			return nil, fmt.Errorf("%w: line add/remove is not allowed in content change", ErrSalesTransactionInvalidPayload)
		}
		if strings.TrimSpace(lineReq.ProductID) != "" {
			var product models.Product
			if err := tx.Where("id = ?", lineReq.ProductID).First(&product).Error; err != nil {
				var material models.Material
				if errM := tx.Where("id = ?", lineReq.ProductID).First(&material).Error; errM != nil {
					return nil, errors.New("[CRITICAL_DATA_INTEGRITY] 订单保存失败：明细行物料 ID " + lineReq.ProductID + " 不存在")
				}
			}
		}
		nextLines = append(nextLines, mapSalesOrderLineRequestToModel(lineReq))
	}

	currentLinesJSON, _ := json.Marshal(current.Lines)
	nextLinesJSON, _ := json.Marshal(nextLines)
	if string(currentLinesJSON) == string(nextLinesJSON) {
		return nil, fmt.Errorf("%w: lines unchanged", ErrSalesTransactionInvalidPayload)
	}

	totalQuantity := 0.0
	totalAmount := 0.0
	for _, line := range nextLines {
		totalQuantity += line.Qty
		totalAmount += line.Amount
	}

	if err := tx.Model(current).Updates(map[string]interface{}{
		"quantity":   totalQuantity,
		"amount":     totalAmount,
		"updated_by": operator,
		"version":    current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Lines = nextLines
	current.Quantity = totalQuantity
	current.Amount = totalAmount
	current.UpdatedBy = operator
	current.Version = current.Version + 1

	if err := tx.Model(current).Association("Lines").Replace(nextLines); err != nil {
		return nil, err
	}
	if _, err := RecalculateSalesOrderStatusTx(tx, current.ID); err != nil {
		return nil, err
	}

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          SalesTransactionIntentOrderLineContentChange,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"lineCount": len(nextLines),
			"quantity":  totalQuantity,
			"amount":    totalAmount,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "SalesOrder",
		TargetID: current.ID,
		Action:   SalesTransactionIntentOrderLineContentChange,
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

func executeOrderLinesChangeTx(tx *gorm.DB, current *models.SalesOrder, input ExecuteSalesOrderTransactionInput) (*models.SalesOrder, error) {
	payload, err := parseSalesOrderLinesChangePayload(input.Payload)
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

	nextLines := make([]models.SalesOrderLine, 0, len(payload.Lines))
	for _, lineReq := range payload.Lines {
		if strings.TrimSpace(lineReq.ProductID) != "" {
			var product models.Product
			if err := tx.Where("id = ?", lineReq.ProductID).First(&product).Error; err != nil {
				var material models.Material
				if errM := tx.Where("id = ?", lineReq.ProductID).First(&material).Error; errM != nil {
					return nil, errors.New("[CRITICAL_DATA_INTEGRITY] 订单保存失败：明细行物料 ID " + lineReq.ProductID + " 不存在")
				}
			}
		}
		nextLines = append(nextLines, mapSalesOrderLineRequestToModel(lineReq))
	}

	currentLinesJSON, _ := json.Marshal(current.Lines)
	nextLinesJSON, _ := json.Marshal(nextLines)
	if string(currentLinesJSON) == string(nextLinesJSON) {
		return nil, fmt.Errorf("%w: lines unchanged", ErrSalesTransactionInvalidPayload)
	}

	totalQuantity := 0.0
	totalAmount := 0.0
	for _, line := range nextLines {
		totalQuantity += line.Qty
		totalAmount += line.Amount
	}

	if err := tx.Model(current).Updates(map[string]interface{}{
		"quantity":   totalQuantity,
		"amount":     totalAmount,
		"updated_by": operator,
		"version":    current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Lines = nextLines
	current.Quantity = totalQuantity
	current.Amount = totalAmount
	current.UpdatedBy = operator
	current.Version = current.Version + 1

	if err := tx.Model(current).Association("Lines").Replace(nextLines); err != nil {
		return nil, err
	}
	if _, err := RecalculateSalesOrderStatusTx(tx, current.ID); err != nil {
		return nil, err
	}

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          SalesTransactionIntentOrderLinesChange,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"lineCount": len(nextLines),
			"quantity":  totalQuantity,
			"amount":    totalAmount,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "SalesOrder",
		TargetID: current.ID,
		Action:   SalesTransactionIntentOrderLinesChange,
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

func executeOrderClassificationTypeChangeTx(tx *gorm.DB, current *models.SalesOrder, input ExecuteSalesOrderTransactionInput) (*models.SalesOrder, error) {
	payload, err := parseSalesOrderClassificationTypeChangePayload(input.Payload)
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

	nextClassification := strings.TrimSpace(payload.Classification)
	if nextClassification == "" {
		nextClassification = strings.TrimSpace(current.Classification)
	}
	nextType := strings.TrimSpace(payload.Type)
	if nextType == "" {
		nextType = strings.TrimSpace(current.Type)
	}
	nextBarcode := strings.TrimSpace(payload.Barcode)
	if nextBarcode == "" {
		nextBarcode = strings.TrimSpace(current.Barcode)
	}

	classificationChanged := nextClassification != strings.TrimSpace(current.Classification)
	typeChanged := nextType != strings.TrimSpace(current.Type)
	barcodeChanged := nextBarcode != strings.TrimSpace(current.Barcode)
	if !classificationChanged && !typeChanged && !barcodeChanged {
		return nil, fmt.Errorf("%w: classification/type unchanged", ErrSalesTransactionInvalidPayload)
	}

	updates := map[string]interface{}{
		"classification": nextClassification,
		"type":           nextType,
		"updated_by":     operator,
		"version":        current.Version + 1,
	}
	if barcodeChanged {
		updates["barcode"] = nextBarcode
	}

	if err := tx.Model(current).Updates(updates).Error; err != nil {
		return nil, err
	}
	current.Classification = nextClassification
	current.Type = nextType
	if barcodeChanged {
		current.Barcode = nextBarcode
	}
	current.UpdatedBy = operator
	current.Version = current.Version + 1

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          SalesTransactionIntentClassificationTypeChange,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"classification": nextClassification,
			"type":           nextType,
			"barcode":        nextBarcode,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "SalesOrder",
		TargetID: current.ID,
		Action:   SalesTransactionIntentClassificationTypeChange,
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

func executeOrderDeliveryDateChangeTx(tx *gorm.DB, current *models.SalesOrder, input ExecuteSalesOrderTransactionInput) (*models.SalesOrder, error) {
	payload, err := parseSalesOrderDeliveryDateChangePayload(input.Payload)
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

	deliveryDate := strings.TrimSpace(payload.DeliveryDate)
	if deliveryDate == "" {
		return nil, fmt.Errorf("%w: deliveryDate is required", ErrSalesTransactionInvalidPayload)
	}
	if deliveryDate == strings.TrimSpace(current.DeliveryDate) {
		return nil, fmt.Errorf("%w: deliveryDate unchanged", ErrSalesTransactionInvalidPayload)
	}

	if err := tx.Model(current).Updates(map[string]interface{}{
		"delivery_date": deliveryDate,
		"updated_by":    operator,
		"version":       current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.DeliveryDate = deliveryDate
	current.UpdatedBy = operator
	current.Version = current.Version + 1

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          SalesTransactionIntentDeliveryDateChange,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"deliveryDate": deliveryDate,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "SalesOrder",
		TargetID: current.ID,
		Action:   SalesTransactionIntentDeliveryDateChange,
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

func executeOrderCustomerChangeTx(tx *gorm.DB, current *models.SalesOrder, input ExecuteSalesOrderTransactionInput) (*models.SalesOrder, error) {
	payload, err := parseSalesOrderCustomerChangePayload(input.Payload)
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

	customerName := strings.TrimSpace(payload.CustomerName)
	customerID := strings.TrimSpace(payload.CustomerID)
	if customerName == "" {
		return nil, fmt.Errorf("%w: customerName is required", ErrSalesTransactionInvalidPayload)
	}
	if customerName == strings.TrimSpace(current.CustomerName) && customerID == strings.TrimSpace(current.CustomerID) {
		return nil, fmt.Errorf("%w: customer unchanged", ErrSalesTransactionInvalidPayload)
	}

	if err := tx.Model(current).Updates(map[string]interface{}{
		"customer_name": customerName,
		"customer_id":   customerID,
		"updated_by":    operator,
		"version":       current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.CustomerName = customerName
	current.CustomerID = customerID
	current.UpdatedBy = operator
	current.Version = current.Version + 1

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          SalesTransactionIntentCustomerChange,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"customerId":   customerID,
			"customerName": customerName,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "SalesOrder",
		TargetID: current.ID,
		Action:   SalesTransactionIntentCustomerChange,
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

type SalesOrderLineClaimPayload struct {
	LineNos  []int  `json:"lineNos"`
	Operator string `json:"operator"`
}

type SalesOrderStatusTransitionPayload struct {
	Status     string `json:"status"`
	StatusNote string `json:"statusNote"`
	Operator   string `json:"operator"`
}

type SalesOrderCancelPayload struct {
	Operator string `json:"operator"`
	Reason   string `json:"reason"`
}

type SalesOrderCustomerChangePayload struct {
	CustomerID   string `json:"customerId"`
	CustomerName string `json:"customerName"`
	Operator     string `json:"operator"`
}

type SalesOrderClassificationTypeChangePayload struct {
	Classification string `json:"classification"`
	Type           string `json:"type"`
	Barcode        string `json:"barcode"`
	Operator       string `json:"operator"`
}

type SalesOrderDeliveryDateChangePayload struct {
	DeliveryDate string `json:"deliveryDate"`
	Operator     string `json:"operator"`
}

type SalesOrderLinesChangePayload struct {
	Lines    []SalesOrderLineRequest `json:"lines"`
	Operator string                  `json:"operator"`
}

type SalesOrderLineContentChangePayload struct {
	Lines    []SalesOrderLineRequest `json:"lines"`
	Operator string                  `json:"operator"`
}

type SalesOrderLineAddPayload struct {
	Lines    []SalesOrderLineRequest `json:"lines"`
	Operator string                  `json:"operator"`
}

type SalesOrderLineRemovePayload struct {
	Lines    []SalesOrderLineRequest `json:"lines"`
	Operator string                  `json:"operator"`
}

type ExecuteSalesOrderTransactionInput struct {
	OrderID         string
	Intent          string
	ActorID         string
	Operator        string
	ExpectedVersion int
	Payload         json.RawMessage
	IP              string
}

func ExecuteSalesOrderTransaction(input ExecuteSalesOrderTransactionInput) (SalesOrderResponse, error) {
	var response SalesOrderResponse

	err := defaultServiceRuntime().txManager.WithinTransaction(func(tx *gorm.DB) error {
		updated, err := executeSalesOrderTransactionTx(tx, input)
		if err != nil {
			return err
		}
		response = MapSalesOrderToResponse(*updated)
		return nil
	})
	if err != nil {
		return SalesOrderResponse{}, err
	}

	return response, nil
}

func executeSalesOrderTransactionTx(tx *gorm.DB, input ExecuteSalesOrderTransactionInput) (*models.SalesOrder, error) {
	if tx == nil {
		return nil, errors.New("transaction is required")
	}

	intent := strings.TrimSpace(input.Intent)
	if intent != SalesTransactionIntentClassificationTypeChange && intent != SalesTransactionIntentCustomerChange && intent != SalesTransactionIntentDeliveryDateChange && intent != SalesTransactionIntentOrderLineAdd && intent != SalesTransactionIntentOrderLineRemove && intent != SalesTransactionIntentOrderLineContentChange && intent != SalesTransactionIntentOrderLinesChange && intent != SalesTransactionIntentOrderLineClaim && intent != SalesTransactionIntentStatusTransition && intent != SalesTransactionIntentOrderCancel {
		return nil, ErrSalesTransactionUnsupportedIntent
	}

	var current models.SalesOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Lines").Where("id = ? AND is_deleted = ?", strings.TrimSpace(input.OrderID), false).First(&current).Error; err != nil {
		return nil, err
	}

	if input.ExpectedVersion != current.Version {
		return nil, ErrSalesTransactionVersionConflict
	}

	switch intent {
	case SalesTransactionIntentClassificationTypeChange:
		return executeOrderClassificationTypeChangeTx(tx, &current, input)
	case SalesTransactionIntentCustomerChange:
		return executeOrderCustomerChangeTx(tx, &current, input)
	case SalesTransactionIntentDeliveryDateChange:
		return executeOrderDeliveryDateChangeTx(tx, &current, input)
	case SalesTransactionIntentOrderLineAdd:
		return executeOrderLineAddTx(tx, &current, input)
	case SalesTransactionIntentOrderLineRemove:
		return executeOrderLineRemoveTx(tx, &current, input)
	case SalesTransactionIntentOrderLineContentChange:
		return executeOrderLineContentChangeTx(tx, &current, input)
	case SalesTransactionIntentOrderLinesChange:
		return executeOrderLinesChangeTx(tx, &current, input)
	case SalesTransactionIntentOrderLineClaim:
		return executeOrderLineClaimTx(tx, &current, input)
	case SalesTransactionIntentOrderCancel:
		return executeOrderCancelTx(tx, &current, input)
	case SalesTransactionIntentStatusTransition:
		return executeOrderStatusTransitionTx(tx, &current, input)
	default:
		return nil, ErrSalesTransactionUnsupportedIntent
	}

}

func executeOrderLineClaimTx(tx *gorm.DB, current *models.SalesOrder, input ExecuteSalesOrderTransactionInput) (*models.SalesOrder, error) {
	claimPayload, err := parseSalesOrderLineClaimPayload(input.Payload)
	if err != nil {
		return nil, err
	}

	operator := strings.TrimSpace(claimPayload.Operator)
	if operator == "" {
		operator = strings.TrimSpace(input.Operator)
	}
	if operator == "" {
		operator = strings.TrimSpace(input.ActorID)
	}
	if operator == "" {
		operator = "unknown"
	}

	targets := make(map[int]struct{}, len(claimPayload.LineNos))
	for _, lineNo := range claimPayload.LineNos {
		targets[lineNo] = struct{}{}
	}
	if len(targets) == 0 {
		return nil, fmt.Errorf("%w: lineNos is required", ErrSalesTransactionInvalidPayload)
	}

	now := time.Now().Format(time.RFC3339)
	matchedCount := 0
	changedCount := 0
	for index := range current.Lines {
		line := &current.Lines[index]
		if _, ok := targets[line.LineNo]; !ok {
			continue
		}
		matchedCount++
		if strings.TrimSpace(line.ClaimedBy) != "" && strings.TrimSpace(line.ClaimedBy) != operator {
			return nil, fmt.Errorf("line %d already claimed by %s", line.LineNo, line.ClaimedBy)
		}
		if strings.TrimSpace(line.ClaimedBy) == operator {
			if strings.TrimSpace(line.ClaimedAt) == "" {
				line.ClaimedAt = now
				changedCount++
			}
			continue
		}
		line.ClaimedBy = operator
		line.ClaimedAt = now
		changedCount++
	}

	if matchedCount == 0 {
		return nil, fmt.Errorf("%w: target lines not found", ErrSalesTransactionInvalidPayload)
	}
	if changedCount == 0 {
		return nil, fmt.Errorf("%w: target lines already claimed", ErrSalesTransactionInvalidPayload)
	}

	if err := tx.Model(current).Updates(map[string]interface{}{
		"updated_by": operator,
		"version":    current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.UpdatedBy = operator
	current.Version = current.Version + 1

	if err := tx.Model(current).Association("Lines").Replace(current.Lines); err != nil {
		return nil, err
	}
	if _, err := RecalculateSalesOrderStatusTx(tx, current.ID); err != nil {
		return nil, err
	}

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          SalesTransactionIntentOrderLineClaim,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"lineNos": claimPayload.LineNos,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "SalesOrder",
		TargetID: current.ID,
		Action:   SalesTransactionIntentOrderLineClaim,
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

func executeOrderCancelTx(tx *gorm.DB, current *models.SalesOrder, input ExecuteSalesOrderTransactionInput) (*models.SalesOrder, error) {
	cancelPayload, err := parseSalesOrderCancelPayload(input.Payload)
	if err != nil {
		return nil, err
	}

	operator := strings.TrimSpace(cancelPayload.Operator)
	if operator == "" {
		operator = strings.TrimSpace(input.Operator)
	}
	if operator == "" {
		operator = strings.TrimSpace(input.ActorID)
	}
	if operator == "" {
		operator = "unknown"
	}

	if current.Status == "Canceled" {
		return nil, fmt.Errorf("%w: order already canceled", ErrSalesTransactionInvalidPayload)
	}

	if err := tx.Model(current).Updates(map[string]interface{}{
		"status":      "Canceled",
		"status_note": strings.TrimSpace(cancelPayload.Reason),
		"updated_by":  operator,
		"version":     current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Status = "Canceled"
	current.StatusNote = strings.TrimSpace(cancelPayload.Reason)
	current.UpdatedBy = operator
	current.Version = current.Version + 1

	if len(current.Lines) > 0 {
		lineIDs := make([]uint, 0, len(current.Lines))
		for index := range current.Lines {
			current.Lines[index].Status = "Canceled"
			lineIDs = append(lineIDs, current.Lines[index].ID)
		}
		if err := tx.Model(&models.SalesOrderLine{}).Where("id IN ?", lineIDs).Update("status", "Canceled").Error; err != nil {
			return nil, err
		}
	}

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          SalesTransactionIntentOrderCancel,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"reason": strings.TrimSpace(cancelPayload.Reason),
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "SalesOrder",
		TargetID: current.ID,
		Action:   SalesTransactionIntentOrderCancel,
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

func executeOrderStatusTransitionTx(tx *gorm.DB, current *models.SalesOrder, input ExecuteSalesOrderTransactionInput) (*models.SalesOrder, error) {
	statusPayload, err := parseSalesOrderStatusTransitionPayload(input.Payload)
	if err != nil {
		return nil, err
	}

	operator := strings.TrimSpace(statusPayload.Operator)
	if operator == "" {
		operator = strings.TrimSpace(input.Operator)
	}
	if operator == "" {
		operator = strings.TrimSpace(input.ActorID)
	}
	if operator == "" {
		operator = "unknown"
	}

	status := strings.TrimSpace(statusPayload.Status)
	if status == "" {
		return nil, fmt.Errorf("%w: status is required", ErrSalesTransactionInvalidPayload)
	}
	if status == current.Status && strings.TrimSpace(statusPayload.StatusNote) == strings.TrimSpace(current.StatusNote) {
		return nil, fmt.Errorf("%w: status unchanged", ErrSalesTransactionInvalidPayload)
	}

	if err := tx.Model(current).Updates(map[string]interface{}{
		"status":      status,
		"status_note": strings.TrimSpace(statusPayload.StatusNote),
		"updated_by":  operator,
		"version":     current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Status = status
	current.StatusNote = strings.TrimSpace(statusPayload.StatusNote)
	current.UpdatedBy = operator
	current.Version = current.Version + 1

	if _, err := RecalculateSalesOrderStatusTx(tx, current.ID); err != nil {
		return nil, err
	}

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          SalesTransactionIntentStatusTransition,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"status":     status,
			"statusNote": strings.TrimSpace(statusPayload.StatusNote),
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "SalesOrder",
		TargetID: current.ID,
		Action:   SalesTransactionIntentStatusTransition,
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

func parseSalesOrderLineClaimPayload(raw json.RawMessage) (SalesOrderLineClaimPayload, error) {
	if len(raw) == 0 {
		return SalesOrderLineClaimPayload{}, fmt.Errorf("%w: payload is required", ErrSalesTransactionInvalidPayload)
	}

	var payload SalesOrderLineClaimPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return SalesOrderLineClaimPayload{}, fmt.Errorf("%w: %v", ErrSalesTransactionInvalidPayload, err)
	}
	if len(payload.LineNos) == 0 {
		return SalesOrderLineClaimPayload{}, fmt.Errorf("%w: lineNos is required", ErrSalesTransactionInvalidPayload)
	}

	return payload, nil
}

func parseSalesOrderCustomerChangePayload(raw json.RawMessage) (SalesOrderCustomerChangePayload, error) {
	if len(raw) == 0 {
		return SalesOrderCustomerChangePayload{}, fmt.Errorf("%w: payload is required", ErrSalesTransactionInvalidPayload)
	}

	var payload SalesOrderCustomerChangePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return SalesOrderCustomerChangePayload{}, fmt.Errorf("%w: %v", ErrSalesTransactionInvalidPayload, err)
	}
	if strings.TrimSpace(payload.CustomerName) == "" {
		return SalesOrderCustomerChangePayload{}, fmt.Errorf("%w: customerName is required", ErrSalesTransactionInvalidPayload)
	}

	return payload, nil
}

func parseSalesOrderClassificationTypeChangePayload(raw json.RawMessage) (SalesOrderClassificationTypeChangePayload, error) {
	if len(raw) == 0 {
		return SalesOrderClassificationTypeChangePayload{}, fmt.Errorf("%w: payload is required", ErrSalesTransactionInvalidPayload)
	}

	var payload SalesOrderClassificationTypeChangePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return SalesOrderClassificationTypeChangePayload{}, fmt.Errorf("%w: %v", ErrSalesTransactionInvalidPayload, err)
	}
	if strings.TrimSpace(payload.Classification) == "" && strings.TrimSpace(payload.Type) == "" && strings.TrimSpace(payload.Barcode) == "" {
		return SalesOrderClassificationTypeChangePayload{}, fmt.Errorf("%w: classification or type is required", ErrSalesTransactionInvalidPayload)
	}

	return payload, nil
}

func parseSalesOrderLinesChangePayload(raw json.RawMessage) (SalesOrderLinesChangePayload, error) {
	if len(raw) == 0 {
		return SalesOrderLinesChangePayload{}, fmt.Errorf("%w: payload is required", ErrSalesTransactionInvalidPayload)
	}

	var payload SalesOrderLinesChangePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return SalesOrderLinesChangePayload{}, fmt.Errorf("%w: %v", ErrSalesTransactionInvalidPayload, err)
	}
	if len(payload.Lines) == 0 {
		return SalesOrderLinesChangePayload{}, fmt.Errorf("%w: lines is required", ErrSalesTransactionInvalidPayload)
	}

	return payload, nil
}

func parseSalesOrderLineContentChangePayload(raw json.RawMessage) (SalesOrderLineContentChangePayload, error) {
	if len(raw) == 0 {
		return SalesOrderLineContentChangePayload{}, fmt.Errorf("%w: payload is required", ErrSalesTransactionInvalidPayload)
	}

	var payload SalesOrderLineContentChangePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return SalesOrderLineContentChangePayload{}, fmt.Errorf("%w: %v", ErrSalesTransactionInvalidPayload, err)
	}
	if len(payload.Lines) == 0 {
		return SalesOrderLineContentChangePayload{}, fmt.Errorf("%w: lines is required", ErrSalesTransactionInvalidPayload)
	}

	return payload, nil
}

func parseSalesOrderLineAddPayload(raw json.RawMessage) (SalesOrderLineAddPayload, error) {
	if len(raw) == 0 {
		return SalesOrderLineAddPayload{}, fmt.Errorf("%w: payload is required", ErrSalesTransactionInvalidPayload)
	}

	var payload SalesOrderLineAddPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return SalesOrderLineAddPayload{}, fmt.Errorf("%w: %v", ErrSalesTransactionInvalidPayload, err)
	}
	if len(payload.Lines) == 0 {
		return SalesOrderLineAddPayload{}, fmt.Errorf("%w: lines is required", ErrSalesTransactionInvalidPayload)
	}

	return payload, nil
}

func parseSalesOrderLineRemovePayload(raw json.RawMessage) (SalesOrderLineRemovePayload, error) {
	if len(raw) == 0 {
		return SalesOrderLineRemovePayload{}, fmt.Errorf("%w: payload is required", ErrSalesTransactionInvalidPayload)
	}

	var payload SalesOrderLineRemovePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return SalesOrderLineRemovePayload{}, fmt.Errorf("%w: %v", ErrSalesTransactionInvalidPayload, err)
	}
	if len(payload.Lines) == 0 {
		return SalesOrderLineRemovePayload{}, fmt.Errorf("%w: lines is required", ErrSalesTransactionInvalidPayload)
	}

	return payload, nil
}

func parseSalesOrderDeliveryDateChangePayload(raw json.RawMessage) (SalesOrderDeliveryDateChangePayload, error) {
	if len(raw) == 0 {
		return SalesOrderDeliveryDateChangePayload{}, fmt.Errorf("%w: payload is required", ErrSalesTransactionInvalidPayload)
	}

	var payload SalesOrderDeliveryDateChangePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return SalesOrderDeliveryDateChangePayload{}, fmt.Errorf("%w: %v", ErrSalesTransactionInvalidPayload, err)
	}
	if strings.TrimSpace(payload.DeliveryDate) == "" {
		return SalesOrderDeliveryDateChangePayload{}, fmt.Errorf("%w: deliveryDate is required", ErrSalesTransactionInvalidPayload)
	}

	return payload, nil
}

func parseSalesOrderCancelPayload(raw json.RawMessage) (SalesOrderCancelPayload, error) {
	if len(raw) == 0 {
		return SalesOrderCancelPayload{}, fmt.Errorf("%w: payload is required", ErrSalesTransactionInvalidPayload)
	}

	var payload SalesOrderCancelPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return SalesOrderCancelPayload{}, fmt.Errorf("%w: %v", ErrSalesTransactionInvalidPayload, err)
	}

	return payload, nil
}

func parseSalesOrderStatusTransitionPayload(raw json.RawMessage) (SalesOrderStatusTransitionPayload, error) {
	if len(raw) == 0 {
		return SalesOrderStatusTransitionPayload{}, fmt.Errorf("%w: payload is required", ErrSalesTransactionInvalidPayload)
	}

	var payload SalesOrderStatusTransitionPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return SalesOrderStatusTransitionPayload{}, fmt.Errorf("%w: %v", ErrSalesTransactionInvalidPayload, err)
	}
	if strings.TrimSpace(payload.Status) == "" {
		return SalesOrderStatusTransitionPayload{}, fmt.Errorf("%w: status is required", ErrSalesTransactionInvalidPayload)
	}

	return payload, nil
}
