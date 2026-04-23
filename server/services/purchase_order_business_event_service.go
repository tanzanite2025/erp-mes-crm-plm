package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func DispatchPurchaseOrderStatusChangedTx(tx *gorm.DB, order models.PurchaseOrder, previousStatus string, nextStatus string, actorID string, operator string) error {
	previous := strings.TrimSpace(previousStatus)
	next := strings.TrimSpace(nextStatus)
	if next == "" || previous == next {
		return nil
	}

	metadata := map[string]any{
		"purchaseOrderId": order.ID,
		"purchaseOrderNo": order.OrderNo,
		"supplierName":    order.SupplierName,
		"supplierId":      order.SupplierID,
		"purchaser":       order.Purchaser,
	}
	templateValues := map[string]string{
		"PurchaseOrderId": order.ID,
		"PurchaseOrderNo": order.OrderNo,
		"SupplierName":    order.SupplierName,
		"SupplierId":      order.SupplierID,
		"Purchaser":       order.Purchaser,
	}
	actionURL := renderTemplateValues("/purchase/orders?search=[PurchaseOrderNo]&detailId=[PurchaseOrderId]", templateValues)
	return DispatchBusinessStatusChangedTx(tx, BusinessStatusChangedEvent{
		EventKey:       buildVersionedStatusEventKey(businessEventSourcePurchaseOrder, order.ID, previous, next, order.Version),
		Entity:         businessEventEntityOrder,
		SourceCode:     businessEventSourcePurchaseOrder,
		TargetID:       order.ID,
		PreviousStatus: previous,
		NextStatus:     next,
		ActorID:        actorID,
		Operator:       operator,
		ActionURL:      actionURL,
		Metadata:       metadata,
		TemplateValues: templateValues,
	})
}

func renderTemplateValues(template string, values map[string]string) string {
	result := strings.TrimSpace(template)
	for key, value := range values {
		result = strings.ReplaceAll(result, "["+key+"]", value)
	}
	return result
}

func buildVersionedStatusEventKey(sourceCode string, targetID string, previousStatus string, nextStatus string, version int) string {
	return strings.Join([]string{
		strings.TrimSpace(sourceCode),
		strings.TrimSpace(targetID),
		businessEventActionStatusChange,
		strings.TrimSpace(previousStatus),
		strings.TrimSpace(nextStatus),
		fmt.Sprintf("v%d", version),
	}, ":")
}
