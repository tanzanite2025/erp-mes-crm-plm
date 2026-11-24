package services

import (
	"strings"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type productionScanCommandTestClient struct {
	service *ProductionScanCommandService
}

func (client *productionScanCommandTestClient) ExecuteProductionScanCommand(request ExecuteProductionScanCommandRequest) (ExecuteProductionScanCommandResponse, error) {
	if strings.TrimSpace(request.ProductionWorkLocationID) == "" {
		request.ProductionWorkLocationID = productionOperationExecutionTestWorkLocationID
	}
	if strings.TrimSpace(request.ProductBarcode) != "" {
		var existingLot models.ProductionExecutionLot
		database := client.service.txManager.DB()
		if err := database.Where("product_barcode = ?", normalizeProductBarcodeValue(request.ProductBarcode)).First(&existingLot).Error; err != nil {
			var plan models.ProductionPlan
			if strings.TrimSpace(request.RouteID) != "" {
				var route models.ProductionRoute
				if database.First(&route, "id = ?", request.RouteID).Error == nil {
					database.Where("product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ?",
						route.ProductID, route.BOMOwnerType, route.BOMOwnerCustomerID, route.BOMVersionLevel).First(&plan)
				}
			} else {
				var planCount int64
				if database.Model(&models.ProductionPlan{}).Count(&planCount).Error == nil && planCount == 1 {
					database.First(&plan)
				}
			}
			if strings.TrimSpace(plan.ID) != "" {
				_ = database.Create(&models.ProductionExecutionLot{
					BaseModel:      models.BaseModel{ID: uuid.NewString()},
					ProductBarcode: normalizeProductBarcodeValue(request.ProductBarcode),
					ProductID:      plan.ProductID,
					ProductName:    plan.ProductName,
					PlanID:         plan.ID,
					BatchNo:        "test-batch",
					Quantity:       1,
					Status:         ProductionExecutionLotStatusActive,
				})
			}
		}
	}
	return client.service.ExecuteProductionScanCommand(request)
}

func newProductionScanCommandTestService(t *testing.T) (*productionScanCommandTestClient, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	createProductionOperationExecutionTestSchema(t, database)
	createProductionScanCommandTestSchema(t, database)

	return &productionScanCommandTestClient{
		service: NewProductionScanCommandService(productionOperationExecutionTestTxManager{db: database}),
	}, database
}

func createProductionScanCommandTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

	require.NoError(t, database.Exec(`
		CREATE TABLE product_barcode_transfer_events (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_barcode TEXT NOT NULL,
			state_id TEXT,
			operation_id TEXT,
			transfer_type TEXT NOT NULL,
			route_id TEXT,
			from_route_step_id TEXT,
			to_route_step_id TEXT,
			from_branch_operation_id TEXT,
			to_branch_operation_id TEXT,
			from_holder_type TEXT,
			from_holder_id TEXT,
			to_holder_type TEXT,
			to_holder_id TEXT,
			operator TEXT NOT NULL,
			payload_snapshot TEXT NOT NULL,
			occurred_at DATETIME
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE products (
			id TEXT PRIMARY KEY, sku TEXT, name TEXT, status TEXT, deleted_at DATETIME
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE customers (
			id TEXT PRIMARY KEY, name TEXT, deleted_at DATETIME
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE boms (
			id TEXT PRIMARY KEY, product_id TEXT, bom_type TEXT, status TEXT,
			owner_type TEXT, owner_customer_id TEXT, version_level TEXT,
			effective_from DATETIME, effective_to DATETIME, deleted_at DATETIME
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_plans (
			id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME,
			deleted_at DATETIME, order_no TEXT, order_id TEXT,
			sales_order_line_id INTEGER, product_id TEXT, product_name TEXT,
			bom_owner_type TEXT, bom_owner_customer_id TEXT, bom_version_level TEXT,
			quantity REAL, status TEXT, start_date DATETIME, end_date DATETIME, notes TEXT
		)
	`).Error)
	migrateProductionRouteRevisionTestSchema(t, database, true)
}

