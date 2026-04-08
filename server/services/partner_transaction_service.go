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
	CustomerTransactionIntentIdentityChange = "CUSTOMER_IDENTITY_CHANGE"
	CustomerTransactionIntentStatusChange = "CUSTOMER_STATUS_CHANGE"
	SupplierTransactionIntentIdentityChange = "SUPPLIER_IDENTITY_CHANGE"
	SupplierTransactionIntentStatusChange = "SUPPLIER_STATUS_CHANGE"
)

var (
	ErrCustomerTransactionUnsupportedIntent = errors.New("unsupported customer transaction intent")
	ErrCustomerTransactionInvalidPayload    = errors.New("invalid customer transaction payload")
	ErrCustomerTransactionVersionConflict   = errors.New("customer transaction version conflict")
	ErrSupplierTransactionUnsupportedIntent = errors.New("unsupported supplier transaction intent")
	ErrSupplierTransactionInvalidPayload    = errors.New("invalid supplier transaction payload")
	ErrSupplierTransactionVersionConflict   = errors.New("supplier transaction version conflict")
)

type EntityTransactionRequest struct {
	Intent          string          `json:"intent"`
	ActorID         string          `json:"actorId"`
	ExpectedVersion int             `json:"expectedVersion"`
	Payload         json.RawMessage `json:"payload"`
}

type StatusChangePayload struct {
	Status   string `json:"status"`
	Operator string `json:"operator"`
}

type IdentityChangePayload struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	Operator string `json:"operator"`
}

type ExecuteCustomerTransactionInput struct {
	CustomerID      string
	Intent          string
	ActorID         string
	Operator        string
	ExpectedVersion int
	Payload         json.RawMessage
	IP              string
}

type ExecuteSupplierTransactionInput struct {
	SupplierID      string
	Intent          string
	ActorID         string
	Operator        string
	ExpectedVersion int
	Payload         json.RawMessage
	IP              string
}

func parseStatusChangePayload(payload json.RawMessage) (StatusChangePayload, error) {
	var input StatusChangePayload
	if err := json.Unmarshal(payload, &input); err != nil {
		return StatusChangePayload{}, fmt.Errorf("%w: %v", ErrCustomerTransactionInvalidPayload, err)
	}
	input.Status = strings.TrimSpace(input.Status)
	input.Operator = strings.TrimSpace(input.Operator)
	if input.Status == "" {
		return StatusChangePayload{}, fmt.Errorf("%w: status is required", ErrCustomerTransactionInvalidPayload)
	}
	return input, nil
}

func parseIdentityChangePayload(payload json.RawMessage) (IdentityChangePayload, error) {
	var input IdentityChangePayload
	if err := json.Unmarshal(payload, &input); err != nil {
		return IdentityChangePayload{}, fmt.Errorf("%w: %v", ErrCustomerTransactionInvalidPayload, err)
	}
	input.Code = strings.TrimSpace(input.Code)
	input.Name = strings.TrimSpace(input.Name)
	input.Operator = strings.TrimSpace(input.Operator)
	if input.Code == "" && input.Name == "" {
		return IdentityChangePayload{}, fmt.Errorf("%w: code or name is required", ErrCustomerTransactionInvalidPayload)
	}
	return input, nil
}

func ExecuteCustomerTransaction(input ExecuteCustomerTransactionInput) (*models.Customer, error) {
	var response *models.Customer
	err := defaultServiceRuntime().txManager.WithinTransaction(func(tx *gorm.DB) error {
		updated, err := executeCustomerTransactionTx(tx, input)
		if err != nil {
			return err
		}
		response = updated
		return nil
	})
	if err != nil {
		return nil, err
	}
	return response, nil
}

func executeCustomerTransactionTx(tx *gorm.DB, input ExecuteCustomerTransactionInput) (*models.Customer, error) {
	if tx == nil {
		return nil, errors.New("transaction is required")
	}

	var current models.Customer
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&current, "id = ? AND is_deleted = ?", input.CustomerID, false).Error; err != nil {
		return nil, err
	}

	if input.ExpectedVersion != current.Version {
		return nil, ErrCustomerTransactionVersionConflict
	}

	switch strings.TrimSpace(input.Intent) {
	case CustomerTransactionIntentIdentityChange:
		return executeCustomerIdentityChangeTx(tx, &current, input)
	case CustomerTransactionIntentStatusChange:
		return executeCustomerStatusChangeTx(tx, &current, input)
	default:
		return nil, ErrCustomerTransactionUnsupportedIntent
	}
}

