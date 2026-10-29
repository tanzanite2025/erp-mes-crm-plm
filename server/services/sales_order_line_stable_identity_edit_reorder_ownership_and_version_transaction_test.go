package services

import (
	"encoding/json"
	"errors"
	"testing"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openSalesOrderStableLineIdentityTransactionTestDatabase(t *testing.T) (*gorm.DB, models.SalesOrder) {
	t.Helper()
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	// Explicit parent schema avoids PostgreSQL's UUID default in isolated SQLite.
	require.NoError(t, database.Exec(`CREATE TABLE sales_orders (
		id TEXT PRIMARY KEY, order_no TEXT UNIQUE NOT NULL, order_name TEXT, customer_name TEXT, customer_id TEXT,
		type TEXT, currency TEXT, exchange_rate_snapshot REAL, payment_method TEXT, payment_method_name TEXT,
		payment_term TEXT, payment_term_name TEXT, classification TEXT, status TEXT, status_note TEXT,
		amount REAL, quantity REAL, order_date TEXT, delivery_date TEXT, purchase_order_no TEXT, barcode TEXT,
		requirements TEXT, evidences JSON, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
		updated_by TEXT, version INTEGER)`).Error)
	require.NoError(t, database.AutoMigrate(&models.SalesOrderLine{}, &models.AuditLog{}, &models.ProductionMaterialIssuanceActiveSourceCoverage{}))
	require.NoError(t, database.Exec(`CREATE TABLE packaging_profile_targets (entity_type TEXT, entity_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO sales_orders (id, order_no, barcode, status, version, quantity, amount, evidences)
		VALUES ('order-1','SO-1','SO-1','Pending',4,30,80,X'5B5D'), ('order-2','SO-2','SO-2','Pending',1,1,1,X'5B5D')`).Error)
	lines := []models.SalesOrderLine{
		{ID: 101, SalesOrderID: "order-1", LineNo: 1, ProductModel: "A", Qty: 10, Price: 2, Amount: 20, Status: "Pending", Note: "first"},
		{ID: 102, SalesOrderID: "order-1", LineNo: 2, ProductModel: "B", Qty: 20, Price: 3, Amount: 60, Status: "Pending", Note: "second"},
		{ID: 201, SalesOrderID: "order-2", LineNo: 1, ProductModel: "OTHER", Qty: 1, Status: "Pending"},
	}
	require.NoError(t, database.Create(&lines).Error)
	var order models.SalesOrder
	require.NoError(t, database.Preload("Lines").First(&order, "id = ?", "order-1").Error)
	return database, order
}

func convertSalesOrderLinesToStableIdentityTransactionTestRequests(t *testing.T, lines []models.SalesOrderLine) []SalesOrderLineRequest {
	t.Helper()
	raw, err := json.Marshal(lines)
	require.NoError(t, err)
	var requests []SalesOrderLineRequest
	require.NoError(t, json.Unmarshal(raw, &requests))
	return requests
}

func executeSalesOrderStableIdentityTestCommand(t *testing.T, database *gorm.DB, intent string, version int, payload any) (*models.SalesOrder, error) {
	t.Helper()
	raw, err := json.Marshal(payload)
	require.NoError(t, err)
	var saved *models.SalesOrder
	err = database.Transaction(func(tx *gorm.DB) error {
		var commandError error
		saved, commandError = executeSalesOrderTransactionTx(tx, ExecuteSalesOrderTransactionInput{
			OrderID: "order-1", Intent: intent, ExpectedVersion: version, Operator: "test", Payload: raw,
		})
		return commandError
	})
	return saved, err
}

func TestSalesOrderStableLineIdentityDeleteReindexAndAddDoesNotReuseDeletedIdentity(t *testing.T) {
	database, original := openSalesOrderStableLineIdentityTransactionTestDatabase(t)
	requests := convertSalesOrderLinesToStableIdentityTransactionTestRequests(t, original.Lines[1:])
	requests[0].LineNo = 1
	requests = append(requests, SalesOrderLineRequest{LineNo: 2, ProductModel: "NEW", Qty: 7, Price: 4, Status: "Pending"})
	saved, err := executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderSave, 4,
		SalesOrderSavePayload{Delta: map[string]json.RawMessage{"lines": json.RawMessage(`{}`)}, FinalData: SalesOrderSnapshotRequest{ID: "order-1", OrderNo: "SO-1", Lines: requests}})
	require.NoError(t, err)
	require.Equal(t, 5, saved.Version)
	require.Len(t, saved.Lines, 2)
	byModel := make(map[string]models.SalesOrderLine)
	for _, line := range saved.Lines {
		byModel[line.ProductModel] = line
	}
	require.EqualValues(t, 102, byModel["B"].ID)
	require.Equal(t, 1, byModel["B"].LineNo)
	require.NotContains(t, []uint{101, 102, 201}, byModel["NEW"].ID)
	require.NotZero(t, byModel["NEW"].ID)
	require.Equal(t, 27.0, saved.Quantity)
	require.Equal(t, 88.0, saved.Amount)
	var removed models.SalesOrderLine
	require.NoError(t, database.First(&removed, 101).Error)
	require.Empty(t, removed.SalesOrderID)
	require.Equal(t, "A", removed.ProductModel)
	// A previously detached row is never accepted as a newly added row.
	_, err = executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderLinesChange, 5,
		SalesOrderLinesChangePayload{Lines: []SalesOrderLineRequest{{ID: 101, LineNo: 1}}})
	require.ErrorIs(t, err, ErrSalesTransactionInvalidPayload)
}

