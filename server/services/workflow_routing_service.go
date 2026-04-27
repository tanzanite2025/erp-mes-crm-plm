package services

import (
	"errors"
	"fmt"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrStandardCommandNotFound  = errors.New("standard command not found")
	ErrNotificationRuleNotFound = errors.New("notification rule not found")
)

func normalizeNotificationRuleRouting(rule models.NotificationRule) models.NotificationRule {
	entity := strings.TrimSpace(rule.Entity)
	sourceCode := strings.TrimSpace(rule.SourceCode)
	actionCode := strings.TrimSpace(rule.ActionCode)

	if entity == "" {
		entity = businessEventEntityOrder
	}
	if entity != businessEventEntityOrder {
		if sourceCode == businessEventSourceProductionPlan || sourceCode == businessEventSourceProductionTask {
			rule.Entity = entity
			rule.SourceCode = sourceCode
			rule.ActionCode = businessEventActionStatusChange
			return rule
		}
		rule.Entity = entity
		rule.SourceCode = sourceCode
		rule.ActionCode = actionCode
		return rule
	}
	if sourceCode == businessEventSourcePurchaseOrder {
		rule.Entity = entity
		rule.SourceCode = businessEventSourcePurchaseOrder
		rule.ActionCode = businessEventActionStatusChange
		return rule
	}
	if sourceCode != "" && sourceCode != businessEventEntityOrder && sourceCode != businessEventSourceSalesOrder {
		rule.Entity = entity
		rule.SourceCode = sourceCode
		rule.ActionCode = actionCode
		return rule
	}

	rule.Entity = businessEventEntityOrder
	rule.SourceCode = businessEventSourceSalesOrder
	if actionCode == "" || actionCode != businessEventActionStatusChange {
		rule.ActionCode = businessEventActionStatusChange
	} else {
		rule.ActionCode = actionCode
	}
	return rule
}

func persistNormalizedNotificationRuleRouting(existing models.NotificationRule, normalized models.NotificationRule) error {
	if existing.Entity == normalized.Entity &&
		existing.SourceCode == normalized.SourceCode &&
		existing.ActionCode == normalized.ActionCode {
		return nil
	}
	return db.DB.Model(&existing).Updates(map[string]interface{}{
		"entity":      normalized.Entity,
		"source_code": normalized.SourceCode,
		"action_code": normalized.ActionCode,
	}).Error
}

func validateNotificationRuleReferences(rule models.NotificationRule) error {
	rule = normalizeNotificationRuleRouting(rule)
	sourceCode := strings.TrimSpace(rule.SourceCode)
	entity := strings.TrimSpace(rule.Entity)
	actionCode := strings.TrimSpace(rule.ActionCode)

	var source models.BusinessEventSource
	if err := db.DB.Where("code = ?", sourceCode).First(&source).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("business event source %q not found", sourceCode)
		}
		return err
	}
	if strings.TrimSpace(source.Entity) != entity {
		return fmt.Errorf("business event source %q entity mismatch: %s", sourceCode, entity)
	}

	config, err := unmarshalBusinessEventSourceConfig(source.Config)
	if err != nil {
		return err
	}

	actionCodes := make(map[string]struct{}, len(config.Actions))
	for _, action := range config.Actions {
		actionCodes[action.Code] = struct{}{}
	}
	if _, ok := actionCodes[actionCode]; !ok {
		return fmt.Errorf("actionCode %q is not configured on source %q", actionCode, sourceCode)
	}

	statusCodes := make(map[string]struct{}, len(config.Statuses))
	for _, status := range config.Statuses {
		statusCodes[status.Code] = struct{}{}
	}
	resolverCodes := make(map[string]struct{}, len(config.DynamicResolvers))
	for _, resolver := range config.DynamicResolvers {
		resolverCodes[resolver.Code] = struct{}{}
	}

	segments, err := unmarshalNotificationRuleSegments(rule.Segments)
	if err != nil {
		return err
	}

	commandIDs := make(map[string]struct{})
	for segmentIndex, segment := range segments {
		for _, statusCode := range segment.TargetStatuses {
			if _, ok := statusCodes[statusCode]; !ok {
				return fmt.Errorf(
					"segments[%d].targetStatuses contains unknown status %q",
					segmentIndex,
					statusCode,
				)
			}
		}
		for _, statusCode := range segment.ResolveOnStatuses {
			if _, ok := statusCodes[statusCode]; !ok {
				return fmt.Errorf(
					"segments[%d].resolveOnStatuses contains unknown status %q",
					segmentIndex,
					statusCode,
				)
			}
		}
		if segment.DynamicTargetField != nil {
			if _, ok := resolverCodes[*segment.DynamicTargetField]; !ok {
				return fmt.Errorf(
					"segments[%d].dynamicTargetField contains unknown resolver %q",
					segmentIndex,
					*segment.DynamicTargetField,
				)
			}
		}
		if segment.Approval != nil && segment.Approval.DynamicApproverField != nil {
			if _, ok := resolverCodes[*segment.Approval.DynamicApproverField]; !ok {
				return fmt.Errorf(
					"segments[%d].approval.dynamicApproverField contains unknown resolver %q",
					segmentIndex,
					*segment.Approval.DynamicApproverField,
				)
			}
		}
		for _, commandID := range segment.CommandIDs {
			commandIDs[commandID] = struct{}{}
		}
	}

	for commandID := range commandIDs {
		var count int64
		if err := db.DB.Model(&models.StandardCommand{}).
			Where("id = ?", commandID).
			Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return fmt.Errorf("command %q not found", commandID)
		}
	}

	return nil
}

