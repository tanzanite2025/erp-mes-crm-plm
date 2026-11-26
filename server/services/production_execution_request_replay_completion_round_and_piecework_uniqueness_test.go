package services

import (
	"strings"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestProductionExecutionCommandRequestReplayRequiresIdempotencyKey(t *testing.T) {
	executed := false
	_, err := executeProductionCommandWithRequestReplayTx(nil, "SCAN_COMMAND", " ", struct{}{}, func() (int, error) {
		executed = true
		return 1, nil
	})
	require.ErrorIs(t, err, ErrInvalidProductionOperationExecution)
	require.False(t, executed)
}

func seedProductionExecutionReplayPricedWork(t *testing.T, database *gorm.DB, barcode string, processes ...string) {
	t.Helper()
	lot := models.ProductionExecutionLot{
		BaseModel: models.BaseModel{ID: "lot-" + barcode}, ProductBarcode: barcode,
		ProductID: "product-replay", ProductName: "Replay product", Quantity: 3,
		Status: ProductionExecutionLotStatusActive,
	}
	if database.Migrator().HasTable(&models.ProductionPlan{}) {
		var plans []models.ProductionPlan
		require.NoError(t, database.Find(&plans).Error)
		if len(plans) == 1 {
			lot.PlanID = plans[0].ID
			lot.ProductID = plans[0].ProductID
			lot.ProductName = plans[0].ProductName
		}
	}
	require.NoError(t, database.Create(&lot).Error)
	start := time.Now().UTC().Add(-time.Hour)
	for _, processID := range processes {
		require.NoError(t, database.Create(&models.PieceworkRate{
			BaseModel: models.BaseModel{ID: "rate-" + processID},
			PayItemID: pieceworkTestPayItemID, PayItemCode: "PAY-001", PayItemName: "Independent payroll item",
			Unit: "PCS", UnitPrice: 2, Currency: "CNY", EffectiveFrom: &start, Status: "active", Version: 1,
		}).Error)
	}
}

func TestProductionExecutionRequestReplayPreservesCompletionAndRequiresReworkForAnotherRound(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationBranch(t, database, "process-replay")
	seedProductionExecutionReplayPricedWork(t, database, "REPLAY-001", "process-replay")
	request := RecordProductionOperationExecutionRequest{
		IdempotencyKey: "original-completion", ProductBarcode: "REPLAY-001",
		ProcessStepID: "process-replay", Action: ProductionOperationActionComplete,
	}
	original, err := service.RecordProductionOperationExecution(request)
	require.NoError(t, err)
	require.Equal(t, int64(1), original.ExecutionRound)
	require.NoError(t, database.Model(&models.PieceworkRate{}).Where("id = ?", "rate-process-replay").Updates(map[string]any{
		"unit_price": 3, "version": 2,
	}).Error)
	replayed, err := service.RecordProductionOperationExecution(request)
	require.NoError(t, err)
	require.Equal(t, original, replayed)
	secondKey := request
	secondKey.IdempotencyKey = "same-round-another-key"
	secondResult, err := service.RecordProductionOperationExecution(secondKey)
	require.NoError(t, err)
	require.Equal(t, original.ID, secondResult.ID)
	conflicting := request
	conflicting.ProcessStepID = "another-process"
	_, err = service.RecordProductionOperationExecution(conflicting)
	require.ErrorIs(t, err, ErrProductionExecutionRequestKeyConflict)
	futureRound := request
	futureRound.IdempotencyKey = "unopened-future-round"
	futureRound.ExecutionRound = 2
	_, err = service.RecordProductionOperationExecution(futureRound)
	require.ErrorIs(t, err, ErrProductionExecutionRoundConflict)
	assertProductionExecutionReplayFactCounts(t, database, 1, 1, 0)

	reworkRequest := request
	reworkRequest.IdempotencyKey = "explicit-rework"
	reworkRequest.Action = ProductionOperationActionRework
	reworkRequest.ExecutionRound = 1
	rework, err := service.RecordProductionOperationExecution(reworkRequest)
	require.NoError(t, err)
	require.Equal(t, int64(2), rework.ExecutionRound)
	reworkReplay, err := service.RecordProductionOperationExecution(reworkRequest)
	require.NoError(t, err)
	require.Equal(t, rework, reworkReplay)
	staleRound := request
	staleRound.IdempotencyKey = "stale-first-round"
	staleRound.ExecutionRound = 1
	_, err = service.RecordProductionOperationExecution(staleRound)
	require.ErrorIs(t, err, ErrProductionExecutionRoundConflict)
	newCompletion := request
	newCompletion.IdempotencyKey = "second-round-completion"
	newCompletion.ExecutionRound = 2
	secondRound, err := service.RecordProductionOperationExecution(newCompletion)
	require.NoError(t, err)
	require.NotEqual(t, original.ID, secondRound.ID)
	require.Equal(t, int64(2), secondRound.ExecutionRound)
	replayed, err = service.RecordProductionOperationExecution(request)
	require.NoError(t, err)
	require.Equal(t, original, replayed)
	assertProductionExecutionReplayFactCounts(t, database, 3, 3, 0)

}

func TestCompletedProductBarcodeRequiresReworkBeforeRestartOrHold(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationBranch(t, database, "process-completed-lifecycle")

	startRequest := RecordProductionOperationExecutionRequest{
		IdempotencyKey: "completed-lifecycle-start",
		ProductBarcode: "COMPLETED-LIFECYCLE-001",
		ProcessStepID:  "process-completed-lifecycle",
		Action:         ProductionOperationActionStart,
		ExecutionRound: 1,
	}
	_, err := service.RecordProductionOperationExecution(startRequest)
	require.NoError(t, err)

	completeRequest := startRequest
	completeRequest.IdempotencyKey = "completed-lifecycle-complete"
	completeRequest.Action = ProductionOperationActionComplete
	completedOperation, err := service.RecordProductionOperationExecution(completeRequest)
	require.NoError(t, err)
	require.Equal(t, int64(1), completedOperation.ExecutionRound)

	for _, action := range []string{ProductionOperationActionStart, ProductionOperationActionHold} {
		request := completeRequest
		request.IdempotencyKey = "completed-lifecycle-after-complete-" + strings.ToLower(action)
		request.Action = action
		_, err := service.RecordProductionOperationExecution(request)
		require.ErrorIs(t, err, ErrProductBarcodeExecutionLifecycleConflict)
	}

	state, events, err := loadProductBarcodeStateWithEvents(database, "COMPLETED-LIFECYCLE-001")
	require.NoError(t, err)
	require.Equal(t, ProductBarcodeStateStatusCompleted, state.Status)
	require.Len(t, events, 2)
	assertProductionExecutionReplayFactCounts(t, database, 2, 2, 0)

	reworkRequest := completeRequest
	reworkRequest.IdempotencyKey = "completed-lifecycle-rework"
	reworkRequest.Action = ProductionOperationActionRework
	rework, err := service.RecordProductionOperationExecution(reworkRequest)
	require.NoError(t, err)
	require.Equal(t, int64(2), rework.ExecutionRound)

	startRequest.IdempotencyKey = "completed-lifecycle-restart-after-rework"
	startRequest.ExecutionRound = 2
	started, err := service.RecordProductionOperationExecution(startRequest)
	require.NoError(t, err)
	require.Equal(t, ProductBarcodeStateStatusInProgress, started.Status)
	require.Equal(t, int64(2), started.ExecutionRound)

	completeRequest.IdempotencyKey = "completed-lifecycle-complete-after-rework"
	completeRequest.ExecutionRound = 2
	completedAgain, err := service.RecordProductionOperationExecution(completeRequest)
	require.NoError(t, err)
	require.Equal(t, ProductBarcodeStateStatusCompleted, completedAgain.Status)
	require.Equal(t, int64(2), completedAgain.ExecutionRound)
	assertProductionExecutionReplayFactCounts(t, database, 5, 5, 0)
}

func TestProductionExecutionFailedRequestDoesNotReserveRequestKey(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationBranch(t, database, "process-failed-request")
	seedProductionExecutionReplayPricedWork(t, database, "FAILED-REQUEST-002", "process-failed-request")
	request := RecordProductionOperationExecutionRequest{
		IdempotencyKey: "initial-valid-completion",
		ProductBarcode: "FAILED-REQUEST-002", ProcessStepID: "process-failed-request", Action: ProductionOperationActionComplete,
	}
	original, err := service.RecordProductionOperationExecution(request)
	require.NoError(t, err)
	replayed, err := service.RecordProductionOperationExecution(request)
	require.NoError(t, err)
	require.Equal(t, original, replayed)
	assertProductionExecutionReplayFactCounts(t, database, 1, 1, 0)
	failedRequest := request
	failedRequest.IdempotencyKey = "failed-then-corrected-command"
	failedRequest.ProcessStepID = "missing-process"
	_, err = service.RecordProductionOperationExecution(failedRequest)
	require.ErrorIs(t, err, ErrInvalidProductionOperationExecution)
	var receiptCount int64
	require.NoError(t, database.Model(&models.ProductionExecutionCommandRequestReceipt{}).Count(&receiptCount).Error)
	require.EqualValues(t, 1, receiptCount)
	failedRequest.ProcessStepID = "process-failed-request"
	replayed, err = service.RecordProductionOperationExecution(failedRequest)
	require.NoError(t, err)
	require.Equal(t, original.ID, replayed.ID)
}

func TestProductionExecutionDistinctRouteStepsSharingProcessHaveIndependentCompletions(t *testing.T) {
	_, database := newProductionScanCommandTestService(t)
	steps := seedProductionScanRoute(t, database, "route-shared-process", "process-shared", "process-placeholder")
	require.NoError(t, database.Model(&models.ProductionRouteStep{}).Where("id = ?", steps[1]).Update("process_step_id", "process-shared").Error)
	seedProductionExecutionReplayPricedWork(t, database, "SHARED-PROCESS-001", "process-shared")
	service := NewProductionOperationExecutionService(productionOperationExecutionTestTxManager{db: database})
	request := RecordProductionOperationExecutionRequest{
		ProductBarcode: "SHARED-PROCESS-001", RouteID: "route-shared-process", ProcessStepID: "process-shared",
		ProductionWorkLocationID: productionOperationExecutionTestWorkLocationID, Action: ProductionOperationActionComplete,
	}
	completedIDs := make([]string, 0, len(steps))
	for _, stepID := range steps {
		request.RouteStepID = stepID
		request.IdempotencyKey = "shared-process-step-" + stepID
		completion, err := service.RecordProductionOperationExecution(request)
		require.NoError(t, err)
		require.Equal(t, int64(1), completion.ExecutionRound)
		completedIDs = append(completedIDs, completion.ID)
	}
	require.NotEqual(t, completedIDs[0], completedIDs[1])
	for index, stepID := range steps {
		request.RouteStepID = stepID
		request.IdempotencyKey = "shared-process-step-" + stepID
		replay, err := service.RecordProductionOperationExecution(request)
		require.NoError(t, err)
		require.Equal(t, completedIDs[index], replay.ID)
	}
	assertProductionExecutionReplayFactCounts(t, database, 2, 2, 0)
}

func TestProductionScanRequestReplayDoesNotAdvanceAnotherStepOrCreateWages(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	steps := seedProductionScanRoute(t, database, "route-replay", "process-a", "process-b", "process-c")
	seedProductionExecutionReplayPricedWork(t, database, "REPLAY-SCAN-001", "process-a", "process-b", "process-c")
	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-start", ProductBarcode: "REPLAY-SCAN-001", RouteID: "route-replay", Action: ProductionOperationActionStart,
	})
	require.NoError(t, err)
	request := ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-complete-first-step", ProductBarcode: "REPLAY-SCAN-001", Action: ProductionOperationActionComplete,
	}
	original, err := service.ExecuteProductionScanCommand(request)
	require.NoError(t, err)
	require.Equal(t, steps[1], original.State.RouteStepID)
	replayed, err := service.ExecuteProductionScanCommand(request)
	require.NoError(t, err)
	require.Equal(t, original, replayed)
	assertProductionExecutionReplayFactCounts(t, database, 2, 3, 0)
	assertProductionScanReplaySideEffectCounts(t, database, 1, 2)

	secondRequest := request
	secondRequest.IdempotencyKey = "scan-complete-second-step"
	second, err := service.ExecuteProductionScanCommand(secondRequest)
	require.NoError(t, err)
	require.Equal(t, steps[2], second.State.RouteStepID)
	replayed, err = service.ExecuteProductionScanCommand(request)
	require.NoError(t, err)
	require.Equal(t, original, replayed)
	state, _, err := loadProductBarcodeStateWithEvents(database, request.ProductBarcode)
	require.NoError(t, err)
	require.Equal(t, steps[2], state.RouteStepID)
	assertProductionScanReplaySideEffectCounts(t, database, 2, 3)
	request.Notes = "different command using the same key"
	_, err = service.ExecuteProductionScanCommand(request)
	require.ErrorIs(t, err, ErrProductionExecutionRequestKeyConflict)
	assertProductionExecutionReplayFactCounts(t, database, 3, 5, 0)

	reworkRequest := ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-rework", ProductBarcode: request.ProductBarcode, Action: ProductionOperationActionRework,
		TargetRouteStepID: steps[0],
	}
	rework, err := service.ExecuteProductionScanCommand(reworkRequest)
	require.NoError(t, err)
	require.Equal(t, int64(2), rework.Operation.ExecutionRound)
	secondRound, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-complete-rework", ProductBarcode: request.ProductBarcode, Action: ProductionOperationActionComplete,
	})
	require.NoError(t, err)
	require.Equal(t, steps[0], secondRound.Operation.RouteStepID)
	require.Equal(t, int64(2), secondRound.Operation.ExecutionRound)
	reworkReplay, err := service.ExecuteProductionScanCommand(reworkRequest)
	require.NoError(t, err)
	require.Equal(t, rework, reworkReplay)
	assertProductionExecutionReplayFactCounts(t, database, 5, 9, 0)
	assertProductionScanReplaySideEffectCounts(t, database, 4, 5)
}

