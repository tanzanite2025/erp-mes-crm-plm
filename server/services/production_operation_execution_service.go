package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	ProductionOperationActionStart    = "START"
	ProductionOperationActionComplete = "COMPLETE"
	ProductionOperationActionHold     = "HOLD"
	ProductionOperationActionRework   = "REWORK"
)

const (
	ProductionOperationExecutionModeInHouse   = "IN_HOUSE"
	ProductionOperationExecutionModeOutsource = "OUTSOURCE"
)

const productionOperationExecutionDefaultLimit = 50

var ErrInvalidProductionOperationExecution = errors.New("invalid production operation execution")

type ProductionOperationExecutionListQuery struct {
	ProductBarcode string
	ProcessStepID  string
	RouteStepID    string
	ExecutionLotID string
	Limit          int
}

type RecordProductionOperationExecutionRequest struct {
	IdempotencyKey string `json:"idempotencyKey"`
	ExecutionRound int64  `json:"executionRound,omitempty"`
	ProductBarcode string `json:"productBarcode"`
	ExecutionLotID string `json:"executionLotId"`
	RouteID        string `json:"routeId"`
	RouteStepID    string `json:"routeStepId"`
	ProcessStepID  string `json:"processStepId"`
	ExecutionMode  string `json:"executionMode"`
	PartnerID      string `json:"partnerId"`
	Action         string `json:"action"`
	Result         string `json:"result"`
	Notes          string `json:"notes"`
	Operator       string `json:"-"`
}

type ProductionOperationExecutionResponse struct {
	SubmittedByUserID string `json:"submittedByUserId"`
	ID                string `json:"id"`
	ExecutionRound    int64  `json:"executionRound"`
	ProductBarcode    string `json:"productBarcode"`
	StateID           string `json:"stateId"`
	ExecutionLotID    string `json:"executionLotId"`
	RouteID           string `json:"routeId"`
	RouteStepID       string `json:"routeStepId"`
	ProcessStepID     string `json:"processStepId"`
	ExecutionMode     string `json:"executionMode"`
	PartnerID         string `json:"partnerId"`
	Action            string `json:"action"`
	Status            string `json:"status"`
	Result            string `json:"result"`
	Operator          string `json:"operator"`
	StartedAt         string `json:"startedAt"`
	CompletedAt       string `json:"completedAt"`
	Notes             string `json:"notes"`
	CreatedAt         string `json:"createdAt"`
	UpdatedAt         string `json:"updatedAt"`
}

type ProductionOperationExecutionListResponse struct {
	Items []ProductionOperationExecutionResponse `json:"items"`
	Total int64                                  `json:"total"`
}

type productionOperationExecutionRecordResult struct {
	Replayed   bool
	Operation  models.ProductionOperationExecution
	State      models.ProductBarcodeState
	StateEvent models.ProductBarcodeStateEvent
}

type productionOperationProductContext struct {
	ProductID   string
	ProductName string
}

type ProductionOperationExecutionService struct {
	txManager transactionManager
}

func NewProductionOperationExecutionService(txManager transactionManager) *ProductionOperationExecutionService {
	return &ProductionOperationExecutionService{txManager: txManager}
}

var defaultProductionOperationExecutionService = NewProductionOperationExecutionService(defaultServiceRuntime().txManager)

func ListProductionOperationExecutions(query ProductionOperationExecutionListQuery) (ProductionOperationExecutionListResponse, error) {
	return defaultProductionOperationExecutionService.ListProductionOperationExecutions(query)
}

func RecordProductionOperationExecution(req RecordProductionOperationExecutionRequest) (ProductionOperationExecutionResponse, error) {
	return defaultProductionOperationExecutionService.RecordProductionOperationExecution(req)
}

func RecordProductionOperationExecutionWithContext(
	ctx context.Context,
	req RecordProductionOperationExecutionRequest,
) (ProductionOperationExecutionResponse, error) {
	return defaultProductionOperationExecutionService.RecordProductionOperationExecutionWithContext(ctx, req)
}

