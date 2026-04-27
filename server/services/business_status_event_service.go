package services

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	businessEventSourcePurchaseOrder  = "PURCHASE_ORDER"
	businessEventSourceProductionPlan = "PRODUCTION_PLAN"
	businessEventSourceProductionTask = "PRODUCTION_TASK"
	businessEventEntitySystem         = "SYSTEM"
)

type BusinessStatusChangedEvent struct {
	EventKey       string
	Entity         string
	SourceCode     string
	TargetID       string
	PreviousStatus string
	NextStatus     string
	ActorID        string
	Operator       string
	ActionURL      string
	Metadata       map[string]any
	TemplateValues map[string]string
	TriggeredAt    time.Time
}

func DispatchBusinessStatusChangedTx(tx *gorm.DB, event BusinessStatusChangedEvent) error {
	if tx == nil {
		return fmt.Errorf("transaction is required")
	}

	event = normalizeBusinessStatusChangedEvent(event)
	if event.SourceCode == "" || event.Entity == "" || event.TargetID == "" || event.NextStatus == "" || event.PreviousStatus == event.NextStatus {
		return nil
	}
	if !tx.Migrator().HasTable(&models.NotificationRule{}) || !tx.Migrator().HasTable(&models.RuleExecutionLog{}) {
		return nil
	}

	var rules []models.NotificationRule
	if err := tx.Where(
		"enabled = ? AND entity = ? AND source_code = ? AND action_code = ?",
		true,
		event.Entity,
		event.SourceCode,
		businessEventActionStatusChange,
	).Find(&rules).Error; err != nil {
		return err
	}

	for _, rule := range rules {
		if err := dispatchBusinessStatusChangedRuleTx(tx, event, rule); err != nil {
			return err
		}
	}
	return nil
}

func normalizeBusinessStatusChangedEvent(event BusinessStatusChangedEvent) BusinessStatusChangedEvent {
	event.Entity = strings.TrimSpace(event.Entity)
	event.SourceCode = strings.TrimSpace(event.SourceCode)
	event.TargetID = strings.TrimSpace(event.TargetID)
	event.PreviousStatus = strings.TrimSpace(event.PreviousStatus)
	event.NextStatus = strings.TrimSpace(event.NextStatus)
	event.ActorID = strings.TrimSpace(event.ActorID)
	event.Operator = strings.TrimSpace(event.Operator)
	event.ActionURL = strings.TrimSpace(event.ActionURL)
	if event.Metadata == nil {
		event.Metadata = map[string]any{}
	}
	if event.TemplateValues == nil {
		event.TemplateValues = map[string]string{}
	}
	event.Metadata["previousStatus"] = event.PreviousStatus
	event.Metadata["nextStatus"] = event.NextStatus
	event.Metadata["status"] = event.NextStatus
	event.Metadata["actorId"] = event.ActorID
	event.Metadata["operator"] = event.Operator
	event.Metadata["sourceCode"] = event.SourceCode
	event.TemplateValues["PreviousStatus"] = event.PreviousStatus
	event.TemplateValues["Status"] = event.NextStatus
	event.TemplateValues["NextStatus"] = event.NextStatus
	event.TemplateValues["ActionURL"] = event.ActionURL
	if event.TriggeredAt.IsZero() {
		event.TriggeredAt = time.Now().UTC()
	}
	if strings.TrimSpace(event.EventKey) == "" {
		event.EventKey = buildBusinessStatusChangedEventKey(event)
	}
	return event
}

func buildBusinessStatusChangedEventKey(event BusinessStatusChangedEvent) string {
	return strings.Join([]string{
		event.SourceCode,
		event.TargetID,
		businessEventActionStatusChange,
		event.PreviousStatus,
		event.NextStatus,
		strconv.FormatInt(event.TriggeredAt.UnixNano(), 10),
	}, ":")
}

func dispatchBusinessStatusChangedRuleTx(tx *gorm.DB, event BusinessStatusChangedEvent, rule models.NotificationRule) error {
	segments, err := unmarshalNotificationRuleSegments(rule.Segments)
	if err != nil {
		return writeBusinessStatusRuleExecutionLogTx(tx, event, rule, RuleSegmentDTO{}, models.RuleExecutionLog{
			ExecutionType:   "match",
			ExecutionStatus: "failed",
			ErrorMessage:    err.Error(),
		})
	}

	for _, segment := range segments {
		if !stringListContains(segment.TargetStatuses, event.NextStatus) {
			continue
		}
		if err := writeBusinessStatusRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
			ExecutionType:   "match",
			ExecutionStatus: "matched",
			Metadata:        mustJSONRawMessage(event.Metadata),
		}); err != nil {
			return err
		}
		if err := dispatchBusinessStatusChangedCommandsTx(tx, event, rule, segment); err != nil {
			return err
		}
		if err := dispatchBusinessStatusChangedApprovalTx(tx, event, rule, segment); err != nil {
			return err
		}
	}
	return nil
}