func executeCustomerIdentityChangeTx(tx *gorm.DB, current *models.Customer, input ExecuteCustomerTransactionInput) (*models.Customer, error) {
	payload, err := parseIdentityChangePayload(input.Payload)
	if err != nil {
		return nil, err
	}

	operator := payload.Operator
	if operator == "" {
		operator = strings.TrimSpace(input.Operator)
	}
	if operator == "" {
		operator = strings.TrimSpace(input.ActorID)
	}
	if operator == "" {
		operator = "unknown"
	}

	nextCode := strings.TrimSpace(current.Code)
	nextName := strings.TrimSpace(current.Name)
	if payload.Code != "" {
		nextCode = payload.Code
	}
	if payload.Name != "" {
		nextName = payload.Name
	}
	if nextCode == "" || nextName == "" {
		return nil, fmt.Errorf("%w: code and name must not be empty", ErrCustomerTransactionInvalidPayload)
	}
	if nextCode == strings.TrimSpace(current.Code) && nextName == strings.TrimSpace(current.Name) {
		return nil, fmt.Errorf("%w: customer identity unchanged", ErrCustomerTransactionInvalidPayload)
	}

	var duplicateCount int64
	if err := tx.Model(&models.Customer{}).
		Where("code = ? AND id <> ? AND is_deleted = ?", nextCode, current.ID, false).
		Count(&duplicateCount).Error; err != nil {
		return nil, err
	}
	if duplicateCount > 0 {
		return nil, fmt.Errorf("%w: duplicated customer code", ErrCustomerTransactionInvalidPayload)
	}

	if err := tx.Model(current).Updates(map[string]any{
		"code":    nextCode,
		"name":    nextName,
		"version": current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	beforeCode := current.Code
	beforeName := current.Name
	current.Code = nextCode
	current.Name = nextName
	current.Version = current.Version + 1

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          CustomerTransactionIntentIdentityChange,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"code": nextCode,
			"name": nextName,
		},
		"before": map[string]any{
			"code": beforeCode,
			"name": beforeName,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "Customer",
		TargetID: current.ID,
		Action:   CustomerTransactionIntentIdentityChange,
		Diff:     auditDiff,
		Operator: operator,
		IP:       strings.TrimSpace(input.IP),
	}); err != nil {
		return nil, err
	}

	return current, nil
}

func executeCustomerStatusChangeTx(tx *gorm.DB, current *models.Customer, input ExecuteCustomerTransactionInput) (*models.Customer, error) {
	payload, err := parseStatusChangePayload(input.Payload)
	if err != nil {
		return nil, err
	}

	operator := payload.Operator
	if operator == "" {
		operator = strings.TrimSpace(input.Operator)
	}
	if operator == "" {
		operator = strings.TrimSpace(input.ActorID)
	}
	if operator == "" {
		operator = "unknown"
	}

	status := payload.Status
	if status != "Active" && status != "Inactive" && status != "Pending" {
		return nil, fmt.Errorf("%w: unsupported customer status", ErrCustomerTransactionInvalidPayload)
	}
	if status == strings.TrimSpace(current.Status) {
		return nil, fmt.Errorf("%w: customer status unchanged", ErrCustomerTransactionInvalidPayload)
	}

	if err := tx.Model(current).Updates(map[string]any{
		"status":  status,
		"version": current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Status = status
	current.Version = current.Version + 1

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          CustomerTransactionIntentStatusChange,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"status": status,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "Customer",
		TargetID: current.ID,
		Action:   CustomerTransactionIntentStatusChange,
		Diff:     auditDiff,
		Operator: operator,
		IP:       strings.TrimSpace(input.IP),
	}); err != nil {
		return nil, err
	}

	return current, nil
}

func ExecuteSupplierTransaction(input ExecuteSupplierTransactionInput) (*models.Supplier, error) {
	var response *models.Supplier
	err := defaultServiceRuntime().txManager.WithinTransaction(func(tx *gorm.DB) error {
		updated, err := executeSupplierTransactionTx(tx, input)
		if err != nil {
			return err
		}
		response = updated
		return nil
	})
	if err != nil {
		return nil, err
	}
	return response, nil
}

