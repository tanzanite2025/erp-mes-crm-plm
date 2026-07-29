package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"testing"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestFillOutsourceOrderLineFromSalesLineOverridesClientProductSnapshot(t *testing.T) {
	target := models.OutsourceOrderLine{
		ProductID:     "wrong-product-id",
		ProductCode:   "WRONG-CODE",
		ProductName:   "Wrong product name",
		Specification: "Wrong specification",
		Quantity:      3,
		UOM:           "PCS",
	}
	source := models.SalesOrderLine{
		ProductID:                       "source-product-id",
		ProductCode:                     "SRC-RAW",
		ProductModel:                    "SRC-MODEL",
		ProductDisplayCodeSnapshot:      "SRC-CODE",
		ProductDisplayFullLabelSnapshot: "Source product",
		Specification:                   "Source specification",
		Qty:                             12,
		UOM:                             "kg",
	}

	fillOutsourceOrderLineFromSalesLine(&target, source)

	require.Equal(t, "source-product-id", target.ProductID)
	require.Equal(t, "SRC-CODE", target.ProductCode)
	require.Equal(t, "Source product", target.ProductName)
	require.Equal(t, "Source specification", target.Specification)
	require.Equal(t, float64(3), target.Quantity)
	require.Equal(t, "KG", target.UOM)
}

func TestManualOutsourceOrderSourceTypeIsNotSupported(t *testing.T) {
	require.False(t, isOutsourceOrderSourceType(normalizeOutsourceOrderSourceType("MANUAL")))
	require.False(t, isOutsourceOrderSourceType(normalizeOutsourceOrderSourceType("")))
	require.True(t, isOutsourceOrderSourceType(normalizeOutsourceOrderSourceType("SALES_ORDER")))
	require.True(t, isOutsourceOrderSourceType(normalizeOutsourceOrderSourceType("PRODUCTION_PLAN")))
}

func TestValidateOutsourceOrderDoesNotRequireManualProcessStepBinding(t *testing.T) {
	order := OutsourceOrderDTO{
		SourceType: OutsourceOrderSourceSalesOrder,
		SourceID:   "source-order-id",
		PartnerID:  "partner-id",
		Status:     OutsourceOrderStatusDraft,
		Lines: []OutsourceOrderLineDTO{
			{
				SourceLineID: "1001",
				Quantity:     10,
				UOM:          "PCS",
				Status:       OutsourceOrderStatusDraft,
			},
		},
	}

	require.NoError(t, validateOutsourceOrderDTO(order))
}

func TestFillOutsourceOrderLinesFromSalesOrderRequiresUniqueSourceLine(t *testing.T) {
	order := models.OutsourceOrder{
		Lines: []models.OutsourceOrderLine{
			{SourceLineID: "1001", Quantity: 1, UOM: "PCS"},
			{SourceLineID: "1001", Quantity: 2, UOM: "PCS"},
		},
	}
	salesLines := []models.SalesOrderLine{
		{ID: 1001, ProductDisplayFullLabelSnapshot: "Source product", Qty: 3, UOM: "PCS"},
	}

	require.Error(t, fillOutsourceOrderLinesFromSalesOrder(&order, salesLines))
}

func newOutsourceExecutionTestService(t *testing.T) (*ProductionOutsourcingService, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	createProductionOperationExecutionTestSchema(t, database)
	createProductionScanCommandTestSchema(t, database)
	createOutsourceExecutionTestSchema(t, database)

	return NewProductionOutsourcingService(productionOperationExecutionTestTxManager{db: database}), database
}

func createOutsourceExecutionTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

	require.NoError(t, database.Exec(`
		CREATE TABLE production_outsource_partners (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			supplier_id TEXT,
			supplier_name_snapshot TEXT,
			contact_person TEXT,
			contact_phone TEXT,
			email TEXT,
			address TEXT,
			quality_grade TEXT,
			status TEXT,
			lead_time_days INTEGER,
			settlement_policy TEXT,
			notes TEXT,
			operator TEXT,
			version INTEGER
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_outsource_orders (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			order_no TEXT NOT NULL,
			source_type TEXT NOT NULL,
			source_id TEXT,
			source_no TEXT,
			customer_id TEXT,
			customer_name TEXT,
			partner_id TEXT NOT NULL,
			partner_name_snapshot TEXT,
			status TEXT,
			planned_send_date DATETIME,
			planned_return_date DATETIME,
			total_quantity REAL,
			uom TEXT,
			notes TEXT,
			operator TEXT,
			version INTEGER
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_outsource_order_lines (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			outsource_order_id TEXT NOT NULL,
			line_no INTEGER,
			source_line_id TEXT,
			product_id TEXT,
			product_code TEXT,
			product_name TEXT,
			specification TEXT,
			quantity REAL,
			uom TEXT,
			segment_id TEXT,
			segment_name TEXT,
			process_step_id TEXT,
			process_code TEXT,
			process_name TEXT,
			status TEXT,
			sent_quantity REAL,
			returned_quantity REAL,
			accepted_quantity REAL,
			rejected_quantity REAL,
			rework_quantity REAL,
			scrap_quantity REAL,
			notes TEXT,
			version INTEGER
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_outsource_transfers (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			transfer_no TEXT NOT NULL,
			outsource_order_id TEXT NOT NULL,
			outsource_order_line_id TEXT NOT NULL,
			transfer_type TEXT NOT NULL,
			product_barcode TEXT NOT NULL,
			quantity REAL,
			uom TEXT,
			partner_id TEXT,
			route_id TEXT,
			route_step_id TEXT,
			process_step_id TEXT,
			from_holder_type TEXT,
			from_holder_id TEXT,
			to_holder_type TEXT,
			to_holder_id TEXT,
			source_category TEXT,
			target_category TEXT,
			batch_no TEXT,
			transfer_event_id TEXT,
			occurred_at DATETIME,
			operator TEXT,
			notes TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE UNIQUE INDEX idx_outsource_transfer_line_type_barcode
		ON production_outsource_transfers (outsource_order_line_id, transfer_type, product_barcode)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_outsource_inspections (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			inspection_no TEXT NOT NULL,
			outsource_order_id TEXT NOT NULL,
			outsource_order_line_id TEXT NOT NULL,
			product_barcode TEXT NOT NULL,
			inspection_task_id TEXT,
			result TEXT NOT NULL,
			disposition TEXT NOT NULL,
			inspected_quantity REAL,
			accepted_quantity REAL,
			rejected_quantity REAL,
			rework_quantity REAL,
			scrap_quantity REAL,
			uom TEXT,
			route_id TEXT,
			route_step_id TEXT,
			process_step_id TEXT,
			operation_id TEXT,
			inspected_at DATETIME,
			inspector TEXT,
			notes TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE UNIQUE INDEX idx_outsource_inspection_line_barcode
		ON production_outsource_inspections (outsource_order_line_id, product_barcode)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE inspection_tasks (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			standard_id TEXT,
			status TEXT,
			source_type TEXT,
			source_id TEXT,
			source_line_id TEXT,
			product_barcode TEXT,
			production_plan_id TEXT,
			order_id TEXT,
			batch_no TEXT NOT NULL,
			product_id TEXT,
			product_name TEXT,
			sample_qty REAL,
			result TEXT,
			inspector TEXT,
			claimed_by TEXT,
			claimed_at DATETIME,
			input_data TEXT,
			remarks TEXT,
			completed_at DATETIME
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE UNIQUE INDEX idx_inspection_task_source_barcode
		ON inspection_tasks (source_type, source_line_id, product_barcode)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE quality_abnormalities (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			task_id TEXT,
			severity TEXT,
			description TEXT NOT NULL,
			analysis TEXT,
			disposal_method TEXT,
			scrap_quantity REAL,
			scrap_unit TEXT,
			production_plan_id TEXT,
			order_id TEXT,
			product_id TEXT,
			batch_no TEXT,
			occurred_at DATETIME,
			status TEXT,
			deadline DATETIME,
			reporter TEXT,
			resolver TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE standard_commands (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			action_type TEXT,
			bind_type TEXT,
			node_type TEXT,
			title TEXT,
			content TEXT,
			target_link TEXT,
			params TEXT,
			source_code TEXT,
			action_code TEXT,
			status_codes TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE notification_rules (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT,
			enabled BOOLEAN,
			entity TEXT,
			source_code TEXT,
			action_code TEXT,
			segments TEXT,
			version INTEGER
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE rule_execution_logs (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			event_key TEXT,
			entity TEXT,
			source_code TEXT,
			action_code TEXT,
			status_code TEXT,
			rule_id TEXT,
			rule_name TEXT,
			segment_id TEXT,
			segment_title TEXT,
			execution_type TEXT,
			execution_status TEXT,
			command_id TEXT,
			title TEXT,
			content TEXT,
			action_url TEXT,
			targets TEXT,
			metadata TEXT,
			result TEXT,
			error_message TEXT,
			triggered_at DATETIME
		)
	`).Error)
	require.NoError(t, database.AutoMigrate(&models.AuditLog{}))
	require.NoError(t, database.Exec(`
		CREATE TABLE materials (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			revision_no TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			change_type TEXT,
			change_order_no TEXT,
			site_code TEXT,
			is_default_site BOOLEAN,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			category TEXT,
			spec TEXT,
			internal_dimensions TEXT,
			external_dimensions TEXT,
			uom TEXT,
			min_stock REAL,
			cost_price REAL,
			supplier_id TEXT,
			description TEXT,
			images TEXT,
			status TEXT,
			version INTEGER
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE product_inventory_material_mappings (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_id TEXT NOT NULL,
			material_id TEXT NOT NULL,
			active BOOLEAN,
			mapping_source TEXT,
			remarks TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE inventory (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			material_id TEXT NOT NULL,
			material_name TEXT,
			material_code TEXT,
			material_spec TEXT,
			quantity REAL,
			total_value REAL,
			average_unit_cost REAL,
			category_code TEXT NOT NULL,
			batch_no TEXT,
			uom TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE inventory_ledger_entries (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			transfer_id TEXT NOT NULL,
			transfer_type TEXT NOT NULL,
			direction TEXT NOT NULL,
			material_id TEXT NOT NULL,
			material_name TEXT,
			material_code TEXT,
			material_spec TEXT,
			category_code TEXT NOT NULL,
			batch_no TEXT,
			quantity_delta REAL NOT NULL,
			quantity_after REAL NOT NULL,
			unit_cost REAL,
			total_value_delta REAL,
			source_type TEXT NOT NULL,
			source_id TEXT NOT NULL,
			source_line_id TEXT,
			source_fact_id TEXT,
			operator TEXT,
			occurred_at DATETIME NOT NULL,
			remarks TEXT
		)
	`).Error)
}

