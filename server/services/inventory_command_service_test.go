package services

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupInventoryCommandTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE inventory (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			material_id TEXT NOT NULL,
			material_name TEXT,
			material_code TEXT,
			material_spec TEXT,
			quantity REAL DEFAULT 0,
			total_value REAL DEFAULT 0,
			average_unit_cost REAL DEFAULT 0,
			category_code TEXT NOT NULL,
			batch_no TEXT,
			uom TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_inventory_deleted_at ON inventory(deleted_at)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE shipment_records (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			material_id TEXT NOT NULL,
			material_name TEXT,
			material_code TEXT,
			sales_order_id TEXT,
			sales_order_line_id INTEGER,
			quantity REAL NOT NULL,
			source_category TEXT NOT NULL,
			batch_no TEXT,
			order_no TEXT,
			status TEXT,
			cogs REAL DEFAULT 0,
			shipment_date DATETIME,
			operator TEXT,
			remarks TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_shipment_deleted_at ON shipment_records(deleted_at)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE inbound_records (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			material_id TEXT NOT NULL,
			material_name TEXT,
			material_code TEXT,
			purchase_order_id TEXT,
			purchase_order_line_id INTEGER,
			quantity REAL NOT NULL,
			purchase_price REAL DEFAULT 0,
			target_category TEXT NOT NULL,
			batch_no TEXT,
			inbound_date DATETIME,
			operator TEXT,
			remarks TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_inbound_deleted_at ON inbound_records(deleted_at)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE financial_vouchers (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			voucher_no TEXT NOT NULL UNIQUE,
			source_type TEXT NOT NULL,
			source_ref_id TEXT NOT NULL,
			currency TEXT NOT NULL,
			total_amount REAL NOT NULL,
			status TEXT NOT NULL
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_financial_vouchers_deleted_at ON financial_vouchers(deleted_at)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE clearing_entries (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			voucher_id TEXT NOT NULL,
			line_no INTEGER NOT NULL,
			entry_type TEXT NOT NULL,
			account_code TEXT NOT NULL,
			amount REAL NOT NULL,
			memo TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_clearing_entries_deleted_at ON clearing_entries(deleted_at)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE materials (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_materials_deleted_at ON materials(deleted_at)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			order_name TEXT,
			customer_name TEXT,
			customer_id TEXT,
			type TEXT,
			currency TEXT,
			classification TEXT,
			status TEXT,
			status_note TEXT,
			amount REAL,
			quantity REAL,
			order_date TEXT,
			delivery_date TEXT,
			purchase_order_no TEXT,
			barcode TEXT,
			requirements TEXT,
			workflow_instance_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			updated_by TEXT,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE sales_order_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sales_order_id TEXT,
			line_no INTEGER,
			product_id TEXT,
			product_model TEXT,
			product_code TEXT,
			specification TEXT,
			description TEXT,
			qty REAL,
			uom TEXT,
			price REAL,
			amount REAL,
			delivered_qty REAL,
			customer_part_no TEXT,
			job_no TEXT,
			note TEXT,
			drilling_plan_id TEXT,
			labeling_plan_id TEXT,
			hole_count INTEGER,
			route TEXT,
			order_date TEXT,
			status TEXT,
			claimed_by TEXT,
			claimed_at TEXT
		)
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE purchase_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			status TEXT,
			currency TEXT,
			amount REAL,
			exchange_rate REAL,
			created_at DATETIME,
			updated_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE purchase_order_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			purchase_order_id TEXT,
			line_no INTEGER,
			material_id TEXT,
			material_code TEXT,
			material_name TEXT,
			specification TEXT,
			qty REAL,
			uom TEXT,
			price REAL,
			amount REAL,
			received_qty REAL,
			status TEXT
		)
	`).Error)

	sqlDB, err := testDB.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(2)

	return testDB
}

func TestRecordInboundMovingAverageUpdatesInventoryValue(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryCommandTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	materialID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, created_at, updated_at)
		VALUES (?, ?, ?)
	`, materialID, now, now).Error)

	inboundA := &models.InboundRecord{
		MaterialID:     materialID,
		Quantity:       10,
		PurchasePrice:  4,
		TargetCategory: "WH_A",
		BatchNo:        "B-001",
	}
	require.NoError(t, RecordInbound(inboundA))

	inboundB := &models.InboundRecord{
		MaterialID:     materialID,
		Quantity:       5,
		PurchasePrice:  10,
		TargetCategory: "WH_A",
		BatchNo:        "B-001",
	}
	require.NoError(t, RecordInbound(inboundB))

	type inventoryRow struct {
		Quantity        float64
		TotalValue      float64
		AverageUnitCost float64
	}
	var inv inventoryRow
	require.NoError(t, db.DB.Raw(`
		SELECT quantity, total_value, average_unit_cost
		FROM inventory
		WHERE material_id = ? AND category_code = ? AND batch_no = ?
	`, materialID, "WH_A", "B-001").Scan(&inv).Error)

	require.InDelta(t, 15.0, inv.Quantity, 0.000001)
	require.InDelta(t, 90.0, inv.TotalValue, 0.000001)
	require.InDelta(t, 6.0, inv.AverageUnitCost, 0.000001)

	type voucherCountRow struct {
		Count int64
	}
	var voucherCount voucherCountRow
	require.NoError(t, db.DB.Raw(`SELECT COUNT(*) AS count FROM financial_vouchers WHERE source_type = ?`, models.FinancialVoucherSourceInbound).Scan(&voucherCount).Error)
	require.Equal(t, int64(2), voucherCount.Count)
}

func TestCommitShipmentSnapshotsCOGSAndDeductsInventoryValue(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryCommandTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	materialID := uuid.NewString()
	inventoryID := uuid.NewString()
	shipmentID := uuid.NewString()
	now := time.Now()

	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, quantity, total_value, average_unit_cost, category_code, batch_no)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, inventoryID, now, now, materialID, 10, 80, 8, "WH_A", "B-001").Error)

	require.NoError(t, db.DB.Exec(`
		INSERT INTO shipment_records (id, created_at, updated_at, material_id, quantity, source_category, batch_no, status, shipment_date)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, shipmentID, now, now, materialID, 3, "WH_A", "B-001", "DRAFT", now).Error)

	shipment, err := CommitShipment(shipmentID)
	require.NoError(t, err)
	require.Equal(t, shipmentID, shipment.ID)
	require.Equal(t, materialID, shipment.MaterialID)
	require.Equal(t, "WH_A", shipment.SourceCategory)
	require.Equal(t, "B-001", shipment.BatchNo)
	require.Equal(t, "COMMITTED", shipment.Status)
	require.InDelta(t, 24.0, shipment.COGS, 0.000001)

	type inventoryRow struct {
		Quantity        float64
		TotalValue      float64
		AverageUnitCost float64
	}
	var inv inventoryRow
	require.NoError(t, db.DB.Raw(`
		SELECT quantity, total_value, average_unit_cost
		FROM inventory
		WHERE id = ?
	`, inventoryID).Scan(&inv).Error)

	require.InDelta(t, 7.0, inv.Quantity, 0.000001)
	require.InDelta(t, 56.0, inv.TotalValue, 0.000001)
	require.InDelta(t, 8.0, inv.AverageUnitCost, 0.000001)

	type voucherRow struct {
		ID          string
		SourceType  string
		SourceRefID string
		TotalAmount float64
		Status      string
	}
	var voucher voucherRow
	require.NoError(t, db.DB.Raw(`
		SELECT id, source_type, source_ref_id, total_amount, status
		FROM financial_vouchers
		WHERE source_ref_id = ?
	`, shipmentID).Scan(&voucher).Error)
	require.Equal(t, models.FinancialVoucherSourceShipment, voucher.SourceType)
	require.Equal(t, shipmentID, voucher.SourceRefID)
	require.Equal(t, models.FinancialVoucherStatusPosted, voucher.Status)
	require.InDelta(t, 24.0, voucher.TotalAmount, 0.000001)

	type entryAggregateRow struct {
		DebitTotal  float64
		CreditTotal float64
		EntryCount  int64
	}
	var entryAgg entryAggregateRow
	require.NoError(t, db.DB.Raw(`
		SELECT
			SUM(CASE WHEN entry_type = ? THEN amount ELSE 0 END) AS debit_total,
			SUM(CASE WHEN entry_type = ? THEN amount ELSE 0 END) AS credit_total,
			COUNT(*) AS entry_count
		FROM clearing_entries
		WHERE voucher_id = ?
	`, models.ClearingEntryTypeDebit, models.ClearingEntryTypeCredit, voucher.ID).Scan(&entryAgg).Error)
	require.Equal(t, int64(2), entryAgg.EntryCount)
	require.InDelta(t, 24.0, entryAgg.DebitTotal, 0.000001)
	require.InDelta(t, 24.0, entryAgg.CreditTotal, 0.000001)
}

func TestCommitShipmentAppliesSalesFulfillmentProgressAndRecalculatesSalesOrderStatus(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryCommandTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	materialID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, created_at, updated_at)
		VALUES (?, ?, ?)
	`, materialID, now, now).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, quantity, total_value, average_unit_cost, category_code, batch_no)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), now, now, materialID, 20.0, 100.0, 5.0, "WH_A", "B-001").Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO sales_orders (id, order_no, order_name, customer_name, customer_id, type, currency, classification, status, amount, quantity, order_date, delivery_date, created_at, updated_at, updated_by, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "so-ship-1", "SO-SHIP-001", "Order", "Customer", "cust-1", "standard", "CNY", "GENERAL", "Pending", 100.0, 10.0, "2026-04-05", "2026-04-12", now, now, "alice", false, 1).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO sales_order_lines (id, sales_order_id, line_no, product_id, product_model, qty, uom, price, amount, delivered_qty, order_date, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, 1, "so-ship-1", 1, materialID, "MODEL-1", 10.0, "PCS", 10.0, 100.0, 2.0, "2026-04-05", "Pending").Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO shipment_records (id, created_at, updated_at, material_id, sales_order_id, sales_order_line_id, quantity, source_category, batch_no, order_no, status, shipment_date)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "ship-1", now, now, materialID, "so-ship-1", 1, 3.0, "WH_A", "B-001", "SO-SHIP-001", "DRAFT", now).Error)

	shipment, err := CommitShipment("ship-1")
	require.NoError(t, err)
	require.Equal(t, "COMMITTED", shipment.Status)

	type salesLineRow struct {
		DeliveredQty float64
	}
	var line salesLineRow
	require.NoError(t, db.DB.Raw(`SELECT delivered_qty FROM sales_order_lines WHERE id = ?`, 1).Scan(&line).Error)
	require.InDelta(t, 5.0, line.DeliveredQty, 0.000001)

	type salesOrderRow struct {
		Status string
	}
	var order salesOrderRow
	require.NoError(t, db.DB.Raw(`SELECT status FROM sales_orders WHERE id = ?`, "so-ship-1").Scan(&order).Error)
	require.Equal(t, "InProgress", order.Status)
}

