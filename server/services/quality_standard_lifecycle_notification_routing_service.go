package services

import (
	"context"
	"encoding/json"
	"fmt"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const qualityStandardEventSourceCode = "QUALITY_STANDARD"

func listQualityStandardEventRulesWithinTransaction(tx *gorm.DB, actionCode string) ([]models.NotificationRule, error) {
	var rules []models.NotificationRule
	err := tx.Clauses(clause.Locking{Strength: "SHARE"}).Where("enabled = ? AND entity = ? AND source_code = ? AND action_code = ?", true, "QUALITY", qualityStandardEventSourceCode, actionCode).Order("id asc").Find(&rules).Error
	return rules, err
}

func qualityStandardSegmentMatchesStatus(segment RuleSegmentDTO, status string) bool {
	return len(segment.TargetStatuses) == 0 || stringListContains(segment.TargetStatuses, status)
}

// DispatchQualityStandardLifecycleNotificationsWithinTransaction records matches
// and queues notifications. It never creates another approval or publishes to
// Redis inside the business transaction.
func DispatchQualityStandardLifecycleNotificationsWithinTransaction(ctx context.Context, tx *gorm.DB, standard models.InspectionStandard, previousStatus string) error {
	if previousStatus == standard.Status {
		return nil
	}
	sourceEnabled, err := LockBusinessEventNotificationSourceWithinTransaction(tx, qualityStandardEventSourceCode)
	if err != nil {
		return err
	}
	if err := ResolveBusinessRuleNotificationInboxEntriesForStatusWithinTransaction(tx, qualityStandardEventSourceCode, "QUALITY", standard.ID, standard.Status); err != nil {
		return err
	}
	if !sourceEnabled {
		return nil
	}
	if previousStatus == "" {
		if err := dispatchQualityStandardEventNotificationsWithinTransaction(ctx, tx, standard, previousStatus, "CREATED"); err != nil {
			return err
		}
	}
	return dispatchQualityStandardEventNotificationsWithinTransaction(ctx, tx, standard, previousStatus, "STATUS_CHANGED")
}

func dispatchQualityStandardEventNotificationsWithinTransaction(ctx context.Context, tx *gorm.DB, standard models.InspectionStandard, previousStatus, actionCode string) error {
	rules, err := listQualityStandardEventRulesWithinTransaction(tx, actionCode)
	if err != nil {
		return err
	}
	event := buildQualityStandardStatusChangedEvent(ctx, standard, previousStatus)
	event.ActionCode = actionCode
	event.EventKey = fmt.Sprintf("QUALITY_STANDARD:%s:%.1f:%s:%s", standard.ID, standard.Version, actionCode, standard.Status)
	for _, rule := range rules {
		segments, err := unmarshalNotificationRuleSegments(rule.Segments)
		if err != nil {
			return err
		}
		for _, segment := range segments {
			if !qualityStandardSegmentMatchesStatus(segment, standard.Status) {
				continue
			}
			event.TemplateValues["RuleName"] = rule.Name
			event.TemplateValues["SegmentTitle"] = segment.Title
			if err := writeBusinessStatusRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{ActionCode: actionCode, ExecutionType: "match", ExecutionStatus: "matched"}); err != nil {
				return err
			}
			targets := businessStatusEventTargets(event, segment)
			if segment.DynamicTargetField != nil && *segment.DynamicTargetField == "operator" {
				targets = trimStringList(append(append([]string{}, segment.AssigneeUsernames...), event.ActorID))
			}
			for _, commandID := range segment.CommandIDs {
				var command models.StandardCommand
				if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).First(&command, "id = ?", commandID).Error; err != nil {
					return err
				}
				var statuses []string
				if len(command.StatusCodes) > 0 {
					if err := json.Unmarshal(command.StatusCodes, &statuses); err != nil {
						return err
					}
				}
				if command.SourceCode != qualityStandardEventSourceCode || command.ActionCode != actionCode || len(statuses) > 0 && !stringListContains(statuses, standard.Status) {
					return domainValidationError("品质标准通知模板与当前业务源、动作或状态不匹配")
				}
				actionURL := renderBusinessStatusEventTemplate(command.TargetLink, event)
				if actionURL == "" {
					actionURL = event.ActionURL
				}
				title := renderBusinessStatusEventTemplate(command.Title, event)
				content := renderBusinessStatusEventTemplate(command.Content, event)
				if err := createBusinessRuleNotificationInboxEntriesWithinTransaction(tx, event, rule, segment, command, targets, title, content, actionURL); err != nil {
					return err
				}
			}
		}
	}
	return nil
}