func seedProductionScanRoute(t *testing.T, database *gorm.DB, routeID string, processIDs ...string) []string {
	t.Helper()
	productID := "product-" + routeID
	require.NoError(t, database.Exec(
		"INSERT INTO products (id, sku, name, status) VALUES (?, ?, ?, 'ACTIVE')",
		productID, productID, "测试产品",
	).Error)
	require.NoError(t, database.Exec(
		`INSERT INTO boms (id, product_id, bom_type, status, owner_type, owner_customer_id, version_level)
		 VALUES (?, ?, 'MBOM', 'RELEASED', 'INTERNAL', '', 'std')`,
		"bom-"+routeID, productID,
	).Error)

	createProductionRouteRevisionTestRecord(t, database, models.ProductionRoute{
		BaseModel:       models.BaseModel{ID: routeID},
		Code:            routeID,
		Name:            routeID,
		ProductID:       productID,
		BOMOwnerType:    "INTERNAL",
		BOMVersionLevel: "std",
		Status:          "PUBLISHED",
		Version:         1,
	})
	require.NoError(t, database.Create(&models.ProductionPlan{
		BaseModel:                 models.BaseModel{ID: "plan-" + routeID},
		ProductID:                 productID,
		ProductName:               "测试产品",
		BOMOwnerType:              "INTERNAL",
		BOMVersionLevel:           "std",
		ProductionRouteRevisionID: routeID,
		ProductionRouteRevisionNo: 1,
		Status:                    "SCHEDULED",
	}).Error)

	stepIDs := make([]string, 0, len(processIDs))
	for index, processID := range processIDs {
		require.NoError(t, database.Create(&models.ProductionBOMBranchOperation{
			BaseModel:       models.BaseModel{ID: processID},
			ProductID:       productID,
			BOMOwnerType:    "INTERNAL",
			BOMVersionLevel: "std",
			Name:            processID,
			IsActive:        true,
		}).Error)
		stepID := routeID + "-step-" + processID
		require.NoError(t, database.Create(&models.ProductionRouteStep{
			BaseModel:         models.BaseModel{ID: stepID},
			RouteID:           routeID,
			Sequence:          index + 1,
			BranchOperationID: processID,
			ExecutionMode:     "IN_HOUSE",
			QualityGate:       "NONE",
		}).Error)
		stepIDs = append(stepIDs, stepID)
	}
	return stepIDs
}

func TestExecuteProductionScanCommandRejectsDraftRoutes(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-draft", "operation-draft")
	require.NoError(t, database.Model(&models.ProductionRoute{}).
		Where("id = ?", "route-draft").
		Update("status", "DRAFT").Error)

	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey:    "scan-draft-route-denied",
		ProductBarcode:    "DRAFT-001",
		RouteID:           "route-draft",
		RouteStepID:       stepIDs[0],
		BranchOperationID: "operation-draft",
		Action:            ProductionOperationActionStart,
		CommandSource:     ProductionScanCommandSourceWeb,
		Operator:          "tester",
	})
	require.ErrorIs(t, err, ErrInvalidProductionScanCommand)

	var executionCount int64
	require.NoError(t, database.Model(&models.ProductionOperationExecution{}).
		Where("product_barcode = ?", "DRAFT-001").
		Count(&executionCount).Error)
	require.Zero(t, executionCount)
}

func TestExecuteProductionScanCommandRejectsBarcodeWithoutActiveExecutionLot(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	seedProductionScanRoute(t, database, "route-missing-lot", "operation-missing-lot")

	_, err := service.service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey:           "scan-without-execution-lot",
		ProductBarcode:           "MISSING-LOT-001",
		ProductionWorkLocationID: productionOperationExecutionTestWorkLocationID,
		Action:                   ProductionOperationActionStart,
	})

	require.ErrorIs(t, err, ErrInvalidProductionScanCommand)
	require.Contains(t, err.Error(), "no active execution lot is linked")
	var executionCount int64
	require.NoError(t, database.Model(&models.ProductionOperationExecution{}).
		Where("product_barcode = ?", "MISSING-LOT-001").
		Count(&executionCount).Error)
	require.Zero(t, executionCount)
}

func TestExecuteProductionScanCommandContinuesUsingPlanBoundRevisionAfterNewRevisionPublishes(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	seedProductionScanRoute(t, database, "route-duplicate-published", "operation-duplicate-published")

	var route models.ProductionRoute
	require.NoError(t, database.First(&route, "id = ?", "route-duplicate-published").Error)
	var routeStep models.ProductionRouteStep
	require.NoError(t, database.First(&routeStep, "route_id = ?", route.ID).Error)
	duplicateRoute := route
	duplicateRoute.BaseModel = models.BaseModel{ID: uuid.NewString()}
	duplicateRoute.Name = "Second route revision"
	duplicateRoute.RevisionNo = 0
	duplicateRoute.BasedOnRouteID = productionRouteBasedOnRevisionIDPointer(route.ID)
	duplicateRoute = createProductionRouteRevisionTestRecord(t, database, duplicateRoute)
	duplicateStep := routeStep
	duplicateStep.BaseModel = models.BaseModel{ID: uuid.NewString()}
	duplicateStep.RouteID = duplicateRoute.ID
	require.NoError(t, database.Create(&duplicateStep).Error)

	response, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-plan-bound-route-after-publication",
		ProductBarcode: "DUPLICATE-PUBLISHED-ROUTE-001",
		Action:         ProductionOperationActionStart,
	})

	require.NoError(t, err)
	require.Equal(t, route.ID, response.Operation.RouteID)
	require.Equal(t, routeStep.ID, response.Operation.RouteStepID)
}

