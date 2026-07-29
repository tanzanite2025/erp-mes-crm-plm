package services

import (
	"strconv"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	businessEventOutsourceStatusInspectionAccepted   = "INSPECTION_ACCEPTED"
	businessEventOutsourceStatusInspectionConcession = "INSPECTION_CONCESSION"
	businessEventOutsourceStatusInspectionRework     = "INSPECTION_REWORK"
	businessEventOutsourceStatusInspectionScrap      = "INSPECTION_SCRAP"
)

func timePointerToTemplateValue(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.Format(time.RFC3339)
}

func DispatchProductionPlanStatusChangedTx(tx *gorm.DB, plan models.ProductionPlan, previousStatus string, nextStatus string, actorID string, operator string) error {
	previous := strings.TrimSpace(previousStatus)
	next := strings.TrimSpace(nextStatus)
	if next == "" || previous == next {
		return nil
	}

	metadata := map[string]any{
		"planId":      plan.ID,
		"orderNo":     plan.OrderNo,
		"orderId":     plan.OrderID,
		"productId":   plan.ProductID,
		"productName": plan.ProductName,
		"quantity":    plan.Quantity,
		"startDate":   timePointerToTemplateValue(plan.StartDate),
		"endDate":     timePointerToTemplateValue(plan.EndDate),
	}
	templateValues := map[string]string{
		"PlanId":      plan.ID,
		"OrderNo":     plan.OrderNo,
		"OrderId":     plan.OrderID,
		"ProductId":   plan.ProductID,
		"ProductName": plan.ProductName,
		"Quantity":    strconv.FormatFloat(plan.Quantity, 'f', -1, 64),
		"StartDate":   timePointerToTemplateValue(plan.StartDate),
		"EndDate":     timePointerToTemplateValue(plan.EndDate),
	}
	actionURL := renderTemplateValues("/dashboard/calendar?planId=[PlanId]", templateValues)
	return DispatchBusinessStatusChangedTx(tx, BusinessStatusChangedEvent{
		Entity:         businessEventEntitySystem,
		SourceCode:     businessEventSourceProductionPlan,
		TargetID:       plan.ID,
		PreviousStatus: previous,
		NextStatus:     next,
		ActorID:        actorID,
		Operator:       operator,
		ActionURL:      actionURL,
		Metadata:       metadata,
		TemplateValues: templateValues,
	})
}

func DispatchProductionTaskStatusChangedTx(tx *gorm.DB, plan models.ProductionPlan, task models.ProductionTask, previousStatus string, nextStatus string, actorID string, operator string) error {
	previous := strings.TrimSpace(previousStatus)
	next := strings.TrimSpace(nextStatus)
	if next == "" || previous == next {
		return nil
	}

	taskOperator := strings.TrimSpace(operator)
	if taskOperator == "" {
		taskOperator = strings.TrimSpace(task.Operator)
	}
	metadata := map[string]any{
		"taskId":      task.ID,
		"planId":      task.PlanID,
		"orderNo":     plan.OrderNo,
		"productName": plan.ProductName,
		"batchNo":     task.BatchNo,
		"processName": task.ProcessName,
		"operator":    taskOperator,
		"targetQty":   task.TargetQty,
		"actualQty":   task.ActualQty,
	}
	templateValues := map[string]string{
		"TaskId":      task.ID,
		"PlanId":      task.PlanID,
		"OrderNo":     plan.OrderNo,
		"ProductName": plan.ProductName,
		"BatchNo":     task.BatchNo,
		"ProcessName": task.ProcessName,
		"Operator":    taskOperator,
		"TargetQty":   strconv.FormatFloat(task.TargetQty, 'f', -1, 64),
		"ActualQty":   strconv.FormatFloat(task.ActualQty, 'f', -1, 64),
	}
	actionURL := renderTemplateValues("/dashboard/calendar?planId=[PlanId]", templateValues)
	return DispatchBusinessStatusChangedTx(tx, BusinessStatusChangedEvent{
		Entity:         businessEventEntitySystem,
		SourceCode:     businessEventSourceProductionTask,
		TargetID:       task.ID,
		PreviousStatus: previous,
		NextStatus:     next,
		ActorID:        actorID,
		Operator:       taskOperator,
		ActionURL:      actionURL,
		Metadata:       metadata,
		TemplateValues: templateValues,
	})
}