func (s *ProductionOperationExecutionService) ListProductionOperationExecutions(query ProductionOperationExecutionListQuery) (ProductionOperationExecutionListResponse, error) {
	normalized := normalizeProductionOperationExecutionListQuery(query)
	base := s.txManager.DB().Model(&models.ProductionOperationExecution{}).Where("deleted_at IS NULL")
	if normalized.ProductBarcode != "" {
		base = base.Where("product_barcode = ?", normalized.ProductBarcode)
	}
	if normalized.ProcessStepID != "" {
		base = base.Where("process_step_id = ?", normalized.ProcessStepID)
	}
	if normalized.RouteStepID != "" {
		base = base.Where("route_step_id = ?", normalized.RouteStepID)
	}
	if normalized.ExecutionLotID != "" {
		base = base.Where("execution_lot_id = ?", normalized.ExecutionLotID)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return ProductionOperationExecutionListResponse{}, fmt.Errorf("failed to count production operation executions: %w", err)
	}

	var items []models.ProductionOperationExecution
	if err := base.
		Order("created_at DESC, id DESC").
		Limit(normalized.Limit).
		Find(&items).Error; err != nil {
		return ProductionOperationExecutionListResponse{}, fmt.Errorf("failed to list production operation executions: %w", err)
	}

	return ProductionOperationExecutionListResponse{
		Items: mapProductionOperationExecutionsToResponse(items),
		Total: total,
	}, nil
}

func (s *ProductionOperationExecutionService) RecordProductionOperationExecution(req RecordProductionOperationExecutionRequest) (ProductionOperationExecutionResponse, error) {
	return s.RecordProductionOperationExecutionWithContext(context.Background(), req)
}

func (s *ProductionOperationExecutionService) RecordProductionOperationExecutionWithContext(
	ctx context.Context,
	req RecordProductionOperationExecutionRequest,
) (ProductionOperationExecutionResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	normalized := normalizeRecordProductionOperationExecutionRequest(req)
	var saved productionOperationExecutionRecordResult
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var err error
		saved, err = executeProductionCommandWithRequestReplayTx(tx, "OPERATION_EXECUTION", normalized.IdempotencyKey, normalized,
			func() (productionOperationExecutionRecordResult, error) {
				if err := validateRecordProductionOperationExecutionRequest(tx, normalized); err != nil {
					return productionOperationExecutionRecordResult{}, err
				}
				return recordProductionOperationExecutionTx(ctx, tx, normalized)
			})
		return err
	})
	if err != nil {
		return ProductionOperationExecutionResponse{}, err
	}
	return mapProductionOperationExecutionToResponse(saved.Operation), nil
}

