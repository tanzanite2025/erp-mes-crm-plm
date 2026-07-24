package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	ProductionScanCommandSourceWeb = "WEB"
	ProductionScanCommandSourcePDA = "PDA"
	ProductionScanCommandSourceUSB = "USB"
)

const (
	ProductBarcodeTransferTypeRouteAdvance    = "ROUTE_ADVANCE"
	ProductBarcodeTransferTypeCustodyTransfer = "CUSTODY_TRANSFER"
)

var ErrInvalidProductionScanCommand = errors.New("invalid production scan command")

type ExecuteProductionScanCommandRequest struct {
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
	CommandSource  string `json:"commandSource"`
	FromHolderType string `json:"fromHolderType"`
	FromHolderID   string `json:"fromHolderId"`
	ToHolderType   string `json:"toHolderType"`
	ToHolderID     string `json:"toHolderId"`
	ActorID        string `json:"-"`
	Operator       string `json:"-"`
	IP             string `json:"-"`
}

type ProductionScanCommandProgressResponse struct {
	ExecutedRouteStepID   string `json:"executedRouteStepId"`
	ExecutedProcessStepID string `json:"executedProcessStepId"`
	CurrentRouteStepID    string `json:"currentRouteStepId"`
	CurrentProcessStepID  string `json:"currentProcessStepId"`
	NextRouteStepID       string `json:"nextRouteStepId"`
	NextProcessStepID     string `json:"nextProcessStepId"`
	Advanced              bool   `json:"advanced"`
	RouteCompleted        bool   `json:"routeCompleted"`
	TransferRequired      bool   `json:"transferRequired"`
	NextTransferRequired  bool   `json:"nextTransferRequired"`
}

type ProductBarcodeTransferEventResponse struct {
	ID                string `json:"id"`
	ProductBarcode    string `json:"productBarcode"`
	StateID           string `json:"stateId"`
	OperationID       string `json:"operationId"`
	TransferType      string `json:"transferType"`
	RouteID           string `json:"routeId"`
	FromRouteStepID   string `json:"fromRouteStepId"`
	ToRouteStepID     string `json:"toRouteStepId"`
	FromProcessStepID string `json:"fromProcessStepId"`
	ToProcessStepID   string `json:"toProcessStepId"`
	FromHolderType    string `json:"fromHolderType"`
	FromHolderID      string `json:"fromHolderId"`
	ToHolderType      string `json:"toHolderType"`
	ToHolderID        string `json:"toHolderId"`
	Operator          string `json:"operator"`
	PayloadSnapshot   string `json:"payloadSnapshot"`
	OccurredAt        string `json:"occurredAt"`
}

type ExecuteProductionScanCommandResponse struct {
	CommandSource  string                                `json:"commandSource"`
	Operation      ProductionOperationExecutionResponse  `json:"operation"`
	State          ProductBarcodeStateResponse           `json:"state"`
	Progress       ProductionScanCommandProgressResponse `json:"progress"`
	TransferEvents []ProductBarcodeTransferEventResponse `json:"transferEvents"`
	Message        string                                `json:"message"`
}

type ProductionScanCommandService struct {
	txManager transactionManager
}

type productionScanCommandResolvedContext struct {
	Request      RecordProductionOperationExecutionRequest
	InitialState models.ProductBarcodeState
	StateExists  bool
	RouteStep    *models.ProductionRouteStep
}

type productionScanCommandTxResult struct {
	CommandSource  string
	RecordResult   productionOperationExecutionRecordResult
	StateResponse  ProductBarcodeStateResponse
	Progress       ProductionScanCommandProgressResponse
	TransferEvents []models.ProductBarcodeTransferEvent
	Message        string
}

func NewProductionScanCommandService(txManager transactionManager) *ProductionScanCommandService {
	return &ProductionScanCommandService{txManager: txManager}
}

var defaultProductionScanCommandService = NewProductionScanCommandService(defaultServiceRuntime().txManager)

func ExecuteProductionScanCommand(req ExecuteProductionScanCommandRequest) (ExecuteProductionScanCommandResponse, error) {
	return defaultProductionScanCommandService.ExecuteProductionScanCommand(req)
}

