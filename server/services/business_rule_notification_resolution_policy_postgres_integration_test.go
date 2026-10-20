package services

import (
	"context"
	"encoding/json"
	"testing"
	"time"
	"xdfc-server/authz"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type businessRuleResolutionLifecyclePostgresTestScenario struct {
	fixture          qualityStandardWorkflowPostgresFixture
	rule             models.NotificationRule
	sourceCode       string
	entity           string
	permission       string
	activeStatus     string
	resolvedStatus   string
	targetID         string
	logisticsRecord  models.LogisticsRecord
	completeBusiness func() error
}

func createBusinessRuleResolutionLifecyclePostgresTestScenario(t *testing.T, domain string) businessRuleResolutionLifecyclePostgresTestScenario {
	t.Helper()
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	scenario := businessRuleResolutionLifecyclePostgresTestScenario{fixture: fixture}
	switch domain {
	case "logistics":
		logisticsDatabase := fixture.database.Session(&gorm.Session{})
		logisticsDatabase.Config.IgnoreRelationshipsWhenMigrating = true
		logisticsDatabase.Config.DisableForeignKeyConstraintWhenMigrating = true
		require.NoError(t, logisticsDatabase.AutoMigrate(&models.LogisticsRecord{}))
		scenario.sourceCode, scenario.entity, scenario.permission = "LOGISTICS_RECORD", "ORDER", authz.MenuTrading
		scenario.activeStatus, scenario.resolvedStatus = "Exception", "Delivered"
		require.NoError(t, fixture.database.Create(&models.BusinessEventSource{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: scenario.sourceCode, Name: "Isolated logistics", Module: "Trading", Entity: scenario.entity, Enabled: true, Config: json.RawMessage(`{}`)}).Error)
	case "quality":
		scenario.sourceCode, scenario.entity, scenario.permission = "QUALITY_STANDARD", "QUALITY", authz.MenuQuality
		scenario.activeStatus, scenario.resolvedStatus = "PUBLISHED", "ARCHIVED"
	case "sales":
		scenario.sourceCode, scenario.entity, scenario.permission = "SALES_ORDER", "ORDER", authz.MenuTrading
		scenario.activeStatus, scenario.resolvedStatus = "Pending", "Done"
	default:
		t.Fatalf("unsupported test domain %s", domain)
	}
	command := models.StandardCommand{BaseModel: models.BaseModel{ID: uuid.NewString()}, SourceCode: scenario.sourceCode, ActionCode: "STATUS_CHANGED", Title: "原始通知", Content: "生成时的正文"}
	require.NoError(t, fixture.database.Create(&command).Error)
	action := "STATUS_CHANGED"
	if domain == "logistics" {
		action = "EXCEPTION"
	}
	segment := RuleSegmentDTO{ID: "original-segment", Title: "Original segment", TargetStatuses: []string{scenario.activeStatus}, ResolveOnStatuses: []string{scenario.resolvedStatus}, CommandIDs: []string{command.ID}, AssigneeUsernames: []string{fixture.reviewer.ID}}
	scenario.rule = models.NotificationRule{BaseModel: models.BaseModel{ID: uuid.NewString()}, Name: "Original rule", Enabled: true, Entity: scenario.entity, SourceCode: scenario.sourceCode, ActionCode: action, Version: 1, Segments: mustJSONRawMessage([]RuleSegmentDTO{segment})}
	require.NoError(t, fixture.database.Create(&scenario.rule).Error)
	switch domain {
	case "logistics":
		record := createLogisticsRecordForNotificationPostgresTest(t, fixture, "Shipment")
		record, err := UpdateLogisticsStatus(fixture.requestContext, record.ID, UpdateLogisticsStatusInput{Status: scenario.activeStatus, Version: record.Version})
		require.NoError(t, err)
		scenario.logisticsRecord, scenario.targetID = record, record.ID
		scenario.completeBusiness = func() error {
			_, err := UpdateLogisticsStatus(fixture.requestContext, record.ID, UpdateLogisticsStatusInput{Status: scenario.resolvedStatus, Version: record.Version})
			return err
		}
	case "quality":
		// This isolated fixture represents an already published standard; only archival is exercised.
		standard := models.InspectionStandard{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "ISOLATED-" + uuid.NewString(), Name: "Isolated published standard", Type: "FQC", Status: scenario.activeStatus, Version: 1, Items: json.RawMessage(`[]`)}
		require.NoError(t, fixture.database.Create(&standard).Error)
		require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
			return DispatchQualityStandardLifecycleNotificationsWithinTransaction(fixture.requestContext, tx, standard, "APPROVED")
		}))
		scenario.targetID = standard.ID
		scenario.completeBusiness = func() error {
			standard.Status, standard.ArchiveReason = scenario.resolvedStatus, "Isolated lifecycle verification"
			return SaveInspectionStandard(fixture.requestContext, &standard)
		}
	case "sales":
		order := models.SalesOrder{ID: uuid.NewString(), OrderNo: "ISOLATED-SALES", Status: scenario.activeStatus, Version: 1}
		require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
			return DispatchSalesOrderStatusChangedTx(tx, order, "Draft", scenario.activeStatus, fixture.requester.ID, fixture.requester.Username)
		}))
		scenario.targetID = order.ID
		scenario.completeBusiness = func() error {
			order.Version++
			order.Status = scenario.resolvedStatus
			return fixture.database.Transaction(func(tx *gorm.DB) error {
				return DispatchSalesOrderStatusChangedTx(tx, order, scenario.activeStatus, scenario.resolvedStatus, fixture.requester.ID, fixture.requester.Username)
			})
		}
	}
	return scenario
}