func recordProductionOperationExecutionTx(
	ctx context.Context,
	tx *gorm.DB,
	normalized RecordProductionOperationExecutionRequest,
) (productionOperationExecutionRecordResult, error) {
	if err := lockProductionBarcodeExecutionTransaction(tx, normalized.ProductBarcode); err != nil {
		return productionOperationExecutionRecordResult{}, err
	}
	round, lastReworkAt, err := resolveProductionBarcodeExecutionRoundTx(tx, normalized)
	if err != nil {
		return productionOperationExecutionRecordResult{}, err
	}
	if normalized.Action == ProductionOperationActionComplete {
		completed, found, err := findCompletedProductionWorkInExecutionRoundTx(tx, normalized, round, lastReworkAt)
		if err != nil || found {
			return completed, err
		}
	}
	actor, _ := audit.ActorFromContext(ctx)
	normalized.ExecutionRound = round
	state, exists, err := findProductBarcodeStateTx(tx, normalized.ProductBarcode)
	if err != nil {
		return productionOperationExecutionRecordResult{}, err
	}
	productContext, err := resolveProductionOperationProductContextTx(tx, &normalized, state)
	if err != nil {
		return productionOperationExecutionRecordResult{}, err
	}

	now := time.Now().UTC()
	previousProcessStepID := strings.TrimSpace(state.CurrentProcessStepID)
	stateStatus := mapProductionOperationActionToBarcodeStateStatus(normalized.Action)
	stateReq := SaveProductBarcodeStateRequest{
		ProductBarcode: normalized.ProductBarcode,
		ProductID:      productContext.ProductID,
		ProductName:    productContext.ProductName,
		RouteID:        normalized.RouteID,
		RouteStepID:    normalized.RouteStepID,
		ProcessStepID:  normalized.ProcessStepID,
		Status:         stateStatus,
		Operator:       normalized.Operator,
	}
	applyProductBarcodeStateRequest(&state, stateReq, now)
	if !exists {
		state.BaseModel = models.BaseModel{ID: uuid.NewString()}
		if err := createProductionRecordWithOptionalUUIDs(tx, &state,
			productionOptionalUUIDWrite{Column: "route_id", Value: state.RouteID},
			productionOptionalUUIDWrite{Column: "route_step_id", Value: state.RouteStepID},
			productionOptionalUUIDWrite{Column: "current_process_step_id", Value: state.CurrentProcessStepID},
			productionOptionalUUIDWrite{Column: "last_event_id", Value: state.LastEventID},
		); err != nil {
			return productionOperationExecutionRecordResult{}, fmt.Errorf("failed to create product barcode state: %w", err)
		}
	} else if err := saveProductionRecordWithOptionalUUIDs(tx, &state,
		productionOptionalUUIDWrite{Column: "route_id", Value: state.RouteID},
		productionOptionalUUIDWrite{Column: "route_step_id", Value: state.RouteStepID},
		productionOptionalUUIDWrite{Column: "current_process_step_id", Value: state.CurrentProcessStepID},
		productionOptionalUUIDWrite{Column: "last_event_id", Value: state.LastEventID},
	); err != nil {
		return productionOperationExecutionRecordResult{}, fmt.Errorf("failed to update product barcode state: %w", err)
	}

	operation := models.ProductionOperationExecution{
		SubmittedByUserID: normalizeProductionExecutionUUIDIdentity(actor.UserID),
		BaseModel:         models.BaseModel{ID: uuid.NewString()},
		WorkIdentityKey:   productionOperationWorkIdentityKey(normalized),
		ExecutionRound:    round,
		ProductBarcode:    normalized.ProductBarcode,
		StateID:           state.ID,
		ExecutionLotID:    normalized.ExecutionLotID,
		RouteID:           normalized.RouteID,
		RouteStepID:       normalized.RouteStepID,
		ProcessStepID:     normalized.ProcessStepID,
		ExecutionMode:     normalized.ExecutionMode,
		PartnerID:         normalized.PartnerID,
		Action:            normalized.Action,
		Status:            stateStatus,
		Result:            normalized.Result,
		Operator:          resolveProductionOperationOperator(normalized.Operator),
		StartedAt:         resolveProductionOperationStartedAt(normalized.Action, now),
		CompletedAt:       resolveProductionOperationCompletedAt(normalized.Action, now),
		Notes:             normalized.Notes,
	}
	if err := createProductionRecordWithOptionalUUIDs(tx, &operation,
		productionOptionalUUIDWrite{Column: "submitted_by_user_id", Value: operation.SubmittedByUserID},
		productionOptionalUUIDWrite{Column: "state_id", Value: operation.StateID},
		productionOptionalUUIDWrite{Column: "execution_lot_id", Value: operation.ExecutionLotID},
		productionOptionalUUIDWrite{Column: "route_id", Value: operation.RouteID},
		productionOptionalUUIDWrite{Column: "route_step_id", Value: operation.RouteStepID},
		productionOptionalUUIDWrite{Column: "partner_id", Value: operation.PartnerID},
	); err != nil {
		return productionOperationExecutionRecordResult{}, fmt.Errorf("failed to create production operation execution: %w", err)
	}

	event := models.ProductBarcodeStateEvent{
		BaseModel:         models.BaseModel{ID: uuid.NewString()},
		StateID:           state.ID,
		ProductBarcode:    state.ProductBarcode,
		EventType:         mapProductionOperationActionToBarcodeStateEvent(normalized.Action),
		FromProcessStepID: previousProcessStepID,
		ToProcessStepID:   state.CurrentProcessStepID,
		RouteID:           state.RouteID,
		RouteStepID:       state.RouteStepID,
		Operator:          operation.Operator,
		PayloadSnapshot:   buildProductionOperationStateEventSnapshot(normalized, operation.ID),
		OccurredAt:        &now,
	}
	if err := createProductionRecordWithOptionalUUIDs(tx, &event,
		productionOptionalUUIDWrite{Column: "from_process_step_id", Value: event.FromProcessStepID},
		productionOptionalUUIDWrite{Column: "to_process_step_id", Value: event.ToProcessStepID},
		productionOptionalUUIDWrite{Column: "route_id", Value: event.RouteID},
		productionOptionalUUIDWrite{Column: "route_step_id", Value: event.RouteStepID},
	); err != nil {
		return productionOperationExecutionRecordResult{}, fmt.Errorf("failed to create product barcode state event: %w", err)
	}

	if err := tx.Model(&models.ProductBarcodeState{}).
		Where("id = ?", state.ID).
		Update("last_event_id", event.ID).Error; err != nil {
		return productionOperationExecutionRecordResult{}, fmt.Errorf("failed to update product barcode last event: %w", err)
	}
	state.LastEventID = event.ID
	if err := SynchronizeSalesOrderProductionProgressFromExecutionLotTx(tx, normalized.ExecutionLotID); err != nil {
		return productionOperationExecutionRecordResult{}, err
	}

	return productionOperationExecutionRecordResult{
		Operation:  operation,
		State:      state,
		StateEvent: event,
	}, nil
}

