package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"strings"
	"time"
	"xdfc-server/authz"
	"xdfc-server/models"
	"xdfc-server/services/access"
)

type SystemAlertNotificationEvent struct {
	Fingerprint, Status, Severity, Name, Description string
	StartsAt                                         time.Time
}

type SystemAlertNotificationInboxEventResult struct {
	Active bool
}

func PersistSystemAlertNotificationInboxEvent(ctx context.Context, database *gorm.DB, event SystemAlertNotificationEvent) (SystemAlertNotificationInboxEventResult, error) {
	result := SystemAlertNotificationInboxEventResult{}
	if strings.TrimSpace(event.Fingerprint) == "" || event.StartsAt.IsZero() {
		return result, domainValidationError("系统告警必须包含指纹和本轮开始时间")
	}
	if !strings.EqualFold(event.Status, "firing") && !strings.EqualFold(event.Status, "resolved") {
		return result, domainValidationError("系统告警状态必须是 firing 或 resolved")
	}
	digest := sha256.Sum256([]byte(event.Fingerprint + ":" + event.StartsAt.UTC().Format(time.RFC3339Nano)))
	occurrenceID := hex.EncodeToString(digest[:])
	err := database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		occurrence := models.SystemAlertNotificationOccurrence{ID: occurrenceID}
		creation := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&occurrence)
		if creation.Error != nil {
			return creation.Error
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&occurrence, "id = ?", occurrenceID).Error; err != nil {
			return err
		}
		if strings.EqualFold(event.Status, "resolved") {
			now := time.Now().UTC()
			if occurrence.ResolvedAt == nil {
				if err := tx.Model(&occurrence).Update("resolved_at", now).Error; err != nil {
					return err
				}
			}
			return ResolveSystemNotificationInboxEntriesWithinTransaction(tx, SystemNotificationInboxResolutionFilter{SourceCode: "SYSTEM_ALERT", BusinessTargetID: occurrenceID})
		}
		if occurrence.ResolvedAt != nil {
			return nil
		}
		result.Active = true
		// Freeze recipients on the first committed occurrence. A repeated webhook
		// must not turn newly authorized accounts into historical recipients.
		if creation.RowsAffected == 0 {
			return nil
		}
		var accounts []models.User
		if err := tx.Where("status = ?", "active").Order("id").Find(&accounts).Error; err != nil {
			return err
		}
		identityAccess := access.NewIdentityAccessServiceWithDB(tx)
		priority := strings.ToLower(event.Severity)
		if priority != "critical" && priority != "error" && priority != "warning" {
			priority = "info"
		}
		for _, account := range accounts {
			snapshot, err := identityAccess.ResolveSnapshotForUser(account)
			if err != nil {
				return err
			}
			if !stringListContains(snapshot.Permissions, authz.PermissionManage) {
				continue
			}
			if _, err := CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{
				RecipientUserID: account.ID, EventKey: "SYSTEM_ALERT:" + occurrenceID, PurposeKey: "system-alert-occurrence", SourceCode: "SYSTEM_ALERT", BusinessTargetID: occurrenceID,
				Title: "系统告警：" + event.Name, Content: event.Description, Priority: priority, RequiresAction: true, ActionURL: "/system-management",
				Metadata: map[string]any{"fingerprint": event.Fingerprint, "startsAt": event.StartsAt, "severity": event.Severity},
			}); err != nil {
				return err
			}
		}
		return nil
	})
	return result, err
}
