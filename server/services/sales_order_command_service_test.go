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
	require.NoError(t, testDB.Exec(`
		CREATE TABLE workflow_definitions (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT,
			name TEXT,
			version INTEGER,
			module TEXT,
			definition_json TEXT,
			description TEXT,
			is_active BOOLEAN
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