func TestSalesOrderStableLineIdentityReorderPreservesContentAndPersistsZeroValues(t *testing.T) {
	for _, intent := range []string{SalesTransactionIntentOrderSave, SalesTransactionIntentOrderLineContentChange, SalesTransactionIntentOrderLinesChange} {
		t.Run(intent, func(t *testing.T) {
			database, order := openSalesOrderStableLineIdentityTransactionTestDatabase(t)
			requests := convertSalesOrderLinesToStableIdentityTransactionTestRequests(t, []models.SalesOrderLine{order.Lines[1], order.Lines[0]})
			requests[0].LineNo, requests[1].LineNo = 1, 2
			requests[0].Qty, requests[0].Note, requests[0].Price = 25, "", 0
			var payload any = SalesOrderLinesChangePayload{Lines: requests}
			if intent == SalesTransactionIntentOrderSave {
				payload = SalesOrderSavePayload{Delta: map[string]json.RawMessage{"lines": json.RawMessage(`{}`)}, FinalData: SalesOrderSnapshotRequest{ID: "order-1", OrderNo: "SO-1", Lines: requests}}
			}
			saved, err := executeSalesOrderStableIdentityTestCommand(t, database, intent, 4, payload)
			require.NoError(t, err)
			require.Equal(t, 5, saved.Version)
			var persisted models.SalesOrderLine
			require.NoError(t, database.First(&persisted, 102).Error)
			require.Equal(t, "B", persisted.ProductModel)
			require.Equal(t, 1, persisted.LineNo)
			require.Equal(t, 25.0, persisted.Qty)
			require.Zero(t, persisted.Price)
			require.Zero(t, persisted.Amount)
			require.Empty(t, persisted.Note)
			require.Equal(t, 35.0, saved.Quantity)
			require.Equal(t, 20.0, saved.Amount)
		})
	}
}

