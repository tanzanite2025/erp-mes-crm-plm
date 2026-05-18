// Package services - 客户/供应商(主数据合作方)事务编排。
//
// 客户(Customer)与供应商(Supplier)共用一套 dispatcher 模式,因为两者主数据结构和生命周期
// 高度对称(身份字段 + 状态字段 + 业务关联):
//   - Customer 路径: ExecuteCustomerTransaction → executeCustomerTransactionTx → 三个 handler
//     (UnifiedSave / IdentityChange / StatusChange)
//   - Supplier 路径: 同上结构,executeSupplier*Tx
//
// 关键不变量:
//   - status-only / identity-only delta 走轻量路径(只校验该字段),减少全量 merge 成本
//   - mergeCustomerSaveSnapshot / mergeSupplierSaveSnapshot 控制部分字段更新时的字段保留策略
//   - 写完后联动写审计日志(operator/IP 从 ctx 解析)
//
// 命令解析(`parse*Payload`)在文件头部,与 dispatcher 解耦。
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
	CustomerTransactionIntentSave           = "CUSTOMER_SAVE"
	CustomerTransactionIntentIdentityChange = "CUSTOMER_IDENTITY_CHANGE"
	CustomerTransactionIntentStatusChange   = "CUSTOMER_STATUS_CHANGE"
	SupplierTransactionIntentSave           = "SUPPLIER_SAVE"
	SupplierTransactionIntentIdentityChange = "SUPPLIER_IDENTITY_CHANGE"
	SupplierTransactionIntentStatusChange   = "SUPPLIER_STATUS_CHANGE"
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

type CustomerSaveSnapshot struct {
	Name          string  `json:"name"`
	Code          string  `json:"code"`
	ContactPerson string  `json:"contactPerson"`
	ContactPhone  string  `json:"contactPhone"`
	WeChat        string  `json:"wechat"`
	WhatsApp      string  `json:"whatsapp"`
	Facebook      string  `json:"facebook"`
	Instagram     string  `json:"instagram"`
	Telegram      string  `json:"telegram"`
	Email         string  `json:"email"`
	Address       string  `json:"address"`
	Status        string  `json:"status"`
	CreditLimit   float64 `json:"creditLimit"`
	Balance       float64 `json:"balance"`
}

type CustomerSavePayload struct {
	Delta     map[string]json.RawMessage `json:"delta"`
	FinalData CustomerSaveSnapshot       `json:"finalData"`
	Operator  string                     `json:"operator"`
}

type SupplierSaveSnapshot struct {
	Name          string   `json:"name"`
	Code          string   `json:"code"`
	Category      string   `json:"category"`
	MainProducts  []string `json:"mainProducts"`
	ContactPerson string   `json:"contactPerson"`
	ContactPhone  string   `json:"contactPhone"`
	WeChat        string   `json:"wechat"`
	WhatsApp      string   `json:"whatsapp"`
	Facebook      string   `json:"facebook"`
	Instagram     string   `json:"instagram"`
	Telegram      string   `json:"telegram"`
	Email         string   `json:"email"`
	Address       string   `json:"address"`
	Status        string   `json:"status"`
	Rating        float64  `json:"rating"`
}

