package services

import (
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type salesAfterSalesQuantityRow struct {
	SalesOrderLineID uint    `gorm:"column:sales_order_line_id"`
	Quantity         float64 `gorm:"column:quantity"`
}

func loadSalesAfterSalesConsumedQuantityMap(
	tx *gorm.DB,
	orderLines []models.SalesOrderLine,
	excludedSalesReturnID string,
) (map[uint]float64, error) {
	consumedQuantityMap := make(map[uint]float64)
	if len(orderLines) == 0 {
		return consumedQuantityMap, nil
	}

	lineIDs := make([]uint, 0, len(orderLines))
	for _, line := range orderLines {
		lineIDs = append(lineIDs, line.ID)
	}

	returnQuery := tx.Table("sales_return_lines AS srl").
		Select("srl.sales_order_line_id AS sales_order_line_id, COALESCE(SUM(srl.quantity), 0) AS quantity").
		Joins("JOIN sales_returns AS sr ON sr.id = srl.sales_return_id").
		Where("srl.sales_order_line_id IN ? AND sr.deleted_at IS NULL AND sr.status <> ?", lineIDs, SalesReturnStatusCanceled)
	if excludedID := strings.TrimSpace(excludedSalesReturnID); excludedID != "" {
		returnQuery = returnQuery.Where("sr.id <> ?", excludedID)
	}

	var returnRows []salesAfterSalesQuantityRow
	if err := returnQuery.Group("srl.sales_order_line_id").Scan(&returnRows).Error; err != nil {
		return nil, err
	}
	for _, row := range returnRows {
		consumedQuantityMap[row.SalesOrderLineID] += row.Quantity
	}

	var exchangeRows []salesAfterSalesQuantityRow
	if err := tx.Table("sales_exchange_lines AS sel").
		Select("sel.sales_order_line_id AS sales_order_line_id, COALESCE(SUM(sel.exchange_quantity), 0) AS quantity").
		Joins("JOIN sales_exchanges AS se ON se.id = sel.sales_exchange_id").
		Where("sel.sales_order_line_id IN ? AND se.deleted_at IS NULL AND se.status <> ?", lineIDs, SalesExchangeStatusCanceled).
		Group("sel.sales_order_line_id").
		Scan(&exchangeRows).Error; err != nil {
		return nil, err
	}
	for _, row := range exchangeRows {
		consumedQuantityMap[row.SalesOrderLineID] += row.Quantity
	}

	return consumedQuantityMap, nil
}