func TestSalesOrderStableLineIdentityRejectsInvalidOwnershipAndDuplicateRowsAtomically(t *testing.T) {
	for _, intent := range []string{SalesTransactionIntentOrderSave, SalesTransactionIntentOrderLineAdd, SalesTransactionIntentOrderLineRemove, SalesTransactionIntentOrderLineContentChange, SalesTransactionIntentOrderLinesChange} {
		for _, invalid := range []string{"foreign-id", "duplicate-id", "duplicate-line-no", "zero-line-no"} {
			if intent == SalesTransactionIntentOrderLineRemove && (invalid == "duplicate-id" || invalid == "duplicate-line-no") {
				continue // This fixture leaves only one row after a pure remove.
			}
			t.Run(intent+"/"+invalid, func(t *testing.T) {
				database, original := openSalesOrderStableLineIdentityTransactionTestDatabase(t)
				requests := convertSalesOrderLinesToStableIdentityTransactionTestRequests(t, original.Lines)
				if intent == SalesTransactionIntentOrderLineAdd {
					requests = append(requests, SalesOrderLineRequest{LineNo: 3})
				}
				if intent == SalesTransactionIntentOrderLineRemove {
					requests = requests[:1]
				}
				switch invalid {
				case "foreign-id":
					requests[0].ID = 201
				case "duplicate-id":
					requests[1].ID = requests[0].ID
				case "duplicate-line-no":
					requests[1].LineNo = requests[0].LineNo
				case "zero-line-no":
					requests[0].LineNo = 0
				}
				var payload any = SalesOrderLinesChangePayload{Lines: requests}
				if intent == SalesTransactionIntentOrderSave {
					payload = SalesOrderSavePayload{Delta: map[string]json.RawMessage{"lines": json.RawMessage(`{}`), "orderName": json.RawMessage(`{}`)}, FinalData: SalesOrderSnapshotRequest{ID: "order-1", OrderNo: "SO-1", OrderName: "must rollback", Lines: requests}}
				}
				_, err := executeSalesOrderStableIdentityTestCommand(t, database, intent, 4, payload)
				require.ErrorIs(t, err, ErrSalesTransactionInvalidPayload)
				var persisted models.SalesOrder
				require.NoError(t, database.Preload("Lines").First(&persisted, "id = ?", original.ID).Error)
				require.Equal(t, original.Version, persisted.Version)
				require.Equal(t, original.Lines, persisted.Lines)
				require.Empty(t, persisted.OrderName)
				var foreign models.SalesOrderLine
				require.NoError(t, database.First(&foreign, 201).Error)
				require.Equal(t, "order-2", foreign.SalesOrderID)
			})
		}
	}
}

func TestSalesOrderStableLineIdentityVersionConflictAndDatabaseFailureRollBack(t *testing.T) {
	database, original := openSalesOrderStableLineIdentityTransactionTestDatabase(t)
	requests := convertSalesOrderLinesToStableIdentityTransactionTestRequests(t, original.Lines)
	requests[0].Qty = 45
	_, err := executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderLinesChange, 3, SalesOrderLinesChangePayload{Lines: requests})
	require.ErrorIs(t, err, ErrSalesTransactionVersionConflict)
	// Fail after header and line writes, at the required audit write.
	require.NoError(t, database.Callback().Create().Before("gorm:create").Register("fail_sales_line_identity_test_audit", func(tx *gorm.DB) {
		if tx.Statement.Table == "audit_logs" {
			tx.AddError(errors.New("injected audit failure"))
		}
	}))
	_, err = executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderLinesChange, 4, SalesOrderLinesChangePayload{Lines: requests})
	require.ErrorContains(t, err, "injected audit failure")
	var persisted models.SalesOrder
	require.NoError(t, database.Preload("Lines").First(&persisted, "id = ?", original.ID).Error)
	require.Equal(t, original.Version, persisted.Version)
	require.Equal(t, original.Lines, persisted.Lines)
}

func TestSalesOrderStableLineIdentityNewOrderRejectsExistingIds(t *testing.T) {
	err := validateAndAssignSalesOrderLineOwnershipForSave("new-order", nil, []models.SalesOrderLine{{ID: 101, LineNo: 1}})
	require.ErrorIs(t, err, ErrSalesTransactionInvalidPayload)
}