type SupplierSavePayload struct {
	Delta     map[string]json.RawMessage `json:"delta"`
	FinalData SupplierSaveSnapshot       `json:"finalData"`
	Operator  string                     `json:"operator"`
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

func parseCustomerSavePayload(payload json.RawMessage) (CustomerSavePayload, error) {
	var input CustomerSavePayload
	if err := json.Unmarshal(payload, &input); err != nil {
		return CustomerSavePayload{}, fmt.Errorf("%w: %v", ErrCustomerTransactionInvalidPayload, err)
	}
	if len(input.Delta) == 0 {
		return CustomerSavePayload{}, fmt.Errorf("%w: delta is required", ErrCustomerTransactionInvalidPayload)
	}
	if err := validateSupportedTopLevelDeltaKeys(input.Delta, "name", "code", "contactPerson", "contactPhone", "wechat", "whatsapp", "facebook", "instagram", "telegram", "email", "address", "status", "creditLimit", "balance"); err != nil {
		return CustomerSavePayload{}, fmt.Errorf("%w: %v", ErrCustomerTransactionInvalidPayload, err)
	}
	input.Operator = strings.TrimSpace(input.Operator)
	input.FinalData.Name = strings.TrimSpace(input.FinalData.Name)
	input.FinalData.Code = strings.TrimSpace(input.FinalData.Code)
	input.FinalData.ContactPerson = strings.TrimSpace(input.FinalData.ContactPerson)
	input.FinalData.ContactPhone = strings.TrimSpace(input.FinalData.ContactPhone)
	input.FinalData.WeChat = strings.TrimSpace(input.FinalData.WeChat)
	input.FinalData.WhatsApp = strings.TrimSpace(input.FinalData.WhatsApp)
	input.FinalData.Facebook = strings.TrimSpace(input.FinalData.Facebook)
	input.FinalData.Instagram = strings.TrimSpace(input.FinalData.Instagram)
	input.FinalData.Telegram = strings.TrimSpace(input.FinalData.Telegram)
	input.FinalData.Email = strings.TrimSpace(input.FinalData.Email)
	input.FinalData.Address = strings.TrimSpace(input.FinalData.Address)
	input.FinalData.Status = strings.TrimSpace(input.FinalData.Status)
	return input, nil
}

func parseSupplierSavePayload(payload json.RawMessage) (SupplierSavePayload, error) {
	var input SupplierSavePayload
	if err := json.Unmarshal(payload, &input); err != nil {
		return SupplierSavePayload{}, fmt.Errorf("%w: %v", ErrSupplierTransactionInvalidPayload, err)
	}
	if len(input.Delta) == 0 {
		return SupplierSavePayload{}, fmt.Errorf("%w: delta is required", ErrSupplierTransactionInvalidPayload)
	}
	if err := validateSupportedTopLevelDeltaKeys(input.Delta, "name", "code", "category", "mainProducts", "contactPerson", "contactPhone", "wechat", "whatsapp", "facebook", "instagram", "telegram", "email", "address", "status", "rating"); err != nil {
		return SupplierSavePayload{}, fmt.Errorf("%w: %v", ErrSupplierTransactionInvalidPayload, err)
	}
	input.Operator = strings.TrimSpace(input.Operator)
	input.FinalData.Name = strings.TrimSpace(input.FinalData.Name)
	input.FinalData.Code = strings.TrimSpace(input.FinalData.Code)
	input.FinalData.Category = strings.TrimSpace(input.FinalData.Category)
	input.FinalData.ContactPerson = strings.TrimSpace(input.FinalData.ContactPerson)
	input.FinalData.ContactPhone = strings.TrimSpace(input.FinalData.ContactPhone)
	input.FinalData.WeChat = strings.TrimSpace(input.FinalData.WeChat)
	input.FinalData.WhatsApp = strings.TrimSpace(input.FinalData.WhatsApp)
	input.FinalData.Facebook = strings.TrimSpace(input.FinalData.Facebook)
	input.FinalData.Instagram = strings.TrimSpace(input.FinalData.Instagram)
	input.FinalData.Telegram = strings.TrimSpace(input.FinalData.Telegram)
	input.FinalData.Email = strings.TrimSpace(input.FinalData.Email)
	input.FinalData.Address = strings.TrimSpace(input.FinalData.Address)
	input.FinalData.Status = strings.TrimSpace(input.FinalData.Status)
	return input, nil
}

func resolvePartnerOperator(payloadOperator string, inputOperator string, actorID string) string {
	operator := strings.TrimSpace(payloadOperator)
	if operator == "" {
		operator = strings.TrimSpace(inputOperator)
	}
	if operator == "" {
		operator = strings.TrimSpace(actorID)
	}
	if operator == "" {
		operator = "unknown"
	}
	return operator
}

func customerStatusSupported(status string) bool {
	return status == "Active" || status == "Inactive" || status == "Pending"
}

func supplierStatusSupported(status string) bool {
	return status == "Active" || status == "Inactive" || status == "OnReview"
}

func extractDeltaKeys(delta map[string]json.RawMessage) []string {
	keys := make([]string, 0, len(delta))
	for key := range delta {
		keys = append(keys, key)
	}
	return keys
}

func customerStatusOnlyDelta(deltaKeys []string) bool {
	if len(deltaKeys) == 0 {
		return false
	}
	for _, key := range deltaKeys {
		if key != "status" {
			return false
		}
	}
	return true
}

func customerIdentityOnlyDelta(deltaKeys []string) bool {
	if len(deltaKeys) == 0 {
		return false
	}
	for _, key := range deltaKeys {
		if key != "code" && key != "name" {
			return false
		}
	}
	return true
}

func mergeCustomerSaveSnapshot(current models.Customer, incoming CustomerSaveSnapshot, deltaKeys []string) CustomerSaveSnapshot {
	merged := MapCustomerToSaveSnapshot(current)
	for _, key := range deltaKeys {
		switch key {
		case "name":
			merged.Name = incoming.Name
		case "code":
			merged.Code = incoming.Code
		case "contactPerson":
			merged.ContactPerson = incoming.ContactPerson
		case "contactPhone":
			merged.ContactPhone = incoming.ContactPhone
		case "wechat":
			merged.WeChat = incoming.WeChat
		case "whatsapp":
			merged.WhatsApp = incoming.WhatsApp
		case "facebook":
			merged.Facebook = incoming.Facebook
		case "instagram":
			merged.Instagram = incoming.Instagram
		case "telegram":
			merged.Telegram = incoming.Telegram
		case "email":
			merged.Email = incoming.Email
		case "address":
			merged.Address = incoming.Address
		case "status":
			merged.Status = incoming.Status
		case "creditLimit":
			merged.CreditLimit = incoming.CreditLimit
		case "balance":
			merged.Balance = incoming.Balance
		}
	}
	return merged
}

func mergeSupplierSaveSnapshot(current models.Supplier, incoming SupplierSaveSnapshot, deltaKeys []string) SupplierSaveSnapshot {
	merged := MapSaveSupplierSnapshotFromModel(current)
	for _, key := range deltaKeys {
		switch key {
		case "name":
			merged.Name = incoming.Name
		case "code":
			merged.Code = incoming.Code
		case "category":
			merged.Category = incoming.Category
		case "mainProducts":
			merged.MainProducts = incoming.MainProducts
		case "contactPerson":
			merged.ContactPerson = incoming.ContactPerson
		case "contactPhone":
			merged.ContactPhone = incoming.ContactPhone
		case "wechat":
			merged.WeChat = incoming.WeChat
		case "whatsapp":
			merged.WhatsApp = incoming.WhatsApp
		case "facebook":
			merged.Facebook = incoming.Facebook
		case "instagram":
			merged.Instagram = incoming.Instagram
		case "telegram":
			merged.Telegram = incoming.Telegram
		case "email":
			merged.Email = incoming.Email
		case "address":
			merged.Address = incoming.Address
		case "status":
			merged.Status = incoming.Status
		case "rating":
			merged.Rating = incoming.Rating
		}
	}
	return merged
}

func executeCustomerUnifiedSaveTx(tx *gorm.DB, current *models.Customer, input ExecuteCustomerTransactionInput) (*models.Customer, error) {
	payload, err := parseCustomerSavePayload(input.Payload)
	if err != nil {
		return nil, err
	}

	operator := resolvePartnerOperator(payload.Operator, input.Operator, input.ActorID)
	deltaKeys := extractDeltaKeys(payload.Delta)
	mergedFinalData := mergeCustomerSaveSnapshot(*current, payload.FinalData, deltaKeys)

	if customerStatusOnlyDelta(deltaKeys) {
		derivedPayload, _ := json.Marshal(StatusChangePayload{
			Status:   mergedFinalData.Status,
			Operator: operator,
		})
		return executeCustomerStatusChangeTx(tx, current, ExecuteCustomerTransactionInput{
			CustomerID:      input.CustomerID,
			Intent:          CustomerTransactionIntentStatusChange,
			ActorID:         input.ActorID,
			Operator:        operator,
			ExpectedVersion: input.ExpectedVersion,
			Payload:         derivedPayload,
			IP:              input.IP,
		})
	}

	if customerIdentityOnlyDelta(deltaKeys) {
		derivedPayload, _ := json.Marshal(IdentityChangePayload{
			Code:     mergedFinalData.Code,
			Name:     mergedFinalData.Name,
			Operator: operator,
		})
		return executeCustomerIdentityChangeTx(tx, current, ExecuteCustomerTransactionInput{
			CustomerID:      input.CustomerID,
			Intent:          CustomerTransactionIntentIdentityChange,
			ActorID:         input.ActorID,
			Operator:        operator,
			ExpectedVersion: input.ExpectedVersion,
			Payload:         derivedPayload,
			IP:              input.IP,
		})
	}

	if mergedFinalData.Code == "" || mergedFinalData.Name == "" {
		return nil, fmt.Errorf("%w: code and name must not be empty", ErrCustomerTransactionInvalidPayload)
	}
	if !customerStatusSupported(mergedFinalData.Status) {
		return nil, fmt.Errorf("%w: unsupported customer status", ErrCustomerTransactionInvalidPayload)
	}

	if mergedFinalData.Code != strings.TrimSpace(current.Code) {
		var duplicateCount int64
		if err := tx.Model(&models.Customer{}).
			Where("code = ? AND id <> ?", mergedFinalData.Code, current.ID).
			Count(&duplicateCount).Error; err != nil {
			return nil, err
		}
		if duplicateCount > 0 {
			return nil, fmt.Errorf("%w: duplicated customer code", ErrCustomerTransactionInvalidPayload)
		}
	}

	nextVersion := current.Version + 1
	if err := tx.Model(current).Updates(map[string]any{
		"name":           mergedFinalData.Name,
		"code":           mergedFinalData.Code,
		"contact_person": mergedFinalData.ContactPerson,
		"contact_phone":  mergedFinalData.ContactPhone,
		"we_chat":        mergedFinalData.WeChat,
		"whats_app":      mergedFinalData.WhatsApp,
		"facebook":       mergedFinalData.Facebook,
		"instagram":      mergedFinalData.Instagram,
		"telegram":       mergedFinalData.Telegram,
		"email":          mergedFinalData.Email,
		"address":        mergedFinalData.Address,
		"status":         mergedFinalData.Status,
		"credit_limit":   mergedFinalData.CreditLimit,
		"balance":        mergedFinalData.Balance,
		"version":        nextVersion,
	}).Error; err != nil {
		return nil, err
	}

	current.Name = mergedFinalData.Name
	current.Code = mergedFinalData.Code
	current.ContactPerson = mergedFinalData.ContactPerson
	current.ContactPhone = mergedFinalData.ContactPhone
	current.WeChat = mergedFinalData.WeChat
	current.WhatsApp = mergedFinalData.WhatsApp
	current.Facebook = mergedFinalData.Facebook
	current.Instagram = mergedFinalData.Instagram
	current.Telegram = mergedFinalData.Telegram
	current.Email = mergedFinalData.Email
	current.Address = mergedFinalData.Address
	current.Status = mergedFinalData.Status
	current.CreditLimit = mergedFinalData.CreditLimit
	current.Balance = mergedFinalData.Balance
	current.Version = nextVersion

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          CustomerTransactionIntentSave,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"deltaKeys": deltaKeys,
			"status":    current.Status,
			"code":      current.Code,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "Customer",
		TargetID: current.ID,
		Action:   CustomerTransactionIntentSave,
		Diff:     auditDiff,
		Operator: operator,
		IP:       strings.TrimSpace(input.IP),
	}); err != nil {
		return nil, err
	}

	return current, nil
}

