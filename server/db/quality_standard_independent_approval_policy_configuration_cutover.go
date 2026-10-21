package db

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SeparateQualityStandardApprovalConfigurationFromNotificationRules is a
// transactional, idempotent cutover, never a runtime fallback. It preserves one
// unambiguous fixed chain and removes embedded approval fields from quality
// listeners. Other business domains are deliberately outside this cutover.
func SeparateQualityStandardApprovalConfigurationFromNotificationRules(database *gorm.DB) error {
	return database.Transaction(func(tx *gorm.DB) error {
		var rules []models.NotificationRule
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("source_code = ?", models.BusinessApprovalTypeQualityStandard).Order("id").Find(&rules).Error; err != nil {
			return err
		}
		type embeddedApprovalConfiguration struct {
			Enabled              bool    `json:"enabled"`
			Module               string  `json:"module"`
			Approver1ID          string  `json:"approver1Id"`
			Approver2ID          string  `json:"approver2Id"`
			DynamicApproverField *string `json:"dynamicApproverField"`
		}
		type notificationRuleUpdate struct {
			rule     models.NotificationRule
			segments json.RawMessage
		}
		var updates []notificationRuleUpdate
		var chains []embeddedApprovalConfiguration
		for _, rule := range rules {
			var segments []map[string]json.RawMessage
			if err := json.Unmarshal(rule.Segments, &segments); err != nil {
				return fmt.Errorf("decode quality notification rule %s: %w", rule.ID, err)
			}
			changed := false
			for _, segment := range segments {
				raw, exists := segment["approval"]
				if !exists {
					continue
				}
				var approval embeddedApprovalConfiguration
				if err := json.Unmarshal(raw, &approval); err != nil {
					return err
				}
				approval.Approver1ID, approval.Approver2ID = strings.TrimSpace(approval.Approver1ID), strings.TrimSpace(approval.Approver2ID)
				if approval.Enabled || approval.Approver1ID != "" || approval.Approver2ID != "" || approval.DynamicApproverField != nil && strings.TrimSpace(*approval.DynamicApproverField) != "" {
					var statuses []string
					if err := json.Unmarshal(segment["targetStatuses"], &statuses); err != nil {
						return err
					}
					if rule.ActionCode != "STATUS_CHANGED" || approval.Module != "Quality" || len(statuses) != 1 || statuses[0] != "PENDING_APPROVAL" {
						return fmt.Errorf("quality approval rule %s does not describe a pending standard review", rule.ID)
					}
					if approval.DynamicApproverField != nil && strings.TrimSpace(*approval.DynamicApproverField) != "" {
						return fmt.Errorf("quality approval rule %s uses a dynamic approver; configure explicit approvers before cutover", rule.ID)
					}
					if approval.Approver1ID == "" {
						return fmt.Errorf("quality approval rule %s has no primary approver", rule.ID)
					}
					if approval.Approver1ID == approval.Approver2ID {
						return fmt.Errorf("quality approval rule %s repeats an approver", rule.ID)
					}
					approval.Enabled = rule.Enabled && approval.Enabled
					chains = append(chains, approval)
				}
				delete(segment, "approval")
				changed = true
			}
			if changed {
				encoded, err := json.Marshal(segments)
				if err != nil {
					return err
				}
				updates = append(updates, notificationRuleUpdate{rule, encoded})
			}
		}
		if len(chains) > 1 {
			return fmt.Errorf("multiple quality approval chains exist; resolve them before independent policy cutover")
		}
		if len(chains) == 1 {
			chain := chains[0]
			policy := models.BusinessApprovalPolicyConfiguration{BaseModel: models.BaseModel{ID: uuid.NewString()}, BusinessType: models.BusinessApprovalTypeQualityStandard,
				Enabled: chain.Enabled, Approver1ID: chain.Approver1ID, Approver2ID: chain.Approver2ID, Version: 1, UpdatedBy: "system:independent-approval-policy-cutover"}
			if err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "business_type"}}, DoNothing: true}).Create(&policy).Error; err != nil {
				return err
			}
			var persisted models.BusinessApprovalPolicyConfiguration
			if err := tx.Where("business_type = ?", models.BusinessApprovalTypeQualityStandard).First(&persisted).Error; err != nil {
				return err
			}
			if persisted.Enabled != chain.Enabled || persisted.Approver1ID != chain.Approver1ID || persisted.Approver2ID != chain.Approver2ID {
				return fmt.Errorf("independent quality approval policy conflicts with an embedded chain; cutover rolled back")
			}
		}
		for _, update := range updates {
			if err := tx.Model(&update.rule).Updates(map[string]any{"segments": update.segments, "version": gorm.Expr("version + 1")}).Error; err != nil {
				return err
			}
			diff, err := json.Marshal(map[string]any{"segments": map[string]any{"o": update.rule.Segments, "n": update.segments}, "approvalBusinessType": models.BusinessApprovalTypeQualityStandard})
			if err != nil {
				return err
			}
			if err := tx.Create(&models.AuditLog{ID: uuid.NewString(), Module: "NotificationRule", TargetID: update.rule.ID,
				Action: "separate_business_approval_configuration", Operator: "system:independent-approval-policy-cutover", Diff: diff, CreatedAt: time.Now().UTC()}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
