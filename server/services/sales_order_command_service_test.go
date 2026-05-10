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
		LineNo:                                1,
		ProductID:                             "product-1",
		ProductModel:                          "R50",
		ProductCode:                           "R50-01",
		Specification:                         "R50 (normal/std)",
		ProductDisplayTitleSnapshot:           "Road Fork",
		ProductDisplaySubtitleSnapshot:        "trail/disc/v2",
		ProductDisplayCodeSnapshot:            "R50-01",
		ProductDisplayFullLabelSnapshot:       "Road Fork (trail/disc/v2)",
		ProductDisplayStrategyVersionSnapshot: "product-display-v1",
		ModelCodeSnapshot:                     "01",
		HolePrefixSnapshot:                    "R",
		AppearanceID:                          "appearance-1",
		AppearanceNameSnapshot:                "UD",
		AppearanceBarcodeCodeSnapshot:         "1",
		AppearanceDescriptionSnapshot:         "外观位值: 1",
		AppearanceImageURLSnapshot:            "/uploads/appearance/ud.png",
		Qty:                                   20,
		UOM:                                   "PCS",
		Price:                                 20,
		Amount:                                400,
		OrderDate:                             "2026-04-29",
		Status:                                "Pending",
		SelectedPackaging: &SalesOrderLinePackagingSelectionPayload{
			ProfileID:         "profile-1",
			ProfileCode:       "PK-001",
			ProfileName:       "Box A",
			PackagingType:     "BOX",
			Length:            10,
			Width:             5,
			Height:            4,
			DimensionUnitCode: "cm",
			NetWeight:         1,
			GrossWeight:       0,
			WeightUnitCode:    "kg",
			Capacity:          10,
			CapacityUnitCode:  "pcs",
			Source:            "manual",
		},
	}

	model := mapSalesOrderLineRequestToModel(line)
	response := mapSalesOrderLineToResponse(model)
	snapshot := mapSalesOrderLineResponseToRequest(response)

	require.Equal(t, "01", model.ModelCodeSnapshot)
	require.Equal(t, "R", model.HolePrefixSnapshot)
	require.Equal(t, "Road Fork", model.ProductDisplayTitleSnapshot)
	require.Equal(t, "trail/disc/v2", model.ProductDisplaySubtitleSnapshot)
	require.Equal(t, "R50-01", model.ProductDisplayCodeSnapshot)
	require.Equal(t, "Road Fork (trail/disc/v2)", model.ProductDisplayFullLabelSnapshot)
	require.Equal(t, "product-display-v1", model.ProductDisplayStrategyVersionSnapshot)
	require.Equal(t, "appearance-1", model.AppearanceID)
	require.Equal(t, "UD", model.AppearanceNameSnapshot)
	require.Equal(t, "1", model.AppearanceBarcodeCodeSnapshot)
	require.Equal(t, "外观位值: 1", model.AppearanceDescriptionSnapshot)
	require.Equal(t, "/uploads/appearance/ud.png", model.AppearanceImageURLSnapshot)
	require.Equal(t, "Road Fork", response.ProductDisplayTitleSnapshot)
	require.Equal(t, "trail/disc/v2", response.ProductDisplaySubtitleSnapshot)
	require.Equal(t, "R50-01", response.ProductDisplayCodeSnapshot)
	require.Equal(t, "Road Fork (trail/disc/v2)", response.ProductDisplayFullLabelSnapshot)
	require.Equal(t, "product-display-v1", response.ProductDisplayStrategyVersionSnapshot)
	require.Equal(t, "01", response.ModelCodeSnapshot)
	require.Equal(t, "R", response.HolePrefixSnapshot)
	require.Equal(t, "appearance-1", response.AppearanceID)
	require.Equal(t, "UD", response.AppearanceNameSnapshot)
	require.Equal(t, "1", response.AppearanceBarcodeCodeSnapshot)
	require.Equal(t, "外观位值: 1", response.AppearanceDescriptionSnapshot)
	require.Equal(t, "/uploads/appearance/ud.png", response.AppearanceImageURLSnapshot)
	require.NotNil(t, response.SelectedPackaging)
	require.Equal(t, "profile-1", response.SelectedPackaging.ProfileID)
	require.Equal(t, "manual", response.SelectedPackaging.Source)
	require.Equal(t, "01", snapshot.ModelCodeSnapshot)
	require.Equal(t, "R", snapshot.HolePrefixSnapshot)
	require.Equal(t, "Road Fork", snapshot.ProductDisplayTitleSnapshot)
	require.Equal(t, "trail/disc/v2", snapshot.ProductDisplaySubtitleSnapshot)
	require.Equal(t, "R50-01", snapshot.ProductDisplayCodeSnapshot)
	require.Equal(t, "Road Fork (trail/disc/v2)", snapshot.ProductDisplayFullLabelSnapshot)
	require.Equal(t, "product-display-v1", snapshot.ProductDisplayStrategyVersionSnapshot)
	require.Equal(t, "appearance-1", snapshot.AppearanceID)
	require.Equal(t, "UD", snapshot.AppearanceNameSnapshot)
	require.Equal(t, "1", snapshot.AppearanceBarcodeCodeSnapshot)
	require.Equal(t, "外观位值: 1", snapshot.AppearanceDescriptionSnapshot)
	require.Equal(t, "/uploads/appearance/ud.png", snapshot.AppearanceImageURLSnapshot)
	require.NotNil(t, snapshot.SelectedPackaging)
	require.Equal(t, "profile-1", snapshot.SelectedPackaging.ProfileID)
	require.Equal(t, "manual", snapshot.SelectedPackaging.Source)
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