func ListStandardCommands() ([]models.StandardCommand, error) {
	var commands []models.StandardCommand
	if err := db.DB.Order("created_at desc").Find(&commands).Error; err != nil {
		return nil, err
	}
	return commands, nil
}

func CreateStandardCommand(command models.StandardCommand) (models.StandardCommand, error) {
	if err := db.DB.Create(&command).Error; err != nil {
		return models.StandardCommand{}, err
	}
	return command, nil
}

func UpdateStandardCommand(id string, patch models.StandardCommand) (models.StandardCommand, error) {
	id = strings.TrimSpace(id)
	var existing models.StandardCommand
	if err := db.DB.Where("id = ?", id).First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.StandardCommand{}, ErrStandardCommandNotFound
		}
		return models.StandardCommand{}, err
	}

	if err := db.DB.Model(&existing).Updates(patch).Error; err != nil {
		return models.StandardCommand{}, err
	}
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.StandardCommand{}, err
	}
	return existing, nil
}

func DeleteStandardCommand(id string) error {
	id = strings.TrimSpace(id)
	return db.DB.Where("id = ?", id).Delete(&models.StandardCommand{}).Error
}

func ListNotificationRules() ([]models.NotificationRule, error) {
	var rules []models.NotificationRule
	if err := db.DB.Order("created_at desc").Find(&rules).Error; err != nil {
		return nil, err
	}
	for index := range rules {
		normalized := normalizeNotificationRuleRouting(rules[index])
		if err := persistNormalizedNotificationRuleRouting(rules[index], normalized); err != nil {
			return nil, err
		}
		rules[index] = normalized
	}
	return rules, nil
}

func CreateNotificationRule(rule models.NotificationRule) (models.NotificationRule, error) {
	rule = normalizeNotificationRuleRouting(rule)
	rule.Name = strings.TrimSpace(rule.Name)
	rule.Entity = strings.TrimSpace(rule.Entity)
	rule.SourceCode = strings.TrimSpace(rule.SourceCode)
	rule.ActionCode = strings.TrimSpace(rule.ActionCode)
	if rule.Version == 0 {
		rule.Version = 1
	}
	if err := validateNotificationRuleReferences(rule); err != nil {
		return models.NotificationRule{}, err
	}
	if err := db.DB.Create(&rule).Error; err != nil {
		return models.NotificationRule{}, err
	}
	return rule, nil
}

func UpdateNotificationRule(id string, patch models.NotificationRule) (models.NotificationRule, error) {
	id = strings.TrimSpace(id)
	var existing models.NotificationRule
	if err := db.DB.Where("id = ?", id).First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.NotificationRule{}, ErrNotificationRuleNotFound
		}
		return models.NotificationRule{}, err
	}

	nextVersion := existing.Version + 1
	if patch.Version > existing.Version {
		nextVersion = patch.Version
	}
	patch = normalizeNotificationRuleRouting(patch)
	if err := validateNotificationRuleReferences(patch); err != nil {
		return models.NotificationRule{}, err
	}
	updates := map[string]interface{}{
		"name":        patch.Name,
		"enabled":     patch.Enabled,
		"entity":      patch.Entity,
		"source_code": patch.SourceCode,
		"action_code": patch.ActionCode,
		"segments":    patch.Segments,
		"version":     nextVersion,
	}
	if strings.TrimSpace(patch.Name) == "" {
		updates["name"] = existing.Name
	}
	if strings.TrimSpace(patch.Entity) == "" {
		updates["entity"] = existing.Entity
	}

	if err := db.DB.Model(&existing).Updates(updates).Error; err != nil {
		return models.NotificationRule{}, err
	}
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.NotificationRule{}, err
	}
	return existing, nil
}

func DeleteNotificationRule(id string) error {
	id = strings.TrimSpace(id)
	return db.DB.Where("id = ?", id).Delete(&models.NotificationRule{}).Error
}