func TestExecuteProductionScanCommandRequiresWorkLocation(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-location-required", "operation-location-required")

	_, err := service.service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey:    "scan-without-work-location",
		ProductBarcode:    "LOCATION-REQUIRED-001",
		RouteID:           "route-location-required",
		RouteStepID:       stepIDs[0],
		BranchOperationID: "operation-location-required",
		Action:            ProductionOperationActionStart,
		Operator:          "tester",
	})
	require.ErrorIs(t, err, ErrInvalidProductionScanCommand)

	var executionCount int64
	require.NoError(t, database.Model(&models.ProductionOperationExecution{}).
		Where("product_barcode = ?", "LOCATION-REQUIRED-001").
		Count(&executionCount).Error)
	require.Zero(t, executionCount)
}

func TestExecuteProductionScanCommandStartsFirstRouteStep(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-a", "process-a")

	response, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-start-first-route-step",
		ProductBarcode: " abc-001 ",
		RouteID:        "route-a",
		Action:         "start",
		CommandSource:  "usb",
		Operator:       "tester",
	})

	require.NoError(t, err)
	require.Equal(t, ProductionScanCommandSourceUSB, response.CommandSource)
	require.Equal(t, "ABC-001", response.Operation.ProductBarcode)
	require.Equal(t, stepIDs[0], response.Operation.RouteStepID)
	require.Equal(t, "process-a", response.Operation.BranchOperationID)
	require.Equal(t, ProductBarcodeStateStatusInProgress, response.State.Status)
	require.Equal(t, stepIDs[0], response.Progress.CurrentRouteStepID)
	require.False(t, response.Progress.Advanced)

	var auditCount int64
	require.NoError(t, database.Model(&models.AuditLog{}).Where("module = ?", AuditModuleProductionOperation).Count(&auditCount).Error)
	require.Equal(t, int64(1), auditCount)
}

func TestExecuteProductionScanCommandRejectsStartWhenBarcodeIsAlreadyInProgress(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	seedProductionScanRoute(t, database, "route-repeated-start", "process-repeated-start")
	request := ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-repeated-start-first",
		ProductBarcode: "SCAN-REPEATED-START-001",
		RouteID:        "route-repeated-start",
		Action:         ProductionOperationActionStart,
		Operator:       "tester",
	}

	_, err := service.ExecuteProductionScanCommand(request)
	require.NoError(t, err)

	request.IdempotencyKey = "scan-repeated-start-second"
	_, err = service.ExecuteProductionScanCommand(request)
	require.ErrorIs(t, err, ErrProductBarcodeExecutionLifecycleConflict)

	state, events, err := loadProductBarcodeStateWithEvents(database, request.ProductBarcode)
	require.NoError(t, err)
	require.Equal(t, ProductBarcodeStateStatusInProgress, state.Status)
	require.Len(t, events, 1)
	require.Equal(t, ProductBarcodeStateEventStart, events[0].EventType)
	assertProductionExecutionReplayFactCounts(t, database, 1, 1, 0)
	assertProductionScanReplaySideEffectCounts(t, database, 0, 1)

	var receiptCount int64
	require.NoError(t, database.Model(&models.ProductionExecutionCommandRequestReceipt{}).Count(&receiptCount).Error)
	require.EqualValues(t, 1, receiptCount)
}

