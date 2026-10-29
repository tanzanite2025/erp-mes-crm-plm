package services

import (
	"context"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func queryProductionMaterialIssuanceActiveProgressForTest(t *testing.T, database *gorm.DB, pageSize int) ProductionMaterialIssuanceActiveProgressResponse {
	t.Helper()
	result, err := QueryProductionMaterialIssuanceActiveOrderProgress(context.Background(), database, ProductionMaterialIssuanceActiveProgressQuery{MaterialsPage: 1, OrdersPage: 1, PageSize: pageSize})
	require.NoError(t, err)
	return result
}

func TestProductionMaterialIssuanceActiveProgressIncludesUndispatchedSourcesAndUsesFrozenBasisExactlyOnce(t *testing.T) {
	database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
	detail, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "sender"}, buildProductionMaterialIssuanceDispatchTestRequest("dispatch-one-source", bases[:1]))
	require.NoError(t, err)
	require.NoError(t, database.Exec(`UPDATE bom_items SET standard_usage=1`).Error)
	result := queryProductionMaterialIssuanceActiveProgressForTest(t, database, 20)
	require.Equal(t, 2, result.Scope.ActiveOrderCount)
	require.Equal(t, 3, result.Scope.SourceLineCount)
	require.Equal(t, 1, result.Scope.DispatchedLineCount)
	require.Equal(t, 2, result.Scope.UndispatchedLineCount)
	require.Equal(t, 1, result.Scope.IssueLineCount)
	require.False(t, result.Scope.IsComplete)
	require.Len(t, result.Materials, 1)
	// A freezes 10; B currently needs 20*(1+1)=40. A's current 20 is not added again.
	require.Equal(t, 50.0, result.Materials[0].StandardQty)
	require.Equal(t, 50.0, result.Materials[0].RemainingQty)
	require.Equal(t, 2, result.Materials[0].SourceLineCount)
	require.Len(t, result.OrderLines[0].Materials, 1)
	require.Equal(t, 10.0, result.OrderLines[0].Materials[0].StandardQty)
	require.Equal(t, detail.Document.ID, result.OrderLines[0].DocumentID)
	require.Equal(t, "INVALID_SOURCE_LINE", result.OrderLines[2].IssueCode)

	_, err = WithdrawProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "sender"}, ProductionMaterialIssuanceWithdrawalRequest{CommandID: "withdraw-unexecuted", DocumentID: detail.Document.ID, ExpectedVersion: 1, Reason: "重新核对"})
	require.NoError(t, err)
	afterWithdrawal := queryProductionMaterialIssuanceActiveProgressForTest(t, database, 20)
	require.Equal(t, 0, afterWithdrawal.Scope.DispatchedLineCount)
	require.Equal(t, 60.0, afterWithdrawal.Materials[0].StandardQty)
	require.Empty(t, afterWithdrawal.OrderLines[0].DocumentID)
	frozen, err := GetProductionMaterialIssuanceDocument(context.Background(), database, detail.Document.ID)
	require.NoError(t, err)
	require.Equal(t, bases[:1], frozen.Sources)
}

func TestProductionMaterialIssuanceActiveProgressPreservesPerLineOutstandingExcessAndReturnsBeforePagination(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseMovementTransactionTestDatabase(t)
	ctx := context.Background()
	actor := ProductionMaterialIssuanceCommandActor{UserID: "warehouse"}
	issued, err := ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "issue-A", models.ProductionMaterialMovementIssue, 1, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 101, Quantity: 10}))
	require.NoError(t, err)
	_, err = ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "supplement-A", models.ProductionMaterialMovementSupplement, 2, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 101, Quantity: 2}))
	require.NoError(t, err)
	_, err = ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "issue-B", models.ProductionMaterialMovementIssue, 3, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 102, Quantity: 16}))
	require.NoError(t, err)
	original := issued.Movement.Materials[0].Allocations[0].ID
	_, err = ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, actor, buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "return-A", models.ProductionMaterialMovementReturn, 4, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 101, Quantity: 1, OriginalAllocationID: &original}))
	require.NoError(t, err)
	require.NoError(t, database.Exec(`UPDATE boms SET status='OBSOLETE'`).Error)
	result := queryProductionMaterialIssuanceActiveProgressForTest(t, database, 1)
	require.Equal(t, 3, result.Scope.SourceLineCount)
	require.Len(t, result.OrderLines, 1)
	total := result.Materials[0]
	require.Equal(t, 30.0, total.StandardQty)
	require.Equal(t, 28.0, total.IssuedQty)
	require.Equal(t, 1.0, total.ReturnedQty)
	require.Equal(t, 27.0, total.NetQty)
	require.Equal(t, 4.0, total.RemainingQty)
	require.Equal(t, 1.0, total.ExcessQty)
	secondPage, err := QueryProductionMaterialIssuanceActiveOrderProgress(ctx, database, ProductionMaterialIssuanceActiveProgressQuery{MaterialsPage: 2, OrdersPage: 2, PageSize: 1})
	require.NoError(t, err)
	require.Equal(t, result.Scope, secondPage.Scope)
	require.Empty(t, secondPage.Materials)
	require.EqualValues(t, 102, secondPage.OrderLines[0].SalesOrderLineID)
	require.Equal(t, 4.0, secondPage.OrderLines[0].Materials[0].RemainingQty)
	// Terminal orders leave current totals, but coverage, source and confirmed handovers remain queryable.
	require.NoError(t, database.Exec(`UPDATE sales_orders SET status='Completed' WHERE id='order-1'`).Error)
	afterCompletion := queryProductionMaterialIssuanceActiveProgressForTest(t, database, 20)
	require.Equal(t, 1, afterCompletion.Scope.SourceLineCount)
	require.Empty(t, afterCompletion.Materials)
	review, err := GetProductionMaterialIssuanceWarehouseReview(ctx, database, detail.Document.ID)
	require.NoError(t, err)
	require.Equal(t, 27.0, review.MaterialTotals[0].NetQty)
	var coverage int64
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceActiveSourceCoverage{}).Count(&coverage).Error)
	require.EqualValues(t, 2, coverage)
}