func seedOutsourceExecutionOrder(t *testing.T, database *gorm.DB, status string) (models.OutsourceOrder, models.OutsourceOrderLine) {
	t.Helper()

	partner := models.OutsourcePartner{
		BaseModel: models.BaseModel{ID: "partner-1"},
		Code:      "OSP-1",
		Name:      "委外单位",
		Status:    OutsourcePartnerStatusActive,
		Version:   1,
	}
	require.NoError(t, database.Create(&partner).Error)
	require.NoError(t, database.Create(&models.Material{
		BaseModel: models.BaseModel{ID: "material-1"},
		Code:      "P-1",
		Name:      "产品一",
		UOM:       "PCS",
	}).Error)
	require.NoError(t, database.Create(&models.ProductInventoryMaterialMapping{
		BaseModel:     models.BaseModel{ID: "mapping-1"},
		ProductID:     "product-1",
		MaterialID:    "material-1",
		Active:        true,
		MappingSource: "TEST",
	}).Error)
	require.NoError(t, database.Create(&models.Inventory{
		BaseModel:       models.BaseModel{ID: "inventory-finished-product-1"},
		MaterialID:      "material-1",
		MaterialName:    "产品一",
		MaterialCode:    "P-1",
		Quantity:        100,
		TotalValue:      1000,
		AverageUnitCost: 10,
		CategoryCode:    "FINISHED",
		UOM:             "PCS",
	}).Error)
	require.NoError(t, database.Create(&models.Inventory{
		BaseModel:    models.BaseModel{ID: "inventory-outsource-product-1"},
		MaterialID:   "material-1",
		MaterialName: "产品一",
		MaterialCode: "P-1",
		CategoryCode: ProductionOutsourceInventoryCategory,
		UOM:          "PCS",
	}).Error)
	seedProductionScanRoute(t, database, "route-1", "process-a", "process-b")
	order := models.OutsourceOrder{
		BaseModel:           models.BaseModel{ID: "order-1"},
		OrderNo:             "OSO-TEST-1",
		SourceType:          OutsourceOrderSourceSalesOrder,
		SourceID:            "sales-order-1",
		SourceNo:            "SO-1",
		PartnerID:           partner.ID,
		PartnerNameSnapshot: partner.Name,
		Status:              status,
		TotalQuantity:       2,
		UOM:                 "PCS",
		Version:             1,
	}
	line := models.OutsourceOrderLine{
		BaseModel:        models.BaseModel{ID: "line-1"},
		OutsourceOrderID: order.ID,
		LineNo:           1,
		SourceLineID:     "1001",
		ProductID:        "product-1",
		ProductCode:      "P-1",
		ProductName:      "产品一",
		Quantity:         2,
		UOM:              "PCS",
		ProcessStepID:    "process-a",
		ProcessCode:      "process-a",
		ProcessName:      "process-a",
		Status:           status,
		Version:          1,
	}
	require.NoError(t, database.Create(&order).Error)
	require.NoError(t, database.Create(&line).Error)
	return order, line
}

func seedOutsourceBarcodeState(t *testing.T, database *gorm.DB, barcode string) {
	t.Helper()

	require.NoError(t, database.Create(&models.ProductBarcodeState{
		BaseModel:            models.BaseModel{ID: "state-" + barcode},
		ProductBarcode:       barcode,
		ProductID:            "product-1",
		ProductName:          "产品一",
		RouteID:              "route-1",
		RouteStepID:          "route-1-step-process-a",
		CurrentProcessStepID: "process-a",
		Status:               ProductBarcodeStateStatusInProgress,
	}).Error)
}

func seedOutsourceNotificationRule(t *testing.T, database *gorm.DB, targetStatuses ...string) {
	t.Helper()

	statusCodesRaw, err := json.Marshal(targetStatuses)
	require.NoError(t, err)
	require.NoError(t, database.Create(&models.StandardCommand{
		BaseModel:   models.BaseModel{ID: "cmd-outsource-event"},
		ActionType:  "notify",
		BindType:    "workflow",
		NodeType:    "message",
		Title:       "委外单 [OutsourceOrderNo] 状态 [Status]",
		Content:     "产品 [ProductName] / 条码 [ProductBarcode] / 数量 [Quantity][UOM]",
		TargetLink:  "/production-outsourcing/transfers?search=[OutsourceOrderNo]",
		Params:      json.RawMessage(`{}`),
		SourceCode:  businessEventSourceProductionOutsource,
		ActionCode:  businessEventActionStatusChange,
		StatusCodes: statusCodesRaw,
	}).Error)

	segmentsRaw, err := json.Marshal([]RuleSegmentDTO{
		{
			ID:                "segment-outsource-event",
			Title:             "委外执行事件",
			TargetStatuses:    targetStatuses,
			CommandIDs:        []string{"cmd-outsource-event"},
			AssigneeUsernames: []string{"planner"},
			ResolveOnStatuses: []string{
				businessEventOutsourceStatusInspectionAccepted,
				businessEventOutsourceStatusInspectionConcession,
				businessEventOutsourceStatusInspectionScrap,
				OutsourceOrderStatusClosed,
				OutsourceOrderStatusCanceled,
			},
		},
	})
	require.NoError(t, err)
	require.NoError(t, database.Create(&models.NotificationRule{
		BaseModel:  models.BaseModel{ID: "rule-outsource-event"},
		Name:       "委外执行通知",
		Enabled:    true,
		Entity:     businessEventEntitySystem,
		SourceCode: businessEventSourceProductionOutsource,
		ActionCode: businessEventActionStatusChange,
		Segments:   segmentsRaw,
		Version:    1,
	}).Error)
}

