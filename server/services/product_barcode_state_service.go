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
	ErrProductBarcodeStateNotFound = errors.New("product barcode state not found")
	ErrInvalidProductBarcodeState  = errors.New("invalid product barcode state")
)

type SaveProductBarcodeStateRequest struct {
	ProductBarcode string `json:"productBarcode"`
	ProductID      string `json:"productId"`
	ProductName    string `json:"productName"`
	RouteID        string `json:"routeId"`
	RouteStepID    string `json:"routeStepId"`
	ProcessStepID  string `json:"processStepId"`
	Status         string `json:"status"`
	Operator       string `json:"-"`
	IP             string `json:"-"`
}

type ProductBarcodeStateProcessStepResponse struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}

type ProductBarcodeStateEventResponse struct {
	ID                string `json:"id"`
	StateID           string `json:"stateId"`
	ProductBarcode    string `json:"productBarcode"`
	EventType         string `json:"eventType"`
	FromProcessStepID string `json:"fromProcessStepId"`
	ToProcessStepID   string `json:"toProcessStepId"`
	RouteID           string `json:"routeId"`
	RouteStepID       string `json:"routeStepId"`
	Operator          string `json:"operator"`
	PayloadSnapshot   string `json:"payloadSnapshot"`
	OccurredAt        string `json:"occurredAt"`
}