func TestVoidShipmentRollsBackSalesFulfillmentProgressAndRecalculatesSalesOrderStatus(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryCommandTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	materialID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, created_at, updated_at)
		VALUES (?, ?, ?)
	`, materialID, now, now).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, quantity, total_value, average_unit_cost, category_code, batch_no)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), now, now, materialID, 17.0, 85.0, 5.0, "WH_A", "B-001").Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO sales_orders (id, order_no, order_name, customer_name, customer_id, type, currency, classification, status, amount, quantity, order_date, delivery_date, created_at, updated_at, updated_by, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "so-ship-void-1", "SO-SHIP-VOID-001", "Order", "Customer", "cust-1", "standard", "CNY", "GENERAL", "InProgress", 100.0, 10.0, "2026-04-05", "2026-04-12", now, now, "alice", false, 1).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO sales_order_lines (id, sales_order_id, line_no, product_id, product_model, qty, uom, price, amount, delivered_qty, order_date, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, 1, "so-ship-void-1", 1, materialID, "MODEL-1", 10.0, "PCS", 10.0, 100.0, 5.0, "2026-04-05", "InProgress").Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO shipment_records (id, created_at, updated_at, material_id, sales_order_id, sales_order_line_id, quantity, source_category, batch_no, order_no, status, cogs, shipment_date)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "ship-void-1", now, now, materialID, "so-ship-void-1", 1, 3.0, "WH_A", "B-001", "SO-SHIP-VOID-001", "COMMITTED", 15.0, now).Error)

	require.NoError(t, VoidShipment(context.Background(), "ship-void-1"))

	type salesLineRow struct {
		DeliveredQty float64
	}
	var line salesLineRow
	require.NoError(t, db.DB.Raw(`SELECT delivered_qty FROM sales_order_lines WHERE id = ?`, 1).Scan(&line).Error)
	require.InDelta(t, 2.0, line.DeliveredQty, 0.000001)

	type salesOrderRow struct {
		Status string
	}
	var order salesOrderRow
	require.NoError(t, db.DB.Raw(`SELECT status FROM sales_orders WHERE id = ?`, "so-ship-void-1").Scan(&order).Error)
	require.Equal(t, "InProgress", order.Status)

	type shipmentRow struct {
		Status string
	}
	var shipment shipmentRow
	require.NoError(t, db.DB.Raw(`SELECT status FROM shipment_records WHERE id = ?`, "ship-void-1").Scan(&shipment).Error)
	require.Equal(t, "VOID", shipment.Status)
}

func TestRecordInboundRollsBackWhenVoucherCreationFails(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryCommandTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	materialID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, created_at, updated_at)
		VALUES (?, ?, ?)
	`, materialID, now, now).Error)

	err := RecordInbound(&models.InboundRecord{
		MaterialID:     materialID,
		Quantity:       5,
		PurchasePrice:  0,
		TargetCategory: "WH_A",
		BatchNo:        "B-001",
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "amount must be greater than zero")

	type countRow struct {
		Count int64
	}
	var inboundCount countRow
	require.NoError(t, db.DB.Raw(`SELECT COUNT(*) AS count FROM inbound_records`).Scan(&inboundCount).Error)
	require.Equal(t, int64(0), inboundCount.Count)

	var inventoryCount countRow
	require.NoError(t, db.DB.Raw(`SELECT COUNT(*) AS count FROM inventory`).Scan(&inventoryCount).Error)
	require.Equal(t, int64(0), inventoryCount.Count)

	var voucherCount countRow
	require.NoError(t, db.DB.Raw(`SELECT COUNT(*) AS count FROM financial_vouchers`).Scan(&voucherCount).Error)
	require.Equal(t, int64(0), voucherCount.Count)
}