func requireOutsourceRuleExecutionLog(t *testing.T, database *gorm.DB, statusCode string, executionType string, executionStatus string) models.RuleExecutionLog {
	t.Helper()

	var logEntry models.RuleExecutionLog
	require.NoError(t, database.
		Where(
			"source_code = ? AND status_code = ? AND execution_type = ? AND execution_status = ?",
			businessEventSourceProductionOutsource,
			statusCode,
			executionType,
			executionStatus,
		).
		First(&logEntry).Error)
	return logEntry
}

func requireOutsourceRuleLogMetadata(t *testing.T, logEntry models.RuleExecutionLog, expected map[string]any) {
	t.Helper()

	var metadata map[string]any
	require.NoError(t, json.Unmarshal(logEntry.Metadata, &metadata))
	for key, value := range expected {
		require.Equal(t, value, metadata[key], key)
	}
}

func requireOutsourceAuditLog(t *testing.T, database *gorm.DB, targetID string, action audit.AuditAction, expected map[string]string) models.AuditLog {
	t.Helper()

	var logs []models.AuditLog
	require.NoError(t, database.
		Where("module = ? AND target_id = ? AND action = ?", AuditModuleOutsourceOrder, targetID, string(action)).
		Find(&logs).Error)
	require.NotEmpty(t, logs)
	for _, logEntry := range logs {
		metadata := decodeOutsourceAuditMetadata(t, logEntry)
		matched := true
		for key, value := range expected {
			if fmt.Sprint(metadata[key]) != value {
				matched = false
				break
			}
		}
		if matched {
			return logEntry
		}
	}
	require.Failf(t, "missing outsource audit log", "target=%s action=%s expected=%v logs=%d", targetID, action, expected, len(logs))
	return models.AuditLog{}
}

func decodeOutsourceAuditMetadata(t *testing.T, logEntry models.AuditLog) map[string]any {
	t.Helper()

	var metadata map[string]any
	require.NoError(t, json.Unmarshal(logEntry.Diff, &metadata))
	return metadata
}

type capturedNotificationPublish struct {
	Channel string
	Payload string
}

func captureNotificationPublisher(t *testing.T, publishErr error) *[]capturedNotificationPublish {
	t.Helper()

	published := make([]capturedNotificationPublish, 0)
	notificationPublisherMu.Lock()
	previous := currentNotificationPublisher
	currentNotificationPublisher = func(_ context.Context, channel string, payload string) error {
		published = append(published, capturedNotificationPublish{Channel: channel, Payload: payload})
		return publishErr
	}
	notificationPublisherMu.Unlock()
	t.Cleanup(func() {
		notificationPublisherMu.Lock()
		currentNotificationPublisher = previous
		notificationPublisherMu.Unlock()
	})
	return &published
}

func decodeCapturedNotificationPayload(t *testing.T, captured capturedNotificationPublish) map[string]any {
	t.Helper()

	var payload map[string]any
	require.NoError(t, json.Unmarshal([]byte(captured.Payload), &payload))
	return payload
}

func TestOutsourceTransferRejectsDraftOrder(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusDraft)
	seedOutsourceBarcodeState(t, database, "BC-001")

	_, err := service.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-001",
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "tester",
	})

	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
}

func TestOutsourceTransferRequiresExplicitInventoryCategories(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	seedOutsourceBarcodeState(t, database, "BC-CATEGORY-REQUIRED")

	_, err := service.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-CATEGORY-REQUIRED",
		Quantity:             1,
		UOM:                  "PCS",
		Operator:             "tester",
	})

	require.Error(t, err)
	var transferCount int64
	require.NoError(t, database.Model(&models.OutsourceTransfer{}).
		Where("outsource_order_line_id = ?", line.ID).
		Count(&transferCount).Error)
	require.Zero(t, transferCount)
	var ledgerCount int64
	require.NoError(t, database.Model(&models.InventoryLedgerEntry{}).
		Where("source_type = ?", DedicatedInventorySourceProductionOutsource).
		Count(&ledgerCount).Error)
	require.Zero(t, ledgerCount)
}

func TestProductionOutsourceInventoryAdapterRollsBackOnShortage(t *testing.T) {
	_, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)

	err := database.Transaction(func(tx *gorm.DB) error {
		_, err := applyProductionOutsourceInventoryTransferTx(tx, productionOutsourceInventoryTransferInput{
			TransferID:         "00000000-0000-0000-0000-000000000901",
			TransferType:       OutsourceTransferTypeSend,
			ProductID:          line.ProductID,
			ProductCode:        line.ProductCode,
			Quantity:           101,
			UOM:                "PCS",
			SourceCategory:     "FINISHED",
			TargetCategory:     ProductionOutsourceInventoryCategory,
			OutsourceOrderID:   line.OutsourceOrderID,
			OutsourceOrderLine: line.ID,
			Operator:           "tester",
		})
		return err
	})

	require.Error(t, err)
	var source models.Inventory
	require.NoError(t, database.Where("category_code = ?", "FINISHED").First(&source).Error)
	require.Equal(t, float64(100), source.Quantity)
	var target models.Inventory
	require.NoError(t, database.Where("category_code = ?", ProductionOutsourceInventoryCategory).First(&target).Error)
	require.Zero(t, target.Quantity)
	var ledgerCount int64
	require.NoError(t, database.Model(&models.InventoryLedgerEntry{}).Count(&ledgerCount).Error)
	require.Zero(t, ledgerCount)
}