func executeSupplierUnifiedSaveTx(tx *gorm.DB, current *models.Supplier, input ExecuteSupplierTransactionInput) (*models.Supplier, error) {
	payload, err := parseSupplierSavePayload(input.Payload)
	if err != nil {
		return nil, err
	}

	operator := resolvePartnerOperator(payload.Operator, input.Operator, input.ActorID)
	deltaKeys := extractDeltaKeys(payload.Delta)
	mergedFinalData := mergeSupplierSaveSnapshot(*current, payload.FinalData, deltaKeys)

	if customerStatusOnlyDelta(deltaKeys) {
		derivedPayload, _ := json.Marshal(StatusChangePayload{
			Status:   mergedFinalData.Status,
			Operator: operator,
		})
		return executeSupplierStatusChangeTx(tx, current, ExecuteSupplierTransactionInput{
			SupplierID:      input.SupplierID,
			Intent:          SupplierTransactionIntentStatusChange,
			ActorID:         input.ActorID,
			Operator:        operator,
			ExpectedVersion: input.ExpectedVersion,
			Payload:         derivedPayload,
			IP:              input.IP,
		})
	}

	if customerIdentityOnlyDelta(deltaKeys) {
		derivedPayload, _ := json.Marshal(IdentityChangePayload{
			Code:     mergedFinalData.Code,
			Name:     mergedFinalData.Name,
			Operator: operator,
		})
		return executeSupplierIdentityChangeTx(tx, current, ExecuteSupplierTransactionInput{
			SupplierID:      input.SupplierID,
			Intent:          SupplierTransactionIntentIdentityChange,
			ActorID:         input.ActorID,
			Operator:        operator,
			ExpectedVersion: input.ExpectedVersion,
			Payload:         derivedPayload,
			IP:              input.IP,
		})
	}

	if mergedFinalData.Code == "" || mergedFinalData.Name == "" {
		return nil, fmt.Errorf("%w: code and name must not be empty", ErrSupplierTransactionInvalidPayload)
	}
	if !supplierStatusSupported(mergedFinalData.Status) {
		return nil, fmt.Errorf("%w: unsupported supplier status", ErrSupplierTransactionInvalidPayload)
	}

	if mergedFinalData.Code != strings.TrimSpace(current.Code) {
		var duplicateCount int64
		if err := tx.Model(&models.Supplier{}).
			Where("code = ? AND id <> ?", mergedFinalData.Code, current.ID).
			Count(&duplicateCount).Error; err != nil {
			return nil, err
		}
		if duplicateCount > 0 {
			return nil, fmt.Errorf("%w: duplicated supplier code", ErrSupplierTransactionInvalidPayload)
		}
	}

	mainProductsJSON, err := json.Marshal(mergedFinalData.MainProducts)
	if err != nil {
		return nil, fmt.Errorf("%w: invalid mainProducts", ErrSupplierTransactionInvalidPayload)
	}

	nextVersion := current.Version + 1
	if err := tx.Model(current).Updates(map[string]any{
		"name":           mergedFinalData.Name,
		"code":           mergedFinalData.Code,
		"category":       mergedFinalData.Category,
		"main_products":  string(mainProductsJSON),
		"contact_person": mergedFinalData.ContactPerson,
		"contact_phone":  mergedFinalData.ContactPhone,
		"we_chat":        mergedFinalData.WeChat,
		"whats_app":      mergedFinalData.WhatsApp,
		"facebook":       mergedFinalData.Facebook,
		"instagram":      mergedFinalData.Instagram,
		"telegram":       mergedFinalData.Telegram,
		"email":          mergedFinalData.Email,
		"address":        mergedFinalData.Address,
		"status":         mergedFinalData.Status,
		"rating":         mergedFinalData.Rating,
		"version":        nextVersion,
	}).Error; err != nil {
		return nil, err
	}

	current.Name = mergedFinalData.Name
	current.Code = mergedFinalData.Code
	current.Category = mergedFinalData.Category
	current.MainProducts = string(mainProductsJSON)
	current.ContactPerson = mergedFinalData.ContactPerson
	current.ContactPhone = mergedFinalData.ContactPhone
	current.WeChat = mergedFinalData.WeChat
	current.WhatsApp = mergedFinalData.WhatsApp
	current.Facebook = mergedFinalData.Facebook
	current.Instagram = mergedFinalData.Instagram
	current.Telegram = mergedFinalData.Telegram
	current.Email = mergedFinalData.Email
	current.Address = mergedFinalData.Address
	current.Status = mergedFinalData.Status
	current.Rating = mergedFinalData.Rating
	current.Version = nextVersion

	auditDiff, _ := json.Marshal(map[string]any{
		"intent":          SupplierTransactionIntentSave,
		"actorId":         strings.TrimSpace(input.ActorID),
		"operator":        operator,
		"expectedVersion": input.ExpectedVersion,
		"nextVersion":     current.Version,
		"payload": map[string]any{
			"deltaKeys": deltaKeys,
			"status":    current.Status,
			"code":      current.Code,
		},
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "Supplier",
		TargetID: current.ID,
		Action:   SupplierTransactionIntentSave,
		Diff:     auditDiff,
		Operator: operator,
		IP:       strings.TrimSpace(input.IP),
	}); err != nil {
		return nil, err
	}

	return current, nil
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
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&current, "id = ?", input.CustomerID).Error; err != nil {
		return nil, err
	}

	if input.ExpectedVersion != current.Version {
		return nil, ErrCustomerTransactionVersionConflict
	}

	switch strings.TrimSpace(input.Intent) {
	case CustomerTransactionIntentSave:
		return executeCustomerUnifiedSaveTx(tx, &current, input)
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
		Where("code = ? AND id <> ?", nextCode, current.ID).
		Count(&duplicateCount).Error; err != nil {
		return nil, err
	}
	if duplicateCount > 0 {
		return nil, fmt.Errorf("%w: duplicated customer code", ErrCustomerTransactionInvalidPayload)
	}

	nextVersion := current.Version + 1
	if err := tx.Model(current).Updates(map[string]any{
		"code":    nextCode,
		"name":    nextName,
		"version": nextVersion,
	}).Error; err != nil {
		return nil, err
	}
	beforeCode := current.Code
	beforeName := current.Name
	current.Code = nextCode
	current.Name = nextName
	current.Version = nextVersion

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

	nextVersion := current.Version + 1
	if err := tx.Model(current).Updates(map[string]any{
		"status":  status,
		"version": nextVersion,
	}).Error; err != nil {
		return nil, err
	}
	current.Status = status
	current.Version = nextVersion

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
	if response != nil {
		syncSupplierToSearch(*response)
	}
	return response, nil
}