func TestFirstProductionScanStartUsesOneCanonicalBarcodeAndDoesNotChangeBoundInventory(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-first-start-canonical", "process-first-start-canonical")
	const productCode = "26719011R140023"

	require.NoError(t, database.Exec(`
		CREATE TABLE print_batches (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			batch_no TEXT,
			template_name TEXT,
			product_id TEXT,
			bom_id TEXT,
			start_sn TEXT,
			end_sn TEXT,
			full_code TEXT,
			sales_order_id TEXT,
			sales_order_line_no INTEGER,
			quantity INTEGER,
			activated_count INTEGER,
			status TEXT,
			expires_at DATETIME,
			version INTEGER
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE linear_barcode_inventory_items (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			batch_id TEXT,
			product_id TEXT,
			sales_order_id TEXT,
			sales_order_line_id INTEGER NOT NULL DEFAULT 0,
			sales_order_line_no INTEGER,
			code TEXT,
			serial_number TEXT,
			status TEXT,
			expires_at DATETIME,
			bound_at DATETIME,
			version INTEGER
		)
	`).Error)
	expiresAt := time.Now().UTC().Add(24 * time.Hour)
	boundAt := time.Now().UTC()
	require.NoError(t, database.Exec(
		`INSERT INTO print_batches (id, batch_no, template_name, quantity, activated_count, status, version) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		"batch-first-start-canonical", "BATCH-FIRST-START", "TEST", 1, 1, "Activated", 2,
	).Error)
	require.NoError(t, database.Exec(
		`INSERT INTO linear_barcode_inventory_items (id, batch_id, product_id, sales_order_id, sales_order_line_no, code, serial_number, status, expires_at, bound_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"inventory-first-start-canonical", "batch-first-start-canonical", "product-first-start-canonical", "order-first-start-canonical", 1,
		productCode, "0023", LinearBarcodeInventoryStatusBound, expiresAt, boundAt, 2,
	).Error)

	request := ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-first-start-canonical",
		ProductBarcode: " 26719011r140023 ",
		RouteID:        "route-first-start-canonical",
		Action:         " start ",
		CommandSource:  "usb",
		Operator:       "tester",
	}
	firstResponse, err := service.ExecuteProductionScanCommand(request)
	require.NoError(t, err)
	require.Equal(t, productCode, firstResponse.Operation.ProductBarcode)
	require.Equal(t, firstResponse.Operation.ProductBarcode, firstResponse.State.ProductBarcode)
	require.Equal(t, stepIDs[0], firstResponse.Operation.RouteStepID)
	require.Equal(t, ProductBarcodeStateStatusInProgress, firstResponse.State.Status)
	require.Len(t, firstResponse.State.Events, 1)
	firstEvent := firstResponse.State.Events[0]
	require.Equal(t, productCode, firstEvent.ProductBarcode)
	require.Equal(t, firstResponse.Operation.ID, firstEvent.OperationID)
	require.Equal(t, firstResponse.State.ID, firstEvent.StateID)
	require.Equal(t, firstEvent.ID, firstResponse.State.LastEventID)
	require.Equal(t, ProductBarcodeStateEventStart, firstEvent.EventType)

	request.ProductBarcode = productCode
	replayedResponse, err := service.ExecuteProductionScanCommand(request)
	require.NoError(t, err)
	require.Equal(t, firstResponse, replayedResponse)
	assertProductionExecutionReplayFactCounts(t, database, 1, 1, 0)
	assertProductionScanReplaySideEffectCounts(t, database, 0, 1)

	var stateCount int64
	require.NoError(t, database.Model(&models.ProductBarcodeState{}).Where("product_barcode = ?", productCode).Count(&stateCount).Error)
	require.EqualValues(t, 1, stateCount)
	var inventory models.LinearBarcodeInventoryItem
	require.NoError(t, database.Where("code = ?", productCode).First(&inventory).Error)
	require.Equal(t, LinearBarcodeInventoryStatusBound, inventory.Status)
	require.Equal(t, 2, inventory.Version)
	require.NotNil(t, inventory.BoundAt)
	var batch models.PrintBatch
	require.NoError(t, database.Where("id = ?", "batch-first-start-canonical").First(&batch).Error)
	require.Equal(t, 1, batch.ActivatedCount)
	require.Equal(t, 2, batch.Version)
}