func TestSaveSalesOrderRecalculatesAuthorityAmountsOnCreate(t *testing.T) {
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
	require.NoError(t, testDB.Exec(`CREATE TABLE IF NOT EXISTS materials (
		id TEXT PRIMARY KEY,
		deleted_at DATETIME
	)`).Error)
	require.NoError(t, testDB.Exec(`INSERT INTO materials (id) VALUES (?)`, "material-1").Error)

	result, err := SaveSalesOrder(SaveSalesOrderCommand{
		Request: SaveSalesOrderRequest{
			OrderNo:        "SO-AUTH-001",
			Barcode:        "SO-AUTH-001",
			CustomerName:   "客户A",
			Classification: "GENERAL",
			Status:         "Pending",
			Currency:       "CNY",
			OrderDate:      "2026-04-16",
			DeliveryDate:   "2026-04-23",
			Amount:         999,
			Quantity:       888,
			Lines: []SalesOrderLineRequest{
				{
					LineNo:        1,
					ProductID:     "material-1",
					ProductModel:  "P1",
					ProductCode:   "P1",
					Specification: "Spec",
					Description:   "Desc",
					Qty:           2,
					UOM:           "PCS",
					Price:         10,
					Amount:        777,
					OrderDate:     "2026-04-16",
					Status:        "Pending",
				},
			},
		},
		ActorID:  "u-1",
		Operator: "admin",
		IP:       "127.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, 20.0, result.Amount)
	require.Equal(t, 2.0, result.Quantity)
	require.Len(t, result.Lines, 1)
	require.Equal(t, 20.0, result.Lines[0].Amount)
}

func TestSaveSalesOrderAutoSelectsUniqueDefaultPackagingProfile(t *testing.T) {
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
	require.NoError(t, testDB.Exec(`CREATE TABLE IF NOT EXISTS materials (
		id TEXT PRIMARY KEY,
		deleted_at DATETIME
	)`).Error)
	require.NoError(t, testDB.Exec(`INSERT INTO materials (id) VALUES (?)`, "product-1").Error)
	require.NoError(t, testDB.Create(&models.PackagingProfile{
		BaseModel:         models.BaseModel{ID: "profile-1"},
		Code:              "PK-001",
		Name:              "Box A",
		PackagingType:     "BOX",
		Length:            10,
		Width:             5,
		Height:            4,
		DimensionUnitCode: "cm",
		NetWeight:         1,
		GrossWeight:       0,
		WeightUnitCode:    "kg",
		Capacity:          10,
		CapacityUnitCode:  "pcs",
		AssemblySource:    "manual",
		IsActive:          true,
	}).Error)
	require.NoError(t, testDB.Create(&models.PackagingProfileTarget{
		BaseModel:          models.BaseModel{ID: "target-1"},
		PackagingProfileID: "profile-1",
		EntityType:         "product",
		EntityID:           "product-1",
		IsDefault:          true,
		SortOrder:          0,
	}).Error)

	result, err := SaveSalesOrder(SaveSalesOrderCommand{
		Request: SaveSalesOrderRequest{
			OrderNo:        "SO-PKG-001",
			Barcode:        "SO-PKG-001",
			CustomerName:   "客户A",
			Classification: "GENERAL",
			Status:         "Pending",
			Currency:       "CNY",
			OrderDate:      "2026-04-16",
			DeliveryDate:   "2026-04-23",
			Lines: []SalesOrderLineRequest{
				{
					LineNo:        1,
					ProductID:     "product-1",
					ProductModel:  "P1",
					ProductCode:   "P1",
					Specification: "Spec",
					Description:   "Desc",
					Qty:           10,
					UOM:           "PCS",
					Price:         10,
					Amount:        100,
					OrderDate:     "2026-04-16",
					Status:        "Pending",
				},
			},
		},
		ActorID:  "u-1",
		Operator: "admin",
		IP:       "127.0.0.1",
	})
	require.NoError(t, err)
	require.Len(t, result.Lines, 1)
	require.NotNil(t, result.Lines[0].SelectedPackaging)
	require.Equal(t, "profile-1", result.Lines[0].SelectedPackaging.ProfileID)
	require.Equal(t, "auto", result.Lines[0].SelectedPackaging.Source)

	var persistedRow struct {
		SelectedPackaging string `gorm:"column:selected_packaging"`
	}
	require.NoError(t, testDB.Raw(`SELECT selected_packaging FROM sales_order_lines WHERE sales_order_id = ? AND line_no = ?`, result.ID, 1).Scan(&persistedRow).Error)
	persisted := decodeSalesOrderLinePackagingSelection(json.RawMessage(persistedRow.SelectedPackaging))
	require.NotNil(t, persisted)
	require.Equal(t, "profile-1", persisted.ProfileID)
	require.Equal(t, "auto", persisted.Source)
}

func TestBuildSalesOrderPatchRequestRejectsAuthorityAmountFields(t *testing.T) {
	_, err := BuildSalesOrderPatchRequest("so-1", SDRTSDeltaHandlerRequest{
		Op: "PATCH",
		Delta: map[string]json.RawMessage{
			"amount": json.RawMessage(`{"o":100,"n":999}`),
		},
		Metadata: SDRTSDeltaMetadata{
			ID:      "so-1",
			Version: 1,
		},
	})
	require.Error(t, err)
	require.ErrorContains(t, err, "unsupported patch field: amount")
}