func (s *ProductionScanCommandService) ExecuteProductionScanCommand(req ExecuteProductionScanCommandRequest) (ExecuteProductionScanCommandResponse, error) {
	normalized := normalizeExecuteProductionScanCommandRequest(req)
	if err := validateProductionScanCommandShell(normalized); err != nil {
		return ExecuteProductionScanCommandResponse{}, err
	}

	var result productionScanCommandTxResult
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		resolved, err := resolveProductionScanCommandContextTx(tx, normalized)
		if err != nil {
			return err
		}
		if err := validateRecordProductionOperationExecutionRequest(tx, resolved.Request); err != nil {
			return err
		}

		recordResult, err := recordProductionOperationExecutionTx(tx, resolved.Request)
		if err != nil {
			return err
		}

		progress := initialProductionScanProgress(recordResult.Operation, resolved.RouteStep)
		transferEvents := make([]models.ProductBarcodeTransferEvent, 0)
		if normalized.Action == ProductionOperationActionComplete && recordResult.Operation.RouteID != "" && recordResult.Operation.RouteStepID != "" {
			progressedState, routeProgress, routeTransferEvent, hasRouteTransfer, err := advanceProductionScanRouteTx(tx, normalized, recordResult)
			if err != nil {
				return err
			}
			recordResult.State = progressedState
			progress = mergeProductionScanProgress(progress, routeProgress)
			if hasRouteTransfer {
				transferEvents = append(transferEvents, routeTransferEvent)
			}
		}

		if shouldRecordProductionScanCustodyTransfer(normalized) {
			custodyEvent, err := recordProductBarcodeTransferEventTx(tx, ProductBarcodeTransferEventWriteRequest{
				ProductBarcode:    recordResult.Operation.ProductBarcode,
				StateID:           recordResult.State.ID,
				OperationID:       recordResult.Operation.ID,
				TransferType:      ProductBarcodeTransferTypeCustodyTransfer,
				RouteID:           recordResult.State.RouteID,
				FromRouteStepID:   recordResult.Operation.RouteStepID,
				ToRouteStepID:     recordResult.State.RouteStepID,
				FromProcessStepID: recordResult.Operation.ProcessStepID,
				ToProcessStepID:   recordResult.State.CurrentProcessStepID,
				FromHolderType:    normalized.FromHolderType,
				FromHolderID:      normalized.FromHolderID,
				ToHolderType:      normalized.ToHolderType,
				ToHolderID:        normalized.ToHolderID,
				Operator:          recordResult.Operation.Operator,
				CommandSource:     normalized.CommandSource,
				Action:            normalized.Action,
			})
			if err != nil {
				return err
			}
			transferEvents = append(transferEvents, custodyEvent)
		}

		if err := DispatchProductionOperationStatusChangedTx(
			tx,
			recordResult.Operation,
			resolved.InitialState.Status,
			recordResult.Operation.Status,
			normalized.ActorID,
			recordResult.Operation.Operator,
		); err != nil {
			return err
		}
		if err := recordProductionScanCommandAuditTx(tx, normalized, recordResult, progress, transferEvents); err != nil {
			return err
		}

		loadedState, events, err := loadProductBarcodeStateWithEvents(tx, recordResult.State.ProductBarcode)
		if err != nil {
			return err
		}

		result = productionScanCommandTxResult{
			CommandSource:  normalized.CommandSource,
			RecordResult:   recordResult,
			StateResponse:  mapProductBarcodeStateToResponse(loadedState, events),
			Progress:       progress,
			TransferEvents: transferEvents,
			Message:        buildProductionScanCommandMessage(progress, recordResult.Operation),
		}
		return nil
	})
	if err != nil {
		return ExecuteProductionScanCommandResponse{}, normalizeProductionScanCommandError(err)
	}

	return ExecuteProductionScanCommandResponse{
		CommandSource:  result.CommandSource,
		Operation:      mapProductionOperationExecutionToResponse(result.RecordResult.Operation),
		State:          result.StateResponse,
		Progress:       result.Progress,
		TransferEvents: mapProductBarcodeTransferEventsToResponse(result.TransferEvents),
		Message:        result.Message,
	}, nil
}

