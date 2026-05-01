package services

import (
	"encoding/json"
	"errors"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	statemachine "xdfc-server/services/state_machine"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ConfirmPurchaseReceiptInput struct {
	PurchaseOrderID string
	Operator        string
	Remarks         string
	ReceiptDate     time.Time
	ReceiptDateRaw  string
	Lines           []ConfirmPurchaseReceiptLineInput
}

type ConfirmPurchaseReceiptLineInput struct {
	PurchaseOrderLineID uint
	OrderLineVersion    int
	MaterialID          string
	Quantity            float64
	PurchasePrice       float64
	BatchNo             string
	TargetCategory      string
}

type ConfirmPurchaseReceiptResult struct {
	PurchaseOrder         models.PurchaseOrder
	CreatedInboundRecords []models.InboundRecord
}

type ExecutePurchaseOrderReceiptConfirmationCommand struct {
	OrderID         string
	ActorID         string
	Operator        string
	ExpectedVersion int
	Payload         PurchaseOrderReceiptConfirmPayload
	IP              string
}

func normalizeConfirmPurchaseReceiptInput(input ConfirmPurchaseReceiptInput) (ConfirmPurchaseReceiptInput, error) {
	purchaseOrderID := strings.TrimSpace(input.PurchaseOrderID)
	if purchaseOrderID == "" {
		return ConfirmPurchaseReceiptInput{}, errors.New("purchase order id is required")
	}
	if len(input.Lines) == 0 {
		return ConfirmPurchaseReceiptInput{}, errors.New("receipt lines are required")
	}
	if strings.TrimSpace(input.ReceiptDateRaw) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(input.ReceiptDateRaw))
		if err != nil {
			return ConfirmPurchaseReceiptInput{}, errors.New("receiptDate 格式错误，需为 RFC3339")
		}
		input.ReceiptDate = parsed
	}
	if input.ReceiptDate.IsZero() {
		input.ReceiptDate = time.Now()
	}
	input.PurchaseOrderID = purchaseOrderID
	input.Operator = strings.TrimSpace(input.Operator)
	input.Remarks = strings.TrimSpace(input.Remarks)
	return input, nil
}

func ConfirmPurchaseReceipt(input ConfirmPurchaseReceiptInput) (ConfirmPurchaseReceiptResponse, error) {
	normalized, err := normalizeConfirmPurchaseReceiptInput(input)
	if err != nil {
		return ConfirmPurchaseReceiptResponse{}, err
	}

	result := ConfirmPurchaseReceiptResult{}
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		confirmed, err := confirmPurchaseReceiptTx(tx, normalized)
		if err != nil {
			return err
		}
		result = confirmed
		return nil
	})
	if err != nil {
		return ConfirmPurchaseReceiptResponse{}, err
	}
	return MapConfirmPurchaseReceiptResultToResponse(result), nil
}

func ExecutePurchaseOrderReceiptConfirmation(command ExecutePurchaseOrderReceiptConfirmationCommand) (ConfirmPurchaseReceiptResponse, error) {
	result := ConfirmPurchaseReceiptResult{}
	err := defaultServiceRuntime().txManager.WithinTransaction(func(tx *gorm.DB) error {
		var current models.PurchaseOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Lines").
			Where("id = ? AND is_deleted = ?", strings.TrimSpace(command.OrderID), false).
			First(&current).Error; err != nil {
			return err
		}

		if command.ExpectedVersion != 0 && command.ExpectedVersion != current.Version {
			return ErrPurchaseTransactionVersionConflict
		}

		operator := strings.TrimSpace(command.Payload.Operator)
		if operator == "" {
			operator = strings.TrimSpace(command.Operator)
		}
		if operator == "" {
			operator = strings.TrimSpace(command.ActorID)
		}
		if operator == "" {
			operator = "unknown"
		}

		confirmed, err := confirmPurchaseReceiptTx(tx, ConfirmPurchaseReceiptInput{
			PurchaseOrderID: current.ID,
			Operator:        operator,
			Remarks:         strings.TrimSpace(command.Payload.Remarks),
			ReceiptDateRaw:  strings.TrimSpace(command.Payload.ReceiptDate),
			Lines:           mapReceiptConfirmPayloadLines(command.Payload.Lines),
		})
		if err != nil {
			return err
		}

		auditDiff, _ := json.Marshal(map[string]any{
			"intent":          PurchaseTransactionIntentReceiptConfirm,
			"actorId":         strings.TrimSpace(command.ActorID),
			"operator":        operator,
			"expectedVersion": command.ExpectedVersion,
			"receiptDate":     strings.TrimSpace(command.Payload.ReceiptDate),
			"lineCount":       len(command.Payload.Lines),
		})
		if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
			Module:   "PurchaseOrder",
			TargetID: current.ID,
			Action:   PurchaseTransactionIntentReceiptConfirm,
			Diff:     auditDiff,
			Operator: operator,
			IP:       strings.TrimSpace(command.IP),
		}); err != nil {
			return err
		}

		result = confirmed
		return nil
	})
	if err != nil {
		return ConfirmPurchaseReceiptResponse{}, err
	}

	return MapConfirmPurchaseReceiptResultToResponse(result), nil
}

