package services

import (
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
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
		if status != models.WorkflowInstanceStatusApproved {
			return nil
		}
		return tx.Model(&models.PurchaseOrder{}).
			Where("id = ? AND status = ?", businessRefID, "Draft").
			Update("status", "Sent").Error
	default:
		return nil
	}
}