func TestSalesOrderStableLineIdentityExplicitAddThenRemovePreservesSurvivor(t *testing.T) {
	database, order := openSalesOrderStableLineIdentityTransactionTestDatabase(t)
	requests := convertSalesOrderLinesToStableIdentityTransactionTestRequests(t, order.Lines)
	requests = append(requests, SalesOrderLineRequest{LineNo: 3, ProductModel: "C", Qty: 5})
	saved, err := executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderLineAdd, 4, SalesOrderLineAddPayload{Lines: requests})
	require.NoError(t, err)
	require.Len(t, saved.Lines, 3)
	requests = convertSalesOrderLinesToStableIdentityTransactionTestRequests(t, saved.Lines[1:])
	for index := range requests {
		requests[index].LineNo = index + 1
	}
	saved, err = executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderLineRemove, 5, SalesOrderLineRemovePayload{Lines: requests})
	require.NoError(t, err)
	require.Equal(t, 6, saved.Version)
	require.Len(t, saved.Lines, 2)
	require.EqualValues(t, 102, saved.Lines[0].ID)
	require.Equal(t, "B", saved.Lines[0].ProductModel)
	require.Equal(t, 1, saved.Lines[0].LineNo)
}

func TestSalesOrderStableLineIdentityMixedHeaderSaveDoesNotOverwriteExecutionFacts(t *testing.T) {
	database, order := openSalesOrderStableLineIdentityTransactionTestDatabase(t)
	requests := convertSalesOrderLinesToStableIdentityTransactionTestRequests(t, []models.SalesOrderLine{order.Lines[1], order.Lines[0]})
	requests[0].LineNo, requests[1].LineNo = 1, 2
	requests[0].Qty, requests[0].DeliveredQty, requests[0].ClaimedBy = 21, 999, "forged-claim"
	saved, err := executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderSave, 4, SalesOrderSavePayload{
		Delta:     map[string]json.RawMessage{"lines": json.RawMessage(`{}`), "orderName": json.RawMessage(`{}`)},
		FinalData: SalesOrderSnapshotRequest{ID: order.ID, OrderNo: order.OrderNo, OrderName: "updated", Status: "Pending", Lines: requests},
	})
	require.NoError(t, err)
	require.Equal(t, "updated", saved.OrderName)
	require.Equal(t, 5, saved.Version)
	var persisted models.SalesOrderLine
	require.NoError(t, database.First(&persisted, 102).Error)
	require.Equal(t, 21.0, persisted.Qty)
	require.Zero(t, persisted.DeliveredQty)
	require.Empty(t, persisted.ClaimedBy)
	require.Equal(t, 1, persisted.LineNo)
	require.Equal(t, 83.0, saved.Amount)
}

func TestSalesOrderStableLineIdentityBulkSyncCannotBypassOwnershipOrVersion(t *testing.T) {
	database, original := openSalesOrderStableLineIdentityTransactionTestDatabase(t)
	previousDatabase := appdb.DB
	appdb.DB = database
	t.Cleanup(func() { appdb.DB = previousDatabase })
	requests := convertSalesOrderLinesToStableIdentityTransactionTestRequests(t, original.Lines[1:])
	requests[0].LineNo, requests[0].Qty = 1, 25
	snapshot := SalesOrderSnapshotRequest{ID: original.ID, Version: 4, OrderNo: original.OrderNo, Status: original.Status, Lines: requests}
	require.NoError(t, BulkSyncSalesOrders([]SalesOrderSnapshotRequest{snapshot}))
	var persisted models.SalesOrder
	require.NoError(t, database.Preload("Lines").First(&persisted, "id = ?", original.ID).Error)
	require.Equal(t, 5, persisted.Version)
	require.Len(t, persisted.Lines, 1)
	require.EqualValues(t, 102, persisted.Lines[0].ID)
	require.Equal(t, 25.0, persisted.Lines[0].Qty)
	require.ErrorIs(t, BulkSyncSalesOrders([]SalesOrderSnapshotRequest{snapshot}), ErrSalesTransactionVersionConflict)
	// Even a current version cannot take a row from another order.
	snapshot.Version, snapshot.Lines[0].ID = 5, 201
	require.ErrorIs(t, BulkSyncSalesOrders([]SalesOrderSnapshotRequest{snapshot}), ErrSalesTransactionInvalidPayload)
	snapshot.ID, snapshot.OrderNo = "new-order", "SO-NEW"
	require.ErrorIs(t, BulkSyncSalesOrders([]SalesOrderSnapshotRequest{snapshot}), ErrSalesTransactionInvalidPayload)
	var foreign models.SalesOrderLine
	require.NoError(t, database.First(&foreign, 201).Error)
	require.Equal(t, "order-2", foreign.SalesOrderID)
}