func DispatchProductionOperationStatusChangedTx(tx *gorm.DB, operation models.ProductionOperationExecution, previousStatus string, nextStatus string, actorID string, operator string) error {
	previous := strings.TrimSpace(previousStatus)
	next := strings.TrimSpace(nextStatus)
	if previous == "" {
		previous = ProductBarcodeStateStatusNotStarted
	}
	if next == "" || previous == next {
		return nil
	}

	operationOperator := strings.TrimSpace(operator)
	if operationOperator == "" {
		operationOperator = strings.TrimSpace(operation.Operator)
	}
	metadata := map[string]any{
		"operationExecutionId": operation.ID,
		"productBarcode":       operation.ProductBarcode,
		"routeId":              operation.RouteID,
		"routeStepId":          operation.RouteStepID,
		"processStepId":        operation.ProcessStepID,
		"action":               operation.Action,
		"result":               operation.Result,
		"operator":             operationOperator,
	}
	templateValues := map[string]string{
		"OperationExecutionId": operation.ID,
		"ProductBarcode":       operation.ProductBarcode,
		"RouteId":              operation.RouteID,
		"RouteStepId":          operation.RouteStepID,
		"ProcessStepId":        operation.ProcessStepID,
		"Action":               operation.Action,
		"Result":               operation.Result,
		"Operator":             operationOperator,
	}
	actionURL := renderTemplateValues("/production-architecture/routes?barcode=[ProductBarcode]", templateValues)
	return DispatchBusinessStatusChangedTx(tx, BusinessStatusChangedEvent{
		Entity:         businessEventEntitySystem,
		SourceCode:     businessEventSourceProductionOperation,
		TargetID:       operation.ID,
		PreviousStatus: previous,
		NextStatus:     next,
		ActorID:        actorID,
		Operator:       operationOperator,
		ActionURL:      actionURL,
		Metadata:       metadata,
		TemplateValues: templateValues,
	})
}

func DispatchOutsourceOrderReleasedTx(tx *gorm.DB, order models.OutsourceOrder, previousStatus string, actorID string, operator string) error {
	return dispatchOutsourceOrderLifecycleStatusChangedTx(
		tx,
		order,
		models.OutsourceOrderLine{},
		models.OutsourceInspection{},
		"OUTSOURCE_RELEASED",
		previousStatus,
		OutsourceOrderStatusReleased,
		actorID,
		operator,
	)
}

func DispatchOutsourceOrderCanceledTx(tx *gorm.DB, order models.OutsourceOrder, previousStatus string, actorID string, operator string) error {
	return dispatchOutsourceOrderLifecycleStatusChangedTx(
		tx,
		order,
		models.OutsourceOrderLine{},
		models.OutsourceInspection{},
		"OUTSOURCE_CANCELED",
		previousStatus,
		OutsourceOrderStatusCanceled,
		actorID,
		operator,
	)
}

func DispatchOutsourceOrderClosedTx(
	tx *gorm.DB,
	order models.OutsourceOrder,
	line models.OutsourceOrderLine,
	inspection models.OutsourceInspection,
	previousStatus string,
	actorID string,
	operator string,
) error {
	return dispatchOutsourceOrderLifecycleStatusChangedTx(
		tx,
		order,
		line,
		inspection,
		"OUTSOURCE_CLOSED",
		previousStatus,
		OutsourceOrderStatusClosed,
		actorID,
		operator,
	)
}