func TestExecuteProductionScanCommandCompletesAndAdvancesToNextRouteStep(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-a", "process-a", "process-b")

	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-advance-start",
		ProductBarcode: "ABC-002",
		RouteID:        "route-a",
		Action:         ProductionOperationActionStart,
		Operator:       "tester",
	})
	require.NoError(t, err)

	response, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-advance-complete-first",
		ProductBarcode: "ABC-002",
		Action:         ProductionOperationActionComplete,
		Operator:       "tester",
	})

	require.NoError(t, err)
	require.Equal(t, stepIDs[0], response.Operation.RouteStepID)
	require.Equal(t, "process-a", response.Operation.BranchOperationID)
	require.Equal(t, ProductBarcodeStateStatusNotStarted, response.State.Status)
	require.Equal(t, stepIDs[1], response.State.RouteStepID)
	require.Equal(t, "process-b", response.State.CurrentBranchOperationID)
	require.True(t, response.Progress.Advanced)
	require.False(t, response.Progress.RouteCompleted)
	require.Equal(t, stepIDs[1], response.Progress.CurrentRouteStepID)
	require.Len(t, response.TransferEvents, 1)
	require.Equal(t, ProductBarcodeTransferTypeRouteAdvance, response.TransferEvents[0].TransferType)
	require.Equal(t, response.State.ID, response.TransferEvents[0].StateID)
	require.Equal(t, response.Operation.ID, response.TransferEvents[0].OperationID)
	require.Equal(t, stepIDs[0], response.TransferEvents[0].FromRouteStepID)
	require.Equal(t, stepIDs[1], response.TransferEvents[0].ToRouteStepID)
	require.Equal(t, "process-a", response.TransferEvents[0].FromBranchOperationID)
	require.Equal(t, "process-b", response.TransferEvents[0].ToBranchOperationID)
	require.Len(t, response.State.Events, 3)
	eventsByType := make(map[string]ProductBarcodeStateEventResponse, len(response.State.Events))
	for _, event := range response.State.Events {
		eventsByType[event.EventType] = event
	}
	transferEvent := eventsByType[ProductBarcodeStateEventTransfer]
	require.NotEmpty(t, transferEvent.ID)
	require.Equal(t, response.State.LastEventID, transferEvent.ID)
	require.Equal(t, response.State.ID, transferEvent.StateID)
	require.Equal(t, response.Operation.ID, transferEvent.OperationID)
	require.Equal(t, "process-a", transferEvent.FromBranchOperationID)
	require.Equal(t, "process-b", transferEvent.ToBranchOperationID)
	completedEvent := eventsByType[ProductBarcodeStateEventComplete]
	require.NotEmpty(t, completedEvent.ID)
	require.Equal(t, response.Operation.ID, completedEvent.OperationID)
}

func TestExecuteProductionScanCommandUsesBarcodePositionWhenRequestKeyChanges(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-repeat-complete", "process-repeat-a", "process-repeat-b", "process-repeat-c")
	const productBarcode = "SCAN-REPEAT-COMPLETE-001"

	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-repeat-complete-start",
		ProductBarcode: productBarcode,
		RouteID:        "route-repeat-complete",
		Action:         ProductionOperationActionStart,
	})
	require.NoError(t, err)

	completionRequest := ExecuteProductionScanCommandRequest{
		IdempotencyKey:    "scan-repeat-complete-first",
		ProductBarcode:    productBarcode,
		RouteID:           "route-repeat-complete",
		RouteStepID:       stepIDs[0],
		BranchOperationID: "process-repeat-a",
		Action:            ProductionOperationActionComplete,
	}
	firstCompletion, err := service.ExecuteProductionScanCommand(completionRequest)
	require.NoError(t, err)
	require.True(t, firstCompletion.Progress.Advanced)
	require.Equal(t, stepIDs[1], firstCompletion.State.RouteStepID)

	completionRequest.IdempotencyKey = "scan-repeat-complete-new-request-key"
	repeatedCompletion, err := service.ExecuteProductionScanCommand(completionRequest)
	require.NoError(t, err)
	require.NotEqual(t, firstCompletion.Operation.ID, repeatedCompletion.Operation.ID)
	require.Equal(t, firstCompletion.State.ID, repeatedCompletion.State.ID)
	require.NotEqual(t, firstCompletion.State.LastEventID, repeatedCompletion.State.LastEventID)
	require.Equal(t, ProductBarcodeStateStatusNotStarted, repeatedCompletion.State.Status)
	require.Equal(t, stepIDs[2], repeatedCompletion.State.RouteStepID)
	require.Equal(t, "process-repeat-c", repeatedCompletion.State.CurrentBranchOperationID)
	require.Len(t, repeatedCompletion.State.Events, 5)
	require.True(t, repeatedCompletion.Progress.Advanced)
	require.Equal(t, stepIDs[2], repeatedCompletion.Progress.NextRouteStepID)
	require.Equal(t, "process-repeat-c", repeatedCompletion.Progress.NextBranchOperationID)
	require.Len(t, repeatedCompletion.TransferEvents, 1)

	assertProductionExecutionReplayFactCounts(t, database, 3, 5, 0)
	assertProductionScanReplaySideEffectCounts(t, database, 2, 3)

	var routeAdvanceCount int64
	require.NoError(t, database.Model(&models.ProductBarcodeTransferEvent{}).
		Where("product_barcode = ? AND transfer_type = ?", productBarcode, ProductBarcodeTransferTypeRouteAdvance).
		Count(&routeAdvanceCount).Error)
	require.EqualValues(t, 2, routeAdvanceCount)

	var requestReceiptCount int64
	require.NoError(t, database.Model(&models.ProductionExecutionCommandRequestReceipt{}).
		Where("command_type = ?", "SCAN_COMMAND").
		Count(&requestReceiptCount).Error)
	require.EqualValues(t, 3, requestReceiptCount)
}