func executeSupplierTransactionTx(tx *gorm.DB, input ExecuteSupplierTransactionInput) (*models.Supplier, error) {
	if tx == nil {
		return nil, errors.New("transaction is required")
	}

	var current models.Supplier
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&current, "id = ?", input.SupplierID).Error; err != nil {
		return nil, err
	}

	if input.ExpectedVersion != current.Version {
		return nil, ErrSupplierTransactionVersionConflict
	}

	switch strings.TrimSpace(input.Intent) {
	case SupplierTransactionIntentSave:
		return executeSupplierUnifiedSaveTx(tx, &current, input)
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
		Where("code = ? AND id <> ?", nextCode, current.ID).
		Count(&duplicateCount).Error; err != nil {
		return nil, err
	}
	if duplicateCount > 0 {
		return nil, fmt.Errorf("%w: duplicated supplier code", ErrSupplierTransactionInvalidPayload)
	}

	nextVersion := current.Version + 1
	if err := tx.Model(current).Updates(map[string]any{
		"code":    nextCode,
		"name":    nextName,
		"version": nextVersion,
	}).Error; err != nil {
		return nil, err
	}
	beforeCode := current.Code
	beforeName := current.Name
	current.Code = nextCode
	current.Name = nextName
	current.Version = nextVersion

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

	nextVersion := current.Version + 1
	if err := tx.Model(current).Updates(map[string]any{
		"status":  status,
		"version": nextVersion,
	}).Error; err != nil {
		return nil, err
	}
	current.Status = status
	current.Version = nextVersion

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
