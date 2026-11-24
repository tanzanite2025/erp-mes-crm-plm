package services

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	productBarcodeLifecycleHistoryDefaultLimit = 50
	productBarcodeLifecycleHistoryMaximumLimit = 200
)

type ProductBarcodeLifecycleHistoryQuery struct {
	ProductBarcode string
	Limit          int
	Offset         int
}

type ProductBarcodeLifecycleCurrentStateResponse struct {
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
}

type ProductBarcodeLifecycleHistoryResponse struct {
	CurrentState            ProductBarcodeLifecycleCurrentStateResponse `json:"currentState"`
	StateEvents             []ProductBarcodeStateEventResponse          `json:"stateEvents"`
	StateEventTotal         int64                                       `json:"stateEventTotal"`
	OperationExecutions     []ProductionOperationExecutionResponse      `json:"operationExecutions"`
	OperationExecutionTotal int64                                       `json:"operationExecutionTotal"`
	TransferEvents          []ProductBarcodeTransferEventResponse       `json:"transferEvents"`
	TransferEventTotal      int64                                       `json:"transferEventTotal"`
	Limit                   int                                         `json:"limit"`
	Offset                  int                                         `json:"offset"`
}

type ProductBarcodeLifecycleHistoryQueryService struct {
	txManager transactionManager
}

func NewProductBarcodeLifecycleHistoryQueryService(txManager transactionManager) *ProductBarcodeLifecycleHistoryQueryService {
	return &ProductBarcodeLifecycleHistoryQueryService{txManager: txManager}
}

var defaultProductBarcodeLifecycleHistoryQueryService = NewProductBarcodeLifecycleHistoryQueryService(defaultServiceRuntime().txManager)

func GetProductBarcodeLifecycleHistory(query ProductBarcodeLifecycleHistoryQuery) (ProductBarcodeLifecycleHistoryResponse, error) {
	return defaultProductBarcodeLifecycleHistoryQueryService.GetProductBarcodeLifecycleHistory(query)
}

