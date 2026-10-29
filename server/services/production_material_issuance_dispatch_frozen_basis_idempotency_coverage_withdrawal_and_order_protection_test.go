package services

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func openProductionMaterialIssuanceDocumentTransactionTestDatabase(t *testing.T) (*gorm.DB, []ProductionMaterialIssuanceReviewedSourceBasis) {
	t.Helper()
	database, _ := openSalesOrderStableLineIdentityTransactionTestDatabase(t)
	require.NoError(t, database.AutoMigrate(&models.ProductionMaterialIssuanceDocument{}, &models.ProductionMaterialIssuanceSourceSnapshot{}, &models.ProductionMaterialIssuanceActiveSourceCoverage{}, &models.ProductionMaterialIssuanceCommandReceipt{}, &models.ProductionMaterialIssuanceWarehouseMovement{}))
	statements := []string{
		`CREATE TABLE product_attribute_options (id TEXT PRIMARY KEY, category TEXT, value TEXT, label TEXT, label_en TEXT, deleted_at DATETIME)`,
		`CREATE TABLE warehouse_categories (id TEXT PRIMARY KEY, code TEXT, is_system BOOLEAN, active BOOLEAN, allow_shipment BOOLEAN, deleted_at DATETIME)`,
		`CREATE TABLE boms (id TEXT PRIMARY KEY, product_id TEXT, bom_type TEXT, bom_no TEXT, status TEXT, owner_type TEXT, owner_customer_id TEXT, version INTEGER, version_text TEXT, version_level TEXT, revision_no TEXT, measured_weight REAL, measured_weight_unit TEXT, effective_from DATETIME, effective_to DATETIME, deleted_at DATETIME)`,
		`CREATE TABLE bom_items (id TEXT PRIMARY KEY, bom_id TEXT, sort_order INTEGER, section TEXT, material_id TEXT, unit TEXT, standard_usage REAL)`,
		`CREATE TABLE materials (id TEXT PRIMARY KEY, code TEXT, name TEXT, spec TEXT, uom TEXT, status TEXT, deleted_at DATETIME)`,
		`CREATE TABLE products (id TEXT PRIMARY KEY, sku TEXT, name TEXT, tech_series TEXT, brake_type TEXT, deleted_at DATETIME)`,
		`INSERT INTO product_attribute_options VALUES ('option-1','versionLevel','standard','标准版','Standard',NULL)`,
		`INSERT INTO warehouse_categories VALUES ('warehouse-1','MATERIAL',1,1,1,NULL)`,
		`UPDATE sales_orders SET customer_id='customer-1', customer_name='客户' WHERE id='order-1'`,
		`UPDATE sales_order_lines SET product_id='product-1', uom='PCS' WHERE sales_order_id='order-1'`,
		`INSERT INTO boms VALUES ('bom-1','product-1','MBOM','MBOM-1','RELEASED','INTERNAL','',3,'V1','standard','A',480,'g',NULL,NULL,NULL)`,
		`INSERT INTO bom_items VALUES ('item-1','bom-1',1,'A','material-1','m2',0.6), ('item-2','bom-1',2,'B','material-1','m2',0.4)`,
		`INSERT INTO materials VALUES ('material-1','m1','材料原名','规格','m2','Active',NULL)`,
		`INSERT INTO products VALUES ('product-1','SKU-1','产品名称','系列','碟刹',NULL)`,
	}
	for _, statement := range statements {
		require.NoError(t, database.Exec(statement).Error)
	}
	selections := []ProductionMaterialIssuanceSourceSelection{{SalesOrderID: "order-1", SalesOrderLineID: 102, BOMID: "bom-1"}, {SalesOrderID: "order-1", SalesOrderLineID: 101, BOMID: "bom-1"}}
	bases, err := ReviewProductionMaterialIssuanceSources(context.Background(), database, selections)
	require.NoError(t, err)
	require.Len(t, bases, 2)
	require.EqualValues(t, 101, bases[0].SalesOrderLineID)
	return database, bases
}