func TestExecuteProductionScanCommandRollsBackAllFactsWhenRouteTransferWriteFails(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-transfer-rollback", "process-transfer-a", "process-transfer-b")
	startRequest := ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-transfer-rollback-start",
		ProductBarcode: "SCAN-TRANSFER-ROLLBACK-001",
		RouteID:        "route-transfer-rollback",
		Action:         ProductionOperationActionStart,
	}
	_, err := service.ExecuteProductionScanCommand(startRequest)
	require.NoError(t, err)
	require.NoError(t, database.Exec(`
		CREATE TRIGGER fail_route_advance_transfer
		BEFORE INSERT ON product_barcode_transfer_events
		WHEN NEW.transfer_type = 'ROUTE_ADVANCE'
		BEGIN
			SELECT RAISE(ABORT, 'forced route transfer write failure');
		END
	`).Error)

	completeRequest := startRequest
	completeRequest.IdempotencyKey = "scan-transfer-rollback-complete"
	completeRequest.Action = ProductionOperationActionComplete
	_, err = service.ExecuteProductionScanCommand(completeRequest)
	require.Error(t, err)

	state, events, err := loadProductBarcodeStateWithEvents(database, "SCAN-TRANSFER-ROLLBACK-001")
	require.NoError(t, err)
	require.Equal(t, ProductBarcodeStateStatusInProgress, state.Status)
	require.Equal(t, stepIDs[0], state.RouteStepID)
	require.Len(t, events, 1)
	require.Equal(t, ProductBarcodeStateEventStart, events[0].EventType)
	require.Equal(t, events[0].ID, state.LastEventID)
	assertProductionExecutionReplayFactCounts(t, database, 1, 1, 0)
	assertProductionScanReplaySideEffectCounts(t, database, 0, 1)

	var receiptCount int64
	require.NoError(t, database.Model(&models.ProductionExecutionCommandRequestReceipt{}).Count(&receiptCount).Error)
	require.EqualValues(t, 1, receiptCount)
}

func TestExecuteProductionScanCommandCompletesFinalRouteStep(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-a", "process-a")

	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-final-step-start",
		ProductBarcode: "ABC-003",
		RouteID:        "route-a",
		Action:         ProductionOperationActionStart,
		Operator:       "tester",
	})
	require.NoError(t, err)

	completionRequest := ExecuteProductionScanCommandRequest{
		IdempotencyKey:    "scan-final-step-complete",
		ProductBarcode:    "ABC-003",
		RouteID:           "route-a",
		RouteStepID:       stepIDs[0],
		BranchOperationID: "process-a",
		Action:            ProductionOperationActionComplete,
		Operator:          "tester",
	}
	response, err := service.ExecuteProductionScanCommand(completionRequest)

	require.NoError(t, err)
	require.Equal(t, ProductBarcodeStateStatusCompleted, response.State.Status)
	require.Equal(t, stepIDs[0], response.State.RouteStepID)
	require.True(t, response.Progress.RouteCompleted)
	require.False(t, response.Progress.Advanced)
	require.Empty(t, response.TransferEvents)

	completionRequest.IdempotencyKey = "scan-final-step-complete-new-key"
	replayed, err := service.ExecuteProductionScanCommand(completionRequest)
	require.NoError(t, err)
	require.Equal(t, response.Operation.ID, replayed.Operation.ID)
	require.Equal(t, response.State.LastEventID, replayed.State.LastEventID)
	require.Equal(t, ProductBarcodeStateStatusCompleted, replayed.State.Status)
	require.True(t, replayed.Progress.RouteCompleted)
	require.False(t, replayed.Progress.Advanced)
	require.Empty(t, replayed.TransferEvents)
	assertProductionExecutionReplayFactCounts(t, database, 2, 2, 0)
	assertProductionScanReplaySideEffectCounts(t, database, 0, 2)
}

