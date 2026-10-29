package services

import (
	"context"
	"encoding/json"
	"testing"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestProductionMaterialIssuanceInvalidSourcesNeverExpandToAllOrdersOrCreateDocuments(t *testing.T) {
	for _, scenario := range []string{"empty", "duplicate", "missing-order", "missing-line", "missing-bom", "missing-fingerprint", "invalid-fingerprint", "missing-version", "too-many"} {
		t.Run(scenario, func(t *testing.T) {
			database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
			request := buildProductionMaterialIssuanceDispatchTestRequest("send", bases)
			switch scenario {
			case "empty":
				request.Sources = nil
			case "duplicate":
				request.Sources = append(request.Sources, request.Sources[0])
			case "missing-order":
				request.Sources[0].SalesOrderID = ""
			case "missing-line":
				request.Sources[0].SalesOrderLineID = 0
			case "missing-bom":
				request.Sources[0].BOMID = ""
			case "missing-fingerprint":
				request.Sources[0].BasisFingerprint = ""
			case "invalid-fingerprint":
				request.Sources[0].BasisFingerprint = "not-a-sha256"
			case "missing-version":
				request.Sources[0].ExpectedOrderVersion = 0
			case "too-many":
				for len(request.Sources) < 501 {
					source := request.Sources[0]
					source.SalesOrderLineID = uint(1000 + len(request.Sources))
					request.Sources = append(request.Sources, source)
				}
			}
			_, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "user-1"}, request)
			require.ErrorIs(t, err, ErrProductionMaterialIssuanceInvalidRequest)
			requireProductionMaterialIssuancePersistedRecordCounts(t, database, 0, 0, 0, 0, 0)
		})
	}
}

func TestProductionMaterialIssuanceDatabaseRejectsDuplicateActiveCoverageAndCommandReceipts(t *testing.T) {
	database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
	_, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "user-1"}, buildProductionMaterialIssuanceDispatchTestRequest("send", bases))
	require.NoError(t, err)
	var coverage models.ProductionMaterialIssuanceActiveSourceCoverage
	require.NoError(t, database.First(&coverage).Error)
	// Bypass the service to verify the database itself enforces whole-line coverage.
	coverage.DocumentID, coverage.SourceSnapshotID = uuid.NewString(), uuid.NewString()
	require.ErrorContains(t, database.Create(&coverage).Error, "UNIQUE constraint failed")
	var receipt models.ProductionMaterialIssuanceCommandReceipt
	require.NoError(t, database.First(&receipt).Error)
	receipt.ID = uuid.NewString()
	require.ErrorContains(t, database.Create(&receipt).Error, "UNIQUE constraint failed")
	var snapshot models.ProductionMaterialIssuanceSourceSnapshot
	require.NoError(t, database.First(&snapshot).Error)
	snapshot.ID = uuid.NewString()
	require.ErrorContains(t, database.Create(&snapshot).Error, "UNIQUE constraint failed")
	requireProductionMaterialIssuancePersistedRecordCounts(t, database, 1, 2, 2, 1, 1)
}

func TestProductionMaterialIssuanceActiveCoveragePreventsOrderDeletionEvenIfStatusWasAlreadyCanceled(t *testing.T) {
	database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
	_, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "user-1"}, buildProductionMaterialIssuanceDispatchTestRequest("send", bases))
	require.NoError(t, err)
	// Simulate a pre-existing inconsistent status; deletion must still keep coverage.
	require.NoError(t, database.Exec("UPDATE sales_orders SET status='Canceled' WHERE id='order-1'").Error)
	require.NoError(t, database.Exec("CREATE TABLE sales_returns (sales_order_id TEXT, deleted_at DATETIME)").Error)
	require.NoError(t, database.Exec("CREATE TABLE sales_exchanges (sales_order_id TEXT, deleted_at DATETIME)").Error)
	previousDatabase := appdb.DB
	appdb.DB = database
	t.Cleanup(func() { appdb.DB = previousDatabase })
	require.ErrorIs(t, DeleteSalesOrder("order-1"), ErrProductionMaterialIssuanceOrderProtected)
	var order models.SalesOrder
	require.NoError(t, database.First(&order, "id = ?", "order-1").Error)
	require.Equal(t, 4, order.Version)
	require.False(t, order.DeletedAt.Valid)
	requireProductionMaterialIssuancePersistedRecordCounts(t, database, 1, 2, 2, 1, 1)
}

func TestProductionMaterialIssuanceWithdrawalAllowsQuantityCorrectionWithoutChangingOldSnapshots(t *testing.T) {
	database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
	actor := ProductionMaterialIssuanceCommandActor{UserID: "user-1"}
	dispatched, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, actor, buildProductionMaterialIssuanceDispatchTestRequest("send", bases))
	require.NoError(t, err)
	_, err = WithdrawProductionMaterialIssuanceDocument(context.Background(), database, actor, ProductionMaterialIssuanceWithdrawalRequest{CommandID: "withdraw", DocumentID: dispatched.Document.ID, ExpectedVersion: 1, Reason: "修正订单数量"})
	require.NoError(t, err)
	var order models.SalesOrder
	require.NoError(t, database.Preload("Lines").First(&order, "id = ?", "order-1").Error)
	requests := convertSalesOrderLinesToStableIdentityTransactionTestRequests(t, order.Lines)
	requests[0].Qty += 5
	saved, err := executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderLinesChange, order.Version, SalesOrderLinesChangePayload{Lines: requests})
	require.NoError(t, err)
	require.Equal(t, 5, saved.Version)
	var updated models.SalesOrderLine
	require.NoError(t, database.First(&updated, requests[0].ID).Error)
	require.Equal(t, requests[0].Qty, updated.Qty)
	history, err := GetProductionMaterialIssuanceDocument(context.Background(), database, dispatched.Document.ID)
	require.NoError(t, err)
	require.Equal(t, models.ProductionMaterialIssuanceWithdrawn, history.Document.Status)
	require.Equal(t, bases, history.Sources)
	// Correcting an order requires a fresh review; old expectations cannot be reused.
	_, err = DispatchProductionMaterialIssuanceDocument(context.Background(), database, actor, buildProductionMaterialIssuanceDispatchTestRequest("send-corrected", bases))
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceBasisChanged)
	var documents, coverage int64
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceDocument{}).Count(&documents).Error)
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceActiveSourceCoverage{}).Count(&coverage).Error)
	require.EqualValues(t, 1, documents)
	require.Zero(t, coverage)
}

func TestProductionMaterialIssuanceHistoricalQueryRejectsCorruptedFrozenBasis(t *testing.T) {
	database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
	detail, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "user-1"}, buildProductionMaterialIssuanceDispatchTestRequest("send", bases))
	require.NoError(t, err)
	corrupted := bases[0]
	corrupted.FinishedQty++
	raw, err := json.Marshal(corrupted)
	require.NoError(t, err)
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceSourceSnapshot{}).Where("document_id = ? AND sales_order_line_id = ?", detail.Document.ID, corrupted.SalesOrderLineID).Update("snapshot", json.RawMessage(raw)).Error)
	_, err = GetProductionMaterialIssuanceDocument(context.Background(), database, detail.Document.ID)
	require.ErrorContains(t, err, "[CRITICAL]")
}