func TestBusinessRuleResolutionPostgresSurvivesRuleAndSourceConfigurationChangesAcrossEveryRouter(t *testing.T) {
	for _, domain := range []string{"logistics", "quality", "sales"} {
		for _, mutation := range []string{"disable-rule", "delete-rule", "edit-segment", "disable-source", "delete-source"} {
			t.Run(domain+"/"+mutation, func(t *testing.T) {
				scenario := createBusinessRuleResolutionLifecyclePostgresTestScenario(t, domain)
				database := scenario.fixture.database
				var original models.SystemNotificationInboxEntry
				require.NoError(t, database.Where("rule_id = ?", scenario.rule.ID).First(&original).Error)
				require.JSONEq(t, string(mustJSONRawMessage([]string{scenario.resolvedStatus})), string(original.ResolveOnStatusCodes))
				require.Equal(t, scenario.entity, original.BusinessResolutionEntity)
				query := SystemNotificationInboxListQuery{RecipientUserID: scenario.fixture.reviewer.ID, PermissionIDs: []string{scenario.permission}, Scope: "active", Limit: 100}
				before, err := ListSystemNotificationInboxForAccount(context.Background(), database, query)
				require.NoError(t, err)
				require.EqualValues(t, 1, before.UnreadCount)
				if mutation == "disable-source" {
					previousPublisher := currentNotificationPublisher
					currentNotificationPublisher = func(context.Context, string, string) error { return nil }
					t.Cleanup(func() { currentNotificationPublisher = previousPublisher })
					_, err := DeliverCommittedWorkflowNotifications(context.Background(), database, time.Now().UTC().Add(time.Minute), 20)
					require.NoError(t, err)
				}
				switch mutation {
				case "disable-rule":
					require.NoError(t, database.Model(&scenario.rule).Update("enabled", false).Error)
				case "delete-rule":
					require.NoError(t, DeleteNotificationRule(scenario.rule.ID))
				case "edit-segment":
					require.NoError(t, database.Model(&scenario.rule).Update("segments", mustJSONRawMessage([]RuleSegmentDTO{{ID: "replacement-segment", Title: "Replacement segment", TargetStatuses: []string{scenario.activeStatus}}})).Error)
				case "disable-source":
					require.NoError(t, database.Model(&models.BusinessEventSource{}).Where("code = ?", scenario.sourceCode).Update("enabled", false).Error)
				case "delete-source":
					var source models.BusinessEventSource
					require.NoError(t, database.Where("code = ?", scenario.sourceCode).First(&source).Error)
					require.NoError(t, DeleteBusinessEventSource(source.ID))
				}
				require.NoError(t, scenario.completeBusiness())
				require.NoError(t, database.First(&original, "id = ?", original.ID).Error)
				require.NotNil(t, original.ResolvedAt)
				require.Nil(t, original.ReadAt)
				require.Nil(t, original.ArchivedAt)
				require.Equal(t, "原始通知", original.Title)
				// A second device reads the same persisted state without any WebSocket delivery.
				after, err := ListSystemNotificationInboxForAccount(context.Background(), database, query)
				require.NoError(t, err)
				require.Empty(t, after.Items)
				require.Zero(t, after.UnreadCount)
				query.Scope = "history"
				history, err := ListSystemNotificationInboxForAccount(context.Background(), database, query)
				require.NoError(t, err)
				require.Len(t, history.Items, 1)
				require.True(t, history.Items[0].IsResolved)
				encoded, err := json.Marshal(history.Items[0])
				require.NoError(t, err)
				require.NotContains(t, string(encoded), "resolveOnStatusCodes")
				require.NotContains(t, string(encoded), "businessResolutionEntity")
				var creationTask models.WorkflowNotificationOutboxEntry
				require.NoError(t, database.Where("inbox_entry_id = ?", original.ID).First(&creationTask).Error)
				if mutation == "disable-source" {
					require.NotNil(t, creationTask.DeliveredAt)
				} else {
					require.NotNil(t, creationTask.CanceledAt)
				}
				var receiptCount int64
				require.NoError(t, database.Model(&models.SystemNotificationInboxEntry{}).Count(&receiptCount).Error)
				require.EqualValues(t, 1, receiptCount, "configuration changes do not produce a replacement receipt")
			})
		}
	}
}