func confirmPurchaseReceiptTx(tx *gorm.DB, input ConfirmPurchaseReceiptInput) (ConfirmPurchaseReceiptResult, error) {
	normalized, err := normalizeConfirmPurchaseReceiptInput(input)
	if err != nil {
		return ConfirmPurchaseReceiptResult{}, err
	}
	input = normalized
	purchaseOrderID := input.PurchaseOrderID

	var order models.PurchaseOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Lines").
		Where("id = ?", purchaseOrderID).
		First(&order).Error; err != nil {
		return ConfirmPurchaseReceiptResult{}, err
	}
	if guard := statemachine.CanConfirmPurchaseReceipt(order); !guard.Allowed {
		return ConfirmPurchaseReceiptResult{}, guard.Err()
	}

	lineMap := make(map[uint]models.PurchaseOrderLine, len(order.Lines))
	for _, line := range order.Lines {
		lineMap[line.ID] = line
	}

	createdRecords := make([]models.InboundRecord, 0, len(input.Lines))
	for _, lineInput := range input.Lines {
		if lineInput.PurchaseOrderLineID == 0 {
			return ConfirmPurchaseReceiptResult{}, errors.New("purchase order line id is required")
		}
		if lineInput.OrderLineVersion <= 0 {
			return ConfirmPurchaseReceiptResult{}, errors.New("purchase order line version is required")
		}
		if lineInput.Quantity <= 0 {
			return ConfirmPurchaseReceiptResult{}, errors.New("receipt quantity must be greater than zero")
		}
		if lineInput.PurchasePrice < 0 {
			return ConfirmPurchaseReceiptResult{}, errors.New("receipt purchase price must be greater than or equal to zero")
		}
		if strings.TrimSpace(lineInput.TargetCategory) == "" {
			return ConfirmPurchaseReceiptResult{}, errors.New("target category is required")
		}

		orderLine, ok := lineMap[lineInput.PurchaseOrderLineID]
		if !ok {
			return ConfirmPurchaseReceiptResult{}, errors.New("purchase order line not found")
		}
		if orderLine.Version != lineInput.OrderLineVersion {
			return ConfirmPurchaseReceiptResult{}, ErrPurchaseTransactionVersionConflict
		}
		materialID := strings.TrimSpace(lineInput.MaterialID)
		if materialID == "" {
			materialID = strings.TrimSpace(orderLine.MaterialID)
		}
		if materialID == "" || materialID != strings.TrimSpace(orderLine.MaterialID) {
			return ConfirmPurchaseReceiptResult{}, errors.New("material id does not match purchase order line")
		}
		remaining := orderLine.Qty - orderLine.ReceivedQty - orderLine.ReturnedQty
		if lineInput.Quantity > remaining+purchaseReceiptTolerance {
			return ConfirmPurchaseReceiptResult{}, errors.New("receipt quantity exceeds remaining quantity")
		}

		inbound := models.InboundRecord{
			BaseModel:           models.BaseModel{ID: uuid.NewString()},
			MaterialID:          materialID,
			PurchaseOrderID:     purchaseOrderID,
			PurchaseOrderLineID: lineInput.PurchaseOrderLineID,
			Quantity:            lineInput.Quantity,
			PurchasePrice:       lineInput.PurchasePrice,
			TargetCategory:      strings.TrimSpace(lineInput.TargetCategory),
			BatchNo:             strings.TrimSpace(lineInput.BatchNo),
			InboundDate:         input.ReceiptDate,
			Operator:            input.Operator,
			Remarks:             input.Remarks,
		}
		if err := recordInboundTx(tx, &inbound); err != nil {
			return ConfirmPurchaseReceiptResult{}, err
		}
		createdRecords = append(createdRecords, inbound)
		updatedLine := lineMap[lineInput.PurchaseOrderLineID]
		updatedLine.ReceivedQty += lineInput.Quantity
		updatedLine.Version++
		lineMap[lineInput.PurchaseOrderLineID] = updatedLine
	}

	updatedOrder, err := recalculatePurchaseOrderStatusTx(tx, purchaseOrderID)
	if err != nil {
		return ConfirmPurchaseReceiptResult{}, err
	}

	return ConfirmPurchaseReceiptResult{
		PurchaseOrder:         updatedOrder,
		CreatedInboundRecords: createdRecords,
	}, nil
}
