package services

import (
	"context"
	"errors"
	"math"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func openProductionMaterialIssuanceWarehouseMovementTransactionTestDatabase(t *testing.T) (*gorm.DB, ProductionMaterialIssuanceDocumentDetail) {
	t.Helper()
	database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
	require.NoError(t, database.AutoMigrate(&models.ProductionMaterialIssuanceWarehouseMovement{}, &models.ProductionMaterialIssuanceWarehouseMovementMaterial{}, &models.ProductionMaterialIssuanceOrderLineAllocation{}))
	for _, statement := range []string{
		`ALTER TABLE warehouse_categories ADD COLUMN allow_inbound BOOLEAN DEFAULT TRUE`,
		`INSERT INTO warehouse_categories (id,code,is_system,active,allow_shipment,allow_inbound) VALUES ('pending-warehouse','PRODUCTION_MATERIAL_PENDING_CONSUMPTION',1,1,1,1)`,
		`CREATE TABLE inventory (id TEXT PRIMARY KEY,created_at DATETIME,updated_at DATETIME,deleted_at DATETIME,material_id TEXT,material_name TEXT,material_code TEXT,material_spec TEXT,quantity REAL,total_value REAL,average_unit_cost REAL,category_code TEXT,batch_no TEXT,uom TEXT)`,
		`CREATE TABLE inventory_ledger_entries (id TEXT PRIMARY KEY,created_at DATETIME,updated_at DATETIME,deleted_at DATETIME,transfer_id TEXT,transfer_type TEXT,direction TEXT,material_id TEXT,material_name TEXT,material_code TEXT,material_spec TEXT,category_code TEXT,batch_no TEXT,quantity_delta REAL,quantity_after REAL,unit_cost REAL,total_value_delta REAL,source_type TEXT,source_id TEXT,source_line_id TEXT,source_fact_id TEXT,operator TEXT,occurred_at DATETIME,remarks TEXT)`,
		`CREATE TABLE inventory_reservations (id TEXT PRIMARY KEY,deleted_at DATETIME,material_id TEXT,category_code TEXT,batch_no TEXT,quantity REAL,status TEXT)`,
		`INSERT INTO inventory (id,material_id,quantity,total_value,average_unit_cost,category_code,batch_no,uom) VALUES ('stock-A','material-1',100,1000,10,'MATERIAL','A','m2'),('stock-B','material-1',100,2000,20,'MATERIAL','B','m2')`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	detail, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "dispatch-user"}, buildProductionMaterialIssuanceDispatchTestRequest("dispatch-before-warehouse", bases))
	require.NoError(t, err)
	return database, detail
}

func buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(documentID, commandID, kind string, version int, allocations ...ProductionMaterialIssuanceWarehouseAllocationInput) ProductionMaterialIssuanceWarehouseConfirmationRequest {
	quantity := 0.0
	for _, allocation := range allocations {
		quantity += allocation.Quantity
	}
	return ProductionMaterialIssuanceWarehouseConfirmationRequest{CommandID: commandID, DocumentID: documentID, ExpectedVersion: version, Kind: kind, Reason: "核对后的实际交接", Materials: []ProductionMaterialIssuanceWarehouseMaterialInput{{MaterialID: "material-1", BatchNo: "A", Quantity: quantity, Allocations: allocations}}}
}

func requireProductionMaterialIssuanceWarehousePersistedCounts(t *testing.T, database *gorm.DB, movements, materials, allocations, ledgers, receipts, audits int64) {
	t.Helper()
	for _, expected := range []struct {
		model any
		count int64
	}{
		{&models.ProductionMaterialIssuanceWarehouseMovement{}, movements}, {&models.ProductionMaterialIssuanceWarehouseMovementMaterial{}, materials}, {&models.ProductionMaterialIssuanceOrderLineAllocation{}, allocations}, {&models.InventoryLedgerEntry{}, ledgers}, {&models.ProductionMaterialIssuanceCommandReceipt{}, receipts}, {&models.AuditLog{}, audits},
	} {
		var count int64
		require.NoError(t, database.Model(expected.model).Count(&count).Error)
		require.Equal(t, expected.count, count, "%T", expected.model)
	}
}