func TestBusinessRuleResolutionPostgresFailureRollsBackBusinessReceiptCancellationAndRefresh(t *testing.T) {
	scenario := createBusinessRuleResolutionLifecyclePostgresTestScenario(t, "logistics")
	database := scenario.fixture.database
	var original models.SystemNotificationInboxEntry
	require.NoError(t, database.Where("business_target_id = ?", scenario.targetID).First(&original).Error)
	require.NoError(t, UpdateSystemNotificationInboxAccountState(context.Background(), database, original.RecipientUserID, []string{scenario.permission}, []string{original.ID}, "read"))
	require.NoError(t, UpdateSystemNotificationInboxAccountState(context.Background(), database, original.RecipientUserID, []string{scenario.permission}, []string{original.ID}, "archive"))
	other := createLogisticsRecordForNotificationPostgresTest(t, scenario.fixture, "Shipment")
	_, err := UpdateLogisticsStatus(scenario.fixture.requestContext, other.ID, UpdateLogisticsStatusInput{Status: "Exception", Version: other.Version})
	require.NoError(t, err)
	require.NoError(t, database.Model(&scenario.rule).Update("enabled", false).Error)
	require.NoError(t, database.Exec(`CREATE FUNCTION reject_business_resolution_refresh() RETURNS trigger AS $$ BEGIN IF NEW.inbox_entry_id IS NULL THEN RAISE EXCEPTION 'forced business resolution refresh failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`).Error)
	require.NoError(t, database.Exec(`CREATE TRIGGER reject_business_resolution_refresh BEFORE INSERT ON workflow_notification_outbox_entries FOR EACH ROW EXECUTE FUNCTION reject_business_resolution_refresh()`).Error)
	require.Error(t, scenario.completeBusiness())
	var persisted models.LogisticsRecord
	require.NoError(t, database.First(&persisted, "id = ?", scenario.targetID).Error)
	require.Equal(t, "Exception", persisted.Status)
	require.Equal(t, scenario.logisticsRecord.Version, persisted.Version)
	require.NoError(t, database.First(&original, "id = ?", original.ID).Error)
	require.Nil(t, original.ResolvedAt)
	var task models.WorkflowNotificationOutboxEntry
	require.NoError(t, database.Where("inbox_entry_id = ?", original.ID).First(&task).Error)
	require.Nil(t, task.CanceledAt)
	var log models.RuleExecutionLog
	require.NoError(t, database.First(&log, "id = ?", *task.ExecutionLogID).Error)
	require.Equal(t, "pending", log.ExecutionStatus)
	require.NoError(t, database.Exec(`DROP TRIGGER reject_business_resolution_refresh ON workflow_notification_outbox_entries`).Error)
	require.NoError(t, scenario.completeBusiness())
	require.NoError(t, database.First(&original, "id = ?", original.ID).Error)
	require.NotNil(t, original.ResolvedAt)
	require.NotNil(t, original.ReadAt)
	require.NotNil(t, original.ArchivedAt)
	var unrelated models.SystemNotificationInboxEntry
	require.NoError(t, database.Where("business_target_id = ?", other.ID).First(&unrelated).Error)
	require.Nil(t, unrelated.ResolvedAt)
}

