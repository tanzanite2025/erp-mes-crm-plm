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

func setupPurchaseTransactionTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE suppliers (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT,
			code TEXT,
			category TEXT,
			main_products TEXT,
			contact_person TEXT,
			contact_phone TEXT,
			email TEXT,
			address TEXT,
			status TEXT,
			rating REAL,
			created_at DATETIME,
			updated_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE materials (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			revision_no TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			change_type TEXT,
			change_order_no TEXT,
			site_code TEXT,
			is_default_site BOOLEAN DEFAULT TRUE,
			code TEXT,
			name TEXT,
			category TEXT,
			spec TEXT,
			internal_dimensions TEXT,
			external_dimensions TEXT,
			uom TEXT,
			min_stock REAL,
			cost_price REAL,
			supplier_id TEXT,
			description TEXT,
			images TEXT,
			status TEXT,
			version INTEGER DEFAULT 1
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_materials_deleted_at ON materials(deleted_at)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE purchase_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			supplier_id TEXT,
			supplier_name TEXT,
			order_date TEXT,
			expected_date TEXT,
			status TEXT,
			currency TEXT,
			amount REAL,
			exchange_rate REAL,
			purchaser TEXT,
			payment_method TEXT,
			payment_method_name TEXT,
			payment_term TEXT,
			payment_term_name TEXT,
			note TEXT,
			workflow_instance_id TEXT,
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
			status TEXT,
			version INTEGER DEFAULT 1
		)
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY NOT NULL,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)
	`).Error)

	return testDB
}

func seedPurchaseTransactionBaseData(t *testing.T, testDB *gorm.DB) {
	t.Helper()

	require.NoError(t, testDB.Create(&models.Supplier{
		ID:        "sup-1",
		Name:      "Supplier A",
		Code:      "SUP-001",
		Status:    "Active",
		Version:   1,
		IsDeleted: false,
	}).Error)
	require.NoError(t, testDB.Create(&models.Supplier{
		ID:        "sup-2",
		Name:      "Supplier B",
		Code:      "SUP-002",
		Status:    "Active",
		Version:   1,
		IsDeleted: false,
	}).Error)
	require.NoError(t, testDB.Create(&models.Material{
		BaseModel: models.BaseModel{ID: "mat-1"},
		Code:      "MAT-001",
		Name:      "Tube",
		Status:    "Active",
	}).Error)
	require.NoError(t, testDB.Create(&models.PurchaseOrder{
		ID:           "po-1",
		OrderNo:      "PO-001",
		SupplierID:   "sup-1",
		SupplierName: "Supplier A",
		OrderDate:    "2026-04-01",
		ExpectedDate: "2026-04-10",
		Status:       "Draft",
		Currency:     "CNY",
		Amount:       100,
		ExchangeRate: 1,
		Purchaser:    "Alice",
		PaymentMethod: "BANK_TRANSFER",
		PaymentMethodName: "Bank Transfer",
		PaymentTerm:  "30D",
		PaymentTermName: "Net 30",
		Note:         "initial",
		Version:      3,
		IsDeleted:    false,
	}).Error)
	require.NoError(t, testDB.Create(&models.PurchaseOrderLine{
		PurchaseOrderID: "po-1",
		Version:         1,
		LineNo:          1,
		MaterialID:      "mat-1",
		MaterialCode:    "MAT-001",
		MaterialName:    "Tube",
		Specification:   "Spec-A",
		Qty:             10,
		UOM:             "PCS",
		Price:           10,
		Amount:          100,
		ReceivedQty:     0,
		Status:          "Draft",
	}).Error)
}

func TestExecutePurchaseOrderTransactionOrderSaveRoutesSupplierOnlyDelta(t *testing.T) {
	originalDB := db.DB
	testDB := setupPurchaseTransactionTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
	})
	seedPurchaseTransactionBaseData(t, testDB)

	payload, err := json.Marshal(PurchaseOrderSavePayload{
		Delta: map[string]json.RawMessage{
			"supplierId":   json.RawMessage(`{"o":"sup-1","n":"sup-2"}`),
			"supplierName": json.RawMessage(`{"o":"Supplier A","n":"Supplier B"}`),
		},
		FinalData: PatchPurchaseOrderRequest{
			ID:           "po-1",
			OrderNo:      "PO-001",
			SupplierID:   "sup-2",
			SupplierName: "Supplier B",
			OrderDate:    "2026-04-01",
			ExpectedDate: "2026-04-10",
			Status:       "Draft",
			Currency:     "CNY",
			Amount:       100,
			ExchangeRate: 1,
			Purchaser:    "Alice",
			PaymentMethod: "BANK_TRANSFER",
			PaymentMethodName: "Bank Transfer",
			PaymentTerm:  "30D",
			PaymentTermName: "Net 30",
			Note:         "initial",
			Version:      3,
			Lines: []PurchaseOrderLineRequest{
				{
					ID:            1,
					LineNo:        1,
					MaterialID:    "mat-1",
					MaterialCode:  "MAT-001",
					MaterialName:  "Tube",
					Specification: "Spec-A",
					Qty:           10,
					UOM:           "PCS",
					Price:         10,
					Amount:        100,
					ReceivedQty:   0,
					Status:        "Draft",
				},
			},
		},
		Operator: "tester",
	})
	require.NoError(t, err)

	result, err := ExecutePurchaseOrderTransaction(ExecutePurchaseOrderTransactionInput{
		OrderID:         "po-1",
		Intent:          PurchaseTransactionIntentOrderSave,
		ActorID:         "user-1",
		Operator:        "tester",
		ExpectedVersion: 3,
		Payload:         payload,
		IP:              "127.0.0.1",
	})

	require.NoError(t, err)
	require.Equal(t, "sup-2", result.SupplierID)
	require.Equal(t, "Supplier B", result.SupplierName)
	require.Equal(t, 4, result.Version)

	var logs []models.AuditLog
	require.NoError(t, testDB.Order("created_at asc").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "purchase-order", logs[0].Module)
	require.Equal(t, PurchaseTransactionIntentSupplierChange, logs[0].Action)
}

func TestExecutePurchaseOrderTransactionOrderSaveFallsBackToUnifiedSaveForMixedDelta(t *testing.T) {
	originalDB := db.DB
	testDB := setupPurchaseTransactionTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
	})
	seedPurchaseTransactionBaseData(t, testDB)

	payload, err := json.Marshal(PurchaseOrderSavePayload{
		Delta: map[string]json.RawMessage{
			"expectedDate": json.RawMessage(`{"o":"2026-04-10","n":"2026-04-20"}`),
			"purchaser":    json.RawMessage(`{"o":"Alice","n":"Bob"}`),
		},
		FinalData: PatchPurchaseOrderRequest{
			ID:           "po-1",
			OrderNo:      "PO-001",
			SupplierID:   "sup-1",
			SupplierName: "Supplier A",
			OrderDate:    "2026-04-01",
			ExpectedDate: "2026-04-20",
			Status:       "Draft",
			Currency:     "CNY",
			Amount:       999,
			ExchangeRate: 1,
			Purchaser:    "Bob",
			PaymentMethod: "BANK_TRANSFER",
			PaymentMethodName: "Bank Transfer",
			PaymentTerm:  "30D",
			PaymentTermName: "Net 30",
			Note:         "mixed",
			Version:      3,
			Lines: []PurchaseOrderLineRequest{
				{
					ID:            1,
					LineNo:        1,
					MaterialID:    "mat-1",
					MaterialCode:  "MAT-001",
					MaterialName:  "Tube",
					Specification: "Spec-A",
					Qty:           10,
					UOM:           "PCS",
					Price:         10,
					Amount:        100,
					ReceivedQty:   0,
					Status:        "Draft",
				},
			},
		},
		Operator: "tester",
	})
	require.NoError(t, err)

	result, err := ExecutePurchaseOrderTransaction(ExecutePurchaseOrderTransactionInput{
		OrderID:         "po-1",
		Intent:          PurchaseTransactionIntentOrderSave,
		ActorID:         "user-1",
		Operator:        "tester",
		ExpectedVersion: 3,
		Payload:         payload,
		IP:              "127.0.0.1",
	})

	require.NoError(t, err)
	require.Equal(t, "2026-04-20", result.ExpectedDate)
	require.Equal(t, "Bob", result.Purchaser)
	require.Equal(t, 100.0, result.Amount)
	require.Equal(t, 4, result.Version)

	var logs []models.AuditLog
	require.NoError(t, testDB.Order("created_at asc").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "purchase-order", logs[0].Module)
	require.Equal(t, PurchaseTransactionIntentOrderSave, logs[0].Action)
}

func TestExecutePurchaseOrderReceiptConfirmationReturnsVersionConflictWhenOrderLineVersionStale(t *testing.T) {
	originalDB := db.DB
	testDB := setupPurchaseTransactionTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
	})
	seedPurchaseTransactionBaseData(t, testDB)

	require.NoError(t, testDB.Model(&models.PurchaseOrder{}).
		Where("id = ?", "po-1").
		Update("status", "Awaiting").Error)
	require.NoError(t, testDB.Model(&models.PurchaseOrderLine{}).
		Where("purchase_order_id = ? AND line_no = ?", "po-1", 1).
		Update("version", 2).Error)

	_, err := ExecutePurchaseOrderReceiptConfirmation(ExecutePurchaseOrderReceiptConfirmationCommand{
		OrderID:         "po-1",
		ActorID:         "user-1",
		Operator:        "tester",
		ExpectedVersion: 3,
		Payload: PurchaseOrderReceiptConfirmPayload{
			Operator:    "tester",
			Remarks:     "stale line version",
			ReceiptDate: "2026-04-12T00:00:00Z",
			Lines: []PurchaseOrderReceiptConfirmLinePayload{
				{
					PurchaseOrderLineID: 1,
					OrderLineVersion:    1,
					MaterialID:          "mat-1",
					Quantity:            1,
					PurchasePrice:       10,
					BatchNo:             "B-STALE-001",
					TargetCategory:      "MATERIAL",
				},
			},
		},
	})
	require.ErrorIs(t, err, ErrPurchaseTransactionVersionConflict)
}