func buildProductionMaterialIssuanceDispatchTestRequest(commandID string, bases []ProductionMaterialIssuanceReviewedSourceBasis) ProductionMaterialIssuanceDispatchRequest {
	request := ProductionMaterialIssuanceDispatchRequest{CommandID: commandID, Sources: make([]ProductionMaterialIssuanceDispatchSourceExpectation, 0, len(bases))}
	for _, basis := range bases {
		request.Sources = append(request.Sources, ProductionMaterialIssuanceDispatchSourceExpectation{
			ProductionMaterialIssuanceSourceSelection: ProductionMaterialIssuanceSourceSelection{SalesOrderID: basis.SalesOrderID, SalesOrderLineID: basis.SalesOrderLineID, BOMID: basis.BOM.ID},
			ExpectedOrderVersion:                      basis.OrderVersion, ExpectedBOMVersion: basis.BOM.Version, BasisFingerprint: basis.BasisFingerprint,
		})
	}
	return request
}

func requireProductionMaterialIssuancePersistedRecordCounts(t *testing.T, database *gorm.DB, documents, snapshots, coverage, receipts, audits int64) {
	t.Helper()
	for _, expected := range []struct {
		model any
		count int64
	}{
		{&models.ProductionMaterialIssuanceDocument{}, documents}, {&models.ProductionMaterialIssuanceSourceSnapshot{}, snapshots},
		{&models.ProductionMaterialIssuanceActiveSourceCoverage{}, coverage}, {&models.ProductionMaterialIssuanceCommandReceipt{}, receipts}, {&models.AuditLog{}, audits},
	} {
		var actual int64
		require.NoError(t, database.Model(expected.model).Count(&actual).Error)
		require.Equal(t, expected.count, actual, "%T", expected.model)
	}
}

func TestProductionMaterialIssuanceDispatchFreezesSharedBasisAndIdempotentOriginalDocument(t *testing.T) {
	database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
	requireProductionMaterialIssuancePersistedRecordCounts(t, database, 0, 0, 0, 0, 0)
	actor := ProductionMaterialIssuanceCommandActor{UserID: "user-1", Username: "发起人"}
	request := buildProductionMaterialIssuanceDispatchTestRequest("dispatch-1", bases)
	detail, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, actor, request)
	require.NoError(t, err)
	require.Equal(t, models.ProductionMaterialIssuanceDispatched, detail.Document.Status)
	require.Equal(t, "MATERIAL", detail.Document.WarehouseCategoryCode)
	require.Equal(t, "user-1", detail.Document.DispatchedBy)
	require.Equal(t, bases, detail.Sources)
	require.Equal(t, 480.0, detail.Sources[0].BOM.MeasuredWeight)
	require.Equal(t, 6.0, detail.Sources[0].Contributions[0].RequiredQty)
	requireProductionMaterialIssuancePersistedRecordCounts(t, database, 1, 2, 2, 1, 1)
	request.Sources[0], request.Sources[1] = request.Sources[1], request.Sources[0]
	replayed, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, actor, request)
	require.NoError(t, err)
	require.Equal(t, detail.Document.ID, replayed.Document.ID)
	require.Equal(t, detail.Sources, replayed.Sources)
	request.Sources[0].ExpectedBOMVersion++
	_, err = DispatchProductionMaterialIssuanceDocument(context.Background(), database, actor, request)
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceCommandReused)
	_, err = DispatchProductionMaterialIssuanceDocument(context.Background(), database, actor, buildProductionMaterialIssuanceDispatchTestRequest("overlapping-dispatch", bases[:1]))
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceSourceCovered)
	// A failed overlap must not leave a receipt, partial document or extra coverage.
	requireProductionMaterialIssuancePersistedRecordCounts(t, database, 1, 2, 2, 1, 1)
	for _, statement := range []string{`UPDATE bom_items SET standard_usage=9`, `UPDATE boms SET version=4, measured_weight=999`, `UPDATE materials SET name='材料新名'`, `UPDATE products SET name='产品新名'`} {
		require.NoError(t, database.Exec(statement).Error)
	}
	frozen, err := GetProductionMaterialIssuanceDocument(context.Background(), database, detail.Document.ID)
	require.NoError(t, err)
	require.Equal(t, detail.Sources, frozen.Sources)
	queue, err := ListProductionMaterialIssuanceDocuments(context.Background(), database, models.ProductionMaterialIssuanceDispatched, 1, 20)
	require.NoError(t, err)
	require.EqualValues(t, 1, queue.Total)
	require.Equal(t, detail.Document.ID, queue.Items[0].ID)
	// No stock table exists in this fixture: dispatch does not reserve/deduct stock.
	require.False(t, database.Migrator().HasTable(&models.Inventory{}))
}

