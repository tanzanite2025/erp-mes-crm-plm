package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// LockBusinessEventNotificationSourceWithinTransaction also locks disabled sources.
// Source -> inbox ordering is shared with the status-code rename transaction.
func LockBusinessEventNotificationSourceWithinTransaction(tx *gorm.DB, sourceCode string) (bool, error) {
	if !tx.Migrator().HasTable(&models.BusinessEventSource{}) {
		return false, nil
	}
	var source models.BusinessEventSource
	if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).Where("code = ?", sourceCode).First(&source).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}
	return source.Enabled, nil
}

// ResolveBusinessRuleNotificationInboxEntriesForStatusWithinTransaction uses the
// original receipt policy, so later rule edits, disables or deletions cannot strand it.
func ResolveBusinessRuleNotificationInboxEntriesForStatusWithinTransaction(tx *gorm.DB, sourceCode, entity, targetID, statusCode string) error {
	if tx == nil || strings.TrimSpace(sourceCode) == "" || strings.TrimSpace(entity) == "" || strings.TrimSpace(targetID) == "" || strings.TrimSpace(statusCode) == "" {
		return ErrSystemNotificationInboxInputInvalid
	}
	if !tx.Migrator().HasTable(&models.SystemNotificationInboxEntry{}) {
		return nil
	}
	var entries []models.SystemNotificationInboxEntry
	if err := tx.Select("id", "resolve_on_status_codes").Where("source_code = ? AND business_resolution_entity = ? AND business_target_id = ? AND resolved_at IS NULL", sourceCode, entity, targetID).Order("id").Find(&entries).Error; err != nil {
		return err
	}
	ids := make([]string, 0, len(entries))
	for _, entry := range entries {
		var statuses []string
		if err := json.Unmarshal(entry.ResolveOnStatusCodes, &statuses); err != nil {
			return fmt.Errorf("notification %s has invalid business resolution status codes: %w", entry.ID, err)
		}
		if stringListContains(statuses, statusCode) {
			ids = append(ids, entry.ID)
		}
	}
	if len(ids) == 0 {
		return nil
	}
	return ResolveSystemNotificationInboxEntriesWithinTransaction(tx, SystemNotificationInboxResolutionFilter{SourceCode: sourceCode, BusinessTargetID: targetID, InboxEntryIDs: ids})
}

// MigratePendingBusinessRuleNotificationInboxResolutionStatusCodesWithinTransaction
// changes only semantic status references, never the displayed message or account state.
func MigratePendingBusinessRuleNotificationInboxResolutionStatusCodesWithinTransaction(tx *gorm.DB, sourceCode string, renames map[string]string) error {
	if !tx.Migrator().HasTable(&models.SystemNotificationInboxEntry{}) {
		return nil
	}
	var entries []models.SystemNotificationInboxEntry
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("source_code = ? AND business_resolution_entity <> ? AND resolved_at IS NULL", sourceCode, "").Order("id").Find(&entries).Error; err != nil {
		return err
	}
	for _, entry := range entries {
		var previous []string
		if err := json.Unmarshal(entry.ResolveOnStatusCodes, &previous); err != nil {
			return err
		}
		next := replaceBusinessEventStatusCodes(previous, renames)
		if equalStringSlices(previous, next) {
			continue
		}
		encoded, err := json.Marshal(next)
		if err != nil {
			return err
		}
		if err := tx.Model(&entry).Updates(map[string]any{"resolve_on_status_codes": json.RawMessage(encoded), "updated_at": time.Now().UTC()}).Error; err != nil {
			return err
		}
	}
	return nil
}
