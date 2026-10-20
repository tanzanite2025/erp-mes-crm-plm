package services

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"sync"
	"testing"
	"time"
	"xdfc-server/authz"
	"xdfc-server/models"
)

func createSystemNotificationInboxReceiptForPostgresTest(t *testing.T, database *gorm.DB, recipientID, eventKey string) models.SystemNotificationInboxEntry {
	t.Helper()
	var receipt models.SystemNotificationInboxEntry
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		var err error
		receipt, err = CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{RecipientUserID: recipientID, EventKey: eventKey, PurposeKey: "test-notice", SourceCode: "QUALITY_STANDARD", BusinessTargetID: "standard-1", Title: "原始标题", Content: "生成时的正文"})
		return err
	}))
	return receipt
}

func TestSystemNotificationInboxPostgresConcurrentBusinessDeduplicationPreservesReadStateAndSnapshot(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	results := make(chan models.SystemNotificationInboxEntry, 6)
	failures := make(chan error, 6)
	var group sync.WaitGroup
	for range 6 {
		group.Go(func() {
			var receipt models.SystemNotificationInboxEntry
			err := fixture.database.Transaction(func(tx *gorm.DB) error {
				var err error
				receipt, err = CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{RecipientUserID: fixture.reviewer.ID, EventKey: "same-event", PurposeKey: "test-notice", SourceCode: "QUALITY_STANDARD", Title: "原始标题"})
				return err
			})
			failures <- err
			results <- receipt
		})
	}
	group.Wait()
	close(results)
	close(failures)
	for err := range failures {
		require.NoError(t, err)
	}
	receipt := <-results
	for duplicate := range results {
		require.Equal(t, receipt.ID, duplicate.ID)
	}
	var count int64
	require.NoError(t, fixture.database.Model(&models.WorkflowNotificationOutboxEntry{}).Count(&count).Error)
	require.EqualValues(t, 1, count)
	require.NoError(t, UpdateSystemNotificationInboxAccountState(context.Background(), fixture.database, fixture.reviewer.ID, []string{authz.MenuQuality}, []string{receipt.ID}, "read"))
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		duplicate, err := CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{RecipientUserID: fixture.reviewer.ID, EventKey: "same-event", PurposeKey: "test-notice", SourceCode: "QUALITY_STANDARD", Title: "不应覆盖历史正文"})
		require.Equal(t, receipt.ID, duplicate.ID)
		require.NotNil(t, duplicate.ReadAt)
		require.Equal(t, "原始标题", duplicate.Title)
		return err
	}))
	require.NoError(t, fixture.database.Model(&models.WorkflowNotificationOutboxEntry{}).Count(&count).Error)
	require.EqualValues(t, 2, count, "replayed business event does not enqueue another notification")
}