func TestExecuteProductionScanCommandRequiresReworkBeforeRestartingCompletedBarcode(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	seedProductionScanRoute(t, database, "route-completed-lifecycle", "process-completed-lifecycle")

	startRequest := ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-completed-lifecycle-start",
		ProductBarcode: "SCAN-COMPLETED-LIFECYCLE-001",
		RouteID:        "route-completed-lifecycle",
		Action:         ProductionOperationActionStart,
	}
	_, err := service.ExecuteProductionScanCommand(startRequest)
	require.NoError(t, err)

	completeRequest := startRequest
	completeRequest.IdempotencyKey = "scan-completed-lifecycle-complete"
	completeRequest.Action = ProductionOperationActionComplete
	completed, err := service.ExecuteProductionScanCommand(completeRequest)
	require.NoError(t, err)
	require.Equal(t, ProductBarcodeStateStatusCompleted, completed.State.Status)

	startRequest.IdempotencyKey = "scan-completed-lifecycle-restart"
	_, err = service.ExecuteProductionScanCommand(startRequest)
	require.ErrorIs(t, err, ErrProductBarcodeExecutionLifecycleConflict)

	state, events, err := loadProductBarcodeStateWithEvents(database, "SCAN-COMPLETED-LIFECYCLE-001")
	require.NoError(t, err)
	require.Equal(t, ProductBarcodeStateStatusCompleted, state.Status)
	require.Len(t, events, 2)
	assertProductionExecutionReplayFactCounts(t, database, 2, 2, 0)
}

func TestExecuteProductionScanCommandUsesFirstStepWhenRouteRepeatsAnOperation(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-a", "process-a")
	require.NoError(t, database.Create(&models.ProductionRouteStep{
		BaseModel:         models.BaseModel{ID: "route-a-step-process-a-duplicate"},
		RouteID:           "route-a",
		Sequence:          2,
		BranchOperationID: "process-a",
		ExecutionMode:     "IN_HOUSE",
		QualityGate:       "NONE",
	}).Error)

	response, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey:    "scan-ambiguous-route-step",
		ProductBarcode:    "ABC-004",
		RouteID:           "route-a",
		BranchOperationID: "process-a",
		Action:            ProductionOperationActionStart,
		Operator:          "tester",
	})
	require.NoError(t, err)
	require.Equal(t, stepIDs[0], response.Operation.RouteStepID)

	response, err = service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey:    "scan-non-first-route-step",
		ProductBarcode:    "ABC-005",
		RouteID:           "route-a",
		RouteStepID:       "route-a-step-process-a-duplicate",
		BranchOperationID: "process-a",
		Action:            ProductionOperationActionStart,
		Operator:          "tester",
	})
	require.NoError(t, err)
	require.Equal(t, stepIDs[0], response.Operation.RouteStepID)
}

func TestExecuteProductionScanCommandUsesPlanFirstRouteStepAndAdvancesFromBarcodeState(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-step-position", "process-position-a", "process-position-b")

	firstResponse, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey:    "scan-skip-first-step",
		ProductBarcode:    "SCAN-STEP-POSITION-SKIP",
		RouteID:           "route-step-position",
		RouteStepID:       stepIDs[1],
		BranchOperationID: "process-position-b",
		Action:            ProductionOperationActionStart,
	})
	require.NoError(t, err)
	require.Equal(t, stepIDs[0], firstResponse.Operation.RouteStepID)

	startRequest := ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-start-current-first-step",
		ProductBarcode: "SCAN-STEP-POSITION-CURRENT",
		RouteID:        "route-step-position",
		Action:         ProductionOperationActionStart,
	}
	_, err = service.ExecuteProductionScanCommand(startRequest)
	require.NoError(t, err)

	startRequest.IdempotencyKey = "scan-complete-current-step"
	startRequest.Action = ProductionOperationActionComplete
	startRequest.RouteStepID = stepIDs[1]
	startRequest.BranchOperationID = "process-position-b"
	response, err := service.ExecuteProductionScanCommand(startRequest)
	require.NoError(t, err)
	require.Equal(t, stepIDs[1], response.State.RouteStepID)
	require.Equal(t, "process-position-b", response.State.CurrentBranchOperationID)

	state, events, err := loadProductBarcodeStateWithEvents(database, "SCAN-STEP-POSITION-CURRENT")
	require.NoError(t, err)
	require.Equal(t, stepIDs[1], state.RouteStepID)
	require.Equal(t, ProductBarcodeStateStatusNotStarted, state.Status)
	require.Len(t, events, 3)
	assertProductionExecutionReplayFactCounts(t, database, 3, 4, 0)
}

