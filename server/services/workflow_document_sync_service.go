package services

import (
	"errors"
	"strings"
	"xdfc-server/models"
	statemachine "xdfc-server/services/state_machine"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func syncWorkflowBusinessDocumentTx(tx *gorm.DB, instance *models.WorkflowInstance) error {
	if tx == nil {
		return errors.New("[CRITICAL_WORKFLOW] transaction is required")
	}
	if instance == nil {
		return errors.New("[CRITICAL_WORKFLOW] workflow instance is required")
	}

	businessType := strings.TrimSpace(instance.BusinessType)
	businessRefID := strings.TrimSpace(instance.BusinessRefID)
	status := strings.TrimSpace(instance.Status)
	if businessType == "" || businessRefID == "" || status == "" {
		return nil
	}

	switch businessType {
	case WorkflowModulePurchaseOrder:
		return syncPurchaseOrderWorkflowStatusTx(tx, businessRefID, status)
	case WorkflowModuleSalesOrder:
		return syncSalesOrderWorkflowStatusTx(tx, businessRefID, status)
	default:
		return nil
	}
}

func syncPurchaseOrderWorkflowStatusTx(tx *gorm.DB, purchaseOrderID string, workflowStatus string) error {
	if workflowStatus != models.WorkflowInstanceStatusApproved {
		return nil
	}

	var order models.PurchaseOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ?", strings.TrimSpace(purchaseOrderID)).
		First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}
	if order.Status != "Draft" {
		return nil
	}

	previousStatus := order.Status
	order.Status = "Sent"
	if err := tx.Model(&order).Update("status", order.Status).Error; err != nil {
		return err
	}
	return DispatchPurchaseOrderStatusChangedTx(tx, order, previousStatus, order.Status, "", "")
}

func syncSalesOrderWorkflowStatusTx(tx *gorm.DB, salesOrderID string, workflowStatus string) error {
	if workflowStatus != models.WorkflowInstanceStatusApproved {
		return nil
	}

	var order models.SalesOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ?", strings.TrimSpace(salesOrderID)).
		First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	target := string(statemachine.SalesOrderStatusPending)
	guard := statemachine.CanTransitionSalesOrderStatus(order.Status, target)
	if !guard.Allowed {
		return nil
	}

	previousStatus := order.Status
	order.Status = target
	if err := tx.Model(&order).Update("status", order.Status).Error; err != nil {
		return err
	}
	return DispatchSalesOrderStatusChangedTx(tx, order, previousStatus, order.Status, "", "")
}