func TestProductionMaterialIssuanceDispatchRejectsChangedAndIncompleteBasisBeforeAnyWrite(t *testing.T) {
	for _, scenario := range []struct{ name, statement string }{
		{"order-version", `UPDATE sales_orders SET version=5 WHERE id='order-1'`},
		{"quantity-without-version", `UPDATE sales_order_lines SET qty=99 WHERE id=101`},
		{"recipe-without-version", `UPDATE bom_items SET standard_usage=0.7 WHERE id='item-1'`},
		{"weight-without-version", `UPDATE boms SET measured_weight=420 WHERE id='bom-1'`},
		{"bom-version", `UPDATE boms SET version=4 WHERE id='bom-1'`},
		{"obsolete-bom", `UPDATE boms SET status='OBSOLETE' WHERE id='bom-1'`},
		{"unavailable-material", `UPDATE materials SET status='Inactive'`},
		{"unit-mismatch", `UPDATE materials SET uom='kg'`},
		{"deleted-line", `UPDATE sales_order_lines SET sales_order_id=NULL WHERE id=101`},
		{"expired-bom", `UPDATE boms SET effective_to='2000-01-01'`},
		{"cancelled-order", `UPDATE sales_orders SET status='Canceled' WHERE id='order-1'`},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
			require.NoError(t, database.Exec(scenario.statement).Error)
			_, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "user-1"}, buildProductionMaterialIssuanceDispatchTestRequest("send", bases))
			require.ErrorIs(t, err, ErrProductionMaterialIssuanceBasisChanged)
			requireProductionMaterialIssuancePersistedRecordCounts(t, database, 0, 0, 0, 0, 0)
		})
	}
}

func TestProductionMaterialIssuanceDispatchAuditFailureRollsBackSnapshotsCoverageAndReceipt(t *testing.T) {
	database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
	require.NoError(t, database.Callback().Create().Before("gorm:create").Register("fail_material_issuance_audit", func(tx *gorm.DB) {
		if tx.Statement.Table == "audit_logs" {
			tx.AddError(errors.New("injected issuance audit failure"))
		}
	}))
	_, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "user-1"}, buildProductionMaterialIssuanceDispatchTestRequest("send", bases))
	require.ErrorContains(t, err, "injected issuance audit failure")
	requireProductionMaterialIssuancePersistedRecordCounts(t, database, 0, 0, 0, 0, 0)
}