func TestOutsourceReleaseDispatchesBusinessEvent(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	order, _ := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusDraft)
	seedOutsourceNotificationRule(t, database, OutsourceOrderStatusReleased)
	published := captureNotificationPublisher(t, nil)

	released, err := service.ReleaseOutsourceOrder(ReleaseOutsourceOrderRequest{
		ID:       order.ID,
		ActorID:  "user-1",
		Operator: "tester",
		IP:       "127.0.0.1",
	})

	require.NoError(t, err)
	require.Equal(t, OutsourceOrderStatusReleased, released.Status)
	matchLog := requireOutsourceRuleExecutionLog(t, database, OutsourceOrderStatusReleased, "match", "matched")
	requireOutsourceRuleLogMetadata(t, matchLog, map[string]any{
		"outsourceOrderNo": "OSO-TEST-1",
		"eventStatus":      OutsourceOrderStatusReleased,
		"orderStatus":      OutsourceOrderStatusReleased,
	})
	notifyLog := requireOutsourceRuleExecutionLog(t, database, OutsourceOrderStatusReleased, "notify", "success")
	require.Equal(t, "委外单 OSO-TEST-1 状态 RELEASED", notifyLog.Title)
	require.Equal(t, "/production-outsourcing/transfers?search=OSO-TEST-1", notifyLog.ActionURL)
	auditLog := requireOutsourceAuditLog(t, database, order.ID, audit.AuditActionStatus, map[string]string{
		"orderNo": "OSO-TEST-1",
		"from":    OutsourceOrderStatusDraft,
		"to":      OutsourceOrderStatusReleased,
	})
	require.Equal(t, "tester", auditLog.Operator)
	require.Equal(t, "127.0.0.1", auditLog.IP)
	require.Len(t, *published, 1)
	require.Equal(t, notificationChannel, (*published)[0].Channel)
	payload := decodeCapturedNotificationPayload(t, (*published)[0])
	require.Equal(t, "Workflow", payload["module"])
	require.Equal(t, businessEventActionStatusChange, payload["action"])
	require.Equal(t, "委外单 OSO-TEST-1 状态 RELEASED", payload["title"])
	require.Equal(t, "planner", payload["targetUser"])
	innerPayload, ok := payload["payload"].(map[string]any)
	require.True(t, ok)
	require.Equal(t, order.ID, innerPayload["targetId"])
	require.Equal(t, businessEventSourceProductionOutsource, innerPayload["sourceCode"])
	require.Equal(t, OutsourceOrderStatusReleased, innerPayload["status"])
}

func TestOutsourceNotificationPublishFailureWritesRuleExecutionLog(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	order, _ := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusDraft)
	seedOutsourceNotificationRule(t, database, OutsourceOrderStatusReleased)
	publishErr := errors.New("redis publish unavailable")
	published := captureNotificationPublisher(t, publishErr)

	released, err := service.ReleaseOutsourceOrder(ReleaseOutsourceOrderRequest{
		ID:       order.ID,
		ActorID:  "user-1",
		Operator: "tester",
		IP:       "127.0.0.1",
	})

	require.NoError(t, err)
	require.Equal(t, OutsourceOrderStatusReleased, released.Status)
	require.Len(t, *published, 1)
	failedLog := requireOutsourceRuleExecutionLog(t, database, OutsourceOrderStatusReleased, "notify", "failed")
	require.Equal(t, "redis publish unavailable", failedLog.ErrorMessage)
	require.Equal(t, "委外单 OSO-TEST-1 状态 RELEASED", failedLog.Title)
	requireOutsourceRuleLogMetadata(t, failedLog, map[string]any{
		"outsourceOrderNo": "OSO-TEST-1",
		"eventStatus":      OutsourceOrderStatusReleased,
		"orderStatus":      OutsourceOrderStatusReleased,
	})
}

func TestOutsourceCancelDispatchesBusinessEvent(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	order, _ := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	seedOutsourceNotificationRule(t, database, OutsourceOrderStatusCanceled)

	canceled, err := service.CancelOutsourceOrder(CancelOutsourceOrderRequest{
		ID:       order.ID,
		ActorID:  "user-1",
		Operator: "tester",
		IP:       "127.0.0.1",
	})

	require.NoError(t, err)
	require.Equal(t, OutsourceOrderStatusCanceled, canceled.Status)
	require.Equal(t, OutsourceOrderStatusCanceled, canceled.Lines[0].Status)
	cancelLog := requireOutsourceRuleExecutionLog(t, database, OutsourceOrderStatusCanceled, "notify", "success")
	requireOutsourceRuleLogMetadata(t, cancelLog, map[string]any{
		"outsourceOrderNo": "OSO-TEST-1",
		"eventStatus":      OutsourceOrderStatusCanceled,
		"orderStatus":      OutsourceOrderStatusCanceled,
	})
	auditLog := requireOutsourceAuditLog(t, database, order.ID, audit.AuditActionStatus, map[string]string{
		"orderNo": "OSO-TEST-1",
		"from":    OutsourceOrderStatusReleased,
		"to":      OutsourceOrderStatusCanceled,
	})
	require.Equal(t, "tester", auditLog.Operator)
	require.Equal(t, "127.0.0.1", auditLog.IP)
}