func (service *ProductBarcodeLifecycleHistoryQueryService) GetProductBarcodeLifecycleHistory(
	query ProductBarcodeLifecycleHistoryQuery,
) (ProductBarcodeLifecycleHistoryResponse, error) {
	normalized, err := normalizeProductBarcodeLifecycleHistoryQuery(query)
	if err != nil {
		return ProductBarcodeLifecycleHistoryResponse{}, err
	}

	var response ProductBarcodeLifecycleHistoryResponse
	err = service.txManager.DB().Transaction(func(tx *gorm.DB) error {
		state, err := loadProductBarcodeLifecycleCurrentStateTx(tx, normalized.ProductBarcode)
		if err != nil {
			return err
		}
		response.CurrentState = mapProductBarcodeLifecycleCurrentState(state)

		stateEvents := tx.Model(&models.ProductBarcodeStateEvent{}).
			Where("state_id = ?", state.ID)
		if err := stateEvents.Count(&response.StateEventTotal).Error; err != nil {
			return fmt.Errorf("failed to count product barcode lifecycle state events: %w", err)
		}
		var stateEventRecords []models.ProductBarcodeStateEvent
		if err := orderProductBarcodeLifecycleStateEvents(stateEvents, state.LastEventID).
			Limit(normalized.Limit).
			Offset(normalized.Offset).
			Find(&stateEventRecords).Error; err != nil {
			return fmt.Errorf("failed to load product barcode lifecycle state events: %w", err)
		}
		response.StateEvents = mapProductBarcodeStateEventsToResponse(stateEventRecords)

		operationExecutions := tx.Model(&models.ProductionOperationExecution{}).
			Where("product_barcode = ?", normalized.ProductBarcode)
		if err := operationExecutions.Count(&response.OperationExecutionTotal).Error; err != nil {
			return fmt.Errorf("failed to count product barcode lifecycle operation executions: %w", err)
		}
		var operationExecutionRecords []models.ProductionOperationExecution
		if err := operationExecutions.
			Order("created_at DESC, id DESC").
			Limit(normalized.Limit).
			Offset(normalized.Offset).
			Find(&operationExecutionRecords).Error; err != nil {
			return fmt.Errorf("failed to load product barcode lifecycle operation executions: %w", err)
		}
		response.OperationExecutions = mapProductionOperationExecutionsToResponse(operationExecutionRecords)

		transferEvents := tx.Model(&models.ProductBarcodeTransferEvent{}).
			Where("product_barcode = ?", normalized.ProductBarcode)
		if err := transferEvents.Count(&response.TransferEventTotal).Error; err != nil {
			return fmt.Errorf("failed to count product barcode lifecycle transfer events: %w", err)
		}
		var transferEventRecords []models.ProductBarcodeTransferEvent
		if err := transferEvents.
			Order("occurred_at DESC, created_at DESC, id DESC").
			Limit(normalized.Limit).
			Offset(normalized.Offset).
			Find(&transferEventRecords).Error; err != nil {
			return fmt.Errorf("failed to load product barcode lifecycle transfer events: %w", err)
		}
		response.TransferEvents = mapProductBarcodeTransferEventsToResponse(transferEventRecords)

		response.Limit = normalized.Limit
		response.Offset = normalized.Offset
		return nil
	}, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
	if err != nil {
		return ProductBarcodeLifecycleHistoryResponse{}, err
	}
	return response, nil
}

func normalizeProductBarcodeLifecycleHistoryQuery(
	query ProductBarcodeLifecycleHistoryQuery,
) (ProductBarcodeLifecycleHistoryQuery, error) {
	productBarcode := normalizeProductBarcodeValue(query.ProductBarcode)
	if productBarcode == "" {
		return ProductBarcodeLifecycleHistoryQuery{}, fmt.Errorf("%w: productBarcode is required", ErrInvalidProductBarcodeState)
	}
	if len(productBarcode) > 120 {
		return ProductBarcodeLifecycleHistoryQuery{}, fmt.Errorf("%w: productBarcode cannot exceed 120 characters", ErrInvalidProductBarcodeState)
	}
	if query.Offset < 0 {
		return ProductBarcodeLifecycleHistoryQuery{}, fmt.Errorf("%w: offset cannot be negative", ErrInvalidProductBarcodeState)
	}
	if query.Limit < 0 {
		return ProductBarcodeLifecycleHistoryQuery{}, fmt.Errorf("%w: limit cannot be negative", ErrInvalidProductBarcodeState)
	}
	limit := query.Limit
	if limit <= 0 {
		limit = productBarcodeLifecycleHistoryDefaultLimit
	}
	if limit > productBarcodeLifecycleHistoryMaximumLimit {
		limit = productBarcodeLifecycleHistoryMaximumLimit
	}
	return ProductBarcodeLifecycleHistoryQuery{
		ProductBarcode: productBarcode,
		Limit:          limit,
		Offset:         query.Offset,
	}, nil
}

func loadProductBarcodeLifecycleCurrentStateTx(tx *gorm.DB, productBarcode string) (models.ProductBarcodeState, error) {
	var state models.ProductBarcodeState
	if err := tx.
		Preload("CurrentBranchOperation").
		Where("product_barcode = ?", productBarcode).
		First(&state).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.ProductBarcodeState{}, ErrProductBarcodeStateNotFound
		}
		return models.ProductBarcodeState{}, fmt.Errorf("failed to load product barcode lifecycle current state: %w", err)
	}
	return state, nil
}

func mapProductBarcodeLifecycleCurrentState(state models.ProductBarcodeState) ProductBarcodeLifecycleCurrentStateResponse {
	return ProductBarcodeLifecycleCurrentStateResponse{
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
		UpdatedAt:                formatProductionExecutionLotTime(state.UpdatedAt),
	}
}

func orderProductBarcodeLifecycleStateEvents(query *gorm.DB, lastEventID string) *gorm.DB {
	lastEventID = strings.TrimSpace(lastEventID)
	if lastEventID == "" {
		return query.Order("occurred_at DESC, created_at DESC, id DESC")
	}
	return query.Order(clause.OrderBy{
		Expression: clause.Expr{
			SQL:  "CASE WHEN id = ? THEN 0 ELSE 1 END, occurred_at DESC, created_at DESC, id DESC",
			Vars: []any{lastEventID},
		},
	})
}