func TestBusinessRuleResolutionPostgresReplayPreservesPolicyAndMatchesOnlyItsOriginalBusinessReference(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	input := SystemNotificationInboxCreationInput{RecipientUserID: fixture.reviewer.ID, EventKey: "isolated-policy-original", PurposeKey: "original-purpose", SourceCode: "QUALITY_STANDARD", BusinessTargetID: uuid.NewString(), RuleID: uuid.NewString(), SegmentID: "original-segment", BusinessResolutionEntity: "QUALITY", ResolveOnStatusCodes: []string{"ARCHIVED"}, Title: "Original"}
	var original, otherTarget, otherEntity, otherSource models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		var err error
		original, err = CreateSystemNotificationInboxEntryWithinTransaction(tx, input)
		return err
	}))
	for _, dimension := range []string{"target", "entity", "source"} {
		next := input
		next.EventKey += ":other-" + dimension
		switch dimension {
		case "target":
			next.BusinessTargetID = uuid.NewString()
		case "entity":
			next.BusinessResolutionEntity = "ORDER"
		case "source":
			next.SourceCode = "BOM_ENGINEERING"
		}
		var entry models.SystemNotificationInboxEntry
		require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
			var err error
			entry, err = CreateSystemNotificationInboxEntryWithinTransaction(tx, next)
			return err
		}))
		switch dimension {
		case "target":
			otherTarget = entry
		case "entity":
			otherEntity = entry
		case "source":
			otherSource = entry
		}
	}
	input.ResolveOnStatusCodes, input.Title = []string{"REJECTED"}, "Changed replay"
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		duplicate, err := CreateSystemNotificationInboxEntryWithinTransaction(tx, input)
		require.Equal(t, original.ID, duplicate.ID)
		require.Equal(t, "Original", duplicate.Title)
		require.JSONEq(t, `["ARCHIVED"]`, string(duplicate.ResolveOnStatusCodes))
		return err
	}))
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		return ResolveBusinessRuleNotificationInboxEntriesForStatusWithinTransaction(tx, input.SourceCode, "QUALITY", input.BusinessTargetID, "REJECTED")
	}))
	require.NoError(t, fixture.database.First(&original, "id = ?", original.ID).Error)
	require.Nil(t, original.ResolvedAt)
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		return ResolveBusinessRuleNotificationInboxEntriesForStatusWithinTransaction(tx, input.SourceCode, "QUALITY", input.BusinessTargetID, "ARCHIVED")
	}))
	require.NoError(t, fixture.database.First(&original, "id = ?", original.ID).Error)
	require.NotNil(t, original.ResolvedAt)
	for _, entry := range []models.SystemNotificationInboxEntry{otherTarget, otherEntity, otherSource} {
		var persisted models.SystemNotificationInboxEntry
		require.NoError(t, fixture.database.First(&persisted, "id = ?", entry.ID).Error)
		require.Nil(t, persisted.ResolvedAt)
	}
}

