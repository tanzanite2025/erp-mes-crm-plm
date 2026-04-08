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
	PurchaseTransactionIntentExpectedDateChange = "ORDER_DELIVERY_DATE_CHANGE"
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
	if intent != PurchaseTransactionIntentExpectedDateChange {
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
	default:
		return nil, ErrPurchaseTransactionUnsupportedIntent
	}
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
