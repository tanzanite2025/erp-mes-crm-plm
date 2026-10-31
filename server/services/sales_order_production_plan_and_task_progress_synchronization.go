package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"
	statemachine "xdfc-server/services/state_machine"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ValidateProductionPlanSalesOrderSourceTx serializes plan writes with sales commands.
// A saved plan cannot be moved to another order or another stable order line.
func ValidateProductionPlanSalesOrderSourceTx(tx *gorm.DB, plan *models.ProductionPlan, previous *models.ProductionPlan) error {
	plan.OrderID = strings.TrimSpace(plan.OrderID)
	if previous != nil && previous.OrderID != "" {
		if plan.OrderID != previous.OrderID {
			return fmt.Errorf("%w: 已保存的生产计划不能更换来源订单", ErrSalesTransactionInvalidPayload)
		}
		if plan.SalesOrderLineID == 0 {
			plan.SalesOrderLineID = previous.SalesOrderLineID
		}
		if plan.SalesOrderLineID != previous.SalesOrderLineID {
			return fmt.Errorf("%w: 已保存的生产计划不能更换来源明细", ErrSalesTransactionInvalidPayload)
		}
	}
	if plan.OrderID == "" {
		if plan.SalesOrderLineID != 0 {
			return fmt.Errorf("%w: 生产计划明细必须有所属销售订单", ErrSalesTransactionInvalidPayload)
		}
		return nil
	}
	var order models.SalesOrder
	if err := applySalesOrderRecordScope(tx).Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, "id = ?", plan.OrderID).Error; err != nil {
		return err
	}
	// Existing terminal orders may still close/cancel their existing production documents.
	closingExistingPlan := previous != nil && previous.OrderID == plan.OrderID && (plan.Status == "COMPLETED" || plan.Status == "CANCELED")
	if !statemachine.IsSalesOrderStatusEligibleForProduction(order.Status) && !closingExistingPlan {
		return fmt.Errorf("%w: 生产计划只能选择已确认且尚未完成的销售订单", ErrSalesTransactionInvalidPayload)
	}
	if plan.SalesOrderLineID != 0 {
		var line models.SalesOrderLine
		if err := tx.First(&line, "id = ? AND sales_order_id = ?", plan.SalesOrderLineID, order.ID).Error; err != nil {
			return fmt.Errorf("%w: 生产计划来源明细不属于当前订单", ErrSalesTransactionInvalidPayload)
		}
	}
	return nil
}

func salesOrderProductionStatusFromPlanAndTasks(plan models.ProductionPlan) string {
	// Actual work remains a fact even if the plan is subsequently canceled.
	for _, task := range plan.Tasks {
		if task.ActualQty > salesDeliveryTolerance || task.StartedAt != nil || task.CompletedAt != nil || task.Status == "RUNNING" || task.Status == "HOLD" || task.Status == "DONE" {
			return "InProgress"
		}
	}
	switch plan.Status {
	case "IN_PROGRESS", "COMPLETED":
		return "InProgress"
	case "SCHEDULED":
		return "Scheduling"
	default:
		return "Pending"
	}
}

func mergeSalesOrderProductionProgress(current string, incoming string) string {
	if current == "InProgress" || incoming == "InProgress" {
		return "InProgress"
	}
	if current == "Scheduling" || incoming == "Scheduling" {
		return "Scheduling"
	}
	return "Pending"
}