func TestProductionMaterialIssuanceWarehousePartialIssueConservesInventoryAndStableOrderLineAllocations(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseMovementTransactionTestDatabase(t)
	ctx := context.Background()
	actor := ProductionMaterialIssuanceCommandActor{UserID: "warehouse-user", Username: "仓库办理人"}
	review, err := GetProductionMaterialIssuanceWarehouseReview(ctx, database, detail.Document.ID)
	require.NoError(t, err)
	require.Len(t, review.SourceMaterials, 2)
	require.Len(t, review.MaterialTotals, 1)
	require.Equal(t, 30.0, review.MaterialTotals[0].StandardQty)
	suggestion, err := SuggestProductionMaterialIssuanceOrdinaryOrderLineAllocations(review, "material-1", 15)
	require.NoError(t, err)
	require.Equal(t, []ProductionMaterialIssuanceWarehouseAllocationInput{{SalesOrderLineID: 101, Quantity: 10}, {SalesOrderLineID: 102, Quantity: 5}}, suggestion)
	// Warehouse confirmation uses the dispatched basis, even when today's BOM changed.
	require.NoError(t, database.Exec(`UPDATE bom_items SET standard_usage=999`).Error)
	require.NoError(t, database.Exec(`UPDATE boms SET measured_weight=999,status='OBSOLETE'`).Error)
	request := buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "first-partial", models.ProductionMaterialMovementIssue, 1, suggestion...)
	confirmed, err := ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, request)
	require.NoError(t, err)
	require.Equal(t, 2, confirmed.Document.Version)
	require.NotNil(t, confirmed.Document.WarehouseExecutionAt)
	require.Equal(t, "warehouse-user", confirmed.Movement.Movement.ConfirmedBy)
	require.Len(t, confirmed.Movement.Materials, 1)
	require.Len(t, confirmed.Movement.Materials[0].Allocations, 2)
	var source, target models.Inventory
	require.NoError(t, database.First(&source, "id = ?", "stock-A").Error)
	require.NoError(t, database.First(&target, "category_code = ? AND batch_no = ?", models.ProductionMaterialPendingConsumptionWarehouseCategoryCode, "A").Error)
	require.Equal(t, 85.0, source.Quantity)
	require.Equal(t, 850.0, source.TotalValue)
	require.Equal(t, 15.0, target.Quantity)
	require.Equal(t, 150.0, target.TotalValue)
	var ledgers []models.InventoryLedgerEntry
	require.NoError(t, database.Find(&ledgers).Error)
	require.Len(t, ledgers, 2)
	require.Zero(t, ledgers[0].QuantityDelta+ledgers[1].QuantityDelta)
	require.Zero(t, ledgers[0].TotalValueDelta+ledgers[1].TotalValueDelta)
	require.Equal(t, DedicatedInventorySourceProductionMaterialIssuance, ledgers[0].SourceType)
	require.Equal(t, confirmed.Movement.Movement.ID, ledgers[0].SourceFactID)
	review, err = GetProductionMaterialIssuanceWarehouseReview(ctx, database, detail.Document.ID)
	require.NoError(t, err)
	require.Equal(t, 15.0, review.MaterialTotals[0].RemainingQty)
	require.Zero(t, review.MaterialTotals[0].ExcessQty)
	request.Materials[0].Allocations[0], request.Materials[0].Allocations[1] = request.Materials[0].Allocations[1], request.Materials[0].Allocations[0]
	replayed, err := ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, request)
	require.NoError(t, err)
	require.Equal(t, confirmed.Movement, replayed.Movement)
	requireProductionMaterialIssuanceWarehousePersistedCounts(t, database, 1, 1, 2, 2, 2, 2)
	secondRequest := buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "second-partial", models.ProductionMaterialMovementIssue, 2, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 102, Quantity: 15})
	second, err := ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, secondRequest)
	require.NoError(t, err)
	require.Equal(t, 3, second.Document.Version)
	replayed, err = ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, request)
	require.NoError(t, err)
	require.Equal(t, 3, replayed.Document.Version)
	require.Equal(t, confirmed.Movement, replayed.Movement)
	review, err = GetProductionMaterialIssuanceWarehouseReview(ctx, database, detail.Document.ID)
	require.NoError(t, err)
	require.Zero(t, review.MaterialTotals[0].RemainingQty)
	_, err = WithdrawProductionMaterialIssuanceDocument(ctx, database, actor, ProductionMaterialIssuanceWithdrawalRequest{CommandID: "withdraw-after-issue", DocumentID: detail.Document.ID, ExpectedVersion: 3, Reason: "不能删掉发料事实"})
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceBasisChanged)
	secondRequest.CommandID = "stale-next-command"
	_, err = ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, secondRequest)
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceBasisChanged)
	requireProductionMaterialIssuanceWarehousePersistedCounts(t, database, 2, 2, 3, 4, 3, 3)
	require.False(t, database.Migrator().HasTable(&models.ShipmentRecord{}))
	require.False(t, database.Migrator().HasTable(&models.InboundRecord{}))
}

