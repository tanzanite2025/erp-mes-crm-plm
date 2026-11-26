package services

import (
	"context"
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

var (
	ErrInvalidProductionScanCommand        = errors.New("invalid production scan command")
	ErrProductionScanRoutePositionConflict = errors.New("production scan route position conflict")
)

type ExecuteProductionScanCommandRequest struct {
	IdempotencyKey           string `json:"idempotencyKey"`
	ExecutionRound           int64  `json:"executionRound,omitempty"`
	ProductBarcode           string `json:"productBarcode"`
	RouteID                  string `json:"-"`
	RouteStepID              string `json:"-"`
	ProcessStepID            string `json:"-"`
	ProductionWorkLocationID string `json:"productionWorkLocationId"`
	TargetRouteStepID        string `json:"targetRouteStepId"`
	ExecutionMode            string `json:"executionMode"`
	PartnerID                string `json:"partnerId"`
	Action                   string `json:"action"`
	Result                   string `json:"result"`
	Notes                    string `json:"notes"`
	CommandSource            string `json:"commandSource"`
	FromHolderType           string `json:"fromHolderType"`
	FromHolderID             string `json:"fromHolderId"`
	ToHolderType             string `json:"toHolderType"`
	ToHolderID               string `json:"toHolderId"`
	ActorID                  string `json:"-"`
	Operator                 string `json:"-"`
	IP                       string `json:"-"`
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

func ExecuteProductionScanCommandWithContext(ctx context.Context, req ExecuteProductionScanCommandRequest) (ExecuteProductionScanCommandResponse, error) {
	return defaultProductionScanCommandService.ExecuteProductionScanCommandWithContext(ctx, req)
}

func (s *ProductionScanCommandService) ExecuteProductionScanCommand(req ExecuteProductionScanCommandRequest) (ExecuteProductionScanCommandResponse, error) {
	return s.ExecuteProductionScanCommandWithContext(context.Background(), req)
}

func (s *ProductionScanCommandService) ExecuteProductionScanCommandWithContext(ctx context.Context, req ExecuteProductionScanCommandRequest) (ExecuteProductionScanCommandResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	normalized := normalizeExecuteProductionScanCommandRequest(req)
	if err := validateProductionScanCommandShell(normalized); err != nil {
		return ExecuteProductionScanCommandResponse{}, err
	}

	var result productionScanCommandTxResult
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var err error
		result, err = executeProductionScanCommandTx(ctx, tx, normalized)
		return err
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

func executeProductionScanCommandTx(ctx context.Context, tx *gorm.DB, normalized ExecuteProductionScanCommandRequest) (productionScanCommandTxResult, error) {
	return executeProductionCommandWithRequestReplayTx(tx, "SCAN_COMMAND", normalized.IdempotencyKey, normalized,
		func() (productionScanCommandTxResult, error) {
			if err := lockProductionBarcodeExecutionTransaction(tx, normalized.ProductBarcode); err != nil {
				return productionScanCommandTxResult{}, err
			}
			return executeProductionScanCommandWithoutRequestReplayTx(ctx, tx, normalized)
		})
}

func executeProductionScanCommandWithoutRequestReplayTx(ctx context.Context, tx *gorm.DB, normalized ExecuteProductionScanCommandRequest) (productionScanCommandTxResult, error) {
	resolved, err := resolveProductionScanCommandContextTx(tx, normalized)
	if err != nil {
		return productionScanCommandTxResult{}, err
	}
	if err := validateRecordProductionOperationExecutionRequest(tx, resolved.Request); err != nil {
		return productionScanCommandTxResult{}, err
	}
	if resolved.Request.Action == ProductionOperationActionStart && resolved.RouteStep != nil {
		if err := validateProductionScanRoutePositionTx(tx, resolved.InitialState, resolved.StateExists, *resolved.RouteStep); err != nil {
			return productionScanCommandTxResult{}, err
		}
	}

	recordResult, err := recordProductionOperationExecutionTx(ctx, tx, resolved.Request)
	if err != nil {
		return productionScanCommandTxResult{}, err
	}

	progress := initialProductionScanProgress(recordResult.Operation, resolved.RouteStep)
	transferEvents := make([]models.ProductBarcodeTransferEvent, 0)
	if recordResult.Replayed && recordResult.Operation.ScanCommandEffectsApplied {
		loadedState, events, err := loadProductBarcodeStateWithEvents(tx, normalized.ProductBarcode)
		if err != nil {
			return productionScanCommandTxResult{}, err
		}
		if err := tx.Where("operation_id = ?", recordResult.Operation.ID).
			Order("created_at ASC, id ASC").
			Find(&transferEvents).Error; err != nil {
			return productionScanCommandTxResult{}, fmt.Errorf("failed to load applied production scan transfer events: %w", err)
		}
		progress.CurrentRouteStepID = loadedState.RouteStepID
		progress.CurrentProcessStepID = loadedState.CurrentProcessStepID
		for _, transferEvent := range transferEvents {
			if transferEvent.TransferType != ProductBarcodeTransferTypeRouteAdvance {
				continue
			}
			progress.Advanced = true
			progress.NextRouteStepID = transferEvent.ToRouteStepID
			progress.NextProcessStepID = transferEvent.ToProcessStepID
			var nextRouteStep models.ProductionRouteStep
			if err := tx.Unscoped().Select("transfer_required").Where("id = ?", transferEvent.ToRouteStepID).First(&nextRouteStep).Error; err == nil {
				progress.NextTransferRequired = nextRouteStep.TransferRequired
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return productionScanCommandTxResult{}, fmt.Errorf("failed to restore production scan next route step: %w", err)
			}
		}
		progress.RouteCompleted = normalized.Action == ProductionOperationActionComplete &&
			recordResult.Operation.RouteID != "" &&
			recordResult.Operation.RouteStepID != "" &&
			!progress.Advanced
		return productionScanCommandTxResult{
			CommandSource: normalized.CommandSource, RecordResult: recordResult,
			StateResponse: mapProductBarcodeStateToResponse(loadedState, events),
			Progress:      progress, TransferEvents: transferEvents,
			Message: buildProductionScanCommandMessage(progress, recordResult.Operation),
		}, nil
	}
	if normalized.Action != ProductionOperationActionStart && resolved.RouteStep != nil {
		if err := validateProductionScanRoutePositionTx(tx, resolved.InitialState, resolved.StateExists, *resolved.RouteStep); err != nil {
			return productionScanCommandTxResult{}, err
		}
	}
	if shouldAdvanceProductionScanRoute(normalized) && recordResult.Operation.RouteID != "" && recordResult.Operation.RouteStepID != "" {
		progressedState, routeProgress, routeTransferEvent, hasRouteTransfer, err := advanceProductionScanRouteTx(tx, normalized, recordResult)
		if err != nil {
			return productionScanCommandTxResult{}, err
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
			return productionScanCommandTxResult{}, err
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
		return productionScanCommandTxResult{}, err
	}
	if err := recordProductionScanCommandAuditTx(tx, normalized, recordResult, progress, transferEvents); err != nil {
		return productionScanCommandTxResult{}, err
	}
	if err := tx.Model(&models.ProductionOperationExecution{}).
		Where("id = ?", recordResult.Operation.ID).
		UpdateColumn("scan_command_effects_applied", true).Error; err != nil {
		return productionScanCommandTxResult{}, err
	}

	loadedState, events, err := loadProductBarcodeStateWithEvents(tx, recordResult.State.ProductBarcode)
	if err != nil {
		return productionScanCommandTxResult{}, err
	}

	return productionScanCommandTxResult{
		CommandSource:  normalized.CommandSource,
		RecordResult:   recordResult,
		StateResponse:  mapProductBarcodeStateToResponse(loadedState, events),
		Progress:       progress,
		TransferEvents: transferEvents,
		Message:        buildProductionScanCommandMessage(progress, recordResult.Operation),
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
		IdempotencyKey:           strings.TrimSpace(input.IdempotencyKey),
		ExecutionRound:           input.ExecutionRound,
		ProductBarcode:           normalizeProductBarcodeValue(input.ProductBarcode),
		ProductionWorkLocationID: normalizeProductionExecutionUUIDIdentity(input.ProductionWorkLocationID),
		TargetRouteStepID:        normalizeProductionExecutionUUIDIdentity(input.TargetRouteStepID),
		ExecutionMode:            strings.ToUpper(strings.TrimSpace(input.ExecutionMode)),
		PartnerID:                normalizeProductionExecutionUUIDIdentity(input.PartnerID),
		Action:                   action,
		Result:                   strings.TrimSpace(input.Result),
		Notes:                    strings.TrimSpace(input.Notes),
		CommandSource:            commandSource,
		FromHolderType:           strings.ToUpper(strings.TrimSpace(input.FromHolderType)),
		FromHolderID:             strings.TrimSpace(input.FromHolderID),
		ToHolderType:             strings.ToUpper(strings.TrimSpace(input.ToHolderType)),
		ToHolderID:               strings.TrimSpace(input.ToHolderID),
		ActorID:                  strings.TrimSpace(input.ActorID),
		Operator:                 strings.TrimSpace(input.Operator),
		IP:                       strings.TrimSpace(input.IP),
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
	lot, plan, err := resolveProductionPlanForExecutionLotTx(tx, req.ProductBarcode)
	if err != nil {
		return productionScanCommandResolvedContext{}, err
	}
	if stateProductID := strings.TrimSpace(state.ProductID); stateProductID != "" && stateProductID != strings.TrimSpace(plan.ProductID) {
		return productionScanCommandResolvedContext{}, fmt.Errorf("%w: barcode product does not match its production plan", ErrInvalidProductionScanCommand)
	}
	route, firstStep, err := resolveUniquePublishedProductionRouteForPlanTx(tx, plan)
	if err != nil {
		return productionScanCommandResolvedContext{}, err
	}
	if stateRouteID := strings.TrimSpace(state.RouteID); stateRouteID != "" && stateRouteID != route.ID {
		return productionScanCommandResolvedContext{}, fmt.Errorf("%w: barcode route does not match its production plan", ErrInvalidProductionScanCommand)
	}

	executionReq := RecordProductionOperationExecutionRequest{
		IdempotencyKey:           req.IdempotencyKey,
		ExecutionRound:           req.ExecutionRound,
		ProductBarcode:           req.ProductBarcode,
		ExecutionLotID:           lot.ID,
		RouteID:                  route.ID,
		ProductionWorkLocationID: req.ProductionWorkLocationID,
		ExecutionMode:            req.ExecutionMode,
		PartnerID:                req.PartnerID,
		Action:                   req.Action,
		Result:                   req.Result,
		Notes:                    req.Notes,
		Operator:                 req.Operator,
	}
	if strings.TrimSpace(state.RouteID) == "" {
		if executionReq.Action != ProductionOperationActionStart {
			return productionScanCommandResolvedContext{}, fmt.Errorf("%w: a barcode without a route position must start from its production plan", ErrInvalidProductionScanCommand)
		}
		executionReq.RouteStepID = firstStep.ID
		executionReq.ProcessStepID = firstStep.ProcessStepID
	} else {
		if strings.TrimSpace(state.RouteStepID) == "" {
			return productionScanCommandResolvedContext{}, fmt.Errorf("%w: barcode has no current route step", ErrInvalidProductionScanCommand)
		}
		loadedStep, err := loadProductionRouteStepTx(tx, state.RouteStepID)
		if err != nil {
			return productionScanCommandResolvedContext{}, err
		}
		if loadedStep.RouteID != route.ID {
			return productionScanCommandResolvedContext{}, fmt.Errorf("%w: barcode route step does not belong to its production plan route", ErrInvalidProductionScanCommand)
		}
		if currentOperationID := strings.TrimSpace(state.CurrentProcessStepID); currentOperationID != "" && currentOperationID != strings.TrimSpace(loadedStep.ProcessStepID) {
			return productionScanCommandResolvedContext{}, fmt.Errorf("%w: barcode operation does not match its current route step", ErrInvalidProductionScanCommand)
		}
		executionReq.RouteStepID = loadedStep.ID
		executionReq.ProcessStepID = strings.TrimSpace(loadedStep.ProcessStepID)
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
		loadedProcessStepID := strings.TrimSpace(loadedStep.ProcessStepID)
		if executionReq.ProcessStepID != "" && loadedProcessStepID != executionReq.ProcessStepID {
			return productionScanCommandResolvedContext{}, fmt.Errorf("%w: routeStepId does not match processStepId", ErrInvalidProductionScanCommand)
		}
		executionReq.RouteID = loadedStep.RouteID
		executionReq.ProcessStepID = loadedProcessStepID
		routeStep = &loadedStep
	} else if executionReq.RouteID != "" && executionReq.ProcessStepID == "" {
		if executionReq.Action != ProductionOperationActionStart {
			return productionScanCommandResolvedContext{}, fmt.Errorf("%w: current route step is required for action %s", ErrInvalidProductionScanCommand, executionReq.Action)
		}
		loadedStep, found, err := findFirstProductionRouteStepTx(tx, executionReq.RouteID)
		if err != nil {
			return productionScanCommandResolvedContext{}, err
		}
		if !found {
			return productionScanCommandResolvedContext{}, fmt.Errorf("%w: route has no executable steps", ErrInvalidProductionScanCommand)
		}
		executionReq.RouteStepID = loadedStep.ID
		executionReq.ProcessStepID = strings.TrimSpace(loadedStep.ProcessStepID)
		routeStep = &loadedStep
	} else if executionReq.RouteID != "" && executionReq.ProcessStepID != "" {
		loadedStep, found, err := findUniqueProductionRouteStepByProcessStepTx(tx, executionReq.RouteID, executionReq.ProcessStepID)
		if err != nil {
			return productionScanCommandResolvedContext{}, err
		}
		if found {
			executionReq.RouteStepID = loadedStep.ID
			routeStep = &loadedStep
		}
	}

	if executionReq.RouteID == "" || executionReq.RouteStepID == "" {
		return productionScanCommandResolvedContext{}, fmt.Errorf("%w: routeId and routeStepId are required", ErrInvalidProductionScanCommand)
	}
	routePublished, err := productionRouteIsPublishedTx(tx, executionReq.RouteID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return productionScanCommandResolvedContext{}, fmt.Errorf("%w: routeId does not exist", ErrInvalidProductionScanCommand)
		}
		return productionScanCommandResolvedContext{}, fmt.Errorf("%w: failed to validate routeId: %v", ErrInvalidProductionScanCommand, err)
	}
	if !routePublished {
		return productionScanCommandResolvedContext{}, fmt.Errorf("%w: production route must be PUBLISHED before execution", ErrInvalidProductionScanCommand)
	}
	if executionReq.ProcessStepID == "" {
		return productionScanCommandResolvedContext{}, fmt.Errorf("%w: processStepId is required", ErrInvalidProductionScanCommand)
	}
	if routeStep == nil || routeStep.ProcessStep == nil || !routeStep.ProcessStep.IsActive {
		return productionScanCommandResolvedContext{}, fmt.Errorf("%w: route step processStepId is missing or inactive", ErrInvalidProductionScanCommand)
	}
	if executionReq.ProductionWorkLocationID == "" {
		return productionScanCommandResolvedContext{}, fmt.Errorf("%w: productionWorkLocationId is required", ErrInvalidProductionScanCommand)
	}
	executionReq.ExecutionMode = resolveProductionScanExecutionMode(req.ExecutionMode, req.PartnerID, routeStep)

	return productionScanCommandResolvedContext{
		Request:      normalizeRecordProductionOperationExecutionRequest(executionReq),
		InitialState: state,
		StateExists:  exists,
		RouteStep:    routeStep,
	}, nil
}

func validateProductionScanRoutePositionTx(
	tx *gorm.DB,
	state models.ProductBarcodeState,
	stateExists bool,
	selectedStep models.ProductionRouteStep,
) error {
	if stateExists {
		currentRouteStepID := normalizeProductionExecutionUUIDIdentity(state.RouteStepID)
		if currentRouteStepID != "" {
			selectedRouteStepID := normalizeProductionExecutionUUIDIdentity(selectedStep.ID)
			if currentRouteStepID != selectedRouteStepID {
				return fmt.Errorf("%w: selected route step does not match the barcode's current route position", ErrProductionScanRoutePositionConflict)
			}
			return nil
		}

		currentProcessStepID := normalizeProductionExecutionUUIDIdentity(state.CurrentProcessStepID)
		if currentProcessStepID != "" {
			selectedProcessStepID := normalizeProductionExecutionUUIDIdentity(selectedStep.ProcessStepID)
			if currentProcessStepID != selectedProcessStepID {
				return fmt.Errorf("%w: selected branch operation does not match the barcode's current production position", ErrProductionScanRoutePositionConflict)
			}
			return nil
		}
	}

	firstStep, found, err := findFirstProductionRouteStepTx(tx, selectedStep.RouteID)
	if err != nil {
		return err
	}
	if !found || normalizeProductionExecutionUUIDIdentity(firstStep.ID) != normalizeProductionExecutionUUIDIdentity(selectedStep.ID) {
		return fmt.Errorf("%w: a barcode without a current route position must start at the first route step", ErrInvalidProductionScanCommand)
	}
	return nil
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

func findUniqueProductionRouteStepByProcessStepTx(tx *gorm.DB, routeID string, processStepID string) (models.ProductionRouteStep, bool, error) {
	var steps []models.ProductionRouteStep
	if err := tx.Preload("ProcessStep").
		Where("route_id = ? AND process_step_id = ?", strings.TrimSpace(routeID), strings.TrimSpace(processStepID)).
		Order("sequence ASC, id ASC").
		Find(&steps).Error; err != nil {
		return models.ProductionRouteStep{}, false, fmt.Errorf("%w: failed to resolve route step by process step: %v", ErrInvalidProductionScanCommand, err)
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

func shouldAdvanceProductionScanRoute(req ExecuteProductionScanCommandRequest) bool {
	if req.Action == ProductionOperationActionComplete {
		return true
	}
	return req.Action == ProductionOperationActionRework && hasProductionScanTargetRoute(req)
}

func hasProductionScanTargetRoute(req ExecuteProductionScanCommandRequest) bool {
	return strings.TrimSpace(req.TargetRouteStepID) != ""
}

func advanceProductionScanRouteTx(
	tx *gorm.DB,
	req ExecuteProductionScanCommandRequest,
	recordResult productionOperationExecutionRecordResult,
) (models.ProductBarcodeState, ProductionScanCommandProgressResponse, models.ProductBarcodeTransferEvent, bool, error) {
	nextStep, found, err := resolveProductionScanRouteTargetStepTx(tx, req, recordResult.Operation)
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

	targetStatus := ProductBarcodeStateStatusNotStarted
	if req.Action == ProductionOperationActionRework {
		targetStatus = ProductBarcodeStateStatusRework
	}
	progressedState, err := advanceProductBarcodeStateToRouteStepTx(tx, recordResult.State, recordResult.Operation, nextStep, req, targetStatus)
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
		ToProcessStepID:   strings.TrimSpace(nextStep.ProcessStepID),
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
		CurrentProcessStepID: strings.TrimSpace(nextStep.ProcessStepID),
		NextRouteStepID:      nextStep.ID,
		NextProcessStepID:    strings.TrimSpace(nextStep.ProcessStepID),
		Advanced:             true,
		NextTransferRequired: nextStep.TransferRequired,
	}, transferEvent, true, nil
}

func resolveProductionScanRouteTargetStepTx(
	tx *gorm.DB,
	req ExecuteProductionScanCommandRequest,
	operation models.ProductionOperationExecution,
) (models.ProductionRouteStep, bool, error) {
	if hasProductionScanTargetRoute(req) {
		return resolveProductionQualityRoutingTargetStepTx(tx, operation.RouteID, productionQualityRoutingTarget{
			TargetRouteStepID: req.TargetRouteStepID,
		})
	}
	return findNextProductionRouteStepTx(tx, operation.RouteID, operation.RouteStepID)
}

func advanceProductBarcodeStateToRouteStepTx(
	tx *gorm.DB,
	state models.ProductBarcodeState,
	operation models.ProductionOperationExecution,
	nextStep models.ProductionRouteStep,
	req ExecuteProductionScanCommandRequest,
	targetStatus string,
) (models.ProductBarcodeState, error) {
	now := time.Now().UTC()
	previousProcessStepID := strings.TrimSpace(state.CurrentProcessStepID)
	stateReq := productBarcodeStateAttributes{
		ProductBarcode: state.ProductBarcode,
		ProductID:      state.ProductID,
		ProductName:    state.ProductName,
		RouteID:        nextStep.RouteID,
		RouteStepID:    nextStep.ID,
		ProcessStepID:  strings.TrimSpace(nextStep.ProcessStepID),
		Status:         targetStatus,
		Operator:       operation.Operator,
	}
	applyProductBarcodeStateAttributes(&state, stateReq, now)
	state.StartedAt = nil
	state.CompletedAt = nil
	if err := saveProductionRecordWithOptionalUUIDs(tx, &state,
		productionOptionalUUIDWrite{Column: "route_id", Value: state.RouteID},
		productionOptionalUUIDWrite{Column: "route_step_id", Value: state.RouteStepID},
		productionOptionalUUIDWrite{Column: "current_process_step_id", Value: state.CurrentProcessStepID},
		productionOptionalUUIDWrite{Column: "last_event_id", Value: state.LastEventID},
	); err != nil {
		return models.ProductBarcodeState{}, fmt.Errorf("failed to advance product barcode state: %w", err)
	}

	stateEvent := models.ProductBarcodeStateEvent{
		BaseModel:         models.BaseModel{ID: uuid.NewString()},
		StateID:           state.ID,
		OperationID:       operation.ID,
		ProductBarcode:    state.ProductBarcode,
		EventType:         ProductBarcodeStateEventTransfer,
		FromProcessStepID: previousProcessStepID,
		ToProcessStepID:   strings.TrimSpace(nextStep.ProcessStepID),
		RouteID:           nextStep.RouteID,
		RouteStepID:       nextStep.ID,
		Operator:          operation.Operator,
		PayloadSnapshot:   buildProductionScanRouteAdvanceSnapshot(operation, nextStep, req),
		OccurredAt:        &now,
	}
	if err := createProductionRecordWithOptionalUUIDs(tx, &stateEvent,
		productionOptionalUUIDWrite{Column: "operation_id", Value: stateEvent.OperationID},
		productionOptionalUUIDWrite{Column: "from_process_step_id", Value: stateEvent.FromProcessStepID},
		productionOptionalUUIDWrite{Column: "to_process_step_id", Value: stateEvent.ToProcessStepID},
		productionOptionalUUIDWrite{Column: "route_id", Value: stateEvent.RouteID},
		productionOptionalUUIDWrite{Column: "route_step_id", Value: stateEvent.RouteStepID},
	); err != nil {
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
	if err := createProductionRecordWithOptionalUUIDs(tx, &event,
		productionOptionalUUIDWrite{Column: "state_id", Value: event.StateID},
		productionOptionalUUIDWrite{Column: "operation_id", Value: event.OperationID},
		productionOptionalUUIDWrite{Column: "route_id", Value: event.RouteID},
		productionOptionalUUIDWrite{Column: "from_route_step_id", Value: event.FromRouteStepID},
		productionOptionalUUIDWrite{Column: "to_route_step_id", Value: event.ToRouteStepID},
		productionOptionalUUIDWrite{Column: "from_process_step_id", Value: event.FromProcessStepID},
		productionOptionalUUIDWrite{Column: "to_process_step_id", Value: event.ToProcessStepID},
		productionOptionalUUIDWrite{Column: "from_holder_id", Value: event.FromHolderID},
		productionOptionalUUIDWrite{Column: "to_holder_id", Value: event.ToHolderID},
	); err != nil {
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
		"toProcessStepId":      strings.TrimSpace(nextStep.ProcessStepID),
		"commandSource":        req.CommandSource,
		"action":               req.Action,
		"targetRouteStepId":    req.TargetRouteStepID,
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
		"submittedByUserId":     recordResult.Operation.SubmittedByUserID,
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
	if req.TargetRouteStepID != "" {
		metadata["targetRouteStepId"] = req.TargetRouteStepID
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
		if operation.Action == ProductionOperationActionRework {
			return "当前工序已标记返工并跳转到目标路线步骤"
		}
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
