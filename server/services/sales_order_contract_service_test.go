package services

import (
	"encoding/json"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupSalesOrderContractServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	originalDB := db.DB
	testDB := setupSalesOrderCommandTestDB(t)
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

func seedSalesOrderContractFixture(t *testing.T, testDB *gorm.DB) models.SalesOrder {
	t.Helper()

	order := models.SalesOrder{
		ID:             "11111111-1111-4111-8111-111111111111",
		OrderNo:        "SO-CONTRACT-001",
		OrderName:      "Sales Contract Order",
		CustomerName:   "Acme",
		CustomerID:     "customer-1",
		Type:           "NORMAL",
		Currency:       "CNY",
		Classification: "GENERAL",
		Status:         "Pending",
		OrderDate:      "2026-04-18",
		DeliveryDate:   "2026-04-20",
		Barcode:        "SO-CONTRACT-001",
		Evidences:      json.RawMessage(`[]`),
		Version:        1,
		Lines: []models.SalesOrderLine{
			{
				LineNo:         1,
				ProductID:      "",
				ProductModel:   "PM-001",
				ProductCode:    "PC-001",
				Specification:  "spec",
				Description:    "desc",
				Qty:            2,
				UOM:            "PCS",
				Price:          10,
				Amount:         20,
				DeliveredQty:   0,
				CustomerPartNo: "CP-001",
				JobNo:          "JOB-001",
				OrderDate:      "2026-04-18",
				Status:         "Pending",
			},
		},
	}

	require.NoError(t, testDB.Create(&order).Error)
	return order
}

func TestSalesOrderServiceContractListRespectsWithLinesFlag(t *testing.T) {
	testDB := setupSalesOrderContractServiceTestDB(t)
	seedSalesOrderContractFixture(t, testDB)

	withoutLines, err := ListSalesOrders(SalesOrderListQuery{
		Page:      1,
		PageSize:  20,
		WithLines: false,
	})
	require.NoError(t, err)
	require.Len(t, withoutLines.Items, 1)
	require.Nil(t, withoutLines.Items[0].Lines)

	withLines, err := ListSalesOrders(SalesOrderListQuery{
		Page:      1,
		PageSize:  20,
		WithLines: true,
	})
	require.NoError(t, err)
	require.Len(t, withLines.Items, 1)
	require.NotNil(t, withLines.Items[0].Lines)
	require.Len(t, *withLines.Items[0].Lines, 1)
}

func TestSalesOrderServiceContractListIncludesEmptyLinesArrayWhenRequested(t *testing.T) {
	testDB := setupSalesOrderContractServiceTestDB(t)
	order := seedSalesOrderContractFixture(t, testDB)
	require.NoError(t, testDB.Where("sales_order_id = ?", order.ID).Delete(&models.SalesOrderLine{}).Error)

	result, err := ListSalesOrders(SalesOrderListQuery{
		Page:      1,
		PageSize:  20,
		WithLines: true,
	})
	require.NoError(t, err)
	require.Len(t, result.Items, 1)
	require.NotNil(t, result.Items[0].Lines)
	require.Empty(t, *result.Items[0].Lines)
}

func TestSalesOrderServiceContractListSupportsPaymentMethodAndTermFilters(t *testing.T) {
	testDB := setupSalesOrderContractServiceTestDB(t)
	seedSalesOrderContractFixture(t, testDB)
	require.NoError(t, testDB.Create(&models.SalesOrder{
		ID:                "18888888-1111-4111-8111-111111111111",
		OrderNo:           "SO-CONTRACT-002",
		OrderName:         "Payment Filter Contract Order",
		CustomerName:      "Delta",
		CustomerID:        "customer-2",
		Type:              "NORMAL",
		Currency:          "CNY",
		PaymentMethod:     "BANK_TRANSFER",
		PaymentMethodName: "Bank Transfer",
		PaymentTerm:       "MONTH_END",
		PaymentTermName:   "Month End",
		Classification:    "GENERAL",
		Status:            "Pending",
		OrderDate:         "2026-04-19",
		DeliveryDate:      "2026-04-21",
		Barcode:           "SO-CONTRACT-002",
		Evidences:         json.RawMessage(`[]`),
		Version:           1,
	}).Error)

	result, err := ListSalesOrders(SalesOrderListQuery{
		Page:          1,
		PageSize:      20,
		WithLines:     false,
		PaymentMethod: "BANK_TRANSFER",
		PaymentTerm:   "MONTH_END",
	})
	require.NoError(t, err)
	require.Len(t, result.Items, 1)
	require.Equal(t, "SO-CONTRACT-002", result.Items[0].OrderNo)
}

func TestSalesOrderServiceContractGetByIDIncludesLines(t *testing.T) {
	testDB := setupSalesOrderContractServiceTestDB(t)
	order := seedSalesOrderContractFixture(t, testDB)

	result, err := GetSalesOrderByID(order.ID)
	require.NoError(t, err)
	require.Len(t, result.Lines, 1)
}

func TestSalesOrderServiceContractGetByNoIncludesLines(t *testing.T) {
	testDB := setupSalesOrderContractServiceTestDB(t)
	order := seedSalesOrderContractFixture(t, testDB)

	result, err := GetSalesOrderByNo(order.OrderNo)
	require.NoError(t, err)
	require.Len(t, result.Lines, 1)
}

func TestSalesOrderServiceContractSaveIncludesLinesArray(t *testing.T) {
	_ = setupSalesOrderContractServiceTestDB(t)

	result, err := SaveSalesOrder(SaveSalesOrderCommand{
		Request: SaveSalesOrderRequest{
			OrderNo:        "SO-SAVE-001",
			Barcode:        "SO-SAVE-001",
			OrderName:      "Created Contract Order",
			CustomerName:   "Acme",
			CustomerID:     "customer-1",
			Type:           "NORMAL",
			Currency:       "CNY",
			Classification: "GENERAL",
			Status:         "Pending",
			OrderDate:      "2026-04-18",
			DeliveryDate:   "2026-04-20",
			Lines:          []SalesOrderLineRequest{},
		},
		ActorID:  "u-1",
		Operator: "tester",
		IP:       "127.0.0.1",
	})
	require.NoError(t, err)
	require.NotNil(t, result.Lines)
	require.Empty(t, result.Lines)
}

func TestSalesOrderServiceContractPatchIncludesLinesArray(t *testing.T) {
	testDB := setupSalesOrderContractServiceTestDB(t)
	order := seedSalesOrderContractFixture(t, testDB)

	result, err := PatchSalesOrder(PatchSalesOrderCommand{
		OrderID: order.ID,
		DeltaReq: SDRTSDeltaHandlerRequest{
			Op: "PATCH",
			Delta: map[string]json.RawMessage{
				"orderName": json.RawMessage(`{"o":"Sales Contract Order","n":"Sales Contract Order Updated"}`),
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
}

func TestSalesOrderServiceContractTransactionIncludesLinesArray(t *testing.T) {
	testDB := setupSalesOrderContractServiceTestDB(t)
	order := seedSalesOrderContractFixture(t, testDB)
	require.NoError(t, testDB.Model(&models.SalesOrder{}).Where("id = ?", order.ID).Update("status", "InProgress").Error)
	require.NoError(t, testDB.Model(&models.SalesOrderLine{}).Where("sales_order_id = ?", order.ID).Updates(map[string]interface{}{
		"status":        "InProgress",
		"delivered_qty": 2,
	}).Error)

	result, err := ExecuteSalesOrderTransaction(ExecuteSalesOrderTransactionInput{
		OrderID:         order.ID,
		Intent:          SalesTransactionIntentStatusTransition,
		ActorID:         "u-1",
		Operator:        "tester",
		ExpectedVersion: order.Version,
		Payload:         json.RawMessage(`{"status":"Done","operator":"tester"}`),
		IP:              "127.0.0.1",
	})
	require.NoError(t, err)
	require.Len(t, result.Lines, 1)
}