func DispatchOutsourceTransferStatusChangedTx(
	tx *gorm.DB,
	order models.OutsourceOrder,
	line models.OutsourceOrderLine,
	transfer models.OutsourceTransfer,
	previousOrderStatus string,
	previousLineStatus string,
	actorID string,
	operator string,
) error {
	nextStatus := OutsourceOrderStatusSent
	if transfer.TransferType == OutsourceTransferTypeReturn {
		nextStatus = OutsourceOrderStatusReturned
	}

	metadata, templateValues := buildOutsourceExecutionEventBase(order, line)
	metadata["eventType"] = "OUTSOURCE_" + transfer.TransferType
	metadata["transferId"] = transfer.ID
	metadata["transferNo"] = transfer.TransferNo
	metadata["transferType"] = transfer.TransferType
	metadata["productBarcode"] = transfer.ProductBarcode
	metadata["quantity"] = transfer.Quantity
	metadata["uom"] = transfer.UOM
	metadata["routeId"] = transfer.RouteID
	metadata["routeStepId"] = transfer.RouteStepID
	metadata["processStepId"] = transfer.ProcessStepID
	metadata["fromHolderType"] = transfer.FromHolderType
	metadata["fromHolderId"] = transfer.FromHolderID
	metadata["toHolderType"] = transfer.ToHolderType
	metadata["toHolderId"] = transfer.ToHolderID
	metadata["transferEventId"] = transfer.TransferEventID
	metadata["previousOrderStatus"] = strings.TrimSpace(previousOrderStatus)
	metadata["orderStatus"] = order.Status
	metadata["previousLineStatus"] = strings.TrimSpace(previousLineStatus)
	metadata["lineStatus"] = line.Status

	templateValues["EventType"] = "OUTSOURCE_" + transfer.TransferType
	templateValues["TransferId"] = transfer.ID
	templateValues["TransferNo"] = transfer.TransferNo
	templateValues["TransferType"] = transfer.TransferType
	templateValues["ProductBarcode"] = transfer.ProductBarcode
	templateValues["Quantity"] = strconv.FormatFloat(transfer.Quantity, 'f', -1, 64)
	templateValues["UOM"] = transfer.UOM
	templateValues["RouteId"] = transfer.RouteID
	templateValues["RouteStepId"] = transfer.RouteStepID
	templateValues["ProcessStepId"] = transfer.ProcessStepID
	templateValues["TransferEventId"] = transfer.TransferEventID
	templateValues["PreviousOrderStatus"] = strings.TrimSpace(previousOrderStatus)
	templateValues["OrderStatus"] = order.Status
	templateValues["PreviousLineStatus"] = strings.TrimSpace(previousLineStatus)
	templateValues["LineStatus"] = line.Status

	return dispatchOutsourceExecutionStatusChangedTx(
		tx,
		transfer.ID,
		previousLineStatus,
		nextStatus,
		actorID,
		resolveOutsourceExecutionOperator(operator, transfer.Operator, order.Operator),
		metadata,
		templateValues,
	)
}

func DispatchOutsourceInspectionStatusChangedTx(
	tx *gorm.DB,
	order models.OutsourceOrder,
	line models.OutsourceOrderLine,
	inspection models.OutsourceInspection,
	previousOrderStatus string,
	previousLineStatus string,
	actorID string,
	operator string,
) error {
	nextStatus := outsourceInspectionEventStatus(inspection)
	metadata, templateValues := buildOutsourceExecutionEventBase(order, line)
	metadata["eventType"] = "OUTSOURCE_INSPECT"
	metadata["inspectionId"] = inspection.ID
	metadata["inspectionNo"] = inspection.InspectionNo
	metadata["inspectionTaskId"] = inspection.InspectionTaskID
	metadata["productBarcode"] = inspection.ProductBarcode
	metadata["inspectionResult"] = inspection.Result
	metadata["inspectionDisposition"] = inspection.Disposition
	metadata["quantity"] = inspection.InspectedQuantity
	metadata["acceptedQuantity"] = inspection.AcceptedQuantity
	metadata["rejectedQuantity"] = inspection.RejectedQuantity
	metadata["reworkQuantity"] = inspection.ReworkQuantity
	metadata["scrapQuantity"] = inspection.ScrapQuantity
	metadata["uom"] = inspection.UOM
	metadata["routeId"] = inspection.RouteID
	metadata["routeStepId"] = inspection.RouteStepID
	metadata["processStepId"] = inspection.ProcessStepID
	metadata["operationId"] = inspection.OperationID
	metadata["previousOrderStatus"] = strings.TrimSpace(previousOrderStatus)
	metadata["orderStatus"] = order.Status
	metadata["previousLineStatus"] = strings.TrimSpace(previousLineStatus)
	metadata["lineStatus"] = line.Status

	templateValues["EventType"] = "OUTSOURCE_INSPECT"
	templateValues["InspectionId"] = inspection.ID
	templateValues["InspectionNo"] = inspection.InspectionNo
	templateValues["InspectionTaskId"] = inspection.InspectionTaskID
	templateValues["ProductBarcode"] = inspection.ProductBarcode
	templateValues["InspectionResult"] = inspection.Result
	templateValues["InspectionDisposition"] = inspection.Disposition
	templateValues["Quantity"] = strconv.FormatFloat(inspection.InspectedQuantity, 'f', -1, 64)
	templateValues["AcceptedQuantity"] = strconv.FormatFloat(inspection.AcceptedQuantity, 'f', -1, 64)
	templateValues["RejectedQuantity"] = strconv.FormatFloat(inspection.RejectedQuantity, 'f', -1, 64)
	templateValues["ReworkQuantity"] = strconv.FormatFloat(inspection.ReworkQuantity, 'f', -1, 64)
	templateValues["ScrapQuantity"] = strconv.FormatFloat(inspection.ScrapQuantity, 'f', -1, 64)
	templateValues["UOM"] = inspection.UOM
	templateValues["RouteId"] = inspection.RouteID
	templateValues["RouteStepId"] = inspection.RouteStepID
	templateValues["ProcessStepId"] = inspection.ProcessStepID
	templateValues["OperationId"] = inspection.OperationID
	templateValues["PreviousOrderStatus"] = strings.TrimSpace(previousOrderStatus)
	templateValues["OrderStatus"] = order.Status
	templateValues["PreviousLineStatus"] = strings.TrimSpace(previousLineStatus)
	templateValues["LineStatus"] = line.Status

	return dispatchOutsourceExecutionStatusChangedTx(
		tx,
		inspection.ID,
		previousLineStatus,
		nextStatus,
		actorID,
		resolveOutsourceExecutionOperator(operator, inspection.Inspector, order.Operator),
		metadata,
		templateValues,
	)
}

