package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"
	statemachine "xdfc-server/services/state_machine"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	businessEventEntityOrder        = "ORDER"
	businessEventSourceSalesOrder   = "SALES_ORDER"
	businessEventActionStatusChange = "STATUS_CHANGED"
)

type salesOrderStatusChangedEvent struct {
	EventKey       string
	Order          models.SalesOrder
	PreviousStatus string
	NextStatus     string
	ActorID        string
	Operator       string
	TriggeredAt    time.Time
}

func DispatchSalesOrderStatusChangedTx(tx *gorm.DB, order models.SalesOrder, previousStatus string, nextStatus string, actorID string, operator string) error {
	if tx == nil {
		return fmt.Errorf("transaction is required")
	}

	previous := string(statemachine.NormalizeSalesOrderStatus(previousStatus))
	next := string(statemachine.NormalizeSalesOrderStatus(nextStatus))
	if previous == "" || next == "" || previous == next {
		return nil
	}
	if !tx.Migrator().HasTable(&models.NotificationRule{}) || !tx.Migrator().HasTable(&models.RuleExecutionLog{}) {
		return nil
	}

	event := salesOrderStatusChangedEvent{
		EventKey:       buildSalesOrderStatusChangedEventKey(order.ID, previous, next, order.Version),
		Order:          order,
		PreviousStatus: previous,
		NextStatus:     next,
		ActorID:        strings.TrimSpace(actorID),
		Operator:       strings.TrimSpace(operator),
		TriggeredAt:    time.Now().UTC(),
	}

	var rules []models.NotificationRule
	if err := tx.Where(
		"enabled = ? AND entity = ? AND source_code = ? AND action_code = ?",
		true,
		businessEventEntityOrder,
		businessEventSourceSalesOrder,
		businessEventActionStatusChange,
	).Find(&rules).Error; err != nil {
		return err
	}

	for _, rule := range rules {
		if err := dispatchSalesOrderStatusChangedRuleTx(tx, event, rule); err != nil {
			return err
		}
	}
	return nil
}

func buildSalesOrderStatusChangedEventKey(orderID string, previousStatus string, nextStatus string, version int) string {
	return strings.Join([]string{
		businessEventSourceSalesOrder,
		strings.TrimSpace(orderID),
		businessEventActionStatusChange,
		strings.TrimSpace(previousStatus),
		strings.TrimSpace(nextStatus),
		fmt.Sprintf("v%d", version),
	}, ":")
}

func dispatchSalesOrderStatusChangedRuleTx(tx *gorm.DB, event salesOrderStatusChangedEvent, rule models.NotificationRule) error {
	segments, err := unmarshalNotificationRuleSegments(rule.Segments)
	if err != nil {
		return writeSalesOrderRuleExecutionLogTx(tx, event, rule, RuleSegmentDTO{}, models.RuleExecutionLog{
			ExecutionType:   "match",
			ExecutionStatus: "failed",
			ErrorMessage:    err.Error(),
		})
	}

	for _, segment := range segments {
		if !stringListContains(segment.TargetStatuses, event.NextStatus) {
			continue
		}
		if err := writeSalesOrderRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
			ExecutionType:   "match",
			ExecutionStatus: "matched",
			Metadata:        mustJSONRawMessage(salesOrderStatusChangedMetadata(event)),
		}); err != nil {
			return err
		}
		if err := dispatchSalesOrderStatusChangedCommandsTx(tx, event, rule, segment); err != nil {
			return err
		}
		if err := dispatchSalesOrderStatusChangedApprovalTx(tx, event, rule, segment); err != nil {
			return err
		}
	}
	return nil
}

