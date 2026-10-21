package services

import (
	"context"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func createIsolatedLogisticsNotificationPostgresFixture(t *testing.T) qualityStandardWorkflowPostgresFixture {
	t.Helper()
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	logisticsDatabase := fixture.database.Session(&gorm.Session{})
	logisticsDatabase.Config.IgnoreRelationshipsWhenMigrating = true
	logisticsDatabase.Config.DisableForeignKeyConstraintWhenMigrating = true
	require.NoError(t, logisticsDatabase.AutoMigrate(&models.LogisticsRecord{}))
	source := models.BusinessEventSource{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "LOGISTICS_RECORD", Name: "物流记录", Module: "Trading", Entity: "ORDER", Enabled: true, Config: mustJSONRawMessage(map[string]any{})}
	require.NoError(t, fixture.database.Create(&source).Error)
	command := models.StandardCommand{BaseModel: models.BaseModel{ID: uuid.NewString()}, Title: "[TrackingNo] [Status]", Content: "[OrderNo] [LogisticsType] [LastLocation]"}
	require.NoError(t, fixture.database.Create(&command).Error)
	for _, action := range []string{"CREATED", "STATUS_CHANGED", "EXCEPTION"} {
		rule := models.NotificationRule{BaseModel: models.BaseModel{ID: uuid.NewString()}, Name: "物流" + action, Enabled: true, Entity: "ORDER", SourceCode: "LOGISTICS_RECORD", ActionCode: action, Version: 1,
			Segments: mustJSONRawMessage([]RuleSegmentDTO{{ID: "notice", Title: action, CommandIDs: []string{command.ID}, AssigneeUsernames: []string{fixture.reviewer.ID}, ResolveOnStatuses: []string{"Delivered", "Canceled"}}})}
		require.NoError(t, fixture.database.Create(&rule).Error)
	}
	return fixture
}

func createLogisticsRecordForNotificationPostgresTest(t *testing.T, fixture qualityStandardWorkflowPostgresFixture, recordType string) models.LogisticsRecord {
	t.Helper()
	record, err := SaveLogisticsRecord(fixture.requestContext, models.LogisticsRecord{OrderNo: "ORDER-TEST", Type: recordType, Carrier: "test-carrier", TrackingNo: uuid.NewString(), Status: "Pending"})
	require.NoError(t, err)
	return record
}

func TestLogisticsRecordPostgresNotificationsUseActualStateVersionPermissionsAndDetailsLink(t *testing.T) {
	for _, recordType := range []string{"Receipt", "Shipment"} {
		t.Run(recordType, func(t *testing.T) {
			fixture := createIsolatedLogisticsNotificationPostgresFixture(t)
			record := createLogisticsRecordForNotificationPostgresTest(t, fixture, recordType)
			permission, otherPermission, path := authz.MenuTrading, authz.MenuPurchase, "/shipping-management/logistics"
			if recordType == "Receipt" {
				permission, otherPermission, path = authz.MenuPurchase, authz.MenuTrading, "/purchase/logistics"
			}
			query := SystemNotificationInboxListQuery{RecipientUserID: fixture.reviewer.ID, PermissionIDs: []string{permission}, Scope: "active", Limit: 100}
			inbox, err := ListSystemNotificationInboxForAccount(context.Background(), fixture.database, query)
			require.NoError(t, err)
			require.Len(t, inbox.Items, 1)
			require.Equal(t, path+"?logisticsId="+record.ID, inbox.Items[0].ActionURL)
			require.Equal(t, record.TrackingNo+" Pending", inbox.Items[0].Title)
			query.PermissionIDs = []string{otherPermission}
			hidden, err := ListSystemNotificationInboxForAccount(context.Background(), fixture.database, query)
			require.NoError(t, err)
			require.Empty(t, hidden.Items)
			require.Zero(t, hidden.UnreadCount)
			require.ErrorIs(t, UpdateSystemNotificationInboxAccountState(context.Background(), fixture.database, fixture.reviewer.ID, query.PermissionIDs, []string{inbox.Items[0].ID}, "read"), ErrSystemNotificationInboxEntryNotFound)

			changed, err := UpdateLogisticsStatus(fixture.requestContext, record.ID, UpdateLogisticsStatusInput{Status: "Exception", Location: "测试地点", Version: record.Version, EventsJSON: []byte(`[]`)})
			require.NoError(t, err)
			require.Equal(t, record.Version+1, changed.Version)
			_, err = UpdateLogisticsStatus(fixture.requestContext, record.ID, UpdateLogisticsStatusInput{Status: "Exception", Version: record.Version, EventsJSON: []byte(`[]`)})
			require.ErrorIs(t, err, ErrLogisticsStatusVersionConflict)
			require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
				return dispatchLogisticsRecordLifecycleNotificationsWithinTransaction(fixture.requestContext, tx, changed, "Pending", "STATUS_CHANGED")
			}))
			var entries []models.SystemNotificationInboxEntry
			require.NoError(t, fixture.database.Where("business_target_id = ?", record.ID).Find(&entries).Error)
			require.Len(t, entries, 3, "replayed event and stale version do not create duplicate receipts")
			for _, entry := range entries {
				require.Equal(t, permission, entry.VisibilityPermission)
				require.NotContains(t, entry.Content, "[")
			}
			// Staying in Exception can update the timeline, but is not a new exception occurrence.
			changed, err = UpdateLogisticsStatus(fixture.requestContext, record.ID, UpdateLogisticsStatusInput{Status: "Exception", Version: changed.Version, EventsJSON: []byte(`[]`)})
			require.NoError(t, err)
			var count int64
			require.NoError(t, fixture.database.Model(&models.SystemNotificationInboxEntry{}).Count(&count).Error)
			require.EqualValues(t, 3, count)
			_, err = UpdateLogisticsStatus(fixture.requestContext, record.ID, UpdateLogisticsStatusInput{Status: "Delivered", Version: changed.Version, EventsJSON: []byte(`[]`)})
			require.NoError(t, err)
			require.NoError(t, fixture.database.Where("business_target_id = ?", record.ID).Find(&entries).Error)
			resolved := 0
			for _, entry := range entries {
				if entry.ResolvedAt != nil {
					resolved++
					require.Nil(t, entry.ReadAt)
				}
			}
			require.Equal(t, 3, resolved, "Delivered also resolves notices from the EXCEPTION action")
		})
	}
}

