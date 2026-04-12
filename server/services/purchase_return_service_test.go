package services

import (
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupPurchaseReturnServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open("file:purchase_return_service_test?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE purchase_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			supplier_id TEXT,
			supplier_name TEXT,
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
			returned_qty REAL,
			status TEXT,
			version INTEGER DEFAULT 1
		)
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE purchase_returns (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			return_no TEXT,
			purchase_order_id TEXT,
			purchase_order_no TEXT,
			supplier_id TEXT,
			supplier_name TEXT,
			status TEXT,
			return_date DATETIME,
			issue_category TEXT,
			reason TEXT,
			remarks TEXT,
			evidences TEXT,
			operator TEXT,
			total_quantity REAL,
			total_amount REAL
		)
	`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE purchase_return_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			purchase_return_id TEXT,
			purchase_order_line_id INTEGER,
			line_no INTEGER,
			material_id TEXT,
			material_code TEXT,
			material_name TEXT,
			specification TEXT,
			uom TEXT,
			quantity REAL,
			price REAL,
			amount REAL,
			issue_category TEXT,
			reason TEXT,
			evidences TEXT
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

	sqlDB, err := testDB.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	return testDB
}

func TestCreatePurchaseReturnUpdatesReturnedQtyAndStatus(t *testing.T) {
	originalDB := db.DB
	testDB := setupPurchaseReturnServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	now := time.Now()
	require.NoError(t, testDB.Exec(`
		INSERT INTO purchase_orders (id, order_no, supplier_id, supplier_name, status, currency, amount, exchange_rate, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "po-return-1", "PO-RETURN-001", "sup-1", "Supplier A", "Sent", "CNY", 100.0, 1.0, now, now, false, 1).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO purchase_order_lines (purchase_order_id, line_no, material_id, material_code, material_name, specification, qty, uom, price, amount, received_qty, returned_qty, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "po-return-1", 1, "mat-1", "MAT-1", "Material 1", "Spec", 10.0, "PCS", 10.0, 100.0, 0.0, 0.0, "Open").Error)

	order, err := GetPurchaseOrderByID("po-return-1")
	require.NoError(t, err)
	require.Len(t, order.Lines, 1)

	response, err := CreatePurchaseReturn(CreatePurchaseReturnInput{
		PurchaseOrderID: order.ID,
		Operator:        "tester",
		IssueCategory:   "Appearance",
		Evidences: []OrderEvidencePayload{
			{
				ID:         "ev-main-1",
				URL:        "return-main-1.webp",
				Name:       "overall.jpg",
				UploadedAt: now.Format(time.RFC3339),
				Note:       "外箱正面破损",
				Location:   "收货区北侧",
				DefectPart: "箱角",
			},
		},
		ReturnDate: time.Date(2026, 4, 11, 0, 0, 0, 0, time.UTC),
		Lines: []CreatePurchaseReturnLineInput{
			{
				PurchaseOrderLineID: order.Lines[0].ID,
				Quantity:            4,
				Price:               10,
				IssueCategory:       "Surface",
				Reason:              "appearance defect",
				Evidences: []OrderEvidencePayload{
					{
						ID:         "ev-line-1",
						URL:        "return-line-1.webp",
						Name:       "line.jpg",
						UploadedAt: now.Format(time.RFC3339),
						Note:       "标签破损且条码不清",
						Location:   "料框内侧",
						DefectPart: "标签区",
					},
				},
			},
		},
	})
	require.NoError(t, err)
	require.Equal(t, "Awaiting", response.PurchaseOrder.Status)
	require.Equal(t, 4.0, response.PurchaseOrder.Lines[0].ReturnedQty)
	require.Equal(t, 4.0, response.PurchaseReturn.TotalQuantity)
	require.Equal(t, 40.0, response.PurchaseReturn.TotalAmount)
	require.Equal(t, "Appearance", response.PurchaseReturn.IssueCategory)
	require.Equal(t, "Surface", response.PurchaseReturn.Lines[0].IssueCategory)
	require.Len(t, response.PurchaseReturn.Evidences, 1)
	require.Equal(t, "return-main-1.webp", response.PurchaseReturn.Evidences[0].URL)
	require.Equal(t, "外箱正面破损", response.PurchaseReturn.Evidences[0].Note)
	require.Equal(t, "收货区北侧", response.PurchaseReturn.Evidences[0].Location)
	require.Equal(t, "箱角", response.PurchaseReturn.Evidences[0].DefectPart)
	require.Len(t, response.PurchaseReturn.Lines[0].Evidences, 1)
	require.Equal(t, "return-line-1.webp", response.PurchaseReturn.Lines[0].Evidences[0].URL)
	require.Equal(t, "标签破损且条码不清", response.PurchaseReturn.Lines[0].Evidences[0].Note)
	require.Equal(t, "料框内侧", response.PurchaseReturn.Lines[0].Evidences[0].Location)
	require.Equal(t, "标签区", response.PurchaseReturn.Lines[0].Evidences[0].DefectPart)
	require.NotEmpty(t, response.PurchaseReturn.ReturnNo)

	var returnCount int64
	require.NoError(t, testDB.Raw(`SELECT COUNT(*) FROM purchase_returns`).Scan(&returnCount).Error)
	require.Equal(t, int64(1), returnCount)

	var updatedLine struct {
		ReturnedQty float64
	}
	require.NoError(t, testDB.Raw(`SELECT returned_qty FROM purchase_order_lines WHERE id = ?`, order.Lines[0].ID).Scan(&updatedLine).Error)
	require.Equal(t, 4.0, updatedLine.ReturnedQty)
}