func buildOutsourceExecutionEventBase(order models.OutsourceOrder, line models.OutsourceOrderLine) (map[string]any, map[string]string) {
	lineNo := ""
	if line.LineNo > 0 {
		lineNo = strconv.Itoa(line.LineNo)
	}
	quantity := line.Quantity
	if quantity == 0 {
		quantity = order.TotalQuantity
	}
	uom := strings.TrimSpace(line.UOM)
	if uom == "" {
		uom = strings.TrimSpace(order.UOM)
	}

	metadata := map[string]any{
		"outsourceOrderId":     order.ID,
		"outsourceOrderNo":     order.OrderNo,
		"orderNo":              order.OrderNo,
		"sourceType":           order.SourceType,
		"sourceId":             order.SourceID,
		"sourceNo":             order.SourceNo,
		"customerId":           order.CustomerID,
		"customerName":         order.CustomerName,
		"partnerId":            order.PartnerID,
		"partnerName":          order.PartnerNameSnapshot,
		"outsourceOrderLineId": line.ID,
		"lineNo":               line.LineNo,
		"sourceLineId":         line.SourceLineID,
		"productId":            line.ProductID,
		"productCode":          line.ProductCode,
		"productName":          line.ProductName,
		"processStepId":        line.ProcessStepID,
		"processCode":          line.ProcessCode,
		"processName":          line.ProcessName,
		"lineQuantity":         line.Quantity,
		"quantity":             quantity,
		"uom":                  uom,
	}
	templateValues := map[string]string{
		"OutsourceOrderId":     order.ID,
		"OutsourceOrderNo":     order.OrderNo,
		"OrderNo":              order.OrderNo,
		"SourceType":           order.SourceType,
		"SourceId":             order.SourceID,
		"SourceNo":             order.SourceNo,
		"CustomerId":           order.CustomerID,
		"CustomerName":         order.CustomerName,
		"PartnerId":            order.PartnerID,
		"PartnerName":          order.PartnerNameSnapshot,
		"OutsourceOrderLineId": line.ID,
		"LineNo":               lineNo,
		"SourceLineId":         line.SourceLineID,
		"ProductId":            line.ProductID,
		"ProductCode":          line.ProductCode,
		"ProductName":          line.ProductName,
		"ProcessStepId":        line.ProcessStepID,
		"ProcessCode":          line.ProcessCode,
		"ProcessName":          line.ProcessName,
		"LineQuantity":         strconv.FormatFloat(line.Quantity, 'f', -1, 64),
		"Quantity":             strconv.FormatFloat(quantity, 'f', -1, 64),
		"UOM":                  uom,
	}
	return metadata, templateValues
}

