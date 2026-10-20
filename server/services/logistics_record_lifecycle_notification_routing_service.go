package services

import (
	"context"
	"fmt"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/models"

	"gorm.io/gorm"
)

// LogisticsRecord is the manual sales/purchase logistics record, not the
// separate carrier DeliveryOrder tracking projection.
func dispatchLogisticsRecordLifecycleNotificationsWithinTransaction(ctx context.Context, tx *gorm.DB, record models.LogisticsRecord, previousStatus, actionCode string) error {
	permission := authz.MenuTrading
	actionURL := "/shipping-management/logistics?logisticsId=" + record.ID
	if record.Type == "Receipt" {
		permission = authz.MenuPurchase
		actionURL = "/purchase/logistics?logisticsId=" + record.ID
	}
	actorID, operator := logisticsBusinessIdentityFromContext(ctx)
	metadata := map[string]any{
		"logisticsId": record.ID, "orderNo": record.OrderNo, "trackingNo": record.TrackingNo,
		"logisticsType": record.Type, "carrier": record.Carrier, "lastLocation": record.LastLocation,
		"salesOrderId": record.SalesOrderID, "purchaseOrderId": record.PurchaseOrderID,
		"shipmentId": record.ShipmentID, "operator": operator,
	}
	values := map[string]string{"Operator": operator}
	for key, value := range metadata {
		values[strings.ToUpper(key[:1])+key[1:]] = fmt.Sprint(value)
	}
	event := BusinessStatusChangedEvent{
		EventKey:   fmt.Sprintf("LOGISTICS_RECORD:%s:v%d:%s", record.ID, record.Version, actionCode),
		ActionCode: actionCode, Entity: "ORDER", SourceCode: "LOGISTICS_RECORD", TargetID: record.ID,
		PreviousStatus: previousStatus, NextStatus: record.Status, ActorID: actorID, Operator: operator,
		ActionURL: actionURL, VisibilityPermission: permission, Metadata: metadata, TemplateValues: values,
		TriggeredAt: record.UpdatedAt,
	}
	if err := DispatchBusinessStatusChangedTx(tx, event); err != nil {
		return err
	}
	if previousStatus != "Exception" && record.Status == "Exception" {
		event.ActionCode = "EXCEPTION"
		event.EventKey = fmt.Sprintf("LOGISTICS_RECORD:%s:v%d:EXCEPTION", record.ID, record.Version)
		return DispatchBusinessStatusChangedTx(tx, event)
	}
	return nil
}