func normalizeExecuteProductionScanCommandRequest(input ExecuteProductionScanCommandRequest) ExecuteProductionScanCommandRequest {
	action := strings.ToUpper(strings.TrimSpace(input.Action))
	if action == "" {
		action = ProductionOperationActionStart
	}
	commandSource := strings.ToUpper(strings.TrimSpace(input.CommandSource))
	if commandSource == "" {
		commandSource = ProductionScanCommandSourceWeb
	}

	return ExecuteProductionScanCommandRequest{
		ProductBarcode: normalizeProductBarcodeValue(input.ProductBarcode),
		ExecutionLotID: strings.TrimSpace(input.ExecutionLotID),
		RouteID:        strings.TrimSpace(input.RouteID),
		RouteStepID:    strings.TrimSpace(input.RouteStepID),
		ProcessStepID:  strings.TrimSpace(input.ProcessStepID),
		ExecutionMode:  strings.ToUpper(strings.TrimSpace(input.ExecutionMode)),
		PartnerID:      strings.TrimSpace(input.PartnerID),
		Action:         action,
		Result:         strings.TrimSpace(input.Result),
		Notes:          strings.TrimSpace(input.Notes),
		CommandSource:  commandSource,
		FromHolderType: strings.ToUpper(strings.TrimSpace(input.FromHolderType)),
		FromHolderID:   strings.TrimSpace(input.FromHolderID),
		ToHolderType:   strings.ToUpper(strings.TrimSpace(input.ToHolderType)),
		ToHolderID:     strings.TrimSpace(input.ToHolderID),
		ActorID:        strings.TrimSpace(input.ActorID),
		Operator:       strings.TrimSpace(input.Operator),
		IP:             strings.TrimSpace(input.IP),
	}
}

func validateProductionScanCommandShell(req ExecuteProductionScanCommandRequest) error {
	if req.ProductBarcode == "" {
		return fmt.Errorf("%w: productBarcode is required", ErrInvalidProductionScanCommand)
	}
	if !isSupportedProductionOperationAction(req.Action) {
		return fmt.Errorf("%w: unsupported action %s", ErrInvalidProductionScanCommand, req.Action)
	}
	switch req.CommandSource {
	case ProductionScanCommandSourceWeb, ProductionScanCommandSourcePDA, ProductionScanCommandSourceUSB:
		return nil
	default:
		return fmt.Errorf("%w: unsupported commandSource %s", ErrInvalidProductionScanCommand, req.CommandSource)
	}
}

func resolveProductionScanCommandContextTx(tx *gorm.DB, req ExecuteProductionScanCommandRequest) (productionScanCommandResolvedContext, error) {
	state, exists, err := findProductBarcodeStateTx(tx, req.ProductBarcode)
	if err != nil {
		return productionScanCommandResolvedContext{}, err
	}
	if !exists {
		state = models.ProductBarcodeState{
			ProductBarcode: req.ProductBarcode,
			Status:         ProductBarcodeStateStatusNotStarted,
		}
	}

	executionReq := RecordProductionOperationExecutionRequest{
		ProductBarcode: req.ProductBarcode,
		ExecutionLotID: req.ExecutionLotID,
		RouteID:        firstNonEmpty(req.RouteID, state.RouteID),
		RouteStepID:    firstNonEmpty(req.RouteStepID, state.RouteStepID),
		ProcessStepID:  firstNonEmpty(req.ProcessStepID, state.CurrentProcessStepID),
		ExecutionMode:  req.ExecutionMode,
		PartnerID:      req.PartnerID,
		Action:         req.Action,
		Result:         req.Result,
		Notes:          req.Notes,
		Operator:       req.Operator,
	}

	var routeStep *models.ProductionRouteStep
	if executionReq.RouteStepID != "" {
		loadedStep, err := loadProductionRouteStepTx(tx, executionReq.RouteStepID)
		if err != nil {
			return productionScanCommandResolvedContext{}, err
		}
		if executionReq.RouteID != "" && loadedStep.RouteID != executionReq.RouteID {
			return productionScanCommandResolvedContext{}, fmt.Errorf("%w: routeStepId does not belong to routeId", ErrInvalidProductionScanCommand)
		}
		if executionReq.ProcessStepID != "" && loadedStep.ProcessStepID != executionReq.ProcessStepID {
			return productionScanCommandResolvedContext{}, fmt.Errorf("%w: routeStepId does not match processStepId", ErrInvalidProductionScanCommand)
		}
		executionReq.RouteID = loadedStep.RouteID
		executionReq.ProcessStepID = loadedStep.ProcessStepID
		routeStep = &loadedStep
	} else if executionReq.RouteID != "" && executionReq.ProcessStepID == "" {
		if executionReq.Action != ProductionOperationActionStart {
			return productionScanCommandResolvedContext{}, fmt.Errorf("%w: current process is required for action %s", ErrInvalidProductionScanCommand, executionReq.Action)
		}
		loadedStep, found, err := findFirstProductionRouteStepTx(tx, executionReq.RouteID)
		if err != nil {
			return productionScanCommandResolvedContext{}, err
		}
		if !found {
			return productionScanCommandResolvedContext{}, fmt.Errorf("%w: route has no executable steps", ErrInvalidProductionScanCommand)
		}
		executionReq.RouteStepID = loadedStep.ID
		executionReq.ProcessStepID = loadedStep.ProcessStepID
		routeStep = &loadedStep
	} else if executionReq.RouteID != "" && executionReq.ProcessStepID != "" {
		loadedStep, found, err := findUniqueProductionRouteStepByProcessTx(tx, executionReq.RouteID, executionReq.ProcessStepID)
		if err != nil {
			return productionScanCommandResolvedContext{}, err
		}
		if found {
			executionReq.RouteStepID = loadedStep.ID
			routeStep = &loadedStep
		}
	}

	if executionReq.ProcessStepID == "" {
		return productionScanCommandResolvedContext{}, fmt.Errorf("%w: processStepId is required when barcode has no current process", ErrInvalidProductionScanCommand)
	}
	executionReq.ExecutionMode = resolveProductionScanExecutionMode(req.ExecutionMode, req.PartnerID, routeStep)

	return productionScanCommandResolvedContext{
		Request:      normalizeRecordProductionOperationExecutionRequest(executionReq),
		InitialState: state,
		StateExists:  exists,
		RouteStep:    routeStep,
	}, nil
}

