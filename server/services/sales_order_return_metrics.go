package services

import (
	"xdfc-server/models"

	"gorm.io/gorm"
)

type salesOrderReturnedQuantityRow struct {
	SalesOrderLineID uint    `gorm:"column:sales_order_line_id"`
	ReturnedQuantity float64 `gorm:"column:returned_quantity"`
}

func loadSalesOrderReturnedQuantityMap(tx *gorm.DB, orders []models.SalesOrder) (map[uint]float64, error) {
	returnedQuantityMap := make(map[uint]float64)
	if tx == nil || len(orders) == 0 {
		return returnedQuantityMap, nil
	}
	if !tx.Migrator().HasTable(&models.SalesReturn{}) || !tx.Migrator().HasTable(&models.SalesReturnLine{}) {
		return returnedQuantityMap, nil
	}

	lineIDSet := make(map[uint]struct{})
	lineIDs := make([]uint, 0)
	for _, order := range orders {
		for _, line := range order.Lines {
			if line.ID == 0 {
				continue
			}
			if _, exists := lineIDSet[line.ID]; exists {
				continue
			}
			lineIDSet[line.ID] = struct{}{}
			lineIDs = append(lineIDs, line.ID)
		}
	}
	if len(lineIDs) == 0 {
		return returnedQuantityMap, nil
	}

	var rows []salesOrderReturnedQuantityRow
	if err := tx.Table("sales_return_lines AS srl").
		Select("srl.sales_order_line_id AS sales_order_line_id, COALESCE(SUM(srl.quantity), 0) AS returned_quantity").
		Joins("JOIN sales_returns AS sr ON sr.id = srl.sales_return_id").
		Where("srl.sales_order_line_id IN ? AND sr.deleted_at IS NULL", lineIDs).
		Group("srl.sales_order_line_id").
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	for _, row := range rows {
		returnedQuantityMap[row.SalesOrderLineID] = row.ReturnedQuantity
	}

	return returnedQuantityMap, nil
}