func TestRecordInboundRollbackWhenDenominatorBecomesZero(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryCommandTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	materialID := uuid.NewString()
	inventoryID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, created_at, updated_at)
		VALUES (?, ?, ?)
	`, materialID, now, now).Error)

	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, quantity, total_value, average_unit_cost, category_code, batch_no)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, inventoryID, now, now, materialID, -5, -20, 4, "WH_A", "B-001").Error)

	err := RecordInbound(&models.InboundRecord{
		MaterialID:     materialID,
		Quantity:       5,
		PurchasePrice:  6,
		TargetCategory: "WH_A",
		BatchNo:        "B-001",
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "denominator equals zero")

	type inboundCountRow struct {
		Count int64
	}
	var inboundCount inboundCountRow
	require.NoError(t, db.DB.Raw(`SELECT COUNT(*) AS count FROM inbound_records`).Scan(&inboundCount).Error)
	require.Equal(t, int64(0), inboundCount.Count, "inbound record must be rolled back when denominator is zero")
}

func TestRecordInboundAppliesPurchaseReceiptProgressAndRecalculatesPurchaseOrderStatus(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryCommandTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	materialID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, created_at, updated_at)
		VALUES (?, ?, ?)
	`, materialID, now, now).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO purchase_orders (id, order_no, status, currency, amount, exchange_rate, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "po-inbound-1", "PO-IN-001", "Sent", "CNY", 50.0, 1.0, now, now, false, 1).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO purchase_order_lines (id, purchase_order_id, line_no, material_id, qty, uom, price, amount, received_qty, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, 1, "po-inbound-1", 1, materialID, 10.0, "PCS", 5.0, 50.0, 3.0, "Open").Error)

	err := RecordInbound(&models.InboundRecord{
		MaterialID:          materialID,
		PurchaseOrderID:     "po-inbound-1",
		PurchaseOrderLineID: 1,
		Quantity:            4,
		PurchasePrice:       5,
		TargetCategory:      "WH_A",
		BatchNo:             "B-001",
	})
	require.NoError(t, err)

	type lineRow struct {
		ReceivedQty float64
	}
	var line lineRow
	require.NoError(t, db.DB.Raw(`SELECT received_qty FROM purchase_order_lines WHERE id = ?`, 1).Scan(&line).Error)
	require.InDelta(t, 7.0, line.ReceivedQty, 0.000001)

	type orderRow struct {
		Status string
	}
	var order orderRow
	require.NoError(t, db.DB.Raw(`SELECT status FROM purchase_orders WHERE id = ?`, "po-inbound-1").Scan(&order).Error)
	require.Equal(t, "Awaiting", order.Status)
}

