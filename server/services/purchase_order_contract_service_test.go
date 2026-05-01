package services

import (
	"encoding/json"
	"fmt"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupPurchaseOrderContractServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	originalDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	applyTradingTestSchema(t, testDB, tradingTestSchemaOptions{includePurchase: true, includeAuditLog: true})
	for _, statement := range []string{
		`CREATE TABLE materials (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT,
			name TEXT,
			status TEXT
		)`,
	} {
		require.NoError(t, testDB.Exec(statement).Error)
	}

	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return testDB
}

func seedPurchaseOrderContractFixture(t *testing.T, testDB *gorm.DB) models.PurchaseOrder {
	t.Helper()

	require.NoError(t, testDB.Exec(`
		INSERT OR IGNORE INTO materials (id, code, name, status)
		VALUES (?, ?, ?, ?)
	`, "material-1", "MAT-001", "Copper", "Active").Error)

	order := models.PurchaseOrder{
		ID:           "33333333-3333-4333-8333-333333333333",
		OrderNo:      "PO-CONTRACT-001",
		SupplierID:   "supplier-1",
		SupplierName: "Supplier A",
		OrderDate:    "2026-04-18",
		ExpectedDate: "2026-04-25",
		Status:       "Draft",
		Currency:     "CNY",
		Amount:       20,
		ExchangeRate: 1,
		Purchaser:    "buyer",
		Note:         "",
		Evidences:    json.RawMessage(`[]`),
		Version:      1,
		Lines: []models.PurchaseOrderLine{
			{
				Version:       1,
				LineNo:        1,
				MaterialID:    "material-1",
				MaterialCode:  "MAT-001",
				MaterialName:  "Copper",
				Specification: "spec",
				Qty:           2,
				UOM:           "PCS",
				Price:         10,
				Amount:        20,
				ReceivedQty:   0,
				ReturnedQty:   0,
				Status:        "Draft",
			},
		},
	}

	require.NoError(t, testDB.Create(&order).Error)
	return order
}

func TestPurchaseOrderServiceContractListRespectsWithLinesFlag(t *testing.T) {
	testDB := setupPurchaseOrderContractServiceTestDB(t)
	seedPurchaseOrderContractFixture(t, testDB)

	withoutLines, err := ListPurchaseOrders(PurchaseOrderListQuery{
		Page:      1,
		PageSize:  20,
		WithLines: false,
	})
	require.NoError(t, err)
	require.Len(t, withoutLines.Items, 1)
	require.Nil(t, withoutLines.Items[0].Lines)

	withLines, err := ListPurchaseOrders(PurchaseOrderListQuery{
		Page:      1,
		PageSize:  20,
		WithLines: true,
	})
	require.NoError(t, err)
	require.Len(t, withLines.Items, 1)
	require.NotNil(t, withLines.Items[0].Lines)
	require.Len(t, *withLines.Items[0].Lines, 1)
	require.Equal(t, "2026-04-25", (*withLines.Items[0].Lines)[0].ExpectedDate)
}

func TestPurchaseOrderServiceContractListSupportsStatusFilter(t *testing.T) {
	testDB := setupPurchaseOrderContractServiceTestDB(t)
	order := seedPurchaseOrderContractFixture(t, testDB)
	require.NoError(t, testDB.Create(&models.PurchaseOrder{
		ID:           "33333333-3333-4333-8333-333333333334",
		OrderNo:      "PO-CONTRACT-002",
		SupplierID:   "supplier-2",
		SupplierName: "Supplier B",
		OrderDate:    "2026-04-19",
		ExpectedDate: "2026-04-26",
		Status:       "Approved",
		Currency:     "CNY",
		Amount:       50,
		ExchangeRate: 1,
		Purchaser:    "buyer",
		Evidences:    json.RawMessage(`[]`),
		Version:      1,
	}).Error)

	result, err := ListPurchaseOrders(PurchaseOrderListQuery{
		Page:            1,
		PageSize:        20,
		StatusFilterRaw: "Approved",
	})
	require.NoError(t, err)
	require.Len(t, result.Items, 1)
	require.Equal(t, "PO-CONTRACT-002", result.Items[0].OrderNo)
	require.NotEqual(t, order.OrderNo, result.Items[0].OrderNo)
}

func TestPurchaseOrderServiceContractGetByIDIncludesLines(t *testing.T) {
	testDB := setupPurchaseOrderContractServiceTestDB(t)
	order := seedPurchaseOrderContractFixture(t, testDB)

	result, err := GetPurchaseOrderByID(order.ID)
	require.NoError(t, err)
	require.Len(t, result.Lines, 1)
	require.Equal(t, "2026-04-25", result.Lines[0].ExpectedDate)
}

func TestPurchaseOrderServiceContractSaveIncludesLinesArray(t *testing.T) {
	setupPurchaseOrderContractServiceTestDB(t)

	result, err := SavePurchaseOrder(SavePurchaseOrderCommand{
		Request: SavePurchaseOrderRequest{
			OrderNo:      "PO-SAVE-001",
			SupplierID:   "supplier-1",
			SupplierName: "Supplier A",
			OrderDate:    "2026-04-18",
			ExpectedDate: "2026-04-25",
			Status:       "Draft",
			Currency:     "CNY",
			Amount:       100,
			ExchangeRate: 1,
			Purchaser:    "buyer",
			Lines:        []PurchaseOrderLineRequest{},
		},
		ActorID:  "u-1",
		Operator: "tester",
		IP:       "127.0.0.1",
	})
	require.NoError(t, err)
	require.NotNil(t, result.Lines)
	require.Empty(t, result.Lines)
}

func TestPurchaseOrderServiceContractPatchIncludesLinesArray(t *testing.T) {
	testDB := setupPurchaseOrderContractServiceTestDB(t)
	order := seedPurchaseOrderContractFixture(t, testDB)

	result, err := PatchPurchaseOrder(PatchPurchaseOrderCommand{
		OrderID: order.ID,
		DeltaReq: SDRTSDeltaHandlerRequest{
			Op: "PATCH",
			Delta: map[string]json.RawMessage{
				"expectedDate": json.RawMessage(`{"o":"2026-04-25","n":"2026-04-26"}`),
			},
			Metadata: SDRTSDeltaMetadata{
				ID:      order.ID,
				Version: int64(order.Version),
			},
		},
		ActorID:  "u-1",
		Operator: "tester",
		IP:       "127.0.0.1",
	})
	require.NoError(t, err)
	require.Len(t, result.Lines, 1)
	require.Equal(t, "2026-04-26", result.Lines[0].ExpectedDate)
}

func TestPurchaseOrderServiceContractTransactionIncludesLinesArray(t *testing.T) {
	testDB := setupPurchaseOrderContractServiceTestDB(t)
	order := seedPurchaseOrderContractFixture(t, testDB)

	result, err := ExecutePurchaseOrderTransaction(ExecutePurchaseOrderTransactionInput{
		OrderID:         order.ID,
		Intent:          PurchaseTransactionIntentExpectedDateChange,
		ActorID:         "u-1",
		Operator:        "tester",
		ExpectedVersion: order.Version,
		Payload:         json.RawMessage(`{"expectedDate":"2026-04-26","operator":"tester"}`),
		IP:              "127.0.0.1",
	})
	require.NoError(t, err)
	require.Len(t, result.Lines, 1)
	require.Equal(t, "2026-04-26", result.Lines[0].ExpectedDate)
}