func dispatchSalesOrderStatusChangedCommandsTx(tx *gorm.DB, event salesOrderStatusChangedEvent, rule models.NotificationRule, segment RuleSegmentDTO) error {
	targets := salesOrderEventTargets(event, segment)
	for _, commandID := range segment.CommandIDs {
		var command models.StandardCommand
		if err := tx.Where("id = ?", commandID).First(&command).Error; err != nil {
			if logErr := writeSalesOrderRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
				ExecutionType:   "notify",
				ExecutionStatus: "failed",
				CommandID:       commandID,
				ErrorMessage:    err.Error(),
			}); logErr != nil {
				return logErr
			}
			continue
		}

		title := renderSalesOrderEventTemplate(command.Title, event)
		content := renderSalesOrderEventTemplate(command.Content, event)
		actionURL := renderSalesOrderEventTemplate(command.TargetLink, event)
		status := "success"
		errorMessage := ""
		for _, target := range targets {
			if err := PublishNotification("Workflow", businessEventActionStatusChange, title, target, map[string]any{
				"eventKey":   event.EventKey,
				"orderId":    event.Order.ID,
				"orderNo":    event.Order.OrderNo,
				"status":     event.NextStatus,
				"actionUrl":  actionURL,
				"commandId":  command.ID,
				"ruleId":     rule.ID,
				"segmentId":  segment.ID,
				"sourceCode": businessEventSourceSalesOrder,
			}); err != nil {
				status = "failed"
				errorMessage = err.Error()
			}
		}
		if len(targets) == 0 {
			status = "skipped"
			errorMessage = "notification target is empty"
		}

		if err := writeSalesOrderRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
			ExecutionType:   "notify",
			ExecutionStatus: status,
			CommandID:       command.ID,
			Title:           title,
			Content:         content,
			ActionURL:       actionURL,
			Targets:         mustJSONRawMessage(targets),
			Metadata:        mustJSONRawMessage(salesOrderStatusChangedMetadata(event)),
			ErrorMessage:    errorMessage,
		}); err != nil {
			return err
		}
	}
	return nil
}

func dispatchSalesOrderStatusChangedApprovalTx(tx *gorm.DB, event salesOrderStatusChangedEvent, rule models.NotificationRule, segment RuleSegmentDTO) error {
	if segment.Approval == nil || !segment.Approval.Enabled {
		return nil
	}
	if !tx.Migrator().HasTable(&models.ApprovalRequest{}) {
		return writeSalesOrderRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
			ExecutionType:   "approval",
			ExecutionStatus: "failed",
			ErrorMessage:    "approval_requests table is missing",
		})
	}

	approver1ID := strings.TrimSpace(segment.Approval.Approver1ID)
	if approver1ID == "" && segment.Approval.DynamicApproverField != nil {
		approver1ID = resolveSalesOrderEventField(event, *segment.Approval.DynamicApproverField)
	}
	if approver1ID == "" {
		return writeSalesOrderRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
			ExecutionType:   "approval",
			ExecutionStatus: "skipped",
			Metadata:        mustJSONRawMessage(salesOrderStatusChangedMetadata(event)),
			ErrorMessage:    "approval approver is empty",
		})
	}

	result, err := RequestApprovalTxWithContext(approvalAuditContext(event.ActorID, event.Operator, "sales-order"), tx, RequestApprovalInput{
		Module:      segment.Approval.Module,
		Action:      segment.Approval.Action,
		TargetID:    event.Order.ID,
		Reason:      renderSalesOrderEventTemplate(segment.Approval.ReasonTemplate, event),
		RequesterID: event.ActorID,
		Approver1ID: approver1ID,
		Approver2ID: segment.Approval.Approver2ID,
	})
	if err != nil {
		return writeSalesOrderRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
			ExecutionType:   "approval",
			ExecutionStatus: "failed",
			Metadata:        mustJSONRawMessage(salesOrderStatusChangedMetadata(event)),
			ErrorMessage:    err.Error(),
		})
	}

	if result.NotifyTargetUser != "" {
		_ = PublishNotification("Approval", result.NotifyAction, result.NotifyTitle, result.NotifyTargetUser, result.Request)
	}
	syncApprovalRequestToSearch(result.Request)
	return writeSalesOrderRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
		ExecutionType:   "approval",
		ExecutionStatus: "success",
		Targets:         mustJSONRawMessage([]string{approver1ID}),
		Metadata:        mustJSONRawMessage(salesOrderStatusChangedMetadata(event)),
		Result:          mustJSONRawMessage(map[string]string{"approvalRequestId": result.Request.ID}),
	})
}