func TestBusinessRuleResolutionPostgresStatusRenameIsAtomicAndSerializesWithCompletionOfDisabledSources(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	configuration := BusinessEventSourceStoredConfigDTO{
		Actions:  []BusinessEventActionDTO{{ID: "status-action", Code: "STATUS_CHANGED", Name: "Status changed", Kind: "status"}},
		Statuses: []BusinessStatusStoredDTO{{ID: "open-status", Order: 0, Code: "OPEN", Label: "Open", Phase: "active"}, {ID: "closed-status", Order: 1, Code: "CLOSED", Label: "Closed", Phase: "done", IsTerminal: true}},
	}
	encodedConfiguration, err := marshalBusinessEventSourceStoredConfig(configuration)
	require.NoError(t, err)
	source := models.BusinessEventSource{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "ISOLATED_STATUS_RENAME", Name: "Isolated status rename", Module: "Trading", Entity: "ORDER", Enabled: true, Config: encodedConfiguration}
	require.NoError(t, fixture.database.Create(&source).Error)
	command := models.StandardCommand{BaseModel: models.BaseModel{ID: uuid.NewString()}, Title: "OPEN is displayed permanently"}
	require.NoError(t, fixture.database.Create(&command).Error)
	rule := models.NotificationRule{BaseModel: models.BaseModel{ID: uuid.NewString()}, Name: "Isolated rename", Enabled: true, Entity: source.Entity, SourceCode: source.Code, ActionCode: "STATUS_CHANGED", Version: 1,
		Segments: mustJSONRawMessage([]RuleSegmentDTO{{ID: "pending", Title: "Pending notice", TargetStatuses: []string{"OPEN"}, ResolveOnStatuses: []string{"CLOSED"}, CommandIDs: []string{command.ID}, AssigneeUsernames: []string{fixture.reviewer.ID}}})}
	require.NoError(t, fixture.database.Create(&rule).Error)
	event := BusinessStatusChangedEvent{EventKey: "isolated-rename-event:1", SourceCode: source.Code, Entity: source.Entity, TargetID: uuid.NewString(), PreviousStatus: "DRAFT", NextStatus: "OPEN"}
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error { return DispatchBusinessStatusChangedTx(tx, event) }))
	var receipt models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Where("business_target_id = ?", event.TargetID).First(&receipt).Error)
	// Even a removed rule and disabled source retain the pending receipt's semantic reference.
	require.NoError(t, DeleteNotificationRule(rule.ID))
	require.NoError(t, fixture.database.Model(&source).Update("enabled", false).Error)
	renameRequest := BusinessEventStatusRenameTransactionRequest{Statuses: []BusinessEventStatusTransactionStatusRequest{{ID: "open-status", Order: 0, Code: "OPEN"}, {ID: "closed-status", Order: 1, Code: "RESOLVED"}}}
	require.NoError(t, fixture.database.Exec(`CREATE FUNCTION reject_resolution_source_rename() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced source rename failure'; END; $$ LANGUAGE plpgsql`).Error)
	require.NoError(t, fixture.database.Exec(`CREATE TRIGGER reject_resolution_source_rename BEFORE UPDATE ON business_event_sources FOR EACH ROW EXECUTE FUNCTION reject_resolution_source_rename()`).Error)
	_, err = CommitBusinessEventStatusRenameTransaction(source.ID, renameRequest)
	require.Error(t, err)
	require.NoError(t, fixture.database.First(&receipt, "id = ?", receipt.ID).Error)
	require.JSONEq(t, `["CLOSED"]`, string(receipt.ResolveOnStatusCodes))
	require.NoError(t, fixture.database.First(&source, "id = ?", source.ID).Error)
	require.Contains(t, string(source.Config), `"CLOSED"`)
	require.NoError(t, fixture.database.Exec(`DROP TRIGGER reject_resolution_source_rename ON business_event_sources`).Error)

	blockingTransaction := fixture.database.Begin()
	require.NoError(t, blockingTransaction.Error)
	t.Cleanup(func() { _ = blockingTransaction.Rollback().Error })
	var lockedSource models.BusinessEventSource
	require.NoError(t, blockingTransaction.Clauses(clause.Locking{Strength: "SHARE"}).First(&lockedSource, "id = ?", source.ID).Error)
	renameResult := make(chan error, 1)
	go func() {
		_, renameError := CommitBusinessEventStatusRenameTransaction(source.ID, renameRequest)
		renameResult <- renameError
	}()
	select {
	case renameError := <-renameResult:
		t.Fatalf("rename must wait for the source lock, got %v", renameError)
	case <-time.After(100 * time.Millisecond):
	}
	event.EventKey, event.PreviousStatus, event.NextStatus = "isolated-rename-event:2", "OPEN", "RESOLVED"
	completionResult := make(chan error, 1)
	go func() {
		completionResult <- fixture.database.Transaction(func(tx *gorm.DB) error { return DispatchBusinessStatusChangedTx(tx, event) })
	}()
	require.NoError(t, blockingTransaction.Commit().Error)
	select {
	case renameError := <-renameResult:
		require.NoError(t, renameError)
	case <-time.After(6 * time.Second):
		t.Fatal("status rename did not finish")
	}
	select {
	case completionError := <-completionResult:
		require.NoError(t, completionError)
	case <-time.After(6 * time.Second):
		t.Fatal("business completion did not finish")
	}
	require.NoError(t, fixture.database.First(&receipt, "id = ?", receipt.ID).Error)
	require.JSONEq(t, `["RESOLVED"]`, string(receipt.ResolveOnStatusCodes))
	require.NotNil(t, receipt.ResolvedAt)
	require.Equal(t, "OPEN is displayed permanently", receipt.Title)
	require.Nil(t, receipt.ReadAt)
}

