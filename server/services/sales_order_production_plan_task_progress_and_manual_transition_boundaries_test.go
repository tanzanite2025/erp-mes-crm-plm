package services

import (
	"encoding/json"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func openSalesOrderProductionProgressSynchronizationTestDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	database, _ := openSalesOrderStableLineIdentityTransactionTestDatabase(t)
	for _, statement := range []string{
		`CREATE TABLE production_plans (id TEXT PRIMARY KEY, order_id TEXT, sales_order_line_id INTEGER, order_no TEXT, product_id TEXT, product_name TEXT, quantity REAL, status TEXT, start_date DATETIME, end_date DATETIME, notes TEXT, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME)`,
		`CREATE TABLE production_tasks (id TEXT PRIMARY KEY, plan_id TEXT, batch_no TEXT, process_id TEXT, process_name TEXT, target_qty REAL, actual_qty REAL, status TEXT, operator TEXT, started_at DATETIME, completed_at DATETIME)`,
		`CREATE TABLE production_execution_lots (id TEXT PRIMARY KEY, plan_id TEXT, task_id TEXT, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	return database
}

func loadSalesOrderProductionProgressSynchronizationTestOrder(t *testing.T, database *gorm.DB) models.SalesOrder {
	t.Helper()
	var order models.SalesOrder
	require.NoError(t, database.Preload("Lines", func(query *gorm.DB) *gorm.DB { return query.Order("id") }).First(&order, "id = ?", "order-1").Error)
	return order
}

func TestSalesOrderProductionPlansAndTasksDriveOnlyTheirStableLineAndDoNotCompleteSales(t *testing.T) {
	database := openSalesOrderProductionProgressSynchronizationTestDatabase(t)
	// Two lines may describe the same product. Product matching must never mark both.
	require.NoError(t, database.Model(&models.SalesOrderLine{}).Where("sales_order_id = ?", "order-1").Update("product_model", "SAME").Error)
	require.NoError(t, database.Exec(`INSERT INTO production_plans (id,order_id,sales_order_line_id,status) VALUES ('plan-1','order-1',101,'SCHEDULED')`).Error)
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error { return SynchronizeSalesOrderProductionPlanAndTaskProgressTx(tx, "order-1") }))
	order := loadSalesOrderProductionProgressSynchronizationTestOrder(t, database)
	require.Equal(t, "Scheduling", order.Status)
	require.Equal(t, "Scheduling", order.Lines[0].Status)
	require.Equal(t, "Pending", order.Lines[1].Status)
	require.Equal(t, 5, order.Version)
	// Replays and ordinary sales recalculation preserve progress without version churn.
	require.NoError(t, SynchronizeSalesOrderProductionPlanAndTaskProgressTx(database, "order-1"))
	_, err := RecalculateSalesOrderStatusTx(database, "order-1")
	require.NoError(t, err)
	require.Equal(t, 5, loadSalesOrderProductionProgressSynchronizationTestOrder(t, database).Version)
	require.NoError(t, database.Exec(`INSERT INTO production_tasks (id,plan_id,status) VALUES ('task-1','plan-1','RUNNING')`).Error)
	require.NoError(t, SynchronizeSalesOrderProductionPlanAndTaskProgressTx(database, "order-1"))
	order = loadSalesOrderProductionProgressSynchronizationTestOrder(t, database)
	require.Equal(t, "InProgress", order.Status)
	require.Equal(t, "InProgress", order.Lines[0].Status)
	require.Equal(t, "Pending", order.Lines[1].Status)
	require.Equal(t, 6, order.Version)
	require.NoError(t, database.Exec(`UPDATE production_plans SET status='COMPLETED'`).Error)
	require.NoError(t, database.Exec(`UPDATE production_tasks SET status='DONE'`).Error)
	require.NoError(t, SynchronizeSalesOrderProductionPlanAndTaskProgressTx(database, "order-1"))
	require.Equal(t, "InProgress", loadSalesOrderProductionProgressSynchronizationTestOrder(t, database).Status)
	// Production completion does not replace delivery fulfillment.
	require.NoError(t, database.Model(&models.SalesOrderLine{}).Where("sales_order_id = ?", "order-1").Update("delivered_qty", gorm.Expr("qty")).Error)
	completed, err := RecalculateSalesOrderStatusTx(database, "order-1")
	require.NoError(t, err)
	require.Equal(t, "Done", completed.Status)
	require.NoError(t, SynchronizeSalesOrderProductionPlanAndTaskProgressTx(database, "order-1"))
	require.Equal(t, "Done", loadSalesOrderProductionProgressSynchronizationTestOrder(t, database).Status)
}

func TestSalesOrderProductionPlanCancellationAndLegacySourceBoundaries(t *testing.T) {
	for _, initial := range []string{"Pending", "Scheduling", "InProgress", "Draft", "Canceled", "Done"} {
		t.Run(initial, func(t *testing.T) {
			database := openSalesOrderProductionProgressSynchronizationTestDatabase(t)
			require.NoError(t, database.Model(&models.SalesOrder{}).Where("id = ?", "order-1").Update("status", initial).Error)
			// Legacy plans without a stable line ID can update only the order.
			require.NoError(t, database.Exec(`INSERT INTO production_plans (id,order_id,status) VALUES ('legacy','order-1','SCHEDULED')`).Error)
			require.NoError(t, SynchronizeSalesOrderProductionPlanAndTaskProgressTx(database, "order-1"))
			order := loadSalesOrderProductionProgressSynchronizationTestOrder(t, database)
			if initial == "Pending" || initial == "Scheduling" {
				require.Equal(t, "Scheduling", order.Status)
			} else {
				require.Equal(t, initial, order.Status)
			}
			require.Equal(t, "Pending", order.Lines[0].Status)
			require.ErrorIs(t, rejectSalesOrderCancellationWithActiveProductionPlansTx(database, "order-1"), ErrSalesTransactionInvalidPayload)
			require.NoError(t, database.Exec(`UPDATE production_plans SET status='CANCELED'`).Error)
			require.NoError(t, SynchronizeSalesOrderProductionPlanAndTaskProgressTx(database, "order-1"))
			require.NoError(t, rejectSalesOrderCancellationWithActiveProductionPlansTx(database, "order-1"))
			order = loadSalesOrderProductionProgressSynchronizationTestOrder(t, database)
			if initial == "Pending" || initial == "Scheduling" {
				require.Equal(t, "Pending", order.Status)
			} else {
				require.Equal(t, initial, order.Status)
			}
		})
	}
}

func TestSalesOrderClaimAndManualCommandsCannotInventProductionProgress(t *testing.T) {
	database := openSalesOrderProductionProgressSynchronizationTestDatabase(t)
	for index, lineNo := range []int{1, 2} {
		saved, err := executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderLineClaim, 4+index,
			SalesOrderLineClaimPayload{LineNos: []int{lineNo}, Operator: "planner"})
		require.NoError(t, err)
		require.Equal(t, "Pending", saved.Status)
	}
	for _, status := range []string{"Scheduling", "InProgress", "Done"} {
		_, err := executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentStatusTransition, 6,
			SalesOrderStatusTransitionPayload{Status: status})
		require.ErrorIs(t, err, ErrSalesTransactionInvalidPayload)
		order := loadSalesOrderProductionProgressSynchronizationTestOrder(t, database)
		_, err = executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderSave, 6, SalesOrderSavePayload{
			Delta:     map[string]json.RawMessage{"status": json.RawMessage(`{}`), "requirements": json.RawMessage(`{}`)},
			FinalData: SalesOrderSnapshotRequest{ID: order.ID, OrderNo: order.OrderNo, Status: status, Requirements: "changed", Lines: convertSalesOrderLinesToStableIdentityTransactionTestRequests(t, order.Lines)},
		})
		require.ErrorIs(t, err, ErrSalesTransactionInvalidPayload)
		require.Equal(t, 6, loadSalesOrderProductionProgressSynchronizationTestOrder(t, database).Version)
	}
}

func TestProductionPlanSourceValidationRejectsInvalidOrdersAndForeignStableLines(t *testing.T) {
	database := openSalesOrderProductionProgressSynchronizationTestDatabase(t)
	for _, status := range []string{"Draft", "Done", "Canceled"} {
		require.NoError(t, database.Model(&models.SalesOrder{}).Where("id = ?", "order-1").Update("status", status).Error)
		plan := models.ProductionPlan{OrderID: "order-1", SalesOrderLineID: 101, Status: "SCHEDULED"}
		require.ErrorIs(t, ValidateProductionPlanSalesOrderSourceTx(database, &plan, nil), ErrSalesTransactionInvalidPayload)
		_, err := executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderLineClaim, 4, SalesOrderLineClaimPayload{LineNos: []int{1}})
		require.ErrorIs(t, err, ErrSalesTransactionInvalidPayload)
	}
	for _, status := range []string{"Pending", "Scheduling", "InProgress"} {
		require.NoError(t, database.Model(&models.SalesOrder{}).Where("id = ?", "order-1").Update("status", status).Error)
		plan := models.ProductionPlan{OrderID: "order-1", SalesOrderLineID: 101, Status: "SCHEDULED"}
		require.NoError(t, ValidateProductionPlanSalesOrderSourceTx(database, &plan, nil))
		plan.SalesOrderLineID = 201
		require.ErrorIs(t, ValidateProductionPlanSalesOrderSourceTx(database, &plan, nil), ErrSalesTransactionInvalidPayload)
	}
	require.NoError(t, database.Model(&models.SalesOrder{}).Where("id = ?", "order-1").Update("classification", " quote ").Error)
	plan := models.ProductionPlan{OrderID: "order-1", Status: "SCHEDULED"}
	require.ErrorIs(t, ValidateProductionPlanSalesOrderSourceTx(database, &plan, nil), gorm.ErrRecordNotFound)
}

func TestProductionExecutionRequiresExplicitPlanSourceToAdvanceSalesOrder(t *testing.T) {
	database := openSalesOrderProductionProgressSynchronizationTestDatabase(t)
	require.NoError(t, SynchronizeSalesOrderProductionProgressFromExecutionLotTx(database, ""))
	require.NoError(t, database.Exec(`INSERT INTO production_execution_lots (id,plan_id) VALUES ('unlinked',''),('linked','plan-1')`).Error)
	require.NoError(t, SynchronizeSalesOrderProductionProgressFromExecutionLotTx(database, "unlinked"))
	require.Equal(t, "Pending", loadSalesOrderProductionProgressSynchronizationTestOrder(t, database).Status)
	require.NoError(t, database.Exec(`INSERT INTO production_plans (id,order_id,sales_order_line_id,status) VALUES ('plan-1','order-1',101,'SCHEDULED')`).Error)
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		return SynchronizeSalesOrderProductionProgressFromExecutionLotTx(tx, "linked")
	}))
	order := loadSalesOrderProductionProgressSynchronizationTestOrder(t, database)
	require.Equal(t, "InProgress", order.Status)
	require.Equal(t, "InProgress", order.Lines[0].Status)
	require.Equal(t, "Pending", order.Lines[1].Status)
	require.NoError(t, SynchronizeSalesOrderProductionProgressFromExecutionLotTx(database, "linked"))
	require.Equal(t, order.Version, loadSalesOrderProductionProgressSynchronizationTestOrder(t, database).Version)
}

func TestSalesOrderBulkSyncCannotInventProductionOrDeliveryProgress(t *testing.T) {
	database := openSalesOrderProductionProgressSynchronizationTestDatabase(t)
	for _, status := range []string{"Scheduling", "InProgress", "Done", "Canceled"} {
		order := loadSalesOrderProductionProgressSynchronizationTestOrder(t, database)
		order.Status = status
		err := database.Transaction(func(tx *gorm.DB) error { return SaveSalesOrderForBulkSync(tx, &order) })
		require.ErrorIs(t, err, ErrSalesTransactionInvalidPayload)
		require.Equal(t, "Pending", loadSalesOrderProductionProgressSynchronizationTestOrder(t, database).Status)
		order.ID, order.OrderNo = "new-order", "SO-NEW"
		order.Lines = nil
		err = database.Transaction(func(tx *gorm.DB) error { return SaveSalesOrderForBulkSync(tx, &order) })
		require.ErrorIs(t, err, ErrSalesTransactionInvalidPayload)
	}
}

func TestCuttingIssuanceSourceUsesConfirmedActiveOrdersAndStableLineIdentity(t *testing.T) {
	database := openSalesOrderProductionProgressSynchronizationTestDatabase(t)
	for _, status := range []string{"Pending", "Scheduling", "InProgress", "Draft", "Done", "Canceled"} {
		require.NoError(t, database.Model(&models.SalesOrder{}).Where("id = ?", "order-1").Update("status", status).Error)
		line, err := loadSalesOrderLineSnapshot(database, CreateCuttingIssuanceExecutionRequest{OrderID: "order-1", OrderNo: "SO-1", SalesOrderLineNo: 1}, false)
		if status == "Pending" || status == "Scheduling" || status == "InProgress" {
			require.NoError(t, err)
			require.EqualValues(t, 101, line.SalesOrderLineID)
		} else {
			require.ErrorIs(t, err, ErrSalesTransactionInvalidPayload)
		}
	}
}

func TestSalesOrderConfirmationAndCancellationUseDedicatedCommands(t *testing.T) {
	database := openSalesOrderProductionProgressSynchronizationTestDatabase(t)
	require.NoError(t, database.Model(&models.SalesOrder{}).Where("id = ?", "order-1").Update("status", "Draft").Error)
	confirmed, err := executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentStatusTransition, 4, SalesOrderStatusTransitionPayload{Status: "Pending"})
	require.NoError(t, err)
	require.Equal(t, "Pending", confirmed.Status)
	require.NoError(t, database.Exec(`INSERT INTO production_plans (id,order_id,sales_order_line_id,status) VALUES ('plan-1','order-1',101,'SCHEDULED')`).Error)
	require.NoError(t, SynchronizeSalesOrderProductionPlanAndTaskProgressTx(database, "order-1"))
	_, err = executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderCancel, 6, SalesOrderCancelPayload{Reason: "cancel"})
	require.ErrorIs(t, err, ErrSalesTransactionInvalidPayload)
	require.Equal(t, 6, loadSalesOrderProductionProgressSynchronizationTestOrder(t, database).Version)
	require.NoError(t, database.Exec(`UPDATE production_plans SET status='CANCELED'`).Error)
	require.NoError(t, SynchronizeSalesOrderProductionPlanAndTaskProgressTx(database, "order-1"))
	canceled, err := executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderCancel, 7, SalesOrderCancelPayload{Reason: "cancel"})
	require.NoError(t, err)
	require.Equal(t, "Canceled", canceled.Status)
	require.NoError(t, SynchronizeSalesOrderProductionPlanAndTaskProgressTx(database, "order-1"))
	require.Equal(t, "Canceled", loadSalesOrderProductionProgressSynchronizationTestOrder(t, database).Status)
}