func writeSalesOrderRuleExecutionLogTx(tx *gorm.DB, event salesOrderStatusChangedEvent, rule models.NotificationRule, segment RuleSegmentDTO, logEntry models.RuleExecutionLog) error {
	logEntry.BaseModel.ID = uuid.NewString()
	logEntry.EventKey = event.EventKey
	logEntry.Entity = businessEventEntityOrder
	logEntry.SourceCode = businessEventSourceSalesOrder
	logEntry.ActionCode = businessEventActionStatusChange
	logEntry.StatusCode = event.NextStatus
	logEntry.RuleID = strings.TrimSpace(rule.ID)
	logEntry.RuleName = strings.TrimSpace(rule.Name)
	logEntry.SegmentID = strings.TrimSpace(segment.ID)
	logEntry.SegmentTitle = strings.TrimSpace(segment.Title)
	logEntry.ExecutionType = strings.TrimSpace(strings.ToLower(logEntry.ExecutionType))
	logEntry.ExecutionStatus = strings.TrimSpace(strings.ToLower(logEntry.ExecutionStatus))
	logEntry.CommandID = strings.TrimSpace(logEntry.CommandID)
	logEntry.Title = strings.TrimSpace(logEntry.Title)
	logEntry.Content = strings.TrimSpace(logEntry.Content)
	logEntry.ActionURL = strings.TrimSpace(logEntry.ActionURL)
	logEntry.ErrorMessage = strings.TrimSpace(logEntry.ErrorMessage)
	if len(logEntry.Targets) == 0 {
		logEntry.Targets = json.RawMessage(`[]`)
	}
	if len(logEntry.Metadata) == 0 {
		logEntry.Metadata = mustJSONRawMessage(salesOrderStatusChangedMetadata(event))
	}
	if len(logEntry.Result) == 0 {
		logEntry.Result = json.RawMessage(`{}`)
	}
	if logEntry.TriggeredAt.IsZero() {
		logEntry.TriggeredAt = event.TriggeredAt
	}
	return tx.Create(&logEntry).Error
}

func salesOrderStatusChangedMetadata(event salesOrderStatusChangedEvent) map[string]any {
	return map[string]any{
		"orderId":        event.Order.ID,
		"orderNo":        event.Order.OrderNo,
		"customerId":     event.Order.CustomerID,
		"customerName":   event.Order.CustomerName,
		"previousStatus": event.PreviousStatus,
		"nextStatus":     event.NextStatus,
		"actorId":        event.ActorID,
		"operator":       event.Operator,
	}
}

func salesOrderEventTargets(event salesOrderStatusChangedEvent, segment RuleSegmentDTO) []string {
	targets := make([]string, 0, len(segment.AssigneeUsernames)+1)
	seen := make(map[string]struct{}, len(segment.AssigneeUsernames)+1)
	add := func(value string) {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			return
		}
		if _, ok := seen[trimmed]; ok {
			return
		}
		seen[trimmed] = struct{}{}
		targets = append(targets, trimmed)
	}
	for _, value := range segment.AssigneeUsernames {
		add(value)
	}
	if segment.DynamicTargetField != nil {
		add(resolveSalesOrderEventField(event, *segment.DynamicTargetField))
	}
	return targets
}

func resolveSalesOrderEventField(event salesOrderStatusChangedEvent, field string) string {
	switch strings.TrimSpace(field) {
	case "orderId":
		return event.Order.ID
	case "orderNo":
		return event.Order.OrderNo
	case "customer", "customerName":
		return event.Order.CustomerName
	case "createdBy", "claimedBy", "updatedBy":
		return event.Order.UpdatedBy
	default:
		return ""
	}
}

func renderSalesOrderEventTemplate(template string, event salesOrderStatusChangedEvent) string {
	replacer := strings.NewReplacer(
		"[OrderId]", event.Order.ID,
		"[OrderNo]", event.Order.OrderNo,
		"[Customer]", event.Order.CustomerName,
		"[PreviousStatus]", event.PreviousStatus,
		"[Status]", event.NextStatus,
		"[NextStatus]", event.NextStatus,
	)
	return replacer.Replace(strings.TrimSpace(template))
}

func stringListContains(values []string, expected string) bool {
	for _, value := range values {
		if strings.TrimSpace(value) == strings.TrimSpace(expected) {
			return true
		}
	}
	return false
}

func mustJSONRawMessage(value interface{}) json.RawMessage {
	raw, err := json.Marshal(value)
	if err != nil {
		return json.RawMessage(`null`)
	}
	return raw
}