func assertProductionExecutionReplayFactCounts(t *testing.T, database *gorm.DB, operations, events, pieceworkRecords int64) {
	t.Helper()
	for _, expected := range []struct {
		model any
		count int64
	}{{&models.ProductionOperationExecution{}, operations}, {&models.ProductBarcodeStateEvent{}, events}} {
		var count int64
		require.NoError(t, database.Model(expected.model).Count(&count).Error)
		require.Equal(t, expected.count, count, "%T", expected.model)
	}
	var historicalPayrollRows int64
	require.NoError(t, database.Table("piecework_records").Count(&historicalPayrollRows).Error)
	require.Equal(t, pieceworkRecords, historicalPayrollRows)
}

func TestProductionScanCompletionAppliesRouteEffectsOnceWithoutCreatingWages(t *testing.T) {
	scanService, database := newProductionScanCommandTestService(t)
	steps := seedProductionScanRoute(t, database, "route-cross-entry", "process-cross-a", "process-cross-b")
	seedProductionExecutionReplayPricedWork(t, database, "CROSS-ENTRY-001", "process-cross-a", "process-cross-b")
	_, err := scanService.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-cross-entry-start", ProductBarcode: "CROSS-ENTRY-001", Action: ProductionOperationActionStart,
	})
	require.NoError(t, err)
	completionRequest := ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-cross-entry-complete", ProductBarcode: "CROSS-ENTRY-001", Action: ProductionOperationActionComplete,
	}
	firstScan, err := scanService.ExecuteProductionScanCommand(completionRequest)
	require.NoError(t, err)
	require.Equal(t, steps[0], firstScan.Operation.RouteStepID)
	require.Equal(t, steps[1], firstScan.State.RouteStepID)
	require.True(t, firstScan.Progress.Advanced)
	repeatScan, err := scanService.ExecuteProductionScanCommand(completionRequest)
	require.NoError(t, err)
	require.Equal(t, firstScan.Operation.ID, repeatScan.Operation.ID)
	require.Equal(t, steps[1], repeatScan.State.RouteStepID)
	require.True(t, repeatScan.Progress.Advanced)
	require.Len(t, repeatScan.TransferEvents, 1)
	require.Equal(t, firstScan.TransferEvents[0].ID, repeatScan.TransferEvents[0].ID)
	assertProductionExecutionReplayFactCounts(t, database, 2, 3, 0)
	assertProductionScanReplaySideEffectCounts(t, database, 1, 2)
}

func assertProductionScanReplaySideEffectCounts(t *testing.T, database *gorm.DB, transfers, audits int64) {
	t.Helper()
	var transferCount, auditCount int64
	require.NoError(t, database.Model(&models.ProductBarcodeTransferEvent{}).Count(&transferCount).Error)
	require.NoError(t, database.Model(&models.AuditLog{}).Where("module = ?", AuditModuleProductionOperation).Count(&auditCount).Error)
	require.Equal(t, transfers, transferCount)
	require.Equal(t, audits, auditCount)
}