func TestProductionMaterialIssuanceWithdrawalPreservesHistoryReleasesCoverageAndIsIdempotent(t *testing.T) {
	database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
	actor := ProductionMaterialIssuanceCommandActor{UserID: "user-1"}
	dispatched, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, actor, buildProductionMaterialIssuanceDispatchTestRequest("send", bases))
	require.NoError(t, err)
	request := ProductionMaterialIssuanceWithdrawalRequest{CommandID: "withdraw", DocumentID: dispatched.Document.ID, ExpectedVersion: 2, Reason: "重新核对数量"}
	_, err = WithdrawProductionMaterialIssuanceDocument(context.Background(), database, actor, request)
	require.ErrorIs(t, err, ErrProductionMaterialIssuanceBasisChanged)
	requireProductionMaterialIssuancePersistedRecordCounts(t, database, 1, 2, 2, 1, 1)
	request.ExpectedVersion = 1
	withdrawn, err := WithdrawProductionMaterialIssuanceDocument(context.Background(), database, actor, request)
	require.NoError(t, err)
	require.Equal(t, models.ProductionMaterialIssuanceWithdrawn, withdrawn.Document.Status)
	require.Equal(t, 2, withdrawn.Document.Version)
	require.Equal(t, dispatched.Sources, withdrawn.Sources)
	requireProductionMaterialIssuancePersistedRecordCounts(t, database, 1, 2, 0, 2, 2)
	replayed, err := WithdrawProductionMaterialIssuanceDocument(context.Background(), database, actor, request)
	require.NoError(t, err)
	require.Equal(t, withdrawn.Document.ID, replayed.Document.ID)
	requireProductionMaterialIssuancePersistedRecordCounts(t, database, 1, 2, 0, 2, 2)
	// Retrying the original send returns its existing document and current state.
	replayed, err = DispatchProductionMaterialIssuanceDocument(context.Background(), database, actor, buildProductionMaterialIssuanceDispatchTestRequest("send", bases))
	require.NoError(t, err)
	require.Equal(t, models.ProductionMaterialIssuanceWithdrawn, replayed.Document.Status)
	_, err = DispatchProductionMaterialIssuanceDocument(context.Background(), database, actor, buildProductionMaterialIssuanceDispatchTestRequest("send-again-after-withdrawal", bases))
	require.NoError(t, err)
	requireProductionMaterialIssuancePersistedRecordCounts(t, database, 2, 4, 2, 3, 3)
}

func TestProductionMaterialIssuanceWithdrawalRejectsWarehouseExecutionAndRollsBackOnAuditFailure(t *testing.T) {
	for _, warehouseExecution := range []bool{true, false} {
		t.Run(map[bool]string{true: "warehouse-execution", false: "audit-failure"}[warehouseExecution], func(t *testing.T) {
			database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
			actor := ProductionMaterialIssuanceCommandActor{UserID: "user-1"}
			detail, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, actor, buildProductionMaterialIssuanceDispatchTestRequest("send", bases))
			require.NoError(t, err)
			if warehouseExecution {
				require.NoError(t, database.Model(&models.ProductionMaterialIssuanceDocument{}).Where("id = ?", detail.Document.ID).Update("warehouse_execution_at", time.Now().UTC()).Error)
			} else {
				require.NoError(t, database.Callback().Create().Before("gorm:create").Register("fail_material_withdrawal_audit", func(tx *gorm.DB) {
					if tx.Statement.Table == "audit_logs" {
						tx.AddError(errors.New("withdraw audit failed"))
					}
				}))
			}
			_, err = WithdrawProductionMaterialIssuanceDocument(context.Background(), database, actor, ProductionMaterialIssuanceWithdrawalRequest{CommandID: "withdraw", DocumentID: detail.Document.ID, ExpectedVersion: 1, Reason: "调整"})
			require.Error(t, err)
			requireProductionMaterialIssuancePersistedRecordCounts(t, database, 1, 2, 2, 1, 1)
			retained, err := GetProductionMaterialIssuanceDocument(context.Background(), database, detail.Document.ID)
			require.NoError(t, err)
			require.Equal(t, models.ProductionMaterialIssuanceDispatched, retained.Document.Status)
			require.Equal(t, 1, retained.Document.Version)
		})
	}
}

