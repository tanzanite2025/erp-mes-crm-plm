package services

import (
	"fmt"
	"testing"
	"xdfc-server/db"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupSalesOrderCommandTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	applyTradingTestSchema(t, testDB, tradingTestSchemaOptions{includeSales: true, includeAuditLog: true})
	require.NoError(t, testDB.Exec(`
		CREATE TABLE numbering_rules (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			rule_key TEXT,
			prefix TEXT,
			pattern TEXT,
			current_seq INTEGER,
			padding INTEGER,
			reset_period TEXT,
			last_reset TEXT
		)
	`).Error)
	return testDB
}

func TestSaveSalesOrderGeneratesOrderNoFromBarcodeWhenBlank(t *testing.T) {
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

	result, err := SaveSalesOrder(SaveSalesOrderCommand{
		Request: SaveSalesOrderRequest{
			OrderNo:        "",
			Barcode:        "",
			CustomerName:   "客户A",
			Classification: "GENERAL",
			Status:         "Pending",
			Currency:       "CNY",
			OrderDate:      "2026-04-16",
			DeliveryDate:   "2026-04-23",
			Lines:          []SalesOrderLineRequest{},
		},
		ActorID:  "u-1",
		Operator: "admin",
		IP:       "127.0.0.1",
	})
	require.NoError(t, err)
	require.NotEmpty(t, result.Barcode)
	require.Equal(t, result.Barcode, result.OrderNo)

	var persisted struct {
		OrderNo string
		Barcode string
	}
	require.NoError(t, testDB.Raw(`SELECT order_no, barcode FROM sales_orders WHERE order_no = ?`, result.OrderNo).Scan(&persisted).Error)
	require.Equal(t, result.OrderNo, persisted.OrderNo)
	require.Equal(t, result.Barcode, persisted.Barcode)
}

func TestSalesOrderLineSnapshotFieldsRoundTripThroughMapper(t *testing.T) {
	line := SalesOrderLineRequest{
		LineNo:                        1,
		ProductID:                     "product-1",
		ProductModel:                  "R50",
		ProductCode:                   "R50-01",
		Specification:                 "R50 (normal/std)",
		ModelCodeSnapshot:             "01",
		HolePrefixSnapshot:            "R",
		AppearanceID:                  "appearance-1",
		AppearanceNameSnapshot:        "UD",
		AppearanceBarcodeCodeSnapshot: "1",
		AppearanceDescriptionSnapshot: "外观位值: 1",
		AppearanceImageURLSnapshot:    "/uploads/appearance/ud.png",
		Qty:                           20,
		UOM:                           "PCS",
		Price:                         20,
		Amount:                        400,
		OrderDate:                     "2026-04-29",
		Status:                        "Pending",
	}

	model := mapSalesOrderLineRequestToModel(line)
	response := mapSalesOrderLineToResponse(model)
	snapshot := mapSalesOrderLineResponseToRequest(response)

	require.Equal(t, "01", model.ModelCodeSnapshot)
	require.Equal(t, "R", model.HolePrefixSnapshot)
	require.Equal(t, "appearance-1", model.AppearanceID)
	require.Equal(t, "UD", model.AppearanceNameSnapshot)
	require.Equal(t, "1", model.AppearanceBarcodeCodeSnapshot)
	require.Equal(t, "外观位值: 1", model.AppearanceDescriptionSnapshot)
	require.Equal(t, "/uploads/appearance/ud.png", model.AppearanceImageURLSnapshot)
	require.Equal(t, "01", response.ModelCodeSnapshot)
	require.Equal(t, "R", response.HolePrefixSnapshot)
	require.Equal(t, "appearance-1", response.AppearanceID)
	require.Equal(t, "UD", response.AppearanceNameSnapshot)
	require.Equal(t, "1", response.AppearanceBarcodeCodeSnapshot)
	require.Equal(t, "外观位值: 1", response.AppearanceDescriptionSnapshot)
	require.Equal(t, "/uploads/appearance/ud.png", response.AppearanceImageURLSnapshot)
	require.Equal(t, "01", snapshot.ModelCodeSnapshot)
	require.Equal(t, "R", snapshot.HolePrefixSnapshot)
	require.Equal(t, "appearance-1", snapshot.AppearanceID)
	require.Equal(t, "UD", snapshot.AppearanceNameSnapshot)
	require.Equal(t, "1", snapshot.AppearanceBarcodeCodeSnapshot)
	require.Equal(t, "外观位值: 1", snapshot.AppearanceDescriptionSnapshot)
	require.Equal(t, "/uploads/appearance/ud.png", snapshot.AppearanceImageURLSnapshot)
}

func TestSalesOrderExchangeRateSnapshotRoundTripThroughMapper(t *testing.T) {
	request := SaveSalesOrderRequest{
		ID:                   "order-1",
		OrderNo:              "SO-001",
		CustomerName:         "Customer A",
		Type:                 "NORMAL",
		Currency:             "USD",
		ExchangeRateSnapshot: 7.125,
		Classification:       "STANDARD",
		Status:               "Pending",
		OrderDate:            "2026-04-29",
		DeliveryDate:         "2026-05-06",
		Lines:                []SalesOrderLineRequest{},
	}

	model := MapSaveSalesOrderRequestToModel(request)
	response := MapSalesOrderToResponse(model)
	snapshot := MapSalesOrderResponseToSnapshot(response)

	require.Equal(t, 7.125, model.ExchangeRateSnapshot)
	require.Equal(t, 7.125, response.ExchangeRateSnapshot)
	require.Equal(t, 7.125, snapshot.ExchangeRateSnapshot)
}
