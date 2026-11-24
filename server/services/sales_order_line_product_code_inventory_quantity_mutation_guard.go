package services

import (
	"errors"
	"fmt"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var ErrSalesOrderLineProtectedByIssuedProductCodeInventory = errors.New("sales order line is protected by issued product-code inventory")

type issuedProductCodeQuantityBySalesOrderLineRow struct {
	SalesOrderLineID uint  `gorm:"column:sales_order_line_id"`
	IssuedQuantity   int64 `gorm:"column:issued_quantity"`
}

// validateSalesOrderLineQuantityAgainstIssuedProductCodeInventoryTx runs while
// the parent order is locked, serializing line edits with product-code issuance.
func validateSalesOrderLineQuantityAgainstIssuedProductCodeInventoryTx(
	tx *gorm.DB,
	orderID string,
	previousLines []models.SalesOrderLine,
	nextLines []models.SalesOrderLine,
) error {
	now := time.Now()
	var issuedQuantities []issuedProductCodeQuantityBySalesOrderLineRow
	statusCondition := effectiveIssuedLinearBarcodeInventoryStatusCondition("linear_barcode_inventory_items")
	if err := tx.Model(&models.LinearBarcodeInventoryItem{}).
		Select("sales_order_line_id, COUNT(*) AS issued_quantity").
		Where("sales_order_id = ? AND sales_order_line_id > 0", orderID).
		Where(statusCondition, LinearBarcodeInventoryStatusAvailable, now, LinearBarcodeInventoryStatusBound).
		Group("sales_order_line_id").
		Scan(&issuedQuantities).Error; err != nil {
		return err
	}
	if len(issuedQuantities) == 0 {
		return nil
	}

	previousByID := make(map[uint]models.SalesOrderLine, len(previousLines))
	for _, line := range previousLines {
		previousByID[line.ID] = line
	}
	nextByID := make(map[uint]models.SalesOrderLine, len(nextLines))
	for _, line := range nextLines {
		nextByID[line.ID] = line
	}
	for _, issued := range issuedQuantities {
		currentLine, exists := previousByID[issued.SalesOrderLineID]
		if !exists {
			return fmt.Errorf("%w: 订单存在 %d 个无法关联到当前订单行的有效已签发编码，请先核对库存", ErrSalesOrderLineProtectedByIssuedProductCodeInventory, issued.IssuedQuantity)
		}
		nextLine, retained := nextByID[issued.SalesOrderLineID]
		if !retained {
			return fmt.Errorf("%w: 订单行 %d 已有 %d 个有效已签发编码，不能删除该订单行", ErrSalesOrderLineProtectedByIssuedProductCodeInventory, currentLine.LineNo, issued.IssuedQuantity)
		}
		if nextLine.Qty < float64(issued.IssuedQuantity) {
			return fmt.Errorf("%w: 订单行 %d 数量为 %.0f，低于有效已签发编码数量 %d", ErrSalesOrderLineProtectedByIssuedProductCodeInventory, currentLine.LineNo, nextLine.Qty, issued.IssuedQuantity)
		}
	}
	return nil
}

func rejectSalesOrderDeletionWithIssuedProductCodeInventoryTx(tx *gorm.DB, orderID string) error {
	var issuedQuantity int64
	now := time.Now()
	if err := tx.Model(&models.LinearBarcodeInventoryItem{}).
		Where("sales_order_id = ?", orderID).
		Where(effectiveIssuedLinearBarcodeInventoryStatusCondition("linear_barcode_inventory_items"), LinearBarcodeInventoryStatusAvailable, now, LinearBarcodeInventoryStatusBound).
		Count(&issuedQuantity).Error; err != nil {
		return err
	}
	if issuedQuantity > 0 {
		return fmt.Errorf("%w: 订单仍关联 %d 个有效已签发编码，不能删除订单", ErrSalesOrderLineProtectedByIssuedProductCodeInventory, issuedQuantity)
	}
	return nil
}