type ProductBarcodeStateResponse struct {
	ID                   string                                  `json:"id"`
	ProductBarcode       string                                  `json:"productBarcode"`
	ProductID            string                                  `json:"productId"`
	ProductName          string                                  `json:"productName"`
	RouteID              string                                  `json:"routeId"`
	RouteStepID          string                                  `json:"routeStepId"`
	CurrentProcessStepID string                                  `json:"currentProcessStepId"`
	CurrentProcessStep   *ProductBarcodeStateProcessStepResponse `json:"currentProcessStep,omitempty"`
	Status               string                                  `json:"status"`
	LastEventID          string                                  `json:"lastEventId"`
	StartedAt            string                                  `json:"startedAt"`
	CompletedAt          string                                  `json:"completedAt"`
	UpdatedAt            string                                  `json:"updatedAt"`
	Events               []ProductBarcodeStateEventResponse      `json:"events"`
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

func SaveProductBarcodeState(req SaveProductBarcodeStateRequest) (ProductBarcodeStateResponse, error) {
	return defaultProductBarcodeStateService.SaveProductBarcodeState(req)
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

func (s *ProductBarcodeStateService) SaveProductBarcodeState(req SaveProductBarcodeStateRequest) (ProductBarcodeStateResponse, error) {
	normalizedReq := normalizeSaveProductBarcodeStateRequest(req)
	if err := validateSaveProductBarcodeStateRequest(s.txManager.DB(), normalizedReq); err != nil {
		return ProductBarcodeStateResponse{}, err
	}

	var response ProductBarcodeStateResponse
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		state, exists, err := findProductBarcodeStateTx(tx, normalizedReq.ProductBarcode)
		if err != nil {
			return err
		}

		now := time.Now().UTC()
		previousProcessStepID := strings.TrimSpace(state.CurrentProcessStepID)
		applyProductBarcodeStateRequest(&state, normalizedReq, now)
		if !exists {
			state.BaseModel = models.BaseModel{ID: uuid.NewString()}
			if err := tx.Create(&state).Error; err != nil {
				return fmt.Errorf("failed to create product barcode state: %w", err)
			}
		} else if err := tx.Save(&state).Error; err != nil {
			return fmt.Errorf("failed to update product barcode state: %w", err)
		}

		event := models.ProductBarcodeStateEvent{
			BaseModel:         models.BaseModel{ID: uuid.NewString()},
			StateID:           state.ID,
			ProductBarcode:    state.ProductBarcode,
			EventType:         resolveProductBarcodeStateEventType(!exists, previousProcessStepID, normalizedReq),
			FromProcessStepID: previousProcessStepID,
			ToProcessStepID:   state.CurrentProcessStepID,
			RouteID:           state.RouteID,
			RouteStepID:       state.RouteStepID,
			Operator:          resolveProductBarcodeStateOperator(normalizedReq.Operator),
			PayloadSnapshot:   buildProductBarcodeStateEventSnapshot(normalizedReq),
			OccurredAt:        &now,
		}
		if err := tx.Create(&event).Error; err != nil {
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

func normalizeSaveProductBarcodeStateRequest(input SaveProductBarcodeStateRequest) SaveProductBarcodeStateRequest {
	status := strings.ToUpper(strings.TrimSpace(input.Status))
	if status == "" {
		status = ProductBarcodeStateStatusNotStarted
	}

	return SaveProductBarcodeStateRequest{
		ProductBarcode: normalizeProductBarcodeValue(input.ProductBarcode),
		ProductID:      strings.TrimSpace(input.ProductID),
		ProductName:    strings.TrimSpace(input.ProductName),
		RouteID:        strings.TrimSpace(input.RouteID),
		RouteStepID:    strings.TrimSpace(input.RouteStepID),
		ProcessStepID:  strings.TrimSpace(input.ProcessStepID),
		Status:         status,
		Operator:       strings.TrimSpace(input.Operator),
		IP:             strings.TrimSpace(input.IP),
	}
}

func validateSaveProductBarcodeStateRequest(tx *gorm.DB, req SaveProductBarcodeStateRequest) error {
	if req.ProductBarcode == "" {
		return fmt.Errorf("%w: productBarcode is required", ErrInvalidProductBarcodeState)
	}
	if len(req.ProductBarcode) > 120 {
		return fmt.Errorf("%w: productBarcode cannot exceed 120 characters", ErrInvalidProductBarcodeState)
	}
	if !isSupportedProductBarcodeStateStatus(req.Status) {
		return fmt.Errorf("%w: unsupported status %s", ErrInvalidProductBarcodeState, req.Status)
	}
	if req.Status != ProductBarcodeStateStatusNotStarted && req.ProcessStepID == "" {
		return fmt.Errorf("%w: processStepId is required once the barcode enters execution", ErrInvalidProductBarcodeState)
	}
	if req.ProcessStepID != "" {
		if err := ensureProductionRecordExists(tx, &models.ProcessStep{}, req.ProcessStepID, "processStepId"); err != nil {
			return err
		}
	}
	if req.RouteStepID != "" {
		if err := ensureProductionRecordExists(tx, &models.ProductionRouteStep{}, req.RouteStepID, "routeStepId"); err != nil {
			return err
		}
	}
	if req.RouteID != "" {
		if err := ensureProductionRecordExists(tx, &models.ProductionRoute{}, req.RouteID, "routeId"); err != nil {
			return err
		}
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

func applyProductBarcodeStateRequest(state *models.ProductBarcodeState, req SaveProductBarcodeStateRequest, now time.Time) {
	state.ProductBarcode = req.ProductBarcode
	state.ProductID = req.ProductID
	state.ProductName = req.ProductName
	state.RouteID = req.RouteID
	state.RouteStepID = req.RouteStepID
	state.CurrentProcessStepID = req.ProcessStepID
	state.Status = req.Status

	if req.Status == ProductBarcodeStateStatusInProgress && state.StartedAt == nil {
		state.StartedAt = &now
	}
	if req.Status == ProductBarcodeStateStatusCompleted {
		state.CompletedAt = &now
	} else {
		state.CompletedAt = nil
	}
}

func resolveProductBarcodeStateEventType(isNew bool, previousProcessStepID string, req SaveProductBarcodeStateRequest) string {
	if isNew {
		return ProductBarcodeStateEventInitialized
	}
	if previousProcessStepID != "" && previousProcessStepID != req.ProcessStepID {
		return ProductBarcodeStateEventTransfer
	}

	switch req.Status {
	case ProductBarcodeStateStatusInProgress:
		return ProductBarcodeStateEventStart
	case ProductBarcodeStateStatusCompleted:
		return ProductBarcodeStateEventComplete
	case ProductBarcodeStateStatusHold:
		return ProductBarcodeStateEventHold
	case ProductBarcodeStateStatusRework:
		return ProductBarcodeStateEventRework
	default:
		return ProductBarcodeStateEventStateSet
	}
}

func resolveProductBarcodeStateOperator(operator string) string {
	if strings.TrimSpace(operator) == "" {
		return "system"
	}
	return strings.TrimSpace(operator)
}

func buildProductBarcodeStateEventSnapshot(req SaveProductBarcodeStateRequest) string {
	payload, err := json.Marshal(map[string]string{
		"productBarcode": req.ProductBarcode,
		"productId":      req.ProductID,
		"productName":    req.ProductName,
		"routeId":        req.RouteID,
		"routeStepId":    req.RouteStepID,
		"processStepId":  req.ProcessStepID,
		"status":         req.Status,
		"operator":       resolveProductBarcodeStateOperator(req.Operator),
	})
	if err != nil {
		return "{}"
	}
	return string(payload)
}

func loadProductBarcodeStateWithEvents(tx *gorm.DB, productBarcode string) (models.ProductBarcodeState, []models.ProductBarcodeStateEvent, error) {
	var state models.ProductBarcodeState
	if err := tx.
		Preload("CurrentProcessStep").
		Where("product_barcode = ?", productBarcode).
		First(&state).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.ProductBarcodeState{}, nil, ErrProductBarcodeStateNotFound
		}
		return models.ProductBarcodeState{}, nil, fmt.Errorf("failed to load product barcode state: %w", err)
	}

	var events []models.ProductBarcodeStateEvent
	if err := tx.
		Where("state_id = ?", state.ID).
		Order("occurred_at DESC, created_at DESC, id DESC").
		Limit(productBarcodeStateEventLimit).
		Find(&events).Error; err != nil {
		return models.ProductBarcodeState{}, nil, fmt.Errorf("failed to load product barcode state events: %w", err)
	}
	return state, events, nil
}

func mapProductBarcodeStateToResponse(state models.ProductBarcodeState, events []models.ProductBarcodeStateEvent) ProductBarcodeStateResponse {
	return ProductBarcodeStateResponse{
		ID:                   strings.TrimSpace(state.ID),
		ProductBarcode:       strings.TrimSpace(state.ProductBarcode),
		ProductID:            strings.TrimSpace(state.ProductID),
		ProductName:          strings.TrimSpace(state.ProductName),
		RouteID:              strings.TrimSpace(state.RouteID),
		RouteStepID:          strings.TrimSpace(state.RouteStepID),
		CurrentProcessStepID: strings.TrimSpace(state.CurrentProcessStepID),
		CurrentProcessStep:   mapProductBarcodeStateProcessStep(state.CurrentProcessStep),
		Status:               strings.TrimSpace(state.Status),
		LastEventID:          strings.TrimSpace(state.LastEventID),
		StartedAt:            formatProductBarcodeStateTime(state.StartedAt),
		CompletedAt:          formatProductBarcodeStateTime(state.CompletedAt),
		UpdatedAt:            state.UpdatedAt.UTC().Format(time.RFC3339),
		Events:               mapProductBarcodeStateEventsToResponse(events),
	}
}

func mapProductBarcodeStateProcessStep(step *models.ProcessStep) *ProductBarcodeStateProcessStepResponse {
	if step == nil || strings.TrimSpace(step.ID) == "" {
		return nil
	}
	return &ProductBarcodeStateProcessStepResponse{
		ID:   strings.TrimSpace(step.ID),
		Code: strings.TrimSpace(step.Code),
		Name: strings.TrimSpace(step.Name),
	}
}

func mapProductBarcodeStateEventsToResponse(events []models.ProductBarcodeStateEvent) []ProductBarcodeStateEventResponse {
	result := make([]ProductBarcodeStateEventResponse, 0, len(events))
	for _, event := range events {
		result = append(result, ProductBarcodeStateEventResponse{
			ID:                strings.TrimSpace(event.ID),
			StateID:           strings.TrimSpace(event.StateID),
			ProductBarcode:    strings.TrimSpace(event.ProductBarcode),
			EventType:         strings.TrimSpace(event.EventType),
			FromProcessStepID: strings.TrimSpace(event.FromProcessStepID),
			ToProcessStepID:   strings.TrimSpace(event.ToProcessStepID),
			RouteID:           strings.TrimSpace(event.RouteID),
			RouteStepID:       strings.TrimSpace(event.RouteStepID),
			Operator:          strings.TrimSpace(event.Operator),
			PayloadSnapshot:   strings.TrimSpace(event.PayloadSnapshot),
			OccurredAt:        formatProductBarcodeStateTime(event.OccurredAt),
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