func resolveProductionScanExecutionMode(requested string, partnerID string, routeStep *models.ProductionRouteStep) string {
	normalized := strings.ToUpper(strings.TrimSpace(requested))
	if normalized != "" {
		return normalized
	}
	if strings.TrimSpace(partnerID) != "" {
		return ProductionOperationExecutionModeOutsource
	}
	if routeStep == nil {
		return ProductionOperationExecutionModeInHouse
	}
	switch strings.ToUpper(strings.TrimSpace(routeStep.ExecutionMode)) {
	case "OUTSOURCE_REQUIRED":
		return ProductionOperationExecutionModeOutsource
	default:
		return ProductionOperationExecutionModeInHouse
	}
}

func loadProductionRouteStepTx(tx *gorm.DB, routeStepID string) (models.ProductionRouteStep, error) {
	var step models.ProductionRouteStep
	err := tx.Preload("ProcessStep").Where("id = ?", strings.TrimSpace(routeStepID)).First(&step).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.ProductionRouteStep{}, fmt.Errorf("%w: routeStepId does not exist", ErrInvalidProductionScanCommand)
	}
	if err != nil {
		return models.ProductionRouteStep{}, fmt.Errorf("%w: failed to load routeStepId: %v", ErrInvalidProductionScanCommand, err)
	}
	return step, nil
}

func findFirstProductionRouteStepTx(tx *gorm.DB, routeID string) (models.ProductionRouteStep, bool, error) {
	var step models.ProductionRouteStep
	err := tx.Preload("ProcessStep").
		Where("route_id = ?", strings.TrimSpace(routeID)).
		Order("sequence ASC, id ASC").
		First(&step).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.ProductionRouteStep{}, false, nil
	}
	if err != nil {
		return models.ProductionRouteStep{}, false, fmt.Errorf("%w: failed to load first route step: %v", ErrInvalidProductionScanCommand, err)
	}
	return step, true, nil
}