func TestProductionMaterialIssuanceWarehouseSupplementAndReturnPreservePerLineShortagesAndOriginalCost(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseMovementTransactionTestDatabase(t)
	ctx := context.Background()
	actor := ProductionMaterialIssuanceCommandActor{UserID: "warehouse-user"}
	issue, err := ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "issue-A", models.ProductionMaterialMovementIssue, 1, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 101, Quantity: 10}))
	require.NoError(t, err)
	_, err = ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "supplement-A", models.ProductionMaterialMovementSupplement, 2, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 101, Quantity: 2}))
	require.NoError(t, err)
	_, err = ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "issue-B", models.ProductionMaterialMovementIssue, 3, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 102, Quantity: 16}))
	require.NoError(t, err)
	review, err := GetProductionMaterialIssuanceWarehouseReview(ctx, database, detail.Document.ID)
	require.NoError(t, err)
	require.Equal(t, 4.0, review.MaterialTotals[0].RemainingQty)
	require.Equal(t, 2.0, review.MaterialTotals[0].ExcessQty)
	_, err = SuggestProductionMaterialIssuanceOrdinaryOrderLineAllocations(review, "material-1", 5)
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceAllocationInvalid)
	// New warehouse receipts may change today's average cost; a return keeps the original issue cost.
	require.NoError(t, database.Exec(`UPDATE inventory SET total_value=quantity*20, average_unit_cost=20 WHERE id='stock-A'`).Error)
	originalID := issue.Movement.Materials[0].Allocations[0].ID
	returned, err := ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "return-original", models.ProductionMaterialMovementReturn, 4, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 101, Quantity: 3, OriginalAllocationID: &originalID}))
	require.NoError(t, err)
	require.Equal(t, 10.0, returned.Movement.Materials[0].Material.UnitCost)
	require.Equal(t, 30.0, returned.Movement.Materials[0].Material.TotalValue)
	var balance models.Inventory
	require.NoError(t, database.First(&balance, "id = ?", "stock-A").Error)
	require.Equal(t, 75.0, balance.Quantity)
	require.Equal(t, 1470.0, balance.TotalValue)
	review, err = GetProductionMaterialIssuanceWarehouseReview(ctx, database, detail.Document.ID)
	require.NoError(t, err)
	require.Equal(t, 5.0, review.MaterialTotals[0].RemainingQty)
	require.Zero(t, review.MaterialTotals[0].ExcessQty)
	for _, invalid := range []ProductionMaterialIssuanceWarehouseAllocationInput{
		{SalesOrderLineID: 102, Quantity: 1, OriginalAllocationID: &originalID},
		{SalesOrderLineID: 101, Quantity: 8, OriginalAllocationID: &originalID},
	} {
		_, err = ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "invalid-return", models.ProductionMaterialMovementReturn, 5, invalid))
		require.ErrorIs(t, err, ErrProductionMaterialIssuanceAllocationInvalid)
	}
	wrongBatch := buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "wrong-return-batch", models.ProductionMaterialMovementReturn, 5, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 101, Quantity: 1, OriginalAllocationID: &originalID})
	wrongBatch.Materials[0].BatchNo = "B"
	_, err = ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, wrongBatch)
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceAllocationInvalid)
	requireProductionMaterialIssuanceWarehousePersistedCounts(t, database, 4, 4, 4, 8, 5, 5)
}