func normalizeProductionOperationExecutionListQuery(query ProductionOperationExecutionListQuery) ProductionOperationExecutionListQuery {
	limit := query.Limit
	if limit <= 0 {
		limit = productionOperationExecutionDefaultLimit
	}
	if limit > 200 {
		limit = 200
	}

	return ProductionOperationExecutionListQuery{
		ProductBarcode: normalizeProductBarcodeValue(query.ProductBarcode),
		ProcessStepID:  strings.TrimSpace(query.ProcessStepID),
		RouteStepID:    strings.TrimSpace(query.RouteStepID),
		ExecutionLotID: strings.TrimSpace(query.ExecutionLotID),
		Limit:          limit,
	}
}

func resolveProductionOperationProductContextTx(
	tx *gorm.DB,
	req *RecordProductionOperationExecutionRequest,
	state models.ProductBarcodeState,
) (productionOperationProductContext, error) {
	result := productionOperationProductContext{
		ProductID:   strings.TrimSpace(state.ProductID),
		ProductName: strings.TrimSpace(state.ProductName),
	}

	var lot models.ProductionExecutionLot
	query := tx.Model(&models.ProductionExecutionLot{})
	if req.ExecutionLotID != "" {
		query = query.Where("id = ?", req.ExecutionLotID)
	} else {
		query = query.Where("product_barcode = ?", req.ProductBarcode)
	}
	err := query.First(&lot).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return result, nil
	}
	if err != nil {
		return productionOperationProductContext{}, fmt.Errorf("failed to resolve production execution lot: %w", err)
	}

	if req.ExecutionLotID == "" {
		req.ExecutionLotID = strings.TrimSpace(lot.ID)
	}
	if productID := strings.TrimSpace(lot.ProductID); productID != "" {
		result.ProductID = productID
	}
	if productName := strings.TrimSpace(lot.ProductName); productName != "" {
		result.ProductName = productName
	}
	return result, nil
}