func findUniqueProductionRouteStepByProcessTx(tx *gorm.DB, routeID string, processStepID string) (models.ProductionRouteStep, bool, error) {
	var steps []models.ProductionRouteStep
	if err := tx.Preload("ProcessStep").
		Where("route_id = ? AND process_step_id = ?", strings.TrimSpace(routeID), strings.TrimSpace(processStepID)).
		Order("sequence ASC, id ASC").
		Find(&steps).Error; err != nil {
		return models.ProductionRouteStep{}, false, fmt.Errorf("%w: failed to resolve route step by process: %v", ErrInvalidProductionScanCommand, err)
	}
	if len(steps) == 0 {
		return models.ProductionRouteStep{}, false, nil
	}
	if len(steps) > 1 {
		return models.ProductionRouteStep{}, false, fmt.Errorf("%w: routeId + processStepId matches multiple route steps; routeStepId is required", ErrInvalidProductionScanCommand)
	}
	return steps[0], true, nil
}

func findNextProductionRouteStepTx(tx *gorm.DB, routeID string, currentRouteStepID string) (models.ProductionRouteStep, bool, error) {
	current, err := loadProductionRouteStepTx(tx, currentRouteStepID)
	if err != nil {
		return models.ProductionRouteStep{}, false, err
	}
	if current.RouteID != strings.TrimSpace(routeID) {
		return models.ProductionRouteStep{}, false, fmt.Errorf("%w: current route step does not belong to route", ErrInvalidProductionScanCommand)
	}

	var next models.ProductionRouteStep
	err = tx.Preload("ProcessStep").
		Where("route_id = ? AND sequence > ?", strings.TrimSpace(routeID), current.Sequence).
		Order("sequence ASC, id ASC").
		First(&next).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.ProductionRouteStep{}, false, nil
	}
	if err != nil {
		return models.ProductionRouteStep{}, false, fmt.Errorf("%w: failed to load next route step: %v", ErrInvalidProductionScanCommand, err)
	}
	return next, true, nil
}

func initialProductionScanProgress(operation models.ProductionOperationExecution, routeStep *models.ProductionRouteStep) ProductionScanCommandProgressResponse {
	progress := ProductionScanCommandProgressResponse{
		ExecutedRouteStepID:   strings.TrimSpace(operation.RouteStepID),
		ExecutedProcessStepID: strings.TrimSpace(operation.ProcessStepID),
		CurrentRouteStepID:    strings.TrimSpace(operation.RouteStepID),
		CurrentProcessStepID:  strings.TrimSpace(operation.ProcessStepID),
	}
	if routeStep != nil {
		progress.TransferRequired = routeStep.TransferRequired
	}
	return progress
}

func mergeProductionScanProgress(base ProductionScanCommandProgressResponse, next ProductionScanCommandProgressResponse) ProductionScanCommandProgressResponse {
	if next.CurrentRouteStepID != "" {
		base.CurrentRouteStepID = next.CurrentRouteStepID
	}
	if next.CurrentProcessStepID != "" {
		base.CurrentProcessStepID = next.CurrentProcessStepID
	}
	base.NextRouteStepID = next.NextRouteStepID
	base.NextProcessStepID = next.NextProcessStepID
	base.Advanced = next.Advanced
	base.RouteCompleted = next.RouteCompleted
	base.NextTransferRequired = next.NextTransferRequired
	return base
}