func TestProductionMaterialIssuanceWarehouseRejectsInvalidAllocationsUnavailableStockAndRollsBackAllFacts(t *testing.T) {
	for _, scenario := range []struct {
		name     string
		change   func(*gorm.DB, *ProductionMaterialIssuanceWarehouseConfirmationRequest)
		expected error
	}{
		{"ordinary-overage", func(_ *gorm.DB, r *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			r.Materials[0].Quantity = 11
			r.Materials[0].Allocations[0].Quantity = 11
		}, ErrProductionMaterialIssuanceAllocationInvalid},
		{"ordinary-overage-across-batches", func(_ *gorm.DB, r *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			r.Materials[0].Quantity = 6
			r.Materials[0].Allocations[0].Quantity = 6
			r.Materials = append(r.Materials, ProductionMaterialIssuanceWarehouseMaterialInput{MaterialID: "material-1", BatchNo: "B", Quantity: 5, Allocations: []ProductionMaterialIssuanceWarehouseAllocationInput{{SalesOrderLineID: 101, Quantity: 5}}})
		}, ErrProductionMaterialIssuanceAllocationInvalid},
		{"duplicate-material-batch", func(_ *gorm.DB, r *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			r.Materials = append(r.Materials, r.Materials[0])
		}, ErrProductionMaterialIssuanceInvalidRequest},
		{"allocation-total", func(_ *gorm.DB, r *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			r.Materials[0].Quantity = 9
		}, ErrProductionMaterialIssuanceAllocationInvalid},
		{"foreign-order-line", func(_ *gorm.DB, r *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			r.Materials[0].Allocations[0].SalesOrderLineID = 201
		}, ErrProductionMaterialIssuanceAllocationInvalid},
		{"not-a-number", func(_ *gorm.DB, r *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			r.Materials[0].Quantity = math.NaN()
		}, ErrProductionMaterialIssuanceInvalidRequest},
		{"infinite-allocation", func(_ *gorm.DB, r *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			r.Materials[0].Allocations[0].Quantity = math.Inf(1)
		}, ErrProductionMaterialIssuanceInvalidRequest},
		{"supplement-without-reason", func(_ *gorm.DB, r *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			r.Kind = models.ProductionMaterialMovementSupplement
			r.Reason = "  "
		}, ErrProductionMaterialIssuanceInvalidRequest},
		{"changed-main-unit", func(db *gorm.DB, _ *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			require.NoError(t, db.Exec(`UPDATE materials SET uom='kg'`).Error)
		}, ErrProductionMaterialIssuanceBasisChanged},
		{"changed-inventory-unit", func(db *gorm.DB, _ *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			require.NoError(t, db.Exec(`UPDATE inventory SET uom='kg' WHERE id='stock-A'`).Error)
		}, ErrProductionMaterialIssuanceBasisChanged},
		{"disabled-material", func(db *gorm.DB, _ *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			require.NoError(t, db.Exec(`UPDATE materials SET status='Inactive'`).Error)
		}, ErrProductionMaterialIssuanceBasisChanged},
		{"reserved-stock", func(db *gorm.DB, _ *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			require.NoError(t, db.Exec(`INSERT INTO inventory_reservations (id,material_id,category_code,batch_no,quantity,status) VALUES ('reserved','material-1','MATERIAL','A',91,'RESERVED')`).Error)
		}, ErrProductionMaterialIssuanceStockUnavailable},
		{"missing-batch", func(_ *gorm.DB, r *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			r.Materials[0].BatchNo = "not-selected-stock"
		}, ErrProductionMaterialIssuanceStockUnavailable},
		{"unavailable-destination", func(db *gorm.DB, _ *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			require.NoError(t, db.Exec(`UPDATE warehouse_categories SET active=0 WHERE id='pending-warehouse'`).Error)
		}, ErrProductionMaterialIssuanceInvalidRequest},
		{"late-batch-shortage", func(db *gorm.DB, r *ProductionMaterialIssuanceWarehouseConfirmationRequest) {
			require.NoError(t, db.Exec(`UPDATE inventory SET quantity=0,total_value=0,average_unit_cost=0 WHERE id='stock-B'`).Error)
			r.Materials = append(r.Materials, ProductionMaterialIssuanceWarehouseMaterialInput{MaterialID: "material-1", BatchNo: "B", Quantity: 5, Allocations: []ProductionMaterialIssuanceWarehouseAllocationInput{{SalesOrderLineID: 102, Quantity: 5}}})
		}, ErrProductionMaterialIssuanceStockUnavailable},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			database, detail := openProductionMaterialIssuanceWarehouseMovementTransactionTestDatabase(t)
			request := buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "warehouse-failure", models.ProductionMaterialMovementIssue, 1, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 101, Quantity: 10})
			scenario.change(database, &request)
			_, err := ConfirmProductionMaterialIssuanceWarehouseMovement(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "warehouse-user"}, request)
			require.ErrorIs(t, err, scenario.expected)
			requireProductionMaterialIssuanceWarehousePersistedCounts(t, database, 0, 0, 0, 0, 1, 1)
			var source models.Inventory
			require.NoError(t, database.First(&source, "id = ?", "stock-A").Error)
			require.Equal(t, 100.0, source.Quantity)
			require.Equal(t, 1000.0, source.TotalValue)
			var document models.ProductionMaterialIssuanceDocument
			require.NoError(t, database.First(&document, "id = ?", detail.Document.ID).Error)
			require.Equal(t, 1, document.Version)
			require.Nil(t, document.WarehouseExecutionAt)
		})
	}
}

