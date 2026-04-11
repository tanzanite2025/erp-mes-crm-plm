package services

import (
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestConfirmPurchaseReceiptCreatesInboundAndMarksOrderReceived(t *testing.T) {
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
	require.NoError(t, db.DB.Exec(`INSERT INTO materials (id, created_at, updated_at) VALUES (?, ?, ?)`, materialID, now, now).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO purchase_orders (id, order_no, status, currency, amount, exchange_rate, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "po-confirm-1", "PO-CONFIRM-001", "Awaiting", "CNY", 88.0, 1.0, now, now, false, 1).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO purchase_order_lines (id, purchase_order_id, line_no, material_id, material_code, material_name, specification, qty, uom, price, amount, received_qty, returned_qty, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, 1, "po-confirm-1", 1, materialID, "MAT-001", "Material 001", "Spec", 10.0, "PCS", 8.8, 88.0, 0.0, 0.0, "Open").Error)

	result, err := ConfirmPurchaseReceipt(ConfirmPurchaseReceiptInput{
		PurchaseOrderID: "po-confirm-1",
		Operator:        "tester",
		Remarks:         "manual confirm",
		ReceiptDate:     now,
		Lines: []ConfirmPurchaseReceiptLineInput{
			{
				PurchaseOrderLineID: 1,
				MaterialID:          materialID,
				Quantity:            10,
				PurchasePrice:       8.8,
				BatchNo:             "B-CONFIRM-001",
				TargetCategory:      "MATERIAL",
			},
		},
	})
	require.NoError(t, err)
	require.Equal(t, "po-confirm-1", result.PurchaseOrder.ID)
	require.Equal(t, "Received", result.PurchaseOrder.Status)
	require.Len(t, result.CreatedInboundRecords, 1)
	require.Equal(t, materialID, result.CreatedInboundRecords[0].MaterialID)
	require.Equal(t, "MATERIAL", result.CreatedInboundRecords[0].TargetCategory)

	var receivedQty float64
	require.NoError(t, db.DB.Raw(`SELECT received_qty FROM purchase_order_lines WHERE id = ?`, 1).Scan(&receivedQty).Error)
	require.Equal(t, 10.0, receivedQty)

	var inventoryQty float64
	require.NoError(t, db.DB.Raw(`SELECT quantity FROM inventory WHERE material_id = ? AND category_code = ? AND batch_no = ?`, materialID, "MATERIAL", "B-CONFIRM-001").Scan(&inventoryQty).Error)
	require.Equal(t, 10.0, inventoryQty)

	var inboundCount int64
	require.NoError(t, db.DB.Model(&models.InboundRecord{}).Where("purchase_order_id = ?", "po-confirm-1").Count(&inboundCount).Error)
	require.Equal(t, int64(1), inboundCount)
}

func TestConfirmPurchaseReceiptReturnsErrorWhenReceiptDateRawInvalid(t *testing.T) {
	result, err := ConfirmPurchaseReceipt(ConfirmPurchaseReceiptInput{
		PurchaseOrderID: "po-invalid-date",
		ReceiptDateRaw:  "not-a-rfc3339",
		Lines: []ConfirmPurchaseReceiptLineInput{
			{
				PurchaseOrderLineID: 1,
				Quantity:            1,
				PurchasePrice:       1,
				TargetCategory:      "MATERIAL",
			},
		},
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "receiptDate 格式错误")
	require.Equal(t, ConfirmPurchaseReceiptResponse{}, result)
}