func executeSupplierTransactionTx(tx *gorm.DB, input ExecuteSupplierTransactionInput) (*models.Supplier, error) {
	if tx == nil {
		return nil, errors.New("transaction is required")
	}

	var current models.Supplier
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&current, "id = ? AND is_deleted = ?", input.SupplierID, false).Error; err != nil {
		return nil, err
	}

	if input.ExpectedVersion != current.Version {
		return nil, ErrSupplierTransactionVersionConflict
	}

	switch strings.TrimSpace(input.Intent) {
	case SupplierTransactionIntentIdentityChange:
		return executeSupplierIdentityChangeTx(tx, &current, input)
	case SupplierTransactionIntentStatusChange:
		return executeSupplierStatusChangeTx(tx, &current, input)
	default:
		return nil, ErrSupplierTransactionUnsupportedIntent
	}
}

func executeSupplierIdentityChangeTx(tx *gorm.DB, current *models.Supplier, input ExecuteSupplierTransactionInput) (*models.Supplier, error) {
	payload, err := parseIdentityChangePayload(input.Payload)
	if err != nil {
		return nil, ErrSupplierTransactionInvalidPayload
	}

	operator := payload.Operator
	if operator == "" {
		operator = strings.TrimSpace(input.Operator)
	}
	if operator == "" {
		operator = strings.TrimSpace(input.ActorID)
	}
	if operator == "" {
		operator = "unknown"
	}

	nextCode := strings.TrimSpace(current.Code)
	nextName := strings.TrimSpace(current.Name)
	if payload.Code != "" {
		nextCode = payload.Code
	}
	if payload.Name != "" {
		nextName = payload.Name
	}
	if nextCode == "" || nextName == "" {
		return nil, fmt.Errorf("%w: code and name must not be empty", ErrSupplierTransactionInvalidPayload)
	}
	if nextCode == strings.TrimSpace(current.Code) && nextName == strings.TrimSpace(current.Name) {
		return nil, fmt.Errorf("%w: supplier identity unchanged", ErrSupplierTransactionInvalidPayload)
	}

	var duplicateCount int64
	if err := tx.Model(&models.Supplier{}).
		Where("code = ? AND id <> ? AND is_deleted = ?", nextCode, current.ID, false).
		Count(&duplicateCount).Error; err != nil {
		return nil, err
	}
	if duplicateCount > 0 {
		return nil, fmt.Errorf("%w: duplicated supplier code", ErrSupplierTransactionInvalidPayload)
	}

	if err := tx.Model(current).Updates(map[string]any{
		"code":    nextCode,
		"name":    nextName,
		"version": current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	beforeCode := current.Code
	beforeName := current.Name
	current.Code = nextCode
	current.Name = nextName
	current.Version = current.Version + 1

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          SupplierTransactionIntentIdentityChange,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"code": nextCode,
			"name": nextName,
		},
		"before": map[string]any{
			"code": beforeCode,
			"name": beforeName,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "Supplier",
		TargetID: current.ID,
		Action:   SupplierTransactionIntentIdentityChange,
		Diff:     auditDiff,
		Operator: operator,
		IP:       strings.TrimSpace(input.IP),
	}); err != nil {
		return nil, err
	}

	return current, nil
}

func executeSupplierStatusChangeTx(tx *gorm.DB, current *models.Supplier, input ExecuteSupplierTransactionInput) (*models.Supplier, error) {
	payload, err := parseStatusChangePayload(input.Payload)
	if err != nil {
		return nil, ErrSupplierTransactionInvalidPayload
	}

	operator := payload.Operator
	if operator == "" {
		operator = strings.TrimSpace(input.Operator)
	}
	if operator == "" {
		operator = strings.TrimSpace(input.ActorID)
	}
	if operator == "" {
		operator = "unknown"
	}

	status := payload.Status
	if status != "Active" && status != "Inactive" && status != "OnReview" {
		return nil, fmt.Errorf("%w: unsupported supplier status", ErrSupplierTransactionInvalidPayload)
	}
	if status == strings.TrimSpace(current.Status) {
		return nil, fmt.Errorf("%w: supplier status unchanged", ErrSupplierTransactionInvalidPayload)
	}

	if err := tx.Model(current).Updates(map[string]any{
		"status":  status,
		"version": current.Version + 1,
	}).Error; err != nil {
		return nil, err
	}
	current.Status = status
	current.Version = current.Version + 1

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          SupplierTransactionIntentStatusChange,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"status": status,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "Supplier",
		TargetID: current.ID,
		Action:   SupplierTransactionIntentStatusChange,
		Diff:     auditDiff,
		Operator: operator,
		IP:       strings.TrimSpace(input.IP),
	}); err != nil {
		return nil, err
	}

	return current, nil
}
