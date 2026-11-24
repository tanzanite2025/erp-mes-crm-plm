package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	ProductBarcodeStateStatusNotStarted = "NOT_STARTED"
	ProductBarcodeStateStatusInProgress = "IN_PROGRESS"
	ProductBarcodeStateStatusCompleted  = "COMPLETED"
	ProductBarcodeStateStatusHold       = "HOLD"
	ProductBarcodeStateStatusRework     = "REWORK"
)

const (
	ProductBarcodeStateEventInitialized = "INITIALIZED"
	ProductBarcodeStateEventStateSet    = "STATE_SET"
	ProductBarcodeStateEventStart       = "START"
	ProductBarcodeStateEventComplete    = "COMPLETE"
	ProductBarcodeStateEventTransfer    = "TRANSFER"
	ProductBarcodeStateEventHold        = "HOLD"
	ProductBarcodeStateEventRework      = "REWORK"
)

const productBarcodeStateEventLimit = 20

var (
	ErrProductBarcodeStateNotFound           = errors.New("product barcode state not found")
	ErrProductBarcodeStateAlreadyInitialized = errors.New("product barcode state already initialized")
	ErrInvalidProductBarcodeState            = errors.New("invalid product barcode state")
)

type InitializeProductBarcodeStateRequest struct {
	ProductBarcode    string `json:"productBarcode"`
	ProductID         string `json:"productId"`
	ProductName       string `json:"productName"`
	RouteID           string `json:"-"`
	RouteStepID       string `json:"-"`
	BranchOperationID string `json:"-"`
	Status            string `json:"status"`
	Operator          string `json:"-"`
	IP                string `json:"-"`
}

type productBarcodeStateAttributes struct {
	ProductBarcode    string
	ProductID         string
	ProductName       string
	RouteID           string
	RouteStepID       string
	BranchOperationID string
	Status            string
	Operator          string
	IP                string
}

type ProductBarcodeStateBranchOperationResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ProductBarcodeStateEventResponse struct {
	ID                    string `json:"id"`
	StateID               string `json:"stateId"`
	OperationID           string `json:"operationId,omitempty"`
	ProductBarcode        string `json:"productBarcode"`
	EventType             string `json:"eventType"`
	FromBranchOperationID string `json:"fromBranchOperationId"`
	ToBranchOperationID   string `json:"toBranchOperationId"`
	RouteID               string `json:"routeId"`
	RouteStepID           string `json:"routeStepId"`
	Operator              string `json:"operator"`
	PayloadSnapshot       string `json:"payloadSnapshot"`
	OccurredAt            string `json:"occurredAt"`
}

type ProductBarcodeStateResponse struct {
	ID                       string                                      `json:"id"`
	ProductBarcode           string                                      `json:"productBarcode"`
	ProductID                string                                      `json:"productId"`
	ProductName              string                                      `json:"productName"`
	RouteID                  string                                      `json:"routeId"`
	RouteStepID              string                                      `json:"routeStepId"`
	CurrentBranchOperationID string                                      `json:"currentBranchOperationId"`
	CurrentBranchOperation   *ProductBarcodeStateBranchOperationResponse `json:"currentBranchOperation,omitempty"`
	Status                   string                                      `json:"status"`
	LastEventID              string                                      `json:"lastEventId"`
	StartedAt                string                                      `json:"startedAt"`
	CompletedAt              string                                      `json:"completedAt"`
	UpdatedAt                string                                      `json:"updatedAt"`
	Events                   []ProductBarcodeStateEventResponse          `json:"events"`
}

type ProductBarcodeStateService struct {
	txManager transactionManager
}

func NewProductBarcodeStateService(txManager transactionManager) *ProductBarcodeStateService {
	return &ProductBarcodeStateService{txManager: txManager}
}

var defaultProductBarcodeStateService = NewProductBarcodeStateService(defaultServiceRuntime().txManager)

func GetProductBarcodeState(productBarcode string) (ProductBarcodeStateResponse, error) {
	return defaultProductBarcodeStateService.GetProductBarcodeState(productBarcode)
}

func InitializeProductBarcodeState(req InitializeProductBarcodeStateRequest) (ProductBarcodeStateResponse, error) {
	return defaultProductBarcodeStateService.InitializeProductBarcodeState(req)
}

