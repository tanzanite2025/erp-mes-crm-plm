package services

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"xdfc-server/models"
)

// Every recipient has one receipt and one delivery log; publishing is deferred
// until the business transaction commits.
func createBusinessRuleNotificationInboxEntriesWithinTransaction(tx *gorm.DB, event BusinessStatusChangedEvent, rule models.NotificationRule, segment RuleSegmentDTO, command models.StandardCommand, identifiers []string, title, content, actionURL string) error {
	recipients, err := ResolveSystemNotificationRecipientAccountIDsWithinTransaction(tx, identifiers)
	if err != nil {
		return err
	}
	if len(recipients) == 0 {
		return writeBusinessStatusRuleExecutionLogTx(tx, event, rule, segment, models.RuleExecutionLog{ExecutionType: "notify", ExecutionStatus: "skipped", CommandID: command.ID, ErrorMessage: "notification target is empty"})
	}
	for _, recipient := range recipients {
		logID := uuid.NewString()
		entry := models.RuleExecutionLog{BaseModel: models.BaseModel{ID: logID}, EventKey: event.EventKey, Entity: event.Entity, SourceCode: event.SourceCode, ActionCode: event.ActionCode, StatusCode: event.NextStatus, RuleID: rule.ID, RuleName: rule.Name, SegmentID: segment.ID, SegmentTitle: segment.Title, CommandID: command.ID, ExecutionType: "notify", ExecutionStatus: "pending", Title: title, Content: content, ActionURL: actionURL, Targets: mustJSONRawMessage([]string{recipient}), Metadata: mustJSONRawMessage(event.Metadata), Result: mustJSONRawMessage(map[string]string{"delivery": "outbox"}), TriggeredAt: event.TriggeredAt}
		if err := tx.Create(&entry).Error; err != nil {
			return err
		}
		if _, err := CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{RecipientUserID: recipient, EventKey: event.EventKey, PurposeKey: rule.ID + ":" + segment.ID + ":" + command.ID, SourceCode: event.SourceCode, BusinessTargetID: event.TargetID, RuleID: rule.ID, SegmentID: segment.ID, CommandID: command.ID, BusinessResolutionEntity: event.Entity, ResolveOnStatusCodes: segment.ResolveOnStatuses, Title: title, Content: content, ActionURL: actionURL, VisibilityPermission: event.VisibilityPermission, Metadata: event.Metadata, ExecutionLogID: &logID}); err != nil {
			return err
		}
	}
	return nil
}