func normalizeRecordProductionOperationExecutionRequest(req RecordProductionOperationExecutionRequest) RecordProductionOperationExecutionRequest {
	action := strings.ToUpper(strings.TrimSpace(req.Action))
	if action == "" {
		action = ProductionOperationActionStart
	}
	executionMode := strings.ToUpper(strings.TrimSpace(req.ExecutionMode))
	if executionMode == "" {
		executionMode = ProductionOperationExecutionModeInHouse
	}
	result := strings.TrimSpace(req.Result)
	if result == "" {
		result = action
	}

	return RecordProductionOperationExecutionRequest{
		IdempotencyKey: strings.TrimSpace(req.IdempotencyKey),
		ExecutionRound: req.ExecutionRound,
		ProductBarcode: normalizeProductBarcodeValue(req.ProductBarcode),
		ExecutionLotID: normalizeProductionExecutionUUIDIdentity(req.ExecutionLotID),
		RouteID:        normalizeProductionExecutionUUIDIdentity(req.RouteID),
		RouteStepID:    normalizeProductionExecutionUUIDIdentity(req.RouteStepID),
		ProcessStepID:  normalizeProductionExecutionUUIDIdentity(req.ProcessStepID),
		ExecutionMode:  executionMode,
		PartnerID:      normalizeProductionExecutionUUIDIdentity(req.PartnerID),
		Action:         action,
		Result:         result,
		Notes:          strings.TrimSpace(req.Notes),
		Operator:       strings.TrimSpace(req.Operator),
	}
}

func validateRecordProductionOperationExecutionRequest(tx *gorm.DB, req RecordProductionOperationExecutionRequest) error {
	if req.ExecutionRound < 0 {
		return fmt.Errorf("%w: executionRound cannot be negative", ErrInvalidProductionOperationExecution)
	}
	if req.ProductBarcode == "" {
		return fmt.Errorf("%w: productBarcode is required", ErrInvalidProductionOperationExecution)
	}
	if req.ProcessStepID == "" {
		return fmt.Errorf("%w: processStepId is required", ErrInvalidProductionOperationExecution)
	}
	if !isSupportedProductionOperationAction(req.Action) {
		return fmt.Errorf("%w: unsupported action %s", ErrInvalidProductionOperationExecution, req.Action)
	}
	if !isSupportedProductionOperationExecutionMode(req.ExecutionMode) {
		return fmt.Errorf("%w: unsupported executionMode %s", ErrInvalidProductionOperationExecution, req.ExecutionMode)
	}
	if err := ensureProductionOperationRecordExists(tx, &models.ProcessStep{}, req.ProcessStepID, "processStepId"); err != nil {
		return err
	}
	if req.ExecutionLotID != "" {
		if err := ensureProductionOperationRecordExists(tx, &models.ProductionExecutionLot{}, req.ExecutionLotID, "executionLotId"); err != nil {
			return err
		}
	}
	if req.RouteID != "" {
		if err := ensureProductionOperationRecordExists(tx, &models.ProductionRoute{}, req.RouteID, "routeId"); err != nil {
			return err
		}
	}
	if req.RouteStepID != "" {
		if err := validateProductionOperationRouteStep(tx, req); err != nil {
			return err
		}
	}
	return nil
}

func isSupportedProductionOperationAction(action string) bool {
	switch action {
	case ProductionOperationActionStart,
		ProductionOperationActionComplete,
		ProductionOperationActionHold,
		ProductionOperationActionRework:
		return true
	default:
		return false
	}
}

func isSupportedProductionOperationExecutionMode(mode string) bool {
	switch mode {
	case ProductionOperationExecutionModeInHouse,
		ProductionOperationExecutionModeOutsource:
		return true
	default:
		return false
	}
}

func ensureProductionOperationRecordExists(tx *gorm.DB, model any, id string, field string) error {
	var count int64
	if err := tx.Model(model).Where("id = ?", strings.TrimSpace(id)).Count(&count).Error; err != nil {
		return fmt.Errorf("%w: failed to validate %s: %v", ErrInvalidProductionOperationExecution, field, err)
	}
	if count == 0 {
		return fmt.Errorf("%w: %s does not exist", ErrInvalidProductionOperationExecution, field)
	}
	return nil
}

func validateProductionOperationRouteStep(tx *gorm.DB, req RecordProductionOperationExecutionRequest) error {
	query := tx.Model(&models.ProductionRouteStep{}).
		Where("id = ? AND process_step_id = ?", req.RouteStepID, req.ProcessStepID)
	if req.RouteID != "" {
		query = query.Where("route_id = ?", req.RouteID)
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		return fmt.Errorf("%w: failed to validate routeStepId: %v", ErrInvalidProductionOperationExecution, err)
	}
	if count == 0 {
		return fmt.Errorf("%w: routeStepId does not match the selected process", ErrInvalidProductionOperationExecution)
	}
	return nil
}