func (s *ProductBarcodeStateService) GetProductBarcodeState(productBarcode string) (ProductBarcodeStateResponse, error) {
	barcode := normalizeProductBarcodeValue(productBarcode)
	if barcode == "" {
		return ProductBarcodeStateResponse{}, fmt.Errorf("%w: productBarcode is required", ErrInvalidProductBarcodeState)
	}

	state, events, err := loadProductBarcodeStateWithEvents(s.txManager.DB(), barcode)
	if err != nil {
		return ProductBarcodeStateResponse{}, err
	}
	return mapProductBarcodeStateToResponse(state, events), nil
}

func (s *ProductBarcodeStateService) InitializeProductBarcodeState(req InitializeProductBarcodeStateRequest) (ProductBarcodeStateResponse, error) {
	attributes := normalizeProductBarcodeStateInitialization(req)
	if err := validateProductBarcodeStateInitializationInput(attributes); err != nil {
		return ProductBarcodeStateResponse{}, err
	}

	var response ProductBarcodeStateResponse
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if err := lockProductionBarcodeExecutionTransaction(tx, attributes.ProductBarcode); err != nil {
			return fmt.Errorf("failed to lock product barcode state initialization: %w", err)
		}
		if err := validateProductBarcodeStateInitializationReferences(tx, &attributes); err != nil {
			return err
		}

		_, exists, err := findProductBarcodeStateTx(tx, attributes.ProductBarcode)
		if err != nil {
			return err
		}
		if exists {
			return ErrProductBarcodeStateAlreadyInitialized
		}

		now := time.Now().UTC()
		state := models.ProductBarcodeState{BaseModel: models.BaseModel{ID: uuid.NewString()}}
		applyProductBarcodeStateAttributes(&state, attributes, now)
		createResult := applyProductionOptionalUUIDOmit(tx,
			productionOptionalUUIDWrite{Column: "route_id", Value: state.RouteID},
			productionOptionalUUIDWrite{Column: "route_step_id", Value: state.RouteStepID},
			productionOptionalUUIDWrite{Column: "current_branch_operation_id", Value: state.CurrentBranchOperationID},
			productionOptionalUUIDWrite{Column: "last_event_id", Value: state.LastEventID},
		).Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "product_barcode"}},
			DoNothing: true,
		}).Create(&state)
		if createResult.Error != nil {
			return fmt.Errorf("failed to create product barcode state: %w", createResult.Error)
		}
		if createResult.RowsAffected == 0 {
			return ErrProductBarcodeStateAlreadyInitialized
		}

		event := models.ProductBarcodeStateEvent{
			BaseModel:           models.BaseModel{ID: uuid.NewString()},
			StateID:             state.ID,
			ProductBarcode:      state.ProductBarcode,
			EventType:           ProductBarcodeStateEventInitialized,
			ToBranchOperationID: state.CurrentBranchOperationID,
			RouteID:             state.RouteID,
			RouteStepID:         state.RouteStepID,
			Operator:            resolveProductBarcodeStateOperator(attributes.Operator),
			PayloadSnapshot:     buildProductBarcodeStateEventSnapshot(attributes),
			OccurredAt:          &now,
		}
		if err := createProductionRecordWithOptionalUUIDs(tx, &event,
			productionOptionalUUIDWrite{Column: "operation_id", Value: event.OperationID},
			productionOptionalUUIDWrite{Column: "to_branch_operation_id", Value: event.ToBranchOperationID},
			productionOptionalUUIDWrite{Column: "route_id", Value: event.RouteID},
			productionOptionalUUIDWrite{Column: "route_step_id", Value: event.RouteStepID},
		); err != nil {
			return fmt.Errorf("failed to create product barcode state event: %w", err)
		}

		if err := tx.Model(&models.ProductBarcodeState{}).
			Where("id = ?", state.ID).
			Update("last_event_id", event.ID).Error; err != nil {
			return fmt.Errorf("failed to update product barcode last event: %w", err)
		}

		loadedState, events, err := loadProductBarcodeStateWithEvents(tx, state.ProductBarcode)
		if err != nil {
			return err
		}
		response = mapProductBarcodeStateToResponse(loadedState, events)
		return nil
	})
	return response, err
}

