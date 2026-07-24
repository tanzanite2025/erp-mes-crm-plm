package services

import (
	"strconv"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
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