func TestSalesOrderStableLineIdentityOrdinarySavePreservesNewerExecutionFacts(t *testing.T) {
	database, order := openSalesOrderStableLineIdentityTransactionTestDatabase(t)
	staleLines := append([]models.SalesOrderLine(nil), order.Lines...)
	staleLines[0].Qty = 15
	require.NoError(t, database.Model(&models.SalesOrderLine{}).Where("id = ?", 101).
		Updates(map[string]any{"delivered_qty": 3, "claimed_by": "warehouse-user", "claimed_at": "2026-10-27T01:00:00Z", "status": "InProgress"}).Error)
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		return persistSalesOrderLinesByStableIdentityTx(tx, order.ID, staleLines)
	}))
	var persisted models.SalesOrderLine
	require.NoError(t, database.First(&persisted, 101).Error)
	require.Equal(t, 15.0, persisted.Qty)
	require.Equal(t, 3.0, persisted.DeliveredQty)
	require.Equal(t, "warehouse-user", persisted.ClaimedBy)
	require.Equal(t, "2026-10-27T01:00:00Z", persisted.ClaimedAt)
	require.Equal(t, "InProgress", persisted.Status)
}

func TestSalesOrderStableLineIdentityClaimWritesOnlyClaimFacts(t *testing.T) {
	database, _ := openSalesOrderStableLineIdentityTransactionTestDatabase(t)
	saved, err := executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderLineClaim, 4,
		SalesOrderLineClaimPayload{LineNos: []int{2}, Operator: "claim-user"})
	require.NoError(t, err)
	require.Equal(t, 5, saved.Version)
	var persisted models.SalesOrderLine
	require.NoError(t, database.First(&persisted, 102).Error)
	require.Equal(t, "claim-user", persisted.ClaimedBy)
	require.NotEmpty(t, persisted.ClaimedAt)
	require.Equal(t, 20.0, persisted.Qty)
	require.Zero(t, persisted.DeliveredQty)
}

func TestSalesOrderStableLineIdentityPackagingFollowsIdentityAfterReindex(t *testing.T) {
	database, _ := openSalesOrderStableLineIdentityTransactionTestDatabase(t)
	previous := []models.SalesOrderLine{
		{ID: 101, LineNo: 1, ProductID: "same-product", SelectedPackaging: encodeSalesOrderLinePackagingSelection(&SalesOrderLinePackagingSelectionPayload{ProfileID: "package-A", Source: "manual"})},
		{ID: 102, LineNo: 2, ProductID: "same-product", SelectedPackaging: encodeSalesOrderLinePackagingSelection(&SalesOrderLinePackagingSelectionPayload{ProfileID: "package-B", Source: "manual"})},
	}
	next := []models.SalesOrderLine{{ID: 102, LineNo: 1, ProductID: "same-product"}, {LineNo: 2, ProductID: "same-product"}}
	require.NoError(t, normalizeSalesOrderLinePackagingSelectionsTx(database, previous, next))
	require.Equal(t, "package-B", decodeSalesOrderLinePackagingSelection(next[0].SelectedPackaging).ProfileID)
	require.Nil(t, decodeSalesOrderLinePackagingSelection(next[1].SelectedPackaging))
}