func advanceProductionScanRouteTx(
	tx *gorm.DB,
	req ExecuteProductionScanCommandRequest,
	recordResult productionOperationExecutionRecordResult,
) (models.ProductBarcodeState, ProductionScanCommandProgressResponse, models.ProductBarcodeTransferEvent, bool, error) {
	nextStep, found, err := findNextProductionRouteStepTx(tx, recordResult.Operation.RouteID, recordResult.Operation.RouteStepID)
	if err != nil {
		return models.ProductBarcodeState{}, ProductionScanCommandProgressResponse{}, models.ProductBarcodeTransferEvent{}, false, err
	}
	if !found {
		return recordResult.State, ProductionScanCommandProgressResponse{
			CurrentRouteStepID:   recordResult.Operation.RouteStepID,
			CurrentProcessStepID: recordResult.Operation.ProcessStepID,
			RouteCompleted:       true,
		}, models.ProductBarcodeTransferEvent{}, false, nil
	}

	progressedState, err := advanceProductBarcodeStateToNextRouteStepTx(tx, recordResult.State, recordResult.Operation, nextStep, req)
	if err != nil {
		return models.ProductBarcodeState{}, ProductionScanCommandProgressResponse{}, models.ProductBarcodeTransferEvent{}, false, err
	}
	transferEvent, err := recordProductBarcodeTransferEventTx(tx, ProductBarcodeTransferEventWriteRequest{
		ProductBarcode:    recordResult.Operation.ProductBarcode,
		StateID:           progressedState.ID,
		OperationID:       recordResult.Operation.ID,
		TransferType:      ProductBarcodeTransferTypeRouteAdvance,
		RouteID:           nextStep.RouteID,
		FromRouteStepID:   recordResult.Operation.RouteStepID,
		ToRouteStepID:     nextStep.ID,
		FromProcessStepID: recordResult.Operation.ProcessStepID,
		ToProcessStepID:   nextStep.ProcessStepID,
		FromHolderType:    req.FromHolderType,
		FromHolderID:      req.FromHolderID,
		ToHolderType:      req.ToHolderType,
		ToHolderID:        req.ToHolderID,
		Operator:          recordResult.Operation.Operator,
		CommandSource:     req.CommandSource,
		Action:            req.Action,
	})
	if err != nil {
		return models.ProductBarcodeState{}, ProductionScanCommandProgressResponse{}, models.ProductBarcodeTransferEvent{}, false, err
	}

	return progressedState, ProductionScanCommandProgressResponse{
		CurrentRouteStepID:   nextStep.ID,
		CurrentProcessStepID: nextStep.ProcessStepID,
		NextRouteStepID:      nextStep.ID,
		NextProcessStepID:    nextStep.ProcessStepID,
		Advanced:             true,
		NextTransferRequired: nextStep.TransferRequired,
	}, transferEvent, true, nil
}

func advanceProductBarcodeStateToNextRouteStepTx(
	tx *gorm.DB,
	state models.ProductBarcodeState,
	operation models.ProductionOperationExecution,
	nextStep models.ProductionRouteStep,
	req ExecuteProductionScanCommandRequest,
) (models.ProductBarcodeState, error) {
	now := time.Now().UTC()
	previousProcessStepID := strings.TrimSpace(state.CurrentProcessStepID)
	stateReq := SaveProductBarcodeStateRequest{
		ProductBarcode: state.ProductBarcode,
		ProductID:      state.ProductID,
		ProductName:    state.ProductName,
		RouteID:        nextStep.RouteID,
		RouteStepID:    nextStep.ID,
		ProcessStepID:  nextStep.ProcessStepID,
		Status:         ProductBarcodeStateStatusNotStarted,
		Operator:       operation.Operator,
	}
	applyProductBarcodeStateRequest(&state, stateReq, now)
	state.StartedAt = nil
	state.CompletedAt = nil
	if err := tx.Save(&state).Error; err != nil {
		return models.ProductBarcodeState{}, fmt.Errorf("failed to advance product barcode state: %w", err)
	}

	stateEvent := models.ProductBarcodeStateEvent{
		BaseModel:         models.BaseModel{ID: uuid.NewString()},
		StateID:           state.ID,
		ProductBarcode:    state.ProductBarcode,
		EventType:         ProductBarcodeStateEventTransfer,
		FromProcessStepID: previousProcessStepID,
		ToProcessStepID:   nextStep.ProcessStepID,
		RouteID:           nextStep.RouteID,
		RouteStepID:       nextStep.ID,
		Operator:          operation.Operator,
		PayloadSnapshot:   buildProductionScanRouteAdvanceSnapshot(operation, nextStep, req),
		OccurredAt:        &now,
	}
	if err := tx.Create(&stateEvent).Error; err != nil {
		return models.ProductBarcodeState{}, fmt.Errorf("failed to create route advance state event: %w", err)
	}
	if err := tx.Model(&models.ProductBarcodeState{}).
		Where("id = ?", state.ID).
		Update("last_event_id", stateEvent.ID).Error; err != nil {
		return models.ProductBarcodeState{}, fmt.Errorf("failed to update product barcode last event: %w", err)
	}
	state.LastEventID = stateEvent.ID
	return state, nil
}

type ProductBarcodeTransferEventWriteRequest struct {
	ProductBarcode    string
	StateID           string
	OperationID       string
	TransferType      string
	RouteID           string
	FromRouteStepID   string
	ToRouteStepID     string
	FromProcessStepID string
	ToProcessStepID   string
	FromHolderType    string
	FromHolderID      string
	ToHolderType      string
	ToHolderID        string
	Operator          string
	CommandSource     string
	Action            string
}

