package services

import (
	"errors"
	"fmt"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrProductionSalesOrderLineRouteModeLocked = errors.New("sales order line route mode is locked by a production plan")

func ResetSalesOrderLineProductionRouteToBranchDefault(salesOrderLineID uint, operator string, ip string) error {
	return defaultProductionService.ResetSalesOrderLineProductionRouteToBranchDefault(salesOrderLineID, operator, ip)
}

func (service *ProductionService) ResetSalesOrderLineProductionRouteToBranchDefault(salesOrderLineID uint, operator string, ip string) error {
	if salesOrderLineID == 0 {
		return fmt.Errorf("sales order line id is required")
	}
	return service.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var line models.SalesOrderLine
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&line, "id = ?", salesOrderLineID).Error; err != nil {
			return err
		}
		previousMode := strings.ToUpper(strings.TrimSpace(line.ProductionRouteMode))
		if previousMode == "" {
			previousMode = "DEFAULT"
		}
		if previousMode == "DEFAULT" {
			return nil
		}
		if tx.Migrator().HasTable(&models.ProductionPlan{}) {
			var planCount int64
			if err := tx.Unscoped().Model(&models.ProductionPlan{}).Where("sales_order_line_id = ?", salesOrderLineID).Count(&planCount).Error; err != nil {
				return fmt.Errorf("failed to check production plan references: %w", err)
			}
			if planCount > 0 {
				return ErrProductionSalesOrderLineRouteModeLocked
			}
		}
		if err := tx.Model(&line).Update("production_route_mode", "DEFAULT").Error; err != nil {
			return fmt.Errorf("failed to restore branch default operations: %w", err)
		}
		return recordAuditEventTx(tx, audit.NewAuditEvent(
			audit.AuditEntitySalesOrder,
			line.SalesOrderID,
			audit.AuditActionUpdate,
			audit.AuditActor{Username: strings.TrimSpace(operator), IP: strings.TrimSpace(ip), Source: "http"},
		).WithChanges(audit.AuditChange{
			Field:    fmt.Sprintf("lines.%d.productionRouteMode", line.LineNo),
			OldValue: previousMode,
			NewValue: "DEFAULT",
		}).Normalize())
	})
}