func TestOutsourceCancelRejectsStartedOrder(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	order, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusSent)
	require.NoError(t, database.Model(&models.OutsourceOrderLine{}).
		Where("id = ?", line.ID).
		Updates(map[string]any{
			"sent_quantity": 1,
			"status":        OutsourceOrderStatusSent,
		}).Error)

	_, err := service.CancelOutsourceOrder(CancelOutsourceOrderRequest{
		ID:       order.ID,
		ActorID:  "user-1",
		Operator: "tester",
	})

	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
}

func TestOutsourceSendReturnAndInspectionUpdateFactsAndBarcodeState(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	seedOutsourceBarcodeState(t, database, "BC-002")
	seedOutsourceNotificationRule(
		t,
		database,
		OutsourceOrderStatusSent,
		OutsourceOrderStatusReturned,
		businessEventOutsourceStatusInspectionAccepted,
		OutsourceOrderStatusClosed,
	)

	send, err := service.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-002",
		Quantity:             2,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		ActorID:              "user-1",
		Operator:             "tester",
		IP:                   "127.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, OutsourceTransferTypeSend, send.Transfer.TransferType)
	require.Equal(t, float64(2), send.Order.Lines[0].SentQuantity)
	require.Equal(t, OutsourceOrderStatusSent, send.Order.Status)
	sentLog := requireOutsourceRuleExecutionLog(t, database, OutsourceOrderStatusSent, "notify", "success")
	requireOutsourceRuleLogMetadata(t, sentLog, map[string]any{
		"outsourceOrderLineId": line.ID,
		"productBarcode":       "BC-002",
		"transferType":         OutsourceTransferTypeSend,
		"eventStatus":          OutsourceOrderStatusSent,
	})
	sendAudit := requireOutsourceAuditLog(t, database, send.Order.ID, audit.AuditActionStatus, map[string]string{
		"action":         "OUTSOURCE_" + OutsourceTransferTypeSend,
		"transferId":     send.Transfer.ID,
		"productBarcode": "BC-002",
		"quantity":       "2",
		"status":         OutsourceOrderStatusSent,
	})
	require.Equal(t, "tester", sendAudit.Operator)
	require.Equal(t, "127.0.0.1", sendAudit.IP)

	returned, err := service.ReturnOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-002",
		Quantity:             2,
		UOM:                  "PCS",
		SourceCategory:       ProductionOutsourceInventoryCategory,
		TargetCategory:       "FINISHED",
		ActorID:              "user-1",
		Operator:             "tester",
		IP:                   "127.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, OutsourceTransferTypeReturn, returned.Transfer.TransferType)
	require.Equal(t, float64(2), returned.Order.Lines[0].ReturnedQuantity)
	returnedLog := requireOutsourceRuleExecutionLog(t, database, OutsourceOrderStatusReturned, "notify", "success")
	requireOutsourceRuleLogMetadata(t, returnedLog, map[string]any{
		"outsourceOrderLineId": line.ID,
		"productBarcode":       "BC-002",
		"transferType":         OutsourceTransferTypeReturn,
		"eventStatus":          OutsourceOrderStatusReturned,
	})
	requireOutsourceAuditLog(t, database, returned.Order.ID, audit.AuditActionStatus, map[string]string{
		"action":         "OUTSOURCE_" + OutsourceTransferTypeReturn,
		"transferId":     returned.Transfer.ID,
		"productBarcode": "BC-002",
		"quantity":       "2",
		"status":         OutsourceOrderStatusReturned,
	})

	inspection, err := service.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-002",
		Result:               OutsourceInspectionResultPass,
		InspectedQuantity:    2,
		UOM:                  "PCS",
		ActorID:              "user-1",
		Operator:             "tester",
		IP:                   "127.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, OutsourceInspectionDispositionAccept, inspection.Inspection.Disposition)
	require.Equal(t, ProductionOperationActionComplete, inspection.Scan.Operation.Action)
	require.Equal(t, "route-1-step-process-b", inspection.Scan.State.RouteStepID)
	require.Equal(t, float64(2), inspection.Order.Lines[0].AcceptedQuantity)
	require.Equal(t, OutsourceOrderStatusClosed, inspection.Order.Status)
	acceptedLog := requireOutsourceRuleExecutionLog(t, database, businessEventOutsourceStatusInspectionAccepted, "notify", "success")
	requireOutsourceRuleLogMetadata(t, acceptedLog, map[string]any{
		"outsourceOrderLineId": line.ID,
		"productBarcode":       "BC-002",
		"inspectionResult":     OutsourceInspectionResultPass,
		"eventStatus":          businessEventOutsourceStatusInspectionAccepted,
	})
	closedLog := requireOutsourceRuleExecutionLog(t, database, OutsourceOrderStatusClosed, "notify", "success")
	requireOutsourceRuleLogMetadata(t, closedLog, map[string]any{
		"outsourceOrderNo": "OSO-TEST-1",
		"inspectionId":     inspection.Inspection.ID,
		"productBarcode":   "BC-002",
		"eventStatus":      OutsourceOrderStatusClosed,
		"orderStatus":      OutsourceOrderStatusClosed,
	})
	requireOutsourceAuditLog(t, database, inspection.Order.ID, audit.AuditActionStatus, map[string]string{
		"action":         "OUTSOURCE_INSPECT",
		"inspectionId":   inspection.Inspection.ID,
		"productBarcode": "BC-002",
		"result":         OutsourceInspectionResultPass,
		"disposition":    OutsourceInspectionDispositionAccept,
		"quantity":       "2",
		"status":         OutsourceOrderStatusClosed,
	})

	var transferEvents int64
	require.NoError(t, database.Model(&models.ProductBarcodeTransferEvent{}).Where("product_barcode = ?", "BC-002").Count(&transferEvents).Error)
	require.GreaterOrEqual(t, transferEvents, int64(3))
}