func TestVoidShipmentConcurrentRollbackOnlyOnce(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryCommandTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	materialID := uuid.NewString()
	shipmentID := uuid.NewString()
	inventoryID := uuid.NewString()
	now := time.Now()

	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, quantity, category_code, batch_no)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, inventoryID, now, now, materialID, 100, "WH_A", "B-001").Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO shipment_records (id, created_at, updated_at, material_id, quantity, source_category, batch_no, status, shipment_date)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, shipmentID, now, now, materialID, 10, "WH_A", "B-001", "COMMITTED", now).Error)

	start := make(chan struct{})
	errs := make(chan error, 2)
	var wg sync.WaitGroup

	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			errs <- VoidShipment(context.Background(), shipmentID)
		}()
	}

	close(start)
	wg.Wait()
	close(errs)

	successCount := 0
	conflictCount := 0
	for err := range errs {
		if err == nil {
			successCount++
			continue
		}
		if errors.Is(err, ErrVoidInProgress) ||
			err.Error() == "shipment already voided" ||
			strings.Contains(err.Error(), "database table is locked") ||
			strings.Contains(err.Error(), "database is deadlocked") {
			conflictCount++
			continue
		}
		t.Fatalf("unexpected error from concurrent void: %v", err)
	}

	require.Equal(t, 1, successCount, "exactly one request should succeed")
	require.Equal(t, 1, conflictCount, "the other request should be rejected as conflict")

	type inventoryRow struct {
		Quantity float64
	}
	var gotInventory inventoryRow
	require.NoError(t, db.DB.Raw("SELECT quantity FROM inventory WHERE id = ?", inventoryID).Scan(&gotInventory).Error)
	require.InDelta(t, 110.0, gotInventory.Quantity, 0.000001, "inventory must be rolled back exactly once")

	type shipmentRow struct {
		Status string
	}
	var gotShipment shipmentRow
	require.NoError(t, db.DB.Raw("SELECT status FROM shipment_records WHERE id = ?", shipmentID).Scan(&gotShipment).Error)
	require.Equal(t, "VOID", gotShipment.Status)
}

