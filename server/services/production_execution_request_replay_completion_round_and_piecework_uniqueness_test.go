package services

import (
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func seedProductionExecutionReplayPricedWork(t *testing.T, database *gorm.DB, barcode string, processes ...string) {
	t.Helper()
	require.NoError(t, database.Omit("plan_id", "task_id").Create(&models.ProductionExecutionLot{
		BaseModel: models.BaseModel{ID: "lot-" + barcode}, ProductBarcode: barcode,
		ProductID: "product-replay", ProductName: "Replay product", Quantity: 3,
	}).Error)
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
	seedProductionOperationProcess(t, database, "process-replay")
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

func TestProductionExecutionLegacyCompletionRetryReusesSourceAndFailedRequestDoesNotReserveKey(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationProcess(t, database, "process-legacy-replay")
	seedProductionExecutionReplayPricedWork(t, database, "REPLAY-002", "process-legacy-replay")
	request := RecordProductionOperationExecutionRequest{
		ProductBarcode: "REPLAY-002", ProcessStepID: "process-legacy-replay", Action: ProductionOperationActionComplete,
	}
	original, err := service.RecordProductionOperationExecution(request)
	require.NoError(t, err)
	replayed, err := service.RecordProductionOperationExecution(request)
	require.NoError(t, err)
	require.Equal(t, original.ID, replayed.ID)
	assertProductionExecutionReplayFactCounts(t, database, 1, 1, 0)
	request.IdempotencyKey = "failed-then-corrected-command"
	request.ProcessStepID = "missing-process"
	_, err = service.RecordProductionOperationExecution(request)
	require.ErrorIs(t, err, ErrInvalidProductionOperationExecution)
	var receiptCount int64
	require.NoError(t, database.Model(&models.ProductionExecutionCommandRequestReceipt{}).Count(&receiptCount).Error)
	require.Zero(t, receiptCount)
	request.ProcessStepID = "process-legacy-replay"
	replayed, err = service.RecordProductionOperationExecution(request)
	require.NoError(t, err)
	require.Equal(t, original.ID, replayed.ID)
}

func TestProductionExecutionHistoricalUnknownRoundsReuseLatestCompletionWithoutCreatingWages(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	testClock := time.Date(2026, 10, 15, 0, 0, 0, 0, time.UTC)
	database.Config.NowFunc = func() time.Time {
		testClock = testClock.Add(time.Millisecond)
		return testClock
	}
	seedProductionOperationProcess(t, database, "process-historical-round")
	seedProductionExecutionReplayPricedWork(t, database, "HISTORICAL-ROUND-001", "process-historical-round")
	request := RecordProductionOperationExecutionRequest{
		ProductBarcode: "HISTORICAL-ROUND-001", ProcessStepID: "process-historical-round", Action: ProductionOperationActionComplete,
	}
	original, err := service.RecordProductionOperationExecution(request)
	require.NoError(t, err)
	require.NoError(t, database.Model(&models.ProductionOperationExecution{}).Where("id = ?", original.ID).Updates(map[string]any{
		"work_identity_key": "", "execution_round": 0,
	}).Error)
	for _, action := range []string{ProductionOperationActionStart, ProductionOperationActionHold} {
		nonReworkRequest := request
		nonReworkRequest.Action = action
		_, err := service.RecordProductionOperationExecution(nonReworkRequest)
		require.NoError(t, err)
	}
	replayed, err := service.RecordProductionOperationExecution(request)
	require.NoError(t, err)
	require.Equal(t, original.ID, replayed.ID)
	require.Zero(t, replayed.ExecutionRound)
	for index := 0; index < 2; index++ {
		reworkRequest := request
		reworkRequest.Action = ProductionOperationActionRework
		_, err := service.RecordProductionOperationExecution(reworkRequest)
		require.NoError(t, err)
	}
	require.NoError(t, database.Model(&models.PieceworkRate{}).Where("id = ?", "rate-process-historical-round").Updates(map[string]any{
		"unit_price": 3, "version": 2,
	}).Error)
	latest, err := service.RecordProductionOperationExecution(request)
	require.NoError(t, err)
	require.NotEqual(t, original.ID, latest.ID)
	require.Equal(t, int64(3), latest.ExecutionRound)
	require.NoError(t, database.Model(&models.ProductionOperationExecution{}).Where("id = ?", latest.ID).Updates(map[string]any{
		"work_identity_key": "", "execution_round": 0,
	}).Error)
	replayed, err = service.RecordProductionOperationExecution(request)
	require.NoError(t, err)
	require.Equal(t, latest.ID, replayed.ID)
	require.Zero(t, replayed.ExecutionRound)
	assertProductionExecutionReplayFactCounts(t, database, 6, 6, 0)
}

func TestProductionExecutionDistinctRouteStepsSharingProcessHaveIndependentCompletions(t *testing.T) {
	_, database := newProductionScanCommandTestService(t)
	steps := seedProductionScanRoute(t, database, "route-shared-process", "process-shared", "process-placeholder")
	require.NoError(t, database.Model(&models.ProductionRouteStep{}).Where("id = ?", steps[1]).Update("process_step_id", "process-shared").Error)
	seedProductionExecutionReplayPricedWork(t, database, "SHARED-PROCESS-001", "process-shared")
	service := NewProductionOperationExecutionService(productionOperationExecutionTestTxManager{db: database})
	request := RecordProductionOperationExecutionRequest{
		ProductBarcode: "SHARED-PROCESS-001", RouteID: "route-shared-process", ProcessStepID: "process-shared", Action: ProductionOperationActionComplete,
	}
	completedIDs := make([]string, 0, len(steps))
	for _, stepID := range steps {
		request.RouteStepID = stepID
		completion, err := service.RecordProductionOperationExecution(request)
		require.NoError(t, err)
		require.Equal(t, int64(1), completion.ExecutionRound)
		completedIDs = append(completedIDs, completion.ID)
	}
	require.NotEqual(t, completedIDs[0], completedIDs[1])
	for index, stepID := range steps {
		request.RouteStepID = stepID
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
		TargetRouteStepID: steps[0], TargetProcessStepID: "process-a",
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

func TestProductionScanAfterManualCompletionAppliesRouteEffectsOnceWithoutCreatingWages(t *testing.T) {
	scanService, database := newProductionScanCommandTestService(t)
	steps := seedProductionScanRoute(t, database, "route-cross-entry", "process-cross-a", "process-cross-b")
	seedProductionExecutionReplayPricedWork(t, database, "CROSS-ENTRY-001", "process-cross-a", "process-cross-b")
	manualService := NewProductionOperationExecutionService(productionOperationExecutionTestTxManager{db: database})
	manual, err := manualService.RecordProductionOperationExecution(RecordProductionOperationExecutionRequest{
		IdempotencyKey: "manual-completion", ProductBarcode: "CROSS-ENTRY-001", RouteID: "route-cross-entry",
		RouteStepID: steps[0], ProcessStepID: "process-cross-a", Action: ProductionOperationActionComplete,
	})
	require.NoError(t, err)
	scanRequest := ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-after-manual", ProductBarcode: "CROSS-ENTRY-001", RouteID: "route-cross-entry",
		RouteStepID: steps[0], ProcessStepID: "process-cross-a", Action: ProductionOperationActionComplete,
	}
	firstScan, err := scanService.ExecuteProductionScanCommand(scanRequest)
	require.NoError(t, err)
	require.Equal(t, manual.ID, firstScan.Operation.ID)
	require.Equal(t, manual.UpdatedAt, firstScan.Operation.UpdatedAt)
	require.Equal(t, steps[1], firstScan.State.RouteStepID)
	require.True(t, firstScan.Progress.Advanced)
	scanRequest.IdempotencyKey = "another-scan-after-manual"
	repeatScan, err := scanService.ExecuteProductionScanCommand(scanRequest)
	require.NoError(t, err)
	require.Equal(t, manual.ID, repeatScan.Operation.ID)
	require.Equal(t, steps[1], repeatScan.State.RouteStepID)
	require.False(t, repeatScan.Progress.Advanced)
	assertProductionExecutionReplayFactCounts(t, database, 1, 2, 0)
	assertProductionScanReplaySideEffectCounts(t, database, 1, 1)
}

func assertProductionScanReplaySideEffectCounts(t *testing.T, database *gorm.DB, transfers, audits int64) {
	t.Helper()
	var transferCount, auditCount int64
	require.NoError(t, database.Model(&models.ProductBarcodeTransferEvent{}).Count(&transferCount).Error)
	require.NoError(t, database.Model(&models.AuditLog{}).Where("module = ?", AuditModuleProductionOperation).Count(&auditCount).Error)
	require.Equal(t, transfers, transferCount)
	require.Equal(t, audits, auditCount)
}