func recordProductBarcodeTransferEventTx(tx *gorm.DB, req ProductBarcodeTransferEventWriteRequest) (models.ProductBarcodeTransferEvent, error) {
	now := time.Now().UTC()
	event := models.ProductBarcodeTransferEvent{
		BaseModel:         models.BaseModel{ID: uuid.NewString()},
		ProductBarcode:    normalizeProductBarcodeValue(req.ProductBarcode),
		StateID:           strings.TrimSpace(req.StateID),
		OperationID:       strings.TrimSpace(req.OperationID),
		TransferType:      strings.ToUpper(strings.TrimSpace(req.TransferType)),
		RouteID:           strings.TrimSpace(req.RouteID),
		FromRouteStepID:   strings.TrimSpace(req.FromRouteStepID),
		ToRouteStepID:     strings.TrimSpace(req.ToRouteStepID),
		FromProcessStepID: strings.TrimSpace(req.FromProcessStepID),
		ToProcessStepID:   strings.TrimSpace(req.ToProcessStepID),
		FromHolderType:    strings.ToUpper(strings.TrimSpace(req.FromHolderType)),
		FromHolderID:      strings.TrimSpace(req.FromHolderID),
		ToHolderType:      strings.ToUpper(strings.TrimSpace(req.ToHolderType)),
		ToHolderID:        strings.TrimSpace(req.ToHolderID),
		Operator:          resolveProductBarcodeStateOperator(req.Operator),
		PayloadSnapshot:   buildProductBarcodeTransferSnapshot(req),
		OccurredAt:        &now,
	}
	if event.ProductBarcode == "" {
		return models.ProductBarcodeTransferEvent{}, fmt.Errorf("%w: productBarcode is required for transfer event", ErrInvalidProductionScanCommand)
	}
	if event.TransferType == "" {
		return models.ProductBarcodeTransferEvent{}, fmt.Errorf("%w: transferType is required", ErrInvalidProductionScanCommand)
	}
	if err := tx.Create(&event).Error; err != nil {
		return models.ProductBarcodeTransferEvent{}, fmt.Errorf("failed to create product barcode transfer event: %w", err)
	}
	return event, nil
}

func shouldRecordProductionScanCustodyTransfer(req ExecuteProductionScanCommandRequest) bool {
	return req.FromHolderType != "" || req.FromHolderID != "" || req.ToHolderType != "" || req.ToHolderID != ""
}

func buildProductionScanRouteAdvanceSnapshot(operation models.ProductionOperationExecution, nextStep models.ProductionRouteStep, req ExecuteProductionScanCommandRequest) string {
	payload, err := json.Marshal(map[string]string{
		"operationExecutionId": operation.ID,
		"productBarcode":       operation.ProductBarcode,
		"routeId":              nextStep.RouteID,
		"fromRouteStepId":      operation.RouteStepID,
		"toRouteStepId":        nextStep.ID,
		"fromProcessStepId":    operation.ProcessStepID,
		"toProcessStepId":      nextStep.ProcessStepID,
		"commandSource":        req.CommandSource,
		"action":               req.Action,
	})
	if err != nil {
		return "{}"
	}
	return string(payload)
}

func buildProductBarcodeTransferSnapshot(req ProductBarcodeTransferEventWriteRequest) string {
	payload, err := json.Marshal(map[string]string{
		"operationExecutionId": req.OperationID,
		"productBarcode":       req.ProductBarcode,
		"transferType":         req.TransferType,
		"routeId":              req.RouteID,
		"fromRouteStepId":      req.FromRouteStepID,
		"toRouteStepId":        req.ToRouteStepID,
		"fromProcessStepId":    req.FromProcessStepID,
		"toProcessStepId":      req.ToProcessStepID,
		"fromHolderType":       req.FromHolderType,
		"fromHolderId":         req.FromHolderID,
		"toHolderType":         req.ToHolderType,
		"toHolderId":           req.ToHolderID,
		"commandSource":        req.CommandSource,
		"action":               req.Action,
	})
	if err != nil {
		return "{}"
	}
	return string(payload)
}