func dispatchOutsourceOrderLifecycleStatusChangedTx(
	tx *gorm.DB,
	order models.OutsourceOrder,
	line models.OutsourceOrderLine,
	inspection models.OutsourceInspection,
	eventType string,
	previousStatus string,
	nextStatus string,
	actorID string,
	operator string,
) error {
	orderStatus := strings.TrimSpace(order.Status)
	if orderStatus == "" {
		orderStatus = strings.TrimSpace(nextStatus)
	}
	metadata, templateValues := buildOutsourceExecutionEventBase(order, line)
	metadata["eventType"] = eventType
	metadata["previousOrderStatus"] = strings.TrimSpace(previousStatus)
	metadata["orderStatus"] = orderStatus
	templateValues["EventType"] = eventType
	templateValues["PreviousOrderStatus"] = strings.TrimSpace(previousStatus)
	templateValues["OrderStatus"] = orderStatus

	if strings.TrimSpace(inspection.ID) != "" {
		metadata["inspectionId"] = inspection.ID
		metadata["inspectionNo"] = inspection.InspectionNo
		metadata["inspectionTaskId"] = inspection.InspectionTaskID
		metadata["productBarcode"] = inspection.ProductBarcode
		metadata["inspectionResult"] = inspection.Result
		metadata["inspectionDisposition"] = inspection.Disposition
		metadata["quantity"] = inspection.InspectedQuantity
		metadata["acceptedQuantity"] = inspection.AcceptedQuantity
		metadata["rejectedQuantity"] = inspection.RejectedQuantity
		metadata["reworkQuantity"] = inspection.ReworkQuantity
		metadata["scrapQuantity"] = inspection.ScrapQuantity
		metadata["uom"] = inspection.UOM
		metadata["operationId"] = inspection.OperationID
		templateValues["InspectionId"] = inspection.ID
		templateValues["InspectionNo"] = inspection.InspectionNo
		templateValues["InspectionTaskId"] = inspection.InspectionTaskID
		templateValues["ProductBarcode"] = inspection.ProductBarcode
		templateValues["InspectionResult"] = inspection.Result
		templateValues["InspectionDisposition"] = inspection.Disposition
		templateValues["Quantity"] = strconv.FormatFloat(inspection.InspectedQuantity, 'f', -1, 64)
		templateValues["AcceptedQuantity"] = strconv.FormatFloat(inspection.AcceptedQuantity, 'f', -1, 64)
		templateValues["RejectedQuantity"] = strconv.FormatFloat(inspection.RejectedQuantity, 'f', -1, 64)
		templateValues["ReworkQuantity"] = strconv.FormatFloat(inspection.ReworkQuantity, 'f', -1, 64)
		templateValues["ScrapQuantity"] = strconv.FormatFloat(inspection.ScrapQuantity, 'f', -1, 64)
		templateValues["UOM"] = inspection.UOM
		templateValues["OperationId"] = inspection.OperationID
	}

	return dispatchOutsourceExecutionStatusChangedTx(
		tx,
		order.ID,
		previousStatus,
		nextStatus,
		actorID,
		resolveOutsourceExecutionOperator(operator, inspection.Inspector, order.Operator),
		metadata,
		templateValues,
	)
}

func dispatchOutsourceExecutionStatusChangedTx(
	tx *gorm.DB,
	targetID string,
	previousStatus string,
	nextStatus string,
	actorID string,
	operator string,
	metadata map[string]any,
	templateValues map[string]string,
) error {
	previous := normalizeOutsourceEventPreviousStatus(previousStatus, nextStatus)
	next := strings.TrimSpace(nextStatus)
	if next == "" {
		return nil
	}
	if metadata == nil {
		metadata = map[string]any{}
	}
	if templateValues == nil {
		templateValues = map[string]string{}
	}

	metadata["eventStatus"] = next
	templateValues["EventStatus"] = next
	templateValues["TargetId"] = strings.TrimSpace(targetID)
	actionURL := renderTemplateValues("/production-outsourcing/transfers?search=[OutsourceOrderNo]", templateValues)
	return DispatchBusinessStatusChangedTx(tx, BusinessStatusChangedEvent{
		EventKey:       strings.Join([]string{businessEventSourceProductionOutsource, strings.TrimSpace(targetID), businessEventActionStatusChange, previous, next}, ":"),
		Entity:         businessEventEntitySystem,
		SourceCode:     businessEventSourceProductionOutsource,
		TargetID:       strings.TrimSpace(targetID),
		PreviousStatus: previous,
		NextStatus:     next,
		ActorID:        actorID,
		Operator:       operator,
		ActionURL:      actionURL,
		Metadata:       metadata,
		TemplateValues: templateValues,
	})
}

func normalizeOutsourceEventPreviousStatus(previousStatus string, nextStatus string) string {
	previous := strings.TrimSpace(previousStatus)
	next := strings.TrimSpace(nextStatus)
	if previous == "" || previous == next {
		return "BEFORE_" + next
	}
	return previous
}

func outsourceInspectionEventStatus(inspection models.OutsourceInspection) string {
	switch strings.TrimSpace(inspection.Disposition) {
	case OutsourceInspectionDispositionAccept:
		return businessEventOutsourceStatusInspectionAccepted
	case OutsourceInspectionDispositionConcession:
		return businessEventOutsourceStatusInspectionConcession
	case OutsourceInspectionDispositionRework:
		return businessEventOutsourceStatusInspectionRework
	case OutsourceInspectionDispositionScrap:
		return businessEventOutsourceStatusInspectionScrap
	default:
		if strings.TrimSpace(inspection.Result) == OutsourceInspectionResultPass {
			return businessEventOutsourceStatusInspectionAccepted
		}
		return businessEventOutsourceStatusInspectionRework
	}
}

func resolveOutsourceExecutionOperator(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}