func TestLogisticsRecordPostgresNotificationFailureRollsBackBusinessAndAudit(t *testing.T) {
	fixture := createIsolatedLogisticsNotificationPostgresFixture(t)
	require.NoError(t, fixture.database.Exec(`CREATE FUNCTION reject_logistics_notification() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced logistics receipt failure'; END; $$ LANGUAGE plpgsql`).Error)
	require.NoError(t, fixture.database.Exec(`CREATE TRIGGER reject_logistics_notification BEFORE INSERT ON system_notification_inbox_entries FOR EACH ROW EXECUTE FUNCTION reject_logistics_notification()`).Error)
	_, err := SaveLogisticsRecord(fixture.requestContext, models.LogisticsRecord{Type: "Shipment", Carrier: "test", TrackingNo: uuid.NewString(), Status: "Pending"})
	require.ErrorContains(t, err, "forced logistics receipt failure")
	for _, model := range []any{&models.LogisticsRecord{}, &models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{}, &models.RuleExecutionLog{}, &models.AuditLog{}} {
		var count int64
		require.NoError(t, fixture.database.Model(model).Count(&count).Error)
		require.Zero(t, count)
	}
	require.NoError(t, fixture.database.Exec(`DROP TRIGGER reject_logistics_notification ON system_notification_inbox_entries`).Error)
	record := createLogisticsRecordForNotificationPostgresTest(t, fixture, "Receipt")
	require.NoError(t, fixture.database.Exec(`CREATE TRIGGER reject_logistics_notification BEFORE INSERT ON system_notification_inbox_entries FOR EACH ROW EXECUTE FUNCTION reject_logistics_notification()`).Error)
	_, err = UpdateLogisticsStatus(fixture.requestContext, record.ID, UpdateLogisticsStatusInput{Status: "Exception", Version: record.Version, EventsJSON: []byte(`[]`)})
	require.ErrorContains(t, err, "forced logistics receipt failure")
	var unchanged models.LogisticsRecord
	require.NoError(t, fixture.database.First(&unchanged, "id = ?", record.ID).Error)
	require.Equal(t, record.Version, unchanged.Version)
	require.Equal(t, "Pending", unchanged.Status)
	for _, model := range []any{&models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{}, &models.AuditLog{}} {
		var count int64
		require.NoError(t, fixture.database.Model(model).Count(&count).Error)
		require.EqualValues(t, 1, count, "the failed status operation leaves only the original creation")
	}
}