func TestProductionMaterialIssuanceActiveCoverageBlocksOrderChangesAcrossWriteEntrypoints(t *testing.T) {
	for _, scenario := range []string{"line-quantity", "line-product", "line-unit", "line-remove", "customer", "cancel", "unified-save", "bulk-sync"} {
		t.Run(scenario, func(t *testing.T) {
			database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
			_, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "user-1"}, buildProductionMaterialIssuanceDispatchTestRequest("send", bases))
			require.NoError(t, err)
			var original models.SalesOrder
			require.NoError(t, database.Preload("Lines").First(&original, "id = ?", "order-1").Error)
			requests := convertSalesOrderLinesToStableIdentityTransactionTestRequests(t, original.Lines)
			intent, payload := SalesTransactionIntentOrderLinesChange, any(SalesOrderLinesChangePayload{Lines: requests})
			switch scenario {
			case "line-quantity":
				requests[0].Qty++
			case "line-product":
				require.NoError(t, database.Exec(`INSERT INTO products (id,name) VALUES ('product-2','另一个产品')`).Error)
				requests[0].ProductID = "product-2"
			case "line-unit":
				requests[0].UOM = "BOX"
			case "line-remove":
				intent, payload = SalesTransactionIntentOrderLineRemove, SalesOrderLineRemovePayload{Lines: requests[1:]}
			case "customer":
				intent, payload = SalesTransactionIntentCustomerChange, SalesOrderCustomerChangePayload{CustomerID: "other-customer", CustomerName: "其他客户"}
			case "cancel":
				intent, payload = SalesTransactionIntentOrderCancel, SalesOrderCancelPayload{Reason: "取消"}
			case "unified-save":
				requests[0].Qty++
				intent, payload = SalesTransactionIntentOrderSave, SalesOrderSavePayload{Delta: map[string]json.RawMessage{"lines": json.RawMessage(`{}`), "orderName": json.RawMessage(`{}`)}, FinalData: SalesOrderSnapshotRequest{ID: original.ID, OrderNo: original.OrderNo, CustomerID: original.CustomerID, Status: original.Status, Lines: requests}}
			case "bulk-sync":
				previousDatabase := appdb.DB
				appdb.DB = database
				t.Cleanup(func() { appdb.DB = previousDatabase })
				requests[0].Qty++
				err = BulkSyncSalesOrders([]SalesOrderSnapshotRequest{{ID: original.ID, Version: original.Version, OrderNo: original.OrderNo, CustomerID: original.CustomerID, Status: original.Status, Lines: requests}})
			}
			if scenario != "bulk-sync" {
				_, err = executeSalesOrderStableIdentityTestCommand(t, database, intent, original.Version, payload)
			}
			require.ErrorIs(t, err, ErrProductionMaterialIssuanceOrderProtected)
			var retained models.SalesOrder
			require.NoError(t, database.Preload("Lines").First(&retained, "id = ?", original.ID).Error)
			require.Equal(t, original.Version, retained.Version)
			require.Equal(t, original.Lines, retained.Lines)
			requireProductionMaterialIssuancePersistedRecordCounts(t, database, 1, 2, 2, 1, 1)
		})
	}
}

func TestProductionMaterialIssuanceActiveCoverageAllowsReindexNotesAndUncoveredNewLines(t *testing.T) {
	database, bases := openProductionMaterialIssuanceDocumentTransactionTestDatabase(t)
	detail, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "user-1"}, buildProductionMaterialIssuanceDispatchTestRequest("send", bases))
	require.NoError(t, err)
	var original models.SalesOrder
	require.NoError(t, database.Preload("Lines").First(&original, "id = ?", "order-1").Error)
	requests := convertSalesOrderLinesToStableIdentityTransactionTestRequests(t, []models.SalesOrderLine{original.Lines[1], original.Lines[0]})
	requests[0].LineNo, requests[1].LineNo = 1, 2
	requests[0].Note = "只改备注"
	requests = append(requests, SalesOrderLineRequest{LineNo: 3, ProductID: "product-1", Qty: 5, UOM: "PCS"})
	saved, err := executeSalesOrderStableIdentityTestCommand(t, database, SalesTransactionIntentOrderLinesChange, 4, SalesOrderLinesChangePayload{Lines: requests})
	require.NoError(t, err)
	require.Equal(t, 5, saved.Version)
	require.Len(t, saved.Lines, 3)
	frozen, err := GetProductionMaterialIssuanceDocument(context.Background(), database, detail.Document.ID)
	require.NoError(t, err)
	require.Equal(t, bases, frozen.Sources)
	var covered int64
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceActiveSourceCoverage{}).Count(&covered).Error)
	require.EqualValues(t, 2, covered)
}