func TestOutsourceInspectionUsesConfiguredReworkRouteTarget(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	seedOutsourceBarcodeState(t, database, "BC-008")
	require.NoError(t, database.Model(&models.ProductionRouteStep{}).
		Where("id = ?", "route-1-step-process-a").
		Update("quality_routing", `{"REWORK":{"targetRouteStepId":"route-1-step-process-b","targetProcessStepId":"process-b"}}`).Error)

	_, err := service.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-008",
		Quantity:             2,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "tester",
	})
	require.NoError(t, err)
	_, err = service.ReturnOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-008",
		Quantity:             2,
		UOM:                  "PCS",
		SourceCategory:       ProductionOutsourceInventoryCategory,
		TargetCategory:       "FINISHED",
		Operator:             "tester",
	})
	require.NoError(t, err)

	inspection, err := service.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-008",
		Result:               OutsourceInspectionResultFail,
		Disposition:          OutsourceInspectionDispositionRework,
		InspectedQuantity:    2,
		UOM:                  "PCS",
		Operator:             "tester",
	})

	require.NoError(t, err)
	require.Equal(t, ProductionOperationActionRework, inspection.Scan.Operation.Action)
	require.Equal(t, ProductBarcodeStateStatusRework, inspection.Scan.State.Status)
	require.Equal(t, "route-1-step-process-b", inspection.Scan.State.RouteStepID)
	require.Equal(t, "process-b", inspection.Scan.State.CurrentProcessStepID)
	require.Equal(t, float64(2), inspection.Order.Lines[0].ReworkQuantity)
	require.Equal(t, OutsourceOrderStatusClosed, inspection.Order.Status)
	require.Len(t, inspection.Scan.TransferEvents, 1)
	require.Equal(t, ProductBarcodeTransferTypeRouteAdvance, inspection.Scan.TransferEvents[0].TransferType)
	require.Equal(t, QualityInspectionTaskStatusCompleted, inspection.InspectionTask.Status)
	require.Equal(t, OutsourceInspectionResultFail, inspection.InspectionTask.Result)

	var abnormality models.QualityAbnormality
	require.NoError(t, database.
		Where("task_id = ?", inspection.InspectionTask.ID).
		First(&abnormality).Error)
	require.Equal(t, OutsourceInspectionDispositionRework, abnormality.DisposalMethod)
	require.Equal(t, "OPEN", abnormality.Status)
}

func TestOutsourceInspectionTaskIsClaimedBeforeJudgment(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	seedOutsourceBarcodeState(t, database, "BC-008-CLAIM")

	_, err := service.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-008-CLAIM",
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "user-a",
	})
	require.NoError(t, err)
	_, err = service.ReturnOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-008-CLAIM",
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       ProductionOutsourceInventoryCategory,
		TargetCategory:       "FINISHED",
		Operator:             "user-a",
	})
	require.NoError(t, err)

	task, err := service.PrepareOutsourceInspectionTask(OutsourceInspectionTaskRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-008-CLAIM",
		SampleQty:            1,
		UOM:                  "PCS",
		Operator:             "user-a",
	})
	require.NoError(t, err)
	require.Equal(t, QualityInspectionTaskStatusClaimed, task.Status)
	require.Equal(t, "user-a", task.ClaimedBy)

	_, err = service.PrepareOutsourceInspectionTask(OutsourceInspectionTaskRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-008-CLAIM",
		SampleQty:            1,
		UOM:                  "PCS",
		Operator:             "user-b",
	})
	require.ErrorIs(t, err, ErrQualityInspectionTaskClaimed)
}

func TestOutsourceReturnRejectsDuplicateBarcodeFact(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	seedOutsourceBarcodeState(t, database, "BC-009")

	_, err := service.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-009",
		Quantity:             2,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "tester",
	})
	require.NoError(t, err)
	_, err = service.ReturnOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-009",
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       ProductionOutsourceInventoryCategory,
		TargetCategory:       "FINISHED",
		Operator:             "tester",
	})
	require.NoError(t, err)

	_, err = service.ReturnOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-009",
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       ProductionOutsourceInventoryCategory,
		TargetCategory:       "FINISHED",
		Operator:             "tester",
	})

	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	var returnCount int64
	require.NoError(t, database.Model(&models.OutsourceTransfer{}).
		Where("outsource_order_line_id = ? AND transfer_type = ? AND product_barcode = ?", line.ID, OutsourceTransferTypeReturn, "BC-009").
		Count(&returnCount).Error)
	require.Equal(t, int64(1), returnCount)
}