func TestExecuteProductionScanCommandPreservesBarcodeProductIdentity(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-a", "process-a", "process-b")

	_, err := NewProductBarcodeStateService(productionOperationExecutionTestTxManager{db: database}).InitializeProductBarcodeState(InitializeProductBarcodeStateRequest{
		ProductBarcode:    "ABC-005",
		ProductID:         "product-route-a",
		ProductName:       "测试产品",
		RouteID:           "route-a",
		RouteStepID:       stepIDs[0],
		BranchOperationID: "process-a",
		Status:            ProductBarcodeStateStatusNotStarted,
		Operator:          "tester",
	})
	require.NoError(t, err)

	response, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-preserve-product-identity",
		ProductBarcode: "ABC-005",
		Action:         ProductionOperationActionComplete,
		Operator:       "tester",
	})

	require.NoError(t, err)
	require.Equal(t, "product-route-a", response.State.ProductID)
	require.Equal(t, "测试产品", response.State.ProductName)
	require.Equal(t, stepIDs[1], response.State.RouteStepID)
}

func TestExecuteProductionScanCommandRejectsBarcodeStateForDifferentPlanProduct(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-product-mismatch", "operation-product-mismatch")
	_, err := NewProductBarcodeStateService(productionOperationExecutionTestTxManager{db: database}).InitializeProductBarcodeState(InitializeProductBarcodeStateRequest{
		ProductBarcode:    "PRODUCT-MISMATCH-001",
		ProductID:         "different-product",
		ProductName:       "Different product",
		RouteID:           "route-product-mismatch",
		RouteStepID:       stepIDs[0],
		BranchOperationID: "operation-product-mismatch",
		Status:            ProductBarcodeStateStatusNotStarted,
	})
	require.NoError(t, err)

	_, err = service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-product-mismatch",
		ProductBarcode: "PRODUCT-MISMATCH-001",
		Action:         ProductionOperationActionComplete,
	})

	require.ErrorIs(t, err, ErrInvalidProductionScanCommand)
	require.Contains(t, err.Error(), "barcode product does not match")
}

func TestExecuteProductionScanCommandReworkAdvancesToExplicitTargetRouteStep(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-a", "process-a", "process-b")

	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-rework-start",
		ProductBarcode: "ABC-006",
		RouteID:        "route-a",
		Action:         ProductionOperationActionStart,
		Operator:       "tester",
	})
	require.NoError(t, err)
	_, err = service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-rework-complete",
		ProductBarcode: "ABC-006",
		Action:         ProductionOperationActionComplete,
		Operator:       "tester",
	})
	require.NoError(t, err)

	response, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey:    "scan-explicit-rework",
		ProductBarcode:    "ABC-006",
		Action:            ProductionOperationActionRework,
		TargetRouteStepID: stepIDs[0],
		Operator:          "tester",
	})

	require.NoError(t, err)
	require.Equal(t, ProductionOperationActionRework, response.Operation.Action)
	require.Equal(t, stepIDs[1], response.Operation.RouteStepID)
	require.Equal(t, ProductBarcodeStateStatusRework, response.State.Status)
	require.Equal(t, stepIDs[0], response.State.RouteStepID)
	require.Equal(t, "process-a", response.State.CurrentBranchOperationID)
	require.True(t, response.Progress.Advanced)
	require.Len(t, response.TransferEvents, 1)
	require.Equal(t, ProductBarcodeTransferTypeRouteAdvance, response.TransferEvents[0].TransferType)
	require.Equal(t, "process-b", response.TransferEvents[0].FromBranchOperationID)
	require.Equal(t, "process-a", response.TransferEvents[0].ToBranchOperationID)
}

func TestExecuteProductionScanCommandRejectsTargetRouteStepOutsideRoute(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	seedProductionScanRoute(t, database, "route-a", "process-a")
	targetStepIDs := seedProductionScanRoute(t, database, "route-b", "process-b")

	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "scan-reject-outside-route-start",
		ProductBarcode: "ABC-007",
		RouteID:        "route-a",
		Action:         ProductionOperationActionStart,
		Operator:       "tester",
	})
	require.NoError(t, err)

	_, err = service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey:    "scan-reject-outside-route-complete",
		ProductBarcode:    "ABC-007",
		Action:            ProductionOperationActionComplete,
		TargetRouteStepID: targetStepIDs[0],
		Operator:          "tester",
	})

	require.ErrorIs(t, err, ErrInvalidProductionScanCommand)
}