func recordProductionScanCommandAuditTx(
	tx *gorm.DB,
	req ExecuteProductionScanCommandRequest,
	recordResult productionOperationExecutionRecordResult,
	progress ProductionScanCommandProgressResponse,
	transferEvents []models.ProductBarcodeTransferEvent,
) error {
	metadata := map[string]string{
		"productBarcode":        recordResult.Operation.ProductBarcode,
		"action":                recordResult.Operation.Action,
		"status":                recordResult.Operation.Status,
		"barcodeStateStatus":    recordResult.State.Status,
		"routeId":               recordResult.State.RouteID,
		"executedRouteStepId":   progress.ExecutedRouteStepID,
		"executedProcessStepId": progress.ExecutedProcessStepID,
		"currentRouteStepId":    progress.CurrentRouteStepID,
		"currentProcessStepId":  progress.CurrentProcessStepID,
		"advanced":              fmt.Sprintf("%t", progress.Advanced),
		"routeCompleted":        fmt.Sprintf("%t", progress.RouteCompleted),
		"commandSource":         req.CommandSource,
	}
	if len(transferEvents) > 0 {
		ids := make([]string, 0, len(transferEvents))
		for _, event := range transferEvents {
			ids = append(ids, event.ID)
		}
		metadata["transferEventIds"] = strings.Join(ids, ",")
	}

	event := audit.NewAuditEvent(
		audit.AuditEntityProductionOperation,
		recordResult.Operation.ID,
		audit.AuditActionCreate,
		audit.AuditActor{
			UserID:   strings.TrimSpace(req.ActorID),
			Username: strings.TrimSpace(req.Operator),
			IP:       strings.TrimSpace(req.IP),
			Source:   strings.ToLower(strings.TrimSpace(req.CommandSource)),
		},
	)
	for key, value := range metadata {
		event = event.WithMetadata(key, value)
	}
	return recordAuditEventTx(tx, event.Normalize())
}

func buildProductionScanCommandMessage(progress ProductionScanCommandProgressResponse, operation models.ProductionOperationExecution) string {
	if progress.RouteCompleted {
		return "当前路线已完成"
	}
	if progress.Advanced {
		return "已完成当前工序并推进到下一路线步骤"
	}
	switch operation.Action {
	case ProductionOperationActionStart:
		return "已开始当前工序"
	case ProductionOperationActionHold:
		return "当前工序已挂起"
	case ProductionOperationActionRework:
		return "当前工序已标记返工"
	default:
		return "扫码执行已记录"
	}
}

func normalizeProductionScanCommandError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, ErrInvalidProductionScanCommand) {
		return err
	}
	if errors.Is(err, ErrInvalidProductionOperationExecution) {
		return fmt.Errorf("%w: %v", ErrInvalidProductionScanCommand, err)
	}
	return err
}

func mapProductBarcodeTransferEventsToResponse(items []models.ProductBarcodeTransferEvent) []ProductBarcodeTransferEventResponse {
	result := make([]ProductBarcodeTransferEventResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapProductBarcodeTransferEventToResponse(item))
	}
	return result
}

func mapProductBarcodeTransferEventToResponse(item models.ProductBarcodeTransferEvent) ProductBarcodeTransferEventResponse {
	return ProductBarcodeTransferEventResponse{
		ID:                strings.TrimSpace(item.ID),
		ProductBarcode:    strings.TrimSpace(item.ProductBarcode),
		StateID:           strings.TrimSpace(item.StateID),
		OperationID:       strings.TrimSpace(item.OperationID),
		TransferType:      strings.TrimSpace(item.TransferType),
		RouteID:           strings.TrimSpace(item.RouteID),
		FromRouteStepID:   strings.TrimSpace(item.FromRouteStepID),
		ToRouteStepID:     strings.TrimSpace(item.ToRouteStepID),
		FromProcessStepID: strings.TrimSpace(item.FromProcessStepID),
		ToProcessStepID:   strings.TrimSpace(item.ToProcessStepID),
		FromHolderType:    strings.TrimSpace(item.FromHolderType),
		FromHolderID:      strings.TrimSpace(item.FromHolderID),
		ToHolderType:      strings.TrimSpace(item.ToHolderType),
		ToHolderID:        strings.TrimSpace(item.ToHolderID),
		Operator:          strings.TrimSpace(item.Operator),
		PayloadSnapshot:   strings.TrimSpace(item.PayloadSnapshot),
		OccurredAt:        formatProductBarcodeStateTime(item.OccurredAt),
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