func TestSystemNotificationInboxPostgresDeviceStateAccountIsolationPermissionsAndExactBulkScope(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	first := createSystemNotificationInboxReceiptForPostgresTest(t, fixture.database, fixture.reviewer.ID, "first")
	second := createSystemNotificationInboxReceiptForPostgresTest(t, fixture.database, fixture.reviewer.ID, "second")
	foreign := createSystemNotificationInboxReceiptForPostgresTest(t, fixture.database, fixture.requester.ID, "foreign")
	query := SystemNotificationInboxListQuery{RecipientUserID: fixture.reviewer.ID, PermissionIDs: []string{authz.MenuQuality}, Scope: "active", Limit: 1}
	deviceA, err := ListSystemNotificationInboxForAccount(context.Background(), fixture.database, query)
	require.NoError(t, err)
	require.Len(t, deviceA.Items, 1)
	require.EqualValues(t, 2, deviceA.UnreadCount)
	require.NotEmpty(t, deviceA.NextCursor)
	query.Cursor = deviceA.NextCursor
	nextPage, err := ListSystemNotificationInboxForAccount(context.Background(), fixture.database, query)
	require.NoError(t, err)
	require.Len(t, nextPage.Items, 1)
	require.NotEqual(t, deviceA.Items[0].ID, nextPage.Items[0].ID)
	require.Empty(t, nextPage.NextCursor)
	err = UpdateSystemNotificationInboxAccountState(context.Background(), fixture.database, fixture.reviewer.ID, query.PermissionIDs, []string{first.ID, foreign.ID}, "read")
	require.ErrorIs(t, err, ErrSystemNotificationInboxEntryNotFound)
	require.NoError(t, fixture.database.First(&first, "id = ?", first.ID).Error)
	require.Nil(t, first.ReadAt, "foreign ID rejects the whole batch")
	third := createSystemNotificationInboxReceiptForPostgresTest(t, fixture.database, fixture.reviewer.ID, "arrived-after-selection")
	require.NoError(t, UpdateSystemNotificationInboxAccountState(context.Background(), fixture.database, fixture.reviewer.ID, query.PermissionIDs, []string{first.ID, second.ID}, "read"))
	query.Cursor = ""
	query.Limit = 100
	deviceB, err := ListSystemNotificationInboxForAccount(context.Background(), fixture.database, query)
	require.NoError(t, err)
	require.EqualValues(t, 1, deviceB.UnreadCount)
	require.NoError(t, fixture.database.First(&third, "id = ?", third.ID).Error)
	require.Nil(t, third.ReadAt, "a new message outside the selection remains unread")
	require.NoError(t, UpdateSystemNotificationInboxAccountState(context.Background(), fixture.database, fixture.reviewer.ID, query.PermissionIDs, []string{third.ID}, "archive"))
	require.NoError(t, fixture.database.First(&third, "id = ?", third.ID).Error)
	require.Nil(t, third.ReadAt, "archiving does not claim the employee read the message")
	query.Scope = "history"
	history, err := ListSystemNotificationInboxForAccount(context.Background(), fixture.database, query)
	require.NoError(t, err)
	require.Len(t, history.Items, 1)
	require.Equal(t, third.ID, history.Items[0].ID)
	require.Zero(t, history.UnreadCount)
	query.PermissionIDs = nil
	revoked, err := ListSystemNotificationInboxForAccount(context.Background(), fixture.database, query)
	require.NoError(t, err)
	require.Empty(t, revoked.Items)
	require.Zero(t, revoked.UnreadCount)
	require.ErrorIs(t, UpdateSystemNotificationInboxAccountState(context.Background(), fixture.database, fixture.reviewer.ID, nil, []string{first.ID}, "archive"), ErrSystemNotificationInboxEntryNotFound)
	query.Cursor = "invalid-cursor"
	_, err = ListSystemNotificationInboxForAccount(context.Background(), fixture.database, query)
	require.ErrorIs(t, err, ErrSystemNotificationInboxInputInvalid)
	require.NoError(t, fixture.database.Model(&fixture.reviewer).Update("status", "disabled").Error)
	query.Cursor = ""
	query.PermissionIDs = []string{authz.MenuQuality}
	query.Scope = "active"
	disabled, err := ListSystemNotificationInboxForAccount(context.Background(), fixture.database, query)
	require.NoError(t, err)
	require.Empty(t, disabled.Items)
}

func TestSystemNotificationInboxPostgresBusinessRollbackAndOfflineResolutionAreDurableAndScoped(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	require.Error(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		_, err := CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{RecipientUserID: fixture.reviewer.ID, EventKey: "rolled-back", PurposeKey: "test", SourceCode: "APPROVAL"})
		require.NoError(t, err)
		return errors.New("rollback business transaction")
	}))
	var count int64
	for _, model := range []any{&models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{}} {
		require.NoError(t, fixture.database.Model(model).Count(&count).Error)
		require.Zero(t, count)
	}
	firstRequestID, secondRequestID := uuid.NewString(), uuid.NewString()
	var first, second models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		var err error
		first, err = CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{RecipientUserID: fixture.reviewer.ID, EventKey: firstRequestID, PurposeKey: "approval-node", SourceCode: "QUALITY_STANDARD", BusinessTargetID: "standard-1", ApprovalRequestID: firstRequestID, RequiresAction: true})
		if err != nil {
			return err
		}
		second, err = CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{RecipientUserID: fixture.reviewer.ID, EventKey: secondRequestID, PurposeKey: "approval-node", SourceCode: "QUALITY_STANDARD", BusinessTargetID: "standard-1", ApprovalRequestID: secondRequestID, RequiresAction: true})
		return err
	}))
	require.Nil(t, first.ExpiresAt)
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		return ResolveSystemNotificationInboxEntriesWithinTransaction(tx, SystemNotificationInboxResolutionFilter{SourceCode: "QUALITY_STANDARD", ApprovalRequestID: firstRequestID})
	}))
	require.NoError(t, fixture.database.First(&first, "id = ?", first.ID).Error)
	require.NoError(t, fixture.database.First(&second, "id = ?", second.ID).Error)
	require.NotNil(t, first.ResolvedAt)
	require.Nil(t, first.ReadAt)
	require.Nil(t, second.ResolvedAt)
	var canceled models.WorkflowNotificationOutboxEntry
	require.NoError(t, fixture.database.Where("inbox_entry_id = ?", first.ID).First(&canceled).Error)
	require.NotNil(t, canceled.CanceledAt)
	require.ErrorIs(t, RetryOriginalSystemNotificationDeliveryQueueTask(context.Background(), fixture.database, canceled.ID), ErrRuleExecutionLogNotRetryable)
	page, err := ListSystemNotificationInboxForAccount(context.Background(), fixture.database, SystemNotificationInboxListQuery{RecipientUserID: fixture.reviewer.ID, PermissionIDs: []string{authz.MenuQuality}, Scope: "active", Limit: 30})
	require.NoError(t, err)
	require.Len(t, page.Items, 1)
	require.Equal(t, second.ID, page.Items[0].ID)
}