func normalizeProductBarcodeValue(value string) string {
	return strings.ToUpper(strings.TrimSpace(value))
}

func normalizeProductBarcodeStateInitialization(input InitializeProductBarcodeStateRequest) productBarcodeStateAttributes {
	status := strings.ToUpper(strings.TrimSpace(input.Status))
	if status == "" {
		status = ProductBarcodeStateStatusNotStarted
	}

	return productBarcodeStateAttributes{
		ProductBarcode:    normalizeProductBarcodeValue(input.ProductBarcode),
		ProductID:         strings.TrimSpace(input.ProductID),
		ProductName:       strings.TrimSpace(input.ProductName),
		RouteID:           strings.TrimSpace(input.RouteID),
		RouteStepID:       strings.TrimSpace(input.RouteStepID),
		BranchOperationID: normalizeProductionExecutionUUIDIdentity(input.BranchOperationID),
		Status:            status,
		Operator:          strings.TrimSpace(input.Operator),
		IP:                strings.TrimSpace(input.IP),
	}
}

func validateProductBarcodeStateInitializationInput(attributes productBarcodeStateAttributes) error {
	if attributes.ProductBarcode == "" {
		return fmt.Errorf("%w: productBarcode is required", ErrInvalidProductBarcodeState)
	}
	if len(attributes.ProductBarcode) > 120 {
		return fmt.Errorf("%w: productBarcode cannot exceed 120 characters", ErrInvalidProductBarcodeState)
	}
	if attributes.Status != ProductBarcodeStateStatusNotStarted {
		return fmt.Errorf("%w: initialization only supports status %s", ErrInvalidProductBarcodeState, ProductBarcodeStateStatusNotStarted)
	}
	return nil
}

func validateProductBarcodeStateInitializationReferences(tx *gorm.DB, attributes *productBarcodeStateAttributes) error {
	if attributes.RouteStepID == "" {
		if attributes.RouteID != "" && attributes.BranchOperationID != "" {
			return fmt.Errorf("%w: routeStepId is required when initializing a barcode at a route process", ErrInvalidProductBarcodeState)
		}
		if attributes.BranchOperationID != "" {
			if err := ensureProductionRecordExists(tx, &models.ProductionBOMBranchOperation{}, attributes.BranchOperationID, "branchOperationId"); err != nil {
				return err
			}
		}
		if attributes.RouteID != "" {
			if err := ensureProductionRecordExists(tx, &models.ProductionRoute{}, attributes.RouteID, "routeId"); err != nil {
				return err
			}
			published, err := productionRouteIsPublishedTx(tx, attributes.RouteID)
			if err != nil {
				return fmt.Errorf("%w: failed to validate routeId: %v", ErrInvalidProductBarcodeState, err)
			}
			if !published {
				return fmt.Errorf("%w: production route must be PUBLISHED before initializing a barcode", ErrInvalidProductBarcodeState)
			}
		}
		return nil
	}

	var selectedStep models.ProductionRouteStep
	if err := tx.Where("id = ?", attributes.RouteStepID).First(&selectedStep).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("%w: routeStepId does not exist", ErrInvalidProductBarcodeState)
		}
		return fmt.Errorf("%w: failed to validate routeStepId: %v", ErrInvalidProductBarcodeState, err)
	}
	if attributes.RouteID != "" && normalizeProductionExecutionUUIDIdentity(attributes.RouteID) != normalizeProductionExecutionUUIDIdentity(selectedStep.RouteID) {
		return fmt.Errorf("%w: routeStepId does not belong to routeId", ErrInvalidProductBarcodeState)
	}
	selectedBranchOperationID := strings.TrimSpace(selectedStep.BranchOperationID)
	if attributes.BranchOperationID != "" && normalizeProductionExecutionUUIDIdentity(attributes.BranchOperationID) != normalizeProductionExecutionUUIDIdentity(selectedBranchOperationID) {
		return fmt.Errorf("%w: routeStepId does not match branchOperationId", ErrInvalidProductBarcodeState)
	}
	if selectedBranchOperationID == "" {
		return fmt.Errorf("%w: routeStepId has no branchOperationId", ErrInvalidProductBarcodeState)
	}

	attributes.RouteID = strings.TrimSpace(selectedStep.RouteID)
	attributes.BranchOperationID = selectedBranchOperationID
	if err := ensureProductionRecordExists(tx, &models.ProductionRoute{}, attributes.RouteID, "routeId"); err != nil {
		return err
	}
	published, err := productionRouteIsPublishedTx(tx, attributes.RouteID)
	if err != nil {
		return fmt.Errorf("%w: failed to validate routeId: %v", ErrInvalidProductBarcodeState, err)
	}
	if !published {
		return fmt.Errorf("%w: production route must be PUBLISHED before initializing a barcode", ErrInvalidProductBarcodeState)
	}
	if err := ensureProductionRecordExists(tx, &models.ProductionBOMBranchOperation{}, attributes.BranchOperationID, "branchOperationId"); err != nil {
		return err
	}

	var firstRouteStep models.ProductionRouteStep
	if err := tx.Where("route_id = ?", attributes.RouteID).Order("sequence ASC, id ASC").First(&firstRouteStep).Error; err != nil {
		return fmt.Errorf("%w: failed to resolve first route step: %v", ErrInvalidProductBarcodeState, err)
	}
	if normalizeProductionExecutionUUIDIdentity(firstRouteStep.ID) != normalizeProductionExecutionUUIDIdentity(selectedStep.ID) {
		return fmt.Errorf("%w: initialization must use the first route step", ErrInvalidProductBarcodeState)
	}
	return nil
}