func TestProductionMaterialIssuanceWarehouseAuditAndLedgerFailuresRollbackInventoryAllocationsAndReceipt(t *testing.T) {
	for _, table := range []string{"audit_logs", "inventory_ledger_entries"} {
		t.Run(table, func(t *testing.T) {
			database, detail := openProductionMaterialIssuanceWarehouseMovementTransactionTestDatabase(t)
			require.NoError(t, database.Callback().Create().Before("gorm:create").Register("reject_warehouse_fact", func(tx *gorm.DB) {
				if tx.Statement.Table == table {
					tx.AddError(errors.New("isolated storage failure"))
				}
			}))
			_, err := ConfirmProductionMaterialIssuanceWarehouseMovement(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "warehouse-user"}, buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "audit-failure", models.ProductionMaterialMovementIssue, 1, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 101, Quantity: 10}))
			require.ErrorContains(t, err, "isolated storage failure")
			requireProductionMaterialIssuanceWarehousePersistedCounts(t, database, 0, 0, 0, 0, 1, 1)
			var source models.Inventory
			require.NoError(t, database.First(&source, "id = ?", "stock-A").Error)
			require.Equal(t, 100.0, source.Quantity)
			require.Equal(t, 1000.0, source.TotalValue)
			var pendingCount int64
			require.NoError(t, database.Model(&models.Inventory{}).Where("category_code = ?", models.ProductionMaterialPendingConsumptionWarehouseCategoryCode).Count(&pendingCount).Error)
			require.Zero(t, pendingCount)
		})
	}
}