func TestOutsourceInspectionRejectsDuplicateBarcodeFact(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	seedOutsourceBarcodeState(t, database, "BC-010")

	_, err := service.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-010",
		Quantity:             2,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "tester",
	})
	require.NoError(t, err)
	_, err = service.ReturnOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-010",
		Quantity:             2,
		UOM:                  "PCS",
		SourceCategory:       ProductionOutsourceInventoryCategory,
		TargetCategory:       "FINISHED",
		Operator:             "tester",
	})
	require.NoError(t, err)
	_, err = service.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-010",
		Result:               OutsourceInspectionResultPass,
		InspectedQuantity:    1,
		UOM:                  "PCS",
		Operator:             "tester",
	})
	require.NoError(t, err)

	_, err = service.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-010",
		Result:               OutsourceInspectionResultPass,
		InspectedQuantity:    1,
		UOM:                  "PCS",
		Operator:             "tester",
	})

	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	var inspectionCount int64
	require.NoError(t, database.Model(&models.OutsourceInspection{}).
		Where("outsource_order_line_id = ? AND product_barcode = ?", line.ID, "BC-010").
		Count(&inspectionCount).Error)
	require.Equal(t, int64(1), inspectionCount)
}

func TestOutsourceCanceledOrderRejectsAllExecutionActions(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusCanceled)
	seedOutsourceBarcodeState(t, database, "BC-011")

	_, err := service.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-011",
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "tester",
	})
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	_, err = service.ReturnOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-011",
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       ProductionOutsourceInventoryCategory,
		TargetCategory:       "FINISHED",
		Operator:             "tester",
	})
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	_, err = service.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-011",
		Result:               OutsourceInspectionResultPass,
		InspectedQuantity:    1,
		UOM:                  "PCS",
		Operator:             "tester",
	})
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)

	var transferCount int64
	require.NoError(t, database.Model(&models.OutsourceTransfer{}).Where("outsource_order_line_id = ?", line.ID).Count(&transferCount).Error)
	require.Zero(t, transferCount)
	var inspectionCount int64
	require.NoError(t, database.Model(&models.OutsourceInspection{}).Where("outsource_order_line_id = ?", line.ID).Count(&inspectionCount).Error)
	require.Zero(t, inspectionCount)
}

func TestOutsourceExecutionUniqueConstraintErrorsNormalizeAsBusinessErrors(t *testing.T) {
	_, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	now := time.Now().UTC()

	transfer := models.OutsourceTransfer{
		BaseModel:            models.BaseModel{ID: "transfer-unique-1"},
		TransferNo:           "OST-UNIQUE-1",
		OutsourceOrderID:     line.OutsourceOrderID,
		OutsourceOrderLineID: line.ID,
		TransferType:         OutsourceTransferTypeSend,
		ProductBarcode:       "BC-UNIQUE",
		Quantity:             1,
		UOM:                  "PCS",
		OccurredAt:           &now,
	}
	require.NoError(t, database.Create(&transfer).Error)
	transfer.ID = "transfer-unique-2"
	transfer.TransferNo = "OST-UNIQUE-2"
	err := database.Create(&transfer).Error
	require.Error(t, err)
	require.ErrorIs(t, normalizeOutsourceExecutionError(err), ErrInvalidOutsourceOrder)

	inspection := models.OutsourceInspection{
		BaseModel:            models.BaseModel{ID: "inspection-unique-1"},
		InspectionNo:         "OSI-UNIQUE-1",
		OutsourceOrderID:     line.OutsourceOrderID,
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-UNIQUE",
		Result:               OutsourceInspectionResultPass,
		Disposition:          OutsourceInspectionDispositionAccept,
		InspectedQuantity:    1,
		AcceptedQuantity:     1,
		UOM:                  "PCS",
		InspectedAt:          &now,
	}
	require.NoError(t, database.Create(&inspection).Error)
	inspection.ID = "inspection-unique-2"
	inspection.InspectionNo = "OSI-UNIQUE-2"
	err = database.Create(&inspection).Error
	require.Error(t, err)
	require.ErrorIs(t, normalizeOutsourceExecutionError(err), ErrInvalidOutsourceOrder)
}

func TestOutsourceReturnRequiresPriorSend(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	seedOutsourceBarcodeState(t, database, "BC-003")

	_, err := service.ReturnOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-003",
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       ProductionOutsourceInventoryCategory,
		TargetCategory:       "FINISHED",
		Operator:             "tester",
	})

	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
}

func TestOutsourceReturnRejectsQuantityAboveBarcodeSend(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	seedOutsourceBarcodeState(t, database, "BC-005")
	seedOutsourceBarcodeState(t, database, "BC-006")

	_, err := service.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-005",
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "tester",
	})
	require.NoError(t, err)
	_, err = service.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-006",
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "tester",
	})
	require.NoError(t, err)

	_, err = service.ReturnOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-005",
		Quantity:             2,
		UOM:                  "PCS",
		SourceCategory:       ProductionOutsourceInventoryCategory,
		TargetCategory:       "FINISHED",
		Operator:             "tester",
	})

	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
}

func TestOutsourceSendRejectsOverQuantity(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	seedOutsourceBarcodeState(t, database, "BC-004")

	_, err := service.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-004",
		Quantity:             3,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "tester",
	})

	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
}
