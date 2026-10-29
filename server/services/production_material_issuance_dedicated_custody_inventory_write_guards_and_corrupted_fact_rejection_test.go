package services

import (
	"context"
	"testing"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestProductionMaterialIssuanceWarehouseCustodyCannotBeChangedThroughGenericInventoryPaths(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseMovementTransactionTestDatabase(t)
	ctx := context.Background()
	confirmed, err := ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, ProductionMaterialIssuanceCommandActor{UserID: "warehouse-user"}, buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "dedicated-issue", models.ProductionMaterialMovementIssue, 1, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 101, Quantity: 10}))
	require.NoError(t, err)
	previousDatabase := appdb.DB
	appdb.DB = database
	t.Cleanup(func() { appdb.DB = previousDatabase })
	pending := models.ProductionMaterialPendingConsumptionWarehouseCategoryCode
	for _, sourceType := range []string{DedicatedInventorySourceProductionMaterialIssuance, " production_material_issuance "} {
		require.True(t, isDedicatedInventoryExecutionSourceType(sourceType))
		require.ErrorIs(t, CreateShipmentDraft(&models.ShipmentRecord{SourceType: sourceType}), ErrDedicatedInventoryExecutionPath)
		require.ErrorIs(t, RecordInbound(ctx, &models.InboundRecord{SourceType: sourceType}), ErrDedicatedInventoryExecutionPath)
	}
	require.ErrorIs(t, CreateShipmentDraft(&models.ShipmentRecord{SourceCategory: pending}), ErrDedicatedInventoryExecutionPath)
	require.ErrorIs(t, RecordInbound(ctx, &models.InboundRecord{TargetCategory: pending}), ErrDedicatedInventoryExecutionPath)
	require.ErrorIs(t, database.Transaction(func(tx *gorm.DB) error {
		_, err := transferInventoryTx(tx, TransferInventoryInput{FromCategory: "MATERIAL", ToCategory: pending})
		return err
	}), ErrDedicatedInventoryExecutionPath)
	require.ErrorIs(t, database.Transaction(func(tx *gorm.DB) error {
		return commitShipmentRecordTx(ctx, tx, &models.ShipmentRecord{SourceCategory: pending}, shipmentCommitOptions{})
	}), ErrDedicatedInventoryExecutionPath)
	require.ErrorIs(t, database.Transaction(func(tx *gorm.DB) error {
		_, err := applyProductionOutsourceInventoryTransferTx(tx, productionOutsourceInventoryTransferInput{TransferID: "transfer", Quantity: 1, SourceCategory: pending, TargetCategory: ProductionOutsourceInventoryCategory})
		return err
	}), ErrDedicatedInventoryExecutionPath)
	var source models.Inventory
	require.NoError(t, database.First(&source, "id = ?", "stock-A").Error)
	_, err = PatchInventoryRecord(ctx, source.ID, PatchInventoryRequest{Version: optimisticVersionFromTimestamps(source.UpdatedAt, source.CreatedAt), CategoryCode: &pending}, []string{"categoryCode"})
	require.ErrorIs(t, err, ErrDedicatedInventoryExecutionPath)
	targetID := confirmed.Movement.Materials[0].Material.TargetInventoryID
	_, err = PatchInventoryRecord(ctx, targetID, PatchInventoryRequest{}, nil)
	require.ErrorIs(t, err, ErrDedicatedInventoryExecutionPath)
	require.ErrorIs(t, BulkSyncInventory(ctx, []BulkSyncInventoryItemRequest{{ID: targetID, MaterialID: "material-1", CategoryCode: "MATERIAL", BatchNo: "A", Quantity: 999, UOM: "m2"}}), ErrDedicatedInventoryExecutionPath)
	// Even an existing adjustment cannot mutate the dedicated balance.
	for _, statement := range []string{
		`CREATE TABLE inventory_adjustments (id TEXT PRIMARY KEY,status TEXT,deleted_at DATETIME)`,
		`CREATE TABLE inventory_adjustment_items (id TEXT PRIMARY KEY,adjustment_id TEXT,material_id TEXT,category_code TEXT,batch_no TEXT,actual_qty REAL,deleted_at DATETIME)`,
		`INSERT INTO inventory_adjustments VALUES ('adjustment','APPROVED',NULL)`,
		`INSERT INTO inventory_adjustment_items VALUES ('item','adjustment','material-1','PRODUCTION_MATERIAL_PENDING_CONSUMPTION','A',999,NULL)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	require.ErrorIs(t, ExecuteAdjustment(ctx, "adjustment", "warehouse-user"), ErrDedicatedInventoryExecutionPath)
	var target models.Inventory
	require.NoError(t, database.First(&target, "id = ?", targetID).Error)
	require.Equal(t, 10.0, target.Quantity)
	require.Equal(t, 100.0, target.TotalValue)
	requireProductionMaterialIssuanceWarehousePersistedCounts(t, database, 1, 1, 1, 2, 2, 2)
}

func TestProductionMaterialIssuanceWarehouseHistoricalCorruptionAndMissingExecutionMarkerFailLoudly(t *testing.T) {
	for _, scenario := range []string{"allocation-quantity", "original-source", "material-cost", "missing-ledger", "execution-marker"} {
		t.Run(scenario, func(t *testing.T) {
			database, detail := openProductionMaterialIssuanceWarehouseMovementTransactionTestDatabase(t)
			ctx := context.Background()
			actor := ProductionMaterialIssuanceCommandActor{UserID: "warehouse-user"}
			confirmed, err := ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "confirm", models.ProductionMaterialMovementIssue, 1, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 101, Quantity: 10}))
			require.NoError(t, err)
			switch scenario {
			case "allocation-quantity":
				require.NoError(t, database.Model(&models.ProductionMaterialIssuanceOrderLineAllocation{}).Where("id = ?", confirmed.Movement.Materials[0].Allocations[0].ID).Update("quantity", 9).Error)
			case "original-source":
				require.NoError(t, database.Model(&models.ProductionMaterialIssuanceOrderLineAllocation{}).Where("id = ?", confirmed.Movement.Materials[0].Allocations[0].ID).Update("sales_order_line_id", 201).Error)
			case "material-cost":
				require.NoError(t, database.Model(&models.ProductionMaterialIssuanceWarehouseMovementMaterial{}).Where("id = ?", confirmed.Movement.Materials[0].Material.ID).Update("total_value", 99).Error)
			case "missing-ledger":
				require.NoError(t, database.Model(&models.ProductionMaterialIssuanceWarehouseMovementMaterial{}).Where("id = ?", confirmed.Movement.Materials[0].Material.ID).Update("outbound_ledger_entry_id", detail.Document.ID).Error)
			case "execution-marker":
				require.NoError(t, database.Model(&models.ProductionMaterialIssuanceDocument{}).Where("id = ?", detail.Document.ID).Update("warehouse_execution_at", nil).Error)
				_, err = WithdrawProductionMaterialIssuanceDocument(ctx, database, actor, ProductionMaterialIssuanceWithdrawalRequest{DocumentID: detail.Document.ID, ExpectedVersion: 2, CommandID: "cannot-withdraw-facts", Reason: "标记缺失也不能撤回事实"})
				require.ErrorIs(t, err, ErrProductionMaterialIssuanceBasisChanged)
			}
			_, err = GetProductionMaterialIssuanceWarehouseReview(ctx, database, detail.Document.ID)
			require.ErrorContains(t, err, "[CRITICAL]")
			_, err = ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "no-write-on-corrupt-basis", models.ProductionMaterialMovementIssue, 2, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 102, Quantity: 1}))
			require.ErrorContains(t, err, "[CRITICAL]")
			requireProductionMaterialIssuanceWarehousePersistedCounts(t, database, 1, 1, 1, 2, 2, 2)
		})
	}
}

func TestProductionMaterialIssuanceWarehouseSharedCommandNamespaceRejectsChangedIntentAndPayload(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseMovementTransactionTestDatabase(t)
	ctx := context.Background()
	actor := ProductionMaterialIssuanceCommandActor{UserID: "warehouse-user"}
	request := buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "one-command", models.ProductionMaterialMovementIssue, 1, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 101, Quantity: 5})
	_, err := ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, request)
	require.NoError(t, err)
	changed := request
	changed.Kind = models.ProductionMaterialMovementSupplement
	_, err = ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, changed)
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceCommandReused)
	changed = request
	changed.ExpectedVersion = 2
	_, err = ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, changed)
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceCommandReused)
	_, err = WithdrawProductionMaterialIssuanceDocument(ctx, database, actor, ProductionMaterialIssuanceWithdrawalRequest{CommandID: request.CommandID, DocumentID: detail.Document.ID, ExpectedVersion: 2, Reason: "不得复用为撤回"})
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceCommandReused)
	requireProductionMaterialIssuanceWarehousePersistedCounts(t, database, 1, 1, 1, 2, 2, 2)
}