func TestLogisticsRecordPostgresDeleteResolvesOnlyItsOwnMessagesAndCannotBeRevived(t *testing.T) {
	fixture := createIsolatedLogisticsNotificationPostgresFixture(t)
	first := createLogisticsRecordForNotificationPostgresTest(t, fixture, "Receipt")
	second := createLogisticsRecordForNotificationPostgresTest(t, fixture, "Receipt")
	require.NoError(t, fixture.database.Exec(`CREATE FUNCTION reject_logistics_delete_audit() RETURNS trigger AS $$ BEGIN IF NEW.action = 'DELETE' THEN RAISE EXCEPTION 'forced logistics deletion failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`).Error)
	require.NoError(t, fixture.database.Exec(`CREATE TRIGGER reject_logistics_delete_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_logistics_delete_audit()`).Error)
	require.ErrorContains(t, DeleteLogisticsRecord(fixture.requestContext, first.ID), "forced logistics deletion failure")
	var active models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Where("business_target_id = ?", first.ID).First(&active).Error)
	require.Nil(t, active.ResolvedAt)
	var originalTask models.WorkflowNotificationOutboxEntry
	require.NoError(t, fixture.database.Where("inbox_entry_id = ?", active.ID).First(&originalTask).Error)
	require.Nil(t, originalTask.CanceledAt)
	require.NoError(t, fixture.database.Exec(`DROP TRIGGER reject_logistics_delete_audit ON audit_logs`).Error)
	require.NoError(t, DeleteLogisticsRecord(fixture.requestContext, first.ID))
	require.NoError(t, DeleteLogisticsRecord(fixture.requestContext, first.ID))
	var entries []models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Find(&entries).Error)
	require.Len(t, entries, 2, "deletion is not a fictional Canceled event")
	for _, entry := range entries {
		if entry.BusinessTargetID == first.ID {
			require.NotNil(t, entry.ResolvedAt)
			var queue models.WorkflowNotificationOutboxEntry
			require.NoError(t, fixture.database.Where("inbox_entry_id = ?", entry.ID).First(&queue).Error)
			require.NotNil(t, queue.CanceledAt)
		} else {
			require.Equal(t, second.ID, entry.BusinessTargetID)
			require.Nil(t, entry.ResolvedAt)
		}
	}
	_, err := UpdateLogisticsStatus(fixture.requestContext, first.ID, UpdateLogisticsStatusInput{Status: "InTransit", Version: first.Version + 1})
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
	_, err = PatchLogisticsRecordDetails(fixture.requestContext, first.ID, first.Version+1, map[string]string{"carrier": "revive"})
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
	var deleted models.LogisticsRecord
	require.NoError(t, fixture.database.First(&deleted, "id = ?", first.ID).Error)
	require.Equal(t, first.Version+1, deleted.Version)
}

func TestLogisticsRecordPostgresDisabledSourceDoesNotFabricateNotifications(t *testing.T) {
	fixture := createIsolatedLogisticsNotificationPostgresFixture(t)
	require.NoError(t, fixture.database.Model(&models.BusinessEventSource{}).Where("code = ?", "LOGISTICS_RECORD").Update("enabled", false).Error)
	createLogisticsRecordForNotificationPostgresTest(t, fixture, "Shipment")
	var count int64
	require.NoError(t, fixture.database.Model(&models.SystemNotificationInboxEntry{}).Count(&count).Error)
	require.Zero(t, count)
}

func TestLogisticsRecordPostgresDetailsPatchPreservesStatusAndProducesMonotonicVersions(t *testing.T) {
	fixture := createIsolatedLogisticsNotificationPostgresFixture(t)
	record := createLogisticsRecordForNotificationPostgresTest(t, fixture, "Shipment")
	patched, err := PatchLogisticsRecordDetails(fixture.requestContext, record.ID, record.Version, map[string]string{"lastLocation": "", "carrier": "new-carrier"})
	require.NoError(t, err)
	require.Equal(t, record.Version+1, patched.Version)
	require.Equal(t, record.Status, patched.Status)
	require.Equal(t, "new-carrier", patched.Carrier)
	_, err = PatchLogisticsRecordDetails(fixture.requestContext, record.ID, record.Version, map[string]string{"carrier": "stale"})
	require.ErrorIs(t, err, ErrLogisticsStatusVersionConflict)
	_, err = PatchLogisticsRecordDetails(fixture.requestContext, record.ID, patched.Version, map[string]string{"status": "Delivered"})
	require.ErrorContains(t, err, "不支持的物流编辑字段")
	patched.Status = "InTransit"
	updated, err := SaveLogisticsRecord(fixture.requestContext, patched)
	require.NoError(t, err)
	require.Equal(t, patched.Version+1, updated.Version)
	var count int64
	require.NoError(t, fixture.database.Model(&models.SystemNotificationInboxEntry{}).Count(&count).Error)
	require.EqualValues(t, 2, count, "details edit does not fabricate a status notification")
	updated.Type = "Receipt"
	_, err = SaveLogisticsRecord(fixture.requestContext, updated)
	require.ErrorContains(t, err, "类型不可变更")
}