func TestSystemNotificationInboxPostgresMultipleWorkersOnlyPublishCommittedRefreshHints(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	for index := range 8 {
		createSystemNotificationInboxReceiptForPostgresTest(t, fixture.database, fixture.reviewer.ID, string(rune('a'+index)))
	}
	previousPublisher := currentNotificationPublisher
	var published sync.Map
	currentNotificationPublisher = func(_ context.Context, _ string, payload string) error {
		var message map[string]any
		if err := json.Unmarshal([]byte(payload), &message); err != nil {
			return err
		}
		if message["module"] != "NotificationInbox" || message["title"] != nil {
			return errors.New("unexpected message content")
		}
		if _, duplicate := published.LoadOrStore(message["id"], true); duplicate {
			return errors.New("concurrent duplicate claim")
		}
		return nil
	}
	t.Cleanup(func() { currentNotificationPublisher = previousPublisher })
	var group sync.WaitGroup
	failures := make(chan error, 3)
	for range 3 {
		group.Go(func() {
			_, err := DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, time.Now().UTC().Add(time.Second), 20)
			failures <- err
		})
	}
	group.Wait()
	close(failures)
	for err := range failures {
		require.NoError(t, err)
	}
	count := 0
	published.Range(func(any, any) bool { count++; return true })
	require.Equal(t, 8, count)
	var remaining int64
	require.NoError(t, fixture.database.Model(&models.WorkflowNotificationOutboxEntry{}).Where("delivered_at IS NULL").Count(&remaining).Error)
	require.Zero(t, remaining)
}

func TestSystemNotificationInboxPostgresRetentionKeepsActiveApprovalAndUnresolvedCriticalAlerts(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	old := createSystemNotificationInboxReceiptForPostgresTest(t, fixture.database, fixture.reviewer.ID, "old-notice")
	now := time.Now().UTC()
	longAgo := now.AddDate(0, 0, -200)
	require.NoError(t, fixture.database.Model(&old).Updates(map[string]any{"archived_at": longAgo, "expires_at": longAgo}).Error)
	require.NoError(t, fixture.database.Model(&models.WorkflowNotificationOutboxEntry{}).Where("inbox_entry_id = ?", old.ID).Update("delivered_at", longAgo).Error)
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		for _, purpose := range []string{"approval", "critical"} {
			_, err := CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{RecipientUserID: fixture.reviewer.ID, EventKey: "still-open", PurposeKey: purpose, SourceCode: "APPROVAL", RequiresAction: purpose == "approval", Priority: "critical"})
			if err != nil {
				return err
			}
		}
		return nil
	}))
	require.NoError(t, PurgeRetainedSystemNotificationDeliveryAndInboxRecords(context.Background(), fixture.database, now))
	var receipts []models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Find(&receipts).Error)
	require.Len(t, receipts, 2)
	for _, receipt := range receipts {
		require.NotEqual(t, old.ID, receipt.ID)
		require.Nil(t, receipt.ExpiresAt)
	}
}

func TestSystemAlertNotificationInboxPostgresFreezesRecipientsAndIgnoresLateFiringAfterResolution(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	require.NoError(t, fixture.database.AutoMigrate(&models.SystemAlertNotificationOccurrence{}, &models.UserPermission{}))
	require.NoError(t, fixture.database.Create(&models.UserPermission{UserID: fixture.reviewer.ID, PermissionID: authz.PermissionManage}).Error)
	event := SystemAlertNotificationEvent{Fingerprint: "redis-test-only", Status: "firing", Severity: "critical", Name: "RedisDown", Description: "隔离测试告警", StartsAt: time.Now().UTC()}
	persistAlertAndAssertActiveState := func(expectedActive bool) {
		result, err := PersistSystemAlertNotificationInboxEvent(context.Background(), fixture.database, event)
		require.NoError(t, err)
		require.Equal(t, expectedActive, result.Active)
	}
	persistAlertAndAssertActiveState(event.Status == "firing")
	require.NoError(t, fixture.database.Create(&models.UserPermission{UserID: fixture.secondReviewer.ID, PermissionID: authz.PermissionManage}).Error)
	persistAlertAndAssertActiveState(event.Status == "firing")
	var receipts []models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Find(&receipts).Error)
	require.Len(t, receipts, 1)
	require.Equal(t, fixture.reviewer.ID, receipts[0].RecipientUserID)
	require.Nil(t, receipts[0].ExpiresAt)
	event.Status = "resolved"
	persistAlertAndAssertActiveState(event.Status == "firing")
	event.Status = "firing"
	persistAlertAndAssertActiveState(false)
	var original models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.First(&original, "id = ?", receipts[0].ID).Error)
	require.NotNil(t, original.ResolvedAt)
	event.StartsAt = event.StartsAt.Add(time.Minute)
	persistAlertAndAssertActiveState(event.Status == "firing")
	require.NoError(t, fixture.database.Find(&receipts).Error)
	require.Len(t, receipts, 3, "a new occurrence freezes its own currently authorized recipients")
	event.StartsAt = event.StartsAt.Add(time.Minute)
	event.Status = "resolved"
	persistAlertAndAssertActiveState(event.Status == "firing")
	event.Status = "firing"
	persistAlertAndAssertActiveState(false)
	require.NoError(t, fixture.database.Find(&receipts).Error)
	require.Len(t, receipts, 3, "resolution arriving before firing must also prevent resurrection")
}

