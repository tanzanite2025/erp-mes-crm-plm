package services

import (
	"errors"
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var ErrSalesOrderLineProtectedByProductionRouteOrPlan = errors.New("sales order line is referenced by a production route or plan")

func validateSalesOrderLinesAgainstProductionReferencesTx(
	tx *gorm.DB,
	orderID string,
	previousLines []models.SalesOrderLine,
	nextLines []models.SalesOrderLine,
) error {
	if tx == nil {
		return nil
	}
	orderID = strings.TrimSpace(orderID)
	nextByID := make(map[uint]models.SalesOrderLine, len(nextLines))
	for _, line := range nextLines {
		nextByID[line.ID] = line
	}

	for _, previous := range previousLines {
		referenced, err := salesOrderLineHasProductionRouteOrPlanReferenceTx(tx, previous.ID)
		if err != nil {
			return err
		}
		if !referenced {
			continue
		}
		next, retained := nextByID[previous.ID]
		if !retained {
			return fmt.Errorf("%w: 订单 %s 明细行 %d 已被生产路线或生产计划引用，不能删除", ErrSalesOrderLineProtectedByProductionRouteOrPlan, orderID, previous.LineNo)
		}
		if strings.TrimSpace(next.ProductID) != strings.TrimSpace(previous.ProductID) {
			return fmt.Errorf("%w: 订单 %s 明细行 %d 已被生产路线或生产计划引用，不能更换产品", ErrSalesOrderLineProtectedByProductionRouteOrPlan, orderID, previous.LineNo)
		}
	}
	return nil
}

func salesOrderLineHasProductionRouteOrPlanReferenceTx(tx *gorm.DB, salesOrderLineID uint) (bool, error) {
	if tx.Migrator().HasTable(&models.ProductionRouteFamily{}) {
		var routeCount int64
		if err := tx.Unscoped().Model(&models.ProductionRouteFamily{}).
			Where("scope_type = ? AND sales_order_line_id = ?", productionRouteScopeSalesOrderLine, salesOrderLineID).
			Count(&routeCount).Error; err != nil {
			return false, err
		}
		if routeCount > 0 {
			return true, nil
		}
	}
	if tx.Migrator().HasTable(&models.ProductionPlan{}) {
		var planCount int64
		if err := tx.Unscoped().Model(&models.ProductionPlan{}).
			Where("sales_order_line_id = ?", salesOrderLineID).
			Count(&planCount).Error; err != nil {
			return false, err
		}
		if planCount > 0 {
			return true, nil
		}
	}
	return false, nil
}

func rejectSalesOrderDeletionWithProductionLineReferencesTx(tx *gorm.DB, orderID string) error {
	var lines []models.SalesOrderLine
	if err := tx.Where("sales_order_id = ?", strings.TrimSpace(orderID)).Find(&lines).Error; err != nil {
		return err
	}
	if err := validateSalesOrderLinesAgainstProductionReferencesTx(tx, orderID, lines, nil); err != nil {
		return err
	}
	return nil
}