func TestBulkSyncInventoryPreservesExistingDisplayFieldsWhenPayloadUsesZeroValues(t *testing.T) {
	originalDB := db.DB
	testDB := setupInventoryCommandTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	inventoryID := uuid.NewString()
	materialID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, material_name, material_code, material_spec, quantity, total_value, average_unit_cost, category_code, batch_no, uom)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, inventoryID, now, now, materialID, "Copper Wire", "MAT-001", "Spec-A", 10.0, 80.0, 8.0, "WH_A", "B-001", "kg").Error)

	err := BulkSyncInventory([]models.Inventory{{
		BaseModel:       models.BaseModel{ID: inventoryID},
		MaterialID:      materialID,
		Quantity:        15,
		TotalValue:      120,
		AverageUnitCost: 8,
		CategoryCode:    "WH_A",
		BatchNo:         "B-001",
	}})
	require.NoError(t, err)

	var persisted models.Inventory
	require.NoError(t, db.DB.Where("id = ?", inventoryID).First(&persisted).Error)
	require.Equal(t, "Copper Wire", persisted.MaterialName)
	require.Equal(t, "MAT-001", persisted.MaterialCode)
	require.Equal(t, "Spec-A", persisted.MaterialSpec)
	require.Equal(t, "kg", persisted.UOM)
	require.InDelta(t, 15.0, persisted.Quantity, 0.000001)
	require.InDelta(t, 120.0, persisted.TotalValue, 0.000001)
}