func mapProductionOperationActionToBarcodeStateStatus(action string) string {
	switch action {
	case ProductionOperationActionComplete:
		return ProductBarcodeStateStatusCompleted
	case ProductionOperationActionHold:
		return ProductBarcodeStateStatusHold
	case ProductionOperationActionRework:
		return ProductBarcodeStateStatusRework
	default:
		return ProductBarcodeStateStatusInProgress
	}
}

func mapProductionOperationActionToBarcodeStateEvent(action string) string {
	switch action {
	case ProductionOperationActionComplete:
		return ProductBarcodeStateEventComplete
	case ProductionOperationActionHold:
		return ProductBarcodeStateEventHold
	case ProductionOperationActionRework:
		return ProductBarcodeStateEventRework
	default:
		return ProductBarcodeStateEventStart
	}
}

func resolveProductionOperationStartedAt(action string, now time.Time) *time.Time {
	if action == ProductionOperationActionStart {
		return &now
	}
	return nil
}

func resolveProductionOperationCompletedAt(action string, now time.Time) *time.Time {
	if action == ProductionOperationActionComplete {
		return &now
	}
	return nil
}

func resolveProductionOperationOperator(operator string) string {
	if strings.TrimSpace(operator) == "" {
		return "system"
	}
	return strings.TrimSpace(operator)
}

func buildProductionOperationStateEventSnapshot(req RecordProductionOperationExecutionRequest, operationID string) string {
	snapshot := map[string]string{
		"idempotencyKey":       req.IdempotencyKey,
		"executionRound":       strconv.FormatInt(req.ExecutionRound, 10),
		"operationExecutionId": operationID,
		"productBarcode":       req.ProductBarcode,
		"executionLotId":       req.ExecutionLotID,
		"routeId":              req.RouteID,
		"routeStepId":          req.RouteStepID,
		"processStepId":        req.ProcessStepID,
		"executionMode":        req.ExecutionMode,
		"partnerId":            req.PartnerID,
		"action":               req.Action,
		"result":               req.Result,
	}
	payload, err := json.Marshal(snapshot)
	if err != nil {
		return "{}"
	}
	return string(payload)
}

func mapProductionOperationExecutionsToResponse(items []models.ProductionOperationExecution) []ProductionOperationExecutionResponse {
	result := make([]ProductionOperationExecutionResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapProductionOperationExecutionToResponse(item))
	}
	return result
}

func mapProductionOperationExecutionToResponse(item models.ProductionOperationExecution) ProductionOperationExecutionResponse {
	return ProductionOperationExecutionResponse{
		SubmittedByUserID: strings.TrimSpace(item.SubmittedByUserID),
		ID:                strings.TrimSpace(item.ID),
		ExecutionRound:    item.ExecutionRound,
		ProductBarcode:    strings.TrimSpace(item.ProductBarcode),
		StateID:           strings.TrimSpace(item.StateID),
		ExecutionLotID:    strings.TrimSpace(item.ExecutionLotID),
		RouteID:           strings.TrimSpace(item.RouteID),
		RouteStepID:       strings.TrimSpace(item.RouteStepID),
		ProcessStepID:     strings.TrimSpace(item.ProcessStepID),
		ExecutionMode:     strings.TrimSpace(item.ExecutionMode),
		PartnerID:         strings.TrimSpace(item.PartnerID),
		Action:            strings.TrimSpace(item.Action),
		Status:            strings.TrimSpace(item.Status),
		Result:            strings.TrimSpace(item.Result),
		Operator:          strings.TrimSpace(item.Operator),
		StartedAt:         formatProductBarcodeStateTime(item.StartedAt),
		CompletedAt:       formatProductBarcodeStateTime(item.CompletedAt),
		Notes:             strings.TrimSpace(item.Notes),
		CreatedAt:         formatProductionExecutionLotTime(item.CreatedAt),
		UpdatedAt:         formatProductionExecutionLotTime(item.UpdatedAt),
	}
}