// SynchronizeSalesOrderProductionPlanAndTaskProgressTx runs inside the production
// write transaction. Printing, MRP analysis and sales assignment never call it.
func SynchronizeSalesOrderProductionPlanAndTaskProgressTx(tx *gorm.DB, salesOrderID string) error {
	if strings.TrimSpace(salesOrderID) == "" {
		return nil
	}
	var order models.SalesOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Lines").First(&order, "id = ?", salesOrderID).Error; err != nil {
		return err
	}
	if !statemachine.IsSalesOrderStatusEligibleForProduction(order.Status) {
		return nil
	}
	var plans []models.ProductionPlan
	if err := tx.Preload("Tasks").Where("order_id = ?", order.ID).Find(&plans).Error; err != nil {
		return err
	}
	progress := "Pending"
	lineProgress := map[uint]string{}
	for _, plan := range plans {
		planProgress := salesOrderProductionStatusFromPlanAndTasks(plan)
		progress = mergeSalesOrderProductionProgress(progress, planProgress)
		if plan.SalesOrderLineID != 0 {
			lineProgress[plan.SalesOrderLineID] = mergeSalesOrderProductionProgress(lineProgress[plan.SalesOrderLineID], planProgress)
		}
	}
	// Once work or delivery has started, canceling a plan cannot erase that fact.
	if order.Status == "InProgress" {
		progress = "InProgress"
	}
	changed := false
	for i := range order.Lines {
		line := &order.Lines[i]
		next := lineProgress[line.ID]
		if next == "" {
			next = "Pending"
		}
		if line.Status == "InProgress" || line.DeliveredQty > salesDeliveryTolerance {
			next = "InProgress"
		}
		if line.Qty > salesDeliveryTolerance && line.DeliveredQty >= line.Qty-salesDeliveryTolerance {
			next = "Done"
		}
		if next != line.Status {
			if err := tx.Model(line).Update("status", next).Error; err != nil {
				return err
			}
			line.Status = next
			changed = true
		}
	}
	previousStatus := order.Status
	order.Status = progress
	nextStatus, err := recalculateSalesOrderStatus(&order)
	if err != nil {
		return err
	}
	if nextStatus == previousStatus && !changed {
		return nil
	}
	order.Status = nextStatus
	order.Version++
	if err := tx.Model(&order).Updates(map[string]any{"status": nextStatus, "version": order.Version}).Error; err != nil {
		return err
	}
	return DispatchSalesOrderStatusChangedTx(tx, order, previousStatus, nextStatus, "", "")
}

func rejectSalesOrderCancellationWithActiveProductionPlansTx(tx *gorm.DB, orderID string) error {
	if !tx.Migrator().HasTable(&models.ProductionPlan{}) {
		return nil
	}
	var count int64
	if err := tx.Model(&models.ProductionPlan{}).Where("order_id = ? AND status <> ?", orderID, "CANCELED").Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return fmt.Errorf("%w: 订单已关联生产计划，请先撤销未执行的生产计划；已开工订单不能直接作废", ErrSalesTransactionInvalidPayload)
	}
	return nil
}

// Unlinked barcode production remains independent. Only an explicit lot/plan
// association provides enough evidence to update a sales order.
func SynchronizeSalesOrderProductionProgressFromExecutionLotTx(tx *gorm.DB, executionLotID string) error {
	if strings.TrimSpace(executionLotID) == "" {
		return nil
	}
	var lot models.ProductionExecutionLot
	if err := tx.First(&lot, "id = ?", executionLotID).Error; err != nil {
		return err
	}
	if lot.PlanID == "" {
		return nil
	}
	var plan models.ProductionPlan
	if err := tx.First(&plan, "id = ?", lot.PlanID).Error; err != nil {
		return err
	}
	// Keep the same order-then-plan lock ordering as plan saves and cancellation.
	if plan.OrderID != "" {
		var order models.SalesOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, "id = ?", plan.OrderID).Error; err != nil {
			return err
		}
	}
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&plan, "id = ?", lot.PlanID).Error; err != nil {
		return err
	}
	if plan.Status == "CANCELED" {
		return fmt.Errorf("%w: 已撤销生产计划不能继续报工", ErrInvalidProductionOperationExecution)
	}
	if plan.Status == "SCHEDULED" {
		if err := tx.Model(&plan).Update("status", "IN_PROGRESS").Error; err != nil {
			return err
		}
		if err := DispatchProductionPlanStatusChangedTx(tx, plan, "SCHEDULED", "IN_PROGRESS", "", ""); err != nil {
			return err
		}
	}
	return SynchronizeSalesOrderProductionPlanAndTaskProgressTx(tx, plan.OrderID)
}