func TestBusinessNotificationInboxPostgresRequiresStableEventKeyAndRoutesDraftManufacturingBOMWithoutPublishing(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	require.ErrorContains(t, DispatchBusinessStatusChangedTx(fixture.database, BusinessStatusChangedEvent{
		Entity: "BOM", SourceCode: "BOM_MANUFACTURING", TargetID: uuid.NewString(), NextStatus: "DRAFT",
	}), "稳定业务事件键")
	source := models.BusinessEventSource{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "BOM_MANUFACTURING", Name: "隔离 MBOM 事件源", Entity: "BOM", Module: "Manufacturing", Enabled: true, Config: json.RawMessage(`{}`)}
	command := models.StandardCommand{BaseModel: models.BaseModel{ID: uuid.NewString()}, Title: "[BomNo] [Status]", Content: "由 [SourceEbomNo] 派生", SourceCode: source.Code, ActionCode: "CREATED_FROM_EBOM"}
	require.NoError(t, fixture.database.Create(&source).Error)
	require.NoError(t, fixture.database.Create(&command).Error)
	rule := models.NotificationRule{BaseModel: models.BaseModel{ID: uuid.NewString()}, Name: "隔离 MBOM 派生通知", Enabled: true, Entity: "BOM", SourceCode: source.Code, ActionCode: command.ActionCode, Version: 1,
		Segments: mustJSONRawMessage([]RuleSegmentDTO{{ID: "draft-derived", Title: "派生草稿", TargetStatuses: []string{"DRAFT"}, CommandIDs: []string{command.ID}, AssigneeUsernames: []string{fixture.reviewer.Username}}})}
	require.NoError(t, fixture.database.Create(&rule).Error)
	previousPublisher := currentNotificationPublisher
	publications := 0
	currentNotificationPublisher = func(context.Context, string, string) error {
		publications++
		return errors.New("must not publish within a business transaction")
	}
	t.Cleanup(func() { currentNotificationPublisher = previousPublisher })
	bom := models.BOM{BaseModel: models.BaseModel{ID: uuid.NewString()}, BOMType: models.BOMTypeMBOM, BOMNo: "ISOLATED-MBOM", Status: models.BOMStatusDraft, Version: 1}
	for range 2 {
		require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
			return dispatchBOMLifecycleNotificationsWithinTransaction(fixture.requestContext, tx, bom, "", "CREATED_FROM_EBOM", "", map[string]any{"sourceEbomNo": "ISOLATED-EBOM"})
		}))
	}
	var receipts []models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Find(&receipts).Error)
	require.Len(t, receipts, 1)
	require.Equal(t, "ISOLATED-MBOM DRAFT", receipts[0].Title)
	require.Equal(t, "由 ISOLATED-EBOM 派生", receipts[0].Content)
	require.Equal(t, fixture.reviewer.ID, receipts[0].RecipientUserID)
	var queued int64
	require.NoError(t, fixture.database.Model(&models.WorkflowNotificationOutboxEntry{}).Count(&queued).Error)
	require.EqualValues(t, 1, queued)
	require.Zero(t, publications)
	require.NoError(t, fixture.database.Model(&source).Update("enabled", false).Error)
	bom.ID = uuid.NewString()
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		return dispatchBOMLifecycleNotificationsWithinTransaction(fixture.requestContext, tx, bom, "", "CREATED_FROM_EBOM", "", nil)
	}))
	require.NoError(t, fixture.database.Find(&receipts).Error)
	require.Len(t, receipts, 1, "disabled source cannot generate receipts")
}