func TestBusinessRuleResolutionPostgresDisabledQualitySourceDoesNotStopExistingApprovalOrItsNecessaryNotifications(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	createQualityStandardWorkflowIndependentApprovalPolicy(t, fixture, "")
	command := models.StandardCommand{BaseModel: models.BaseModel{ID: uuid.NewString()}, SourceCode: "QUALITY_STANDARD", ActionCode: "STATUS_CHANGED", Title: "Configured review notice"}
	require.NoError(t, fixture.database.Create(&command).Error)
	rule := models.NotificationRule{BaseModel: models.BaseModel{ID: uuid.NewString()}, Name: "Configured review notice", Enabled: true, Entity: "QUALITY", SourceCode: "QUALITY_STANDARD", ActionCode: "STATUS_CHANGED", Version: 1,
		Segments: mustJSONRawMessage([]RuleSegmentDTO{{ID: "review-notice", Title: "Review notice", TargetStatuses: []string{"PENDING_APPROVAL"}, ResolveOnStatuses: []string{"APPROVED"}, CommandIDs: []string{command.ID}, AssigneeUsernames: []string{fixture.reviewer.ID}}})}
	require.NoError(t, fixture.database.Create(&rule).Error)
	standard := saveQualityStandardWorkflowDraft(t, fixture)
	standard.Status = "PENDING_APPROVAL"
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
	var initial []models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Where("business_target_id = ?", standard.ID).Find(&initial).Error)
	require.Len(t, initial, 2)
	require.NoError(t, fixture.database.Model(&models.BusinessEventSource{}).Where("code = ?", "QUALITY_STANDARD").Update("enabled", false).Error)
	require.NoError(t, fixture.database.Where("source_code = ?", "QUALITY_STANDARD").Delete(&models.NotificationRule{}).Error)
	require.NoError(t, decideQualityStandardWorkflowApproval(t, fixture, standard, fixture.reviewer, "APPROVED", "Verified existing request"))
	require.NoError(t, fixture.database.First(&standard, "id = ?", standard.ID).Error)
	require.Equal(t, "APPROVED", standard.Status)
	for _, original := range initial {
		var persisted models.SystemNotificationInboxEntry
		require.NoError(t, fixture.database.First(&persisted, "id = ?", original.ID).Error)
		require.NotNil(t, persisted.ResolvedAt)
		require.Nil(t, persisted.ReadAt)
	}
	var result models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Where("recipient_user_id = ? AND approval_request_id = ? AND requires_action = ?", fixture.requester.ID, *standard.ApprovalRequestID, false).First(&result).Error)
	require.Equal(t, "审批申请已通过", result.Title)
	require.Empty(t, result.BusinessResolutionEntity, "necessary approvals have their own exact request/node lifecycle")
}