func TestProductionMaterialIssuanceActiveProgressFlagsMissingAmbiguousAndInvalidUnitsWithoutPretendZeroFulfillment(t *testing.T) {
	for _, scenario := range []struct{ name, statement, issue string }{
		{"missing", `UPDATE boms SET status='DRAFT'`, "MISSING_BOM"},
		{"ambiguous", `INSERT INTO boms SELECT 'bom-2',product_id,bom_type,'MBOM-2',status,owner_type,owner_customer_id,version,version_text,'light',revision_no,measured_weight,measured_weight_unit,effective_from,effective_to,deleted_at FROM boms`, "BOM_SELECTION_REQUIRED"},
		{"material-unit", `UPDATE bom_items SET unit='kg'`, "MATERIAL_UNIT_MISMATCH"},
		{"finished-unit", `UPDATE sales_order_lines SET uom='' WHERE id=101`, "INVALID_SOURCE_LINE"},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			database, _ := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
			require.NoError(t, database.Exec(scenario.statement).Error)
			writes := 0
			for _, register := range []func(string, func(*gorm.DB)) error{database.Callback().Create().Before("gorm:create").Register, database.Callback().Update().Before("gorm:update").Register, database.Callback().Delete().Before("gorm:delete").Register} {
				require.NoError(t, register("progress_read_must_not_write", func(*gorm.DB) { writes++ }))
			}
			result := queryProductionMaterialIssuanceActiveProgressForTest(t, database, 20)
			require.False(t, result.Scope.IsComplete)
			require.Equal(t, scenario.issue, result.OrderLines[0].IssueCode)
			require.Empty(t, result.OrderLines[0].Materials)
			require.Zero(t, writes)
		})
	}
}

func TestProductionMaterialIssuanceActiveProgressRejectsCorruptCoverageAndIncompatibleFrozenCurrentUnits(t *testing.T) {
	for _, statement := range []string{
		`UPDATE production_material_issuance_active_source_coverages SET source_snapshot_id='missing'`,
		`UPDATE sales_order_lines SET qty=999 WHERE id=101`,
		`UPDATE materials SET uom='kg'; UPDATE bom_items SET unit='kg'`,
	} {
		t.Run(statement, func(t *testing.T) {
			database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
			_, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "sender"}, buildProductionMaterialIssuanceDispatchTestRequest("one-frozen", bases[:1]))
			require.NoError(t, err)
			require.NoError(t, database.Exec(statement).Error)
			_, err = QueryProductionMaterialIssuanceActiveOrderProgress(context.Background(), database, ProductionMaterialIssuanceActiveProgressQuery{MaterialsPage: 1, OrdersPage: 1, PageSize: 20})
			require.Error(t, err)
		})
	}
}

func TestProductionMaterialIssuanceActiveProgressExcludesQuotesAndTerminalOrdersAndFailsOnMissingStorage(t *testing.T) {
	database, _ := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
	for _, update := range []string{`status='Completed'`, `status='Canceled'`, `status='Closed'`, `classification='quote'`, `type='quote'`} {
		require.NoError(t, database.Exec(`UPDATE sales_orders SET status='Pending',classification='',type=''`).Error)
		require.NoError(t, database.Exec(`UPDATE sales_orders SET `+update).Error)
		result := queryProductionMaterialIssuanceActiveProgressForTest(t, database, 20)
		require.True(t, result.Scope.IsComplete)
		require.Zero(t, result.Scope.SourceLineCount)
		require.Empty(t, result.OrderLines)
	}
	require.NoError(t, database.Exec(`DROP TABLE production_material_issuance_active_source_coverages`).Error)
	require.NoError(t, database.Exec(`UPDATE sales_orders SET status='Pending',classification='',type=''`).Error)
	_, err := QueryProductionMaterialIssuanceActiveOrderProgress(context.Background(), database, ProductionMaterialIssuanceActiveProgressQuery{MaterialsPage: 1, OrdersPage: 1, PageSize: 20})
	require.Error(t, err)
}