func isSupportedProductBarcodeStateStatus(status string) bool {
	switch status {
	case ProductBarcodeStateStatusNotStarted,
		ProductBarcodeStateStatusInProgress,
		ProductBarcodeStateStatusCompleted,
		ProductBarcodeStateStatusHold,
		ProductBarcodeStateStatusRework:
		return true
	default:
		return false
	}
}

func ensureProductionRecordExists(tx *gorm.DB, model any, id string, field string) error {
	var count int64
	if err := tx.Model(model).Where("id = ?", strings.TrimSpace(id)).Count(&count).Error; err != nil {
		return fmt.Errorf("%w: failed to validate %s: %v", ErrInvalidProductBarcodeState, field, err)
	}
	if count == 0 {
		return fmt.Errorf("%w: %s does not exist", ErrInvalidProductBarcodeState, field)
	}
	return nil
}

func findProductBarcodeStateTx(tx *gorm.DB, productBarcode string) (models.ProductBarcodeState, bool, error) {
	var state models.ProductBarcodeState
	err := tx.Where("product_barcode = ?", productBarcode).First(&state).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.ProductBarcodeState{}, false, nil
	}
	if err != nil {
		return models.ProductBarcodeState{}, false, fmt.Errorf("failed to query product barcode state: %w", err)
	}
	return state, true, nil
}

func applyProductBarcodeStateAttributes(state *models.ProductBarcodeState, attributes productBarcodeStateAttributes, now time.Time) {
	state.ProductBarcode = attributes.ProductBarcode
	state.ProductID = attributes.ProductID
	state.ProductName = attributes.ProductName
	state.RouteID = attributes.RouteID
	state.RouteStepID = attributes.RouteStepID
	state.CurrentBranchOperationID = attributes.BranchOperationID
	state.Status = attributes.Status

	if attributes.Status == ProductBarcodeStateStatusInProgress && state.StartedAt == nil {
		state.StartedAt = &now
	}
	if attributes.Status == ProductBarcodeStateStatusCompleted {
		state.CompletedAt = &now
	} else {
		state.CompletedAt = nil
	}
}

func resolveProductBarcodeStateOperator(operator string) string {
	if strings.TrimSpace(operator) == "" {
		return "system"
	}
	return strings.TrimSpace(operator)
}

func buildProductBarcodeStateEventSnapshot(attributes productBarcodeStateAttributes) string {
	payload, err := json.Marshal(map[string]string{
		"productBarcode":    attributes.ProductBarcode,
		"productId":         attributes.ProductID,
		"productName":       attributes.ProductName,
		"routeId":           attributes.RouteID,
		"routeStepId":       attributes.RouteStepID,
		"branchOperationId": attributes.BranchOperationID,
		"status":            attributes.Status,
		"operator":          resolveProductBarcodeStateOperator(attributes.Operator),
	})
	if err != nil {
		return "{}"
	}
	return string(payload)
}