func dispatchBusinessStatusChangedCommandsTx(tx *gorm.DB, event BusinessStatusChangedEvent, rule models.NotificationRule, segment RuleSegmentDTO) error {
	targets := businessStatusEventTargets(event, segment)
	for _, commandID := range segment.CommandIDs {
		var command models.StandardCommand
		if err := tx.Where("id = ?", commandID).First(&command).Error; err != nil {
			if logErr := writeBusinessStatusRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
				ExecutionType:   "notify",
				ExecutionStatus: "failed",
				CommandID:       commandID,
				ErrorMessage:    err.Error(),
			}); logErr != nil {
				return logErr
			}
			continue
		}

		title := renderBusinessStatusEventTemplate(command.Title, event)
		content := renderBusinessStatusEventTemplate(command.Content, event)
		actionURL := renderBusinessStatusEventTemplate(command.TargetLink, event)
		status := "success"
		errorMessage := ""
		for _, target := range targets {
			if err := PublishNotification("Workflow", businessEventActionStatusChange, title, target, map[string]any{
				"eventKey":   event.EventKey,
				"targetId":   event.TargetID,
				"status":     event.NextStatus,
				"actionUrl":  actionURL,
				"commandId":  command.ID,
				"ruleId":     rule.ID,
				"segmentId":  segment.ID,
				"sourceCode": event.SourceCode,
				"metadata":   event.Metadata,
			}); err != nil {
				status = "failed"
				errorMessage = err.Error()
			}
		}
		if len(targets) == 0 {
			status = "skipped"
			errorMessage = "notification target is empty"
		}

		if err := writeBusinessStatusRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
			ExecutionType:   "notify",
			ExecutionStatus: status,
			CommandID:       command.ID,
			Title:           title,
			Content:         content,
			ActionURL:       actionURL,
			Targets:         mustJSONRawMessage(targets),
			Metadata:        mustJSONRawMessage(event.Metadata),
			ErrorMessage:    errorMessage,
		}); err != nil {
			return err
		}
	}
	return nil
}

func dispatchBusinessStatusChangedApprovalTx(tx *gorm.DB, event BusinessStatusChangedEvent, rule models.NotificationRule, segment RuleSegmentDTO) error {
	if segment.Approval == nil || !segment.Approval.Enabled {
		return nil
	}
	if !tx.Migrator().HasTable(&models.ApprovalRequest{}) {
		return writeBusinessStatusRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
			ExecutionType:   "approval",
			ExecutionStatus: "failed",
			ErrorMessage:    "approval_requests table is missing",
		})
	}

	approver1ID := strings.TrimSpace(segment.Approval.Approver1ID)
	if approver1ID == "" && segment.Approval.DynamicApproverField != nil {
		approver1ID = resolveBusinessStatusEventField(event, *segment.Approval.DynamicApproverField)
	}
	if approver1ID == "" {
		return writeBusinessStatusRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
			ExecutionType:   "approval",
			ExecutionStatus: "skipped",
			Metadata:        mustJSONRawMessage(event.Metadata),
			ErrorMessage:    "approval approver is empty",
		})
	}

	result, err := RequestApprovalTx(tx, RequestApprovalInput{
		Module:      segment.Approval.Module,
		Action:      segment.Approval.Action,
		TargetID:    event.TargetID,
		Reason:      renderBusinessStatusEventTemplate(segment.Approval.ReasonTemplate, event),
		RequesterID: event.ActorID,
		Approver1ID: approver1ID,
		Approver2ID: segment.Approval.Approver2ID,
	})
	if err != nil {
		return writeBusinessStatusRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
			ExecutionType:   "approval",
			ExecutionStatus: "failed",
			Metadata:        mustJSONRawMessage(event.Metadata),
			ErrorMessage:    err.Error(),
		})
	}

	if result.NotifyTargetUser != "" {
		_ = PublishNotification("Approval", result.NotifyAction, result.NotifyTitle, result.NotifyTargetUser, result.Request)
	}
	syncApprovalRequestToSearch(result.Request)
	return writeBusinessStatusRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{
		ExecutionType:   "approval",
		ExecutionStatus: "success",
		Targets:         mustJSONRawMessage([]string{approver1ID}),
		Metadata:        mustJSONRawMessage(event.Metadata),
		Result:          mustJSONRawMessage(map[string]string{"approvalRequestId": result.Request.ID}),
	})
}

func writeBusinessStatusRuleExecutionLogTx(tx *gorm.DB, event BusinessStatusChangedEvent, rule models.NotificationRule, segment RuleSegmentDTO, logEntry models.RuleExecutionLog) error {
	logEntry.BaseModel.ID = uuid.NewString()
	logEntry.EventKey = event.EventKey
	logEntry.Entity = event.Entity
	logEntry.SourceCode = event.SourceCode
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
		logEntry.Metadata = mustJSONRawMessage(event.Metadata)
	}
	if len(logEntry.Result) == 0 {
		logEntry.Result = json.RawMessage(`{}`)
	}
	if logEntry.TriggeredAt.IsZero() {
		logEntry.TriggeredAt = event.TriggeredAt
	}
	return tx.Create(&logEntry).Error
}

func businessStatusEventTargets(event BusinessStatusChangedEvent, segment RuleSegmentDTO) []string {
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
		add(resolveBusinessStatusEventField(event, *segment.DynamicTargetField))
	}
	return targets
}

func resolveBusinessStatusEventField(event BusinessStatusChangedEvent, field string) string {
	key := strings.TrimSpace(field)
	if key == "" {
		return ""
	}
	if value, ok := event.TemplateValues[key]; ok {
		return value
	}
	if value, ok := event.Metadata[key]; ok {
		return fmt.Sprint(value)
	}
	return ""
}

func renderBusinessStatusEventTemplate(template string, event BusinessStatusChangedEvent) string {
	result := strings.TrimSpace(template)
	for key, value := range event.TemplateValues {
		result = strings.ReplaceAll(result, "["+key+"]", value)
	}
	return result
}