func loadProductBarcodeStateWithEvents(tx *gorm.DB, productBarcode string) (models.ProductBarcodeState, []models.ProductBarcodeStateEvent, error) {
	var state models.ProductBarcodeState
	if err := tx.
		Preload("CurrentBranchOperation").
		Where("product_barcode = ?", productBarcode).
		First(&state).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.ProductBarcodeState{}, nil, ErrProductBarcodeStateNotFound
		}
		return models.ProductBarcodeState{}, nil, fmt.Errorf("failed to load product barcode state: %w", err)
	}

	eventQuery := tx.Where("state_id = ?", state.ID)
	if strings.TrimSpace(state.LastEventID) != "" {
		eventQuery = eventQuery.Order(clause.OrderBy{
			Expression: clause.Expr{
				SQL:  "CASE WHEN id = ? THEN 0 ELSE 1 END, occurred_at DESC, created_at DESC, id DESC",
				Vars: []any{state.LastEventID},
			},
		})
	} else {
		eventQuery = eventQuery.Order("occurred_at DESC, created_at DESC, id DESC")
	}

	var events []models.ProductBarcodeStateEvent
	if err := eventQuery.
		Limit(productBarcodeStateEventLimit).
		Find(&events).Error; err != nil {
		return models.ProductBarcodeState{}, nil, fmt.Errorf("failed to load product barcode state events: %w", err)
	}
	return state, events, nil
}

func mapProductBarcodeStateToResponse(state models.ProductBarcodeState, events []models.ProductBarcodeStateEvent) ProductBarcodeStateResponse {
	return ProductBarcodeStateResponse{
		ID:                       strings.TrimSpace(state.ID),
		ProductBarcode:           strings.TrimSpace(state.ProductBarcode),
		ProductID:                strings.TrimSpace(state.ProductID),
		ProductName:              strings.TrimSpace(state.ProductName),
		RouteID:                  strings.TrimSpace(state.RouteID),
		RouteStepID:              strings.TrimSpace(state.RouteStepID),
		CurrentBranchOperationID: strings.TrimSpace(state.CurrentBranchOperationID),
		CurrentBranchOperation:   mapProductBarcodeStateBranchOperation(state.CurrentBranchOperation),
		Status:                   strings.TrimSpace(state.Status),
		LastEventID:              strings.TrimSpace(state.LastEventID),
		StartedAt:                formatProductBarcodeStateTime(state.StartedAt),
		CompletedAt:              formatProductBarcodeStateTime(state.CompletedAt),
		UpdatedAt:                state.UpdatedAt.UTC().Format(time.RFC3339),
		Events:                   mapProductBarcodeStateEventsToResponse(events),
	}
}

func mapProductBarcodeStateBranchOperation(step *models.ProductionBOMBranchOperation) *ProductBarcodeStateBranchOperationResponse {
	if step == nil || strings.TrimSpace(step.ID) == "" {
		return nil
	}
	return &ProductBarcodeStateBranchOperationResponse{
		ID:   strings.TrimSpace(step.ID),
		Name: strings.TrimSpace(step.Name),
	}
}

func mapProductBarcodeStateEventsToResponse(events []models.ProductBarcodeStateEvent) []ProductBarcodeStateEventResponse {
	result := make([]ProductBarcodeStateEventResponse, 0, len(events))
	for _, event := range events {
		result = append(result, ProductBarcodeStateEventResponse{
			ID:                    strings.TrimSpace(event.ID),
			StateID:               strings.TrimSpace(event.StateID),
			OperationID:           strings.TrimSpace(event.OperationID),
			ProductBarcode:        strings.TrimSpace(event.ProductBarcode),
			EventType:             strings.TrimSpace(event.EventType),
			FromBranchOperationID: strings.TrimSpace(event.FromBranchOperationID),
			ToBranchOperationID:   strings.TrimSpace(event.ToBranchOperationID),
			RouteID:               strings.TrimSpace(event.RouteID),
			RouteStepID:           strings.TrimSpace(event.RouteStepID),
			Operator:              strings.TrimSpace(event.Operator),
			PayloadSnapshot:       strings.TrimSpace(event.PayloadSnapshot),
			OccurredAt:            formatProductBarcodeStateTime(event.OccurredAt),
		})
	}
	return result
}

func formatProductBarcodeStateTime(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}
