package services

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type qualityStandardWorkflowPostgresFixture struct {
	database       *gorm.DB
	requester      models.User
	reviewer       models.User
	secondReviewer models.User
	requestContext context.Context
}

func createIsolatedQualityStandardWorkflowPostgresFixture(t *testing.T) qualityStandardWorkflowPostgresFixture {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("QUALITY_STANDARD_WORKFLOW_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set QUALITY_STANDARD_WORKFLOW_TEST_POSTGRES_DSN to verify the transactional quality workflow")
	}
	adminDatabase, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	adminConnection, err := adminDatabase.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
	schemaName := "quality_standard_workflow_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, adminDatabase.Exec("CREATE SCHEMA "+schemaName).Error)
	t.Cleanup(func() { require.NoError(t, adminDatabase.Exec("DROP SCHEMA "+schemaName+" CASCADE").Error) })
	config, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	config.RuntimeParams["search_path"] = schemaName
	config.RuntimeParams["lock_timeout"] = "3000"
	config.RuntimeParams["statement_timeout"] = "6000"
	connection := stdlib.OpenDB(*config)
	connection.SetMaxOpenConns(8)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(&models.User{}, &models.InspectionStandard{}, &models.ApprovalRequest{}, &models.AuditLog{}, &models.Unit{},
		&models.BusinessApprovalPolicyConfiguration{}, &models.BusinessEventSource{}, &models.NotificationRule{}, &models.StandardCommand{}, &models.RuleExecutionLog{}, &models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{}))
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	fixture := qualityStandardWorkflowPostgresFixture{database: database}
	for index, user := range []*models.User{&fixture.requester, &fixture.reviewer, &fixture.secondReviewer} {
		*user = models.User{ID: uuid.NewString(), Username: []string{"workflow-requester", "workflow-reviewer", "workflow-second-reviewer"}[index], Password: "not-a-live-account", Status: "active"}
		require.NoError(t, database.Create(user).Error)
	}
	fixture.requestContext = audit.NewContextWithActor(context.Background(), audit.AuditActor{UserID: fixture.requester.ID, Username: fixture.requester.Username})
	require.NoError(t, database.Create(&models.Unit{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "G", Name: "克", Status: "active"}).Error)
	require.NoError(t, EnsureDefaultBusinessEventSources())
	return fixture
}

func createQualityStandardWorkflowIndependentApprovalPolicy(t *testing.T, fixture qualityStandardWorkflowPostgresFixture, secondReviewerID string) models.BusinessApprovalPolicyConfiguration {
	t.Helper()
	policy := models.BusinessApprovalPolicyConfiguration{BaseModel: models.BaseModel{ID: uuid.NewString()}, BusinessType: models.BusinessApprovalTypeQualityStandard,
		Enabled: true, Approver1ID: fixture.reviewer.ID, Approver2ID: secondReviewerID, Version: 1, UpdatedBy: fixture.requester.ID}
	require.NoError(t, fixture.database.Create(&policy).Error)
	return policy
}

func saveQualityStandardWorkflowDraft(t *testing.T, fixture qualityStandardWorkflowPostgresFixture) models.InspectionStandard {
	t.Helper()
	standard := models.InspectionStandard{Code: "QCP-" + uuid.NewString(), Name: "重量受控协议", Type: "FQC", Status: "DRAFT",
		Items: json.RawMessage(`[{"id":"weight","name":"重量","unit":"G","centerValue":450,"levels":[{"level":"S","tolerance":0,"min":450,"max":450},{"level":"A","deviationMinExclusive":0,"tolerance":5,"min":445,"max":455},{"level":"B","deviationMinExclusive":5,"tolerance":10,"min":440,"max":460}]}]`)}
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
	return standard
}

func decideQualityStandardWorkflowApproval(t *testing.T, fixture qualityStandardWorkflowPostgresFixture, standard models.InspectionStandard, reviewer models.User, status, comment string) error {
	t.Helper()
	require.NotNil(t, standard.ApprovalRequestID)
	ctx := audit.NewContextWithActor(context.Background(), audit.AuditActor{UserID: reviewer.ID, Username: reviewer.Username})
	_, err := ApproveRequest(ctx, ApproveRequestInput{RequestID: *standard.ApprovalRequestID, ApproverUserID: reviewer.ID, Status: status, Comment: comment}, time.Now().UTC(), func() string { return "123456" })
	return err
}

func TestQualityStandardPostgresWorkflowHasAtomicSubmissionAndReviewLifecycle(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	standard := saveQualityStandardWorkflowDraft(t, fixture)
	require.Empty(t, standard.Auditor)
	require.Nil(t, standard.AuditTime)
	draftVersion := standard.Version
	standard.Status = "PENDING_APPROVAL"
	require.ErrorContains(t, SaveInspectionStandard(fixture.requestContext, &standard), "审批链")
	require.NoError(t, fixture.database.First(&standard, "id = ?", standard.ID).Error)
	require.Equal(t, "DRAFT", standard.Status)
	require.Equal(t, draftVersion, standard.Version)
	createQualityStandardWorkflowIndependentApprovalPolicy(t, fixture, "")
	standard.Status = "PENDING_APPROVAL"
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
	require.NotNil(t, standard.ApprovalRequestID)
	summary, err := GetQualityStandardApprovalSummary(standard)
	require.NoError(t, err)
	require.Equal(t, *standard.ApprovalRequestID, summary.ID)
	require.Equal(t, fixture.requester.ID, summary.RequesterID)
	require.Equal(t, fixture.reviewer.ID, summary.Approver1ID)
	require.Contains(t, summary.Reason, standard.Code)
	require.NotContains(t, summary.Reason, "[Standard")
	requests, err := ListMyApprovals(fixture.reviewer.ID, nil)
	require.NoError(t, err)
	require.Len(t, requests, 1, "the configured reviewer sees the persisted todo")
	require.Error(t, decideQualityStandardWorkflowApproval(t, fixture, standard, fixture.requester, "APPROVED", ""))
	spoofed := standard
	spoofed.Status = "APPROVED"
	require.ErrorContains(t, SaveInspectionStandard(fixture.requestContext, &spoofed), "审批决定")
	require.NoError(t, decideQualityStandardWorkflowApproval(t, fixture, standard, fixture.reviewer, "APPROVED", "检验范围正确"))
	require.NoError(t, fixture.database.First(&standard, "id = ?", standard.ID).Error)
	require.Equal(t, "APPROVED", standard.Status)
	require.Equal(t, fixture.reviewer.Username, standard.Auditor)
	require.Equal(t, "检验范围正确", standard.ReviewComment)
	require.NotNil(t, standard.AuditTime)
	require.Error(t, decideQualityStandardWorkflowApproval(t, fixture, standard, fixture.reviewer, "REJECTED", "重复决定"))
	standard.Status = "PUBLISHED"
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
	require.Equal(t, fixture.requester.Username, standard.PublishedBy)
	require.NotNil(t, standard.PublishedAt)
	standard.Status = "ARCHIVED"
	standard.ArchiveReason = "换版归档"
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
	require.NoError(t, fixture.database.First(&standard, "id = ?", standard.ID).Error)
	require.Equal(t, "换版归档", standard.ArchiveReason)
	require.Equal(t, fixture.requester.Username, standard.ArchivedBy)
	require.NotNil(t, standard.ArchivedAt)
	require.Equal(t, "检验范围正确", standard.ReviewComment)
}

func TestQualityStandardPostgresTwoLevelRejectionAndResubmissionUseCurrentRequest(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	createQualityStandardWorkflowIndependentApprovalPolicy(t, fixture, fixture.secondReviewer.ID)
	standard := saveQualityStandardWorkflowDraft(t, fixture)
	standard.Status = "PENDING_APPROVAL"
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
	oldRequestID := *standard.ApprovalRequestID
	require.NoError(t, decideQualityStandardWorkflowApproval(t, fixture, standard, fixture.reviewer, "APPROVED", "一级通过"))
	require.NoError(t, fixture.database.First(&standard, "id = ?", standard.ID).Error)
	require.Equal(t, "PENDING_APPROVAL", standard.Status)
	summary, err := GetQualityStandardApprovalSummary(standard)
	require.NoError(t, err)
	require.Equal(t, 2, summary.CurrentLevel)
	require.Equal(t, "APPROVED_L1", summary.Status)
	require.NoError(t, decideQualityStandardWorkflowApproval(t, fixture, standard, fixture.secondReviewer, "REJECTED", "请复核中心值"))
	require.NoError(t, fixture.database.First(&standard, "id = ?", standard.ID).Error)
	require.Equal(t, "REJECTED", standard.Status)
	require.Equal(t, "请复核中心值", standard.RejectReason)
	standard.Status = "PENDING_APPROVAL"
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
	require.NotEqual(t, oldRequestID, *standard.ApprovalRequestID)
	require.Empty(t, standard.RejectReason)
	var persisted models.InspectionStandard
	require.NoError(t, fixture.database.First(&persisted, "id = ?", standard.ID).Error)
	require.Empty(t, persisted.RejectReason, "zero values must really clear on resubmission")
	require.Nil(t, persisted.AuditTime)
	summary, err = GetQualityStandardApprovalSummary(persisted)
	require.NoError(t, err)
	require.Equal(t, "PENDING", summary.Status)
}

func TestQualityStandardPostgresSubmissionRollbackAndConcurrencyDoNotLeavePartialRequests(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	createQualityStandardWorkflowIndependentApprovalPolicy(t, fixture, "")
	standard := saveQualityStandardWorkflowDraft(t, fixture)
	initialVersion := standard.Version
	require.NoError(t, fixture.database.Exec(`CREATE FUNCTION reject_quality_submission_audit() RETURNS trigger AS $$ BEGIN IF NEW.target_id = '`+standard.ID+`' THEN RAISE EXCEPTION 'forced audit failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`).Error)
	require.NoError(t, fixture.database.Exec(`CREATE TRIGGER reject_quality_submission_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_quality_submission_audit()`).Error)
	standard.Status = "PENDING_APPROVAL"
	require.ErrorContains(t, SaveInspectionStandard(fixture.requestContext, &standard), "forced audit failure")
	for _, model := range []any{&models.ApprovalRequest{}, &models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{}, &models.RuleExecutionLog{}} {
		var count int64
		require.NoError(t, fixture.database.Model(model).Count(&count).Error)
		require.Zero(t, count, "failed submission rolls back every dependent write")
	}
	require.NoError(t, fixture.database.Exec(`DROP TRIGGER reject_quality_submission_audit ON audit_logs`).Error)
	require.NoError(t, fixture.database.First(&standard, "id = ?", standard.ID).Error)
	require.Equal(t, "DRAFT", standard.Status)
	require.Equal(t, initialVersion, standard.Version)
	var group sync.WaitGroup
	errorsFromSubmissions := make(chan error, 2)
	for range 2 {
		group.Go(func() {
			candidate := standard
			candidate.Status = "PENDING_APPROVAL"
			errorsFromSubmissions <- SaveInspectionStandard(fixture.requestContext, &candidate)
		})
	}
	group.Wait()
	close(errorsFromSubmissions)
	successes := 0
	for err := range errorsFromSubmissions {
		if err == nil {
			successes++
		} else {
			require.ErrorIs(t, err, ErrQualityStandardVersionConflict)
		}
	}
	require.Equal(t, 1, successes)
	var count int64
	require.NoError(t, fixture.database.Model(&models.ApprovalRequest{}).Count(&count).Error)
	require.Equal(t, int64(1), count)
}

func TestQualityStandardPostgresOutboxRetriesOnlyCommittedNotificationsWithStableIDs(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	previousPublisher := currentNotificationPublisher
	var deliveryIDs []string
	currentNotificationPublisher = func(_ context.Context, _ string, payload string) error {
		var message map[string]any
		require.NoError(t, json.Unmarshal([]byte(payload), &message))
		deliveryIDs = append(deliveryIDs, message["id"].(string))
		if len(deliveryIDs) == 1 {
			return errors.New("test transport unavailable")
		}
		return nil
	}
	t.Cleanup(func() { currentNotificationPublisher = previousPublisher })
	require.Error(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		_, err := CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{RecipientUserID: fixture.reviewer.ID, EventKey: "rollback", PurposeKey: "test", SourceCode: "APPROVAL", Title: "Rolled back"})
		require.NoError(t, err)
		return errors.New("rollback")
	}))
	now := time.Now().UTC().Add(time.Second)
	count, err := DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now, 10)
	require.NoError(t, err)
	require.Zero(t, count)
	require.Empty(t, deliveryIDs)
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		_, err := CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{RecipientUserID: fixture.reviewer.ID, EventKey: "committed", PurposeKey: "test", SourceCode: "APPROVAL", Title: "Committed"})
		return err
	}))
	count, err = DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now, 10)
	require.NoError(t, err)
	require.Zero(t, count)
	count, err = DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now.Add(time.Minute), 10)
	require.NoError(t, err)
	require.Equal(t, 1, count)
	require.Len(t, deliveryIDs, 2)
	require.Equal(t, deliveryIDs[0], deliveryIDs[1])
	count, err = DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now.Add(2*time.Minute), 10)
	require.NoError(t, err)
	require.Zero(t, count)
}

func TestQualityStandardPostgresRejectsInvalidCriteriaAndInactiveApprovalPolicyButAllowsDisabledNotificationSource(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	standard := saveQualityStandardWorkflowDraft(t, fixture)
	for _, invalidCriteria := range []struct{ name, original, replacement, message string }{
		{"unknown unit", `"unit":"G"`, `"unit":"not-configured"`, "单位不存在"},
		{"wrong center grade", `"level":"S","tolerance":0`, `"level":"S","tolerance":1`, "S 等级必须等于中心值"},
		{"asymmetric limits", `"min":445`, `"min":444`, "对称"},
		{"gap in deviation bands", `"deviationMinExclusive":5`, `"deviationMinExclusive":6`, "边界不连续"},
	} {
		t.Run(invalidCriteria.name, func(t *testing.T) {
			candidate := standard
			candidate.Items = json.RawMessage(strings.Replace(string(standard.Items), invalidCriteria.original, invalidCriteria.replacement, 1))
			require.ErrorContains(t, SaveInspectionStandard(fixture.requestContext, &candidate), invalidCriteria.message)
			var persisted models.InspectionStandard
			require.NoError(t, fixture.database.First(&persisted, "id = ?", standard.ID).Error)
			require.Equal(t, standard.Version, persisted.Version)
			require.JSONEq(t, string(standard.Items), string(persisted.Items))
		})
	}
	createQualityStandardWorkflowIndependentApprovalPolicy(t, fixture, "")
	candidate := standard
	candidate.Status = "PENDING_APPROVAL"
	require.NoError(t, fixture.database.Model(&fixture.reviewer).Update("status", "disabled").Error)
	require.ErrorContains(t, SaveInspectionStandard(fixture.requestContext, &candidate), "已停用")
	require.NoError(t, fixture.database.Model(&fixture.reviewer).Update("status", "active").Error)
	require.NoError(t, fixture.database.Model(&models.BusinessEventSource{}).Where("code = ?", "QUALITY_STANDARD").Update("enabled", false).Error)
	candidate = standard
	candidate.Status = "PENDING_APPROVAL"
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &candidate))
	require.NoError(t, decideQualityStandardWorkflowApproval(t, fixture, candidate, fixture.reviewer, "APPROVED", "通知源停用不影响审批"))
	var requestCount int64
	require.NoError(t, fixture.database.Model(&models.ApprovalRequest{}).Count(&requestCount).Error)
	require.EqualValues(t, 1, requestCount)
}

func TestQualityStandardPostgresLifecycleNotificationsUseCommittedTemplatesRecipientsAndOutboxLogs(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	dynamicOperator := "operator"
	for _, actionCode := range []string{"CREATED", "STATUS_CHANGED"} {
		command := models.StandardCommand{BaseModel: models.BaseModel{ID: uuid.NewString()}, SourceCode: "QUALITY_STANDARD", ActionCode: actionCode,
			Title: "[StandardCode] [Status]", Content: "[StandardName] / [Operator]", TargetLink: "/quality/standards/[StandardId]/preview"}
		require.NoError(t, fixture.database.Create(&command).Error)
		segment := RuleSegmentDTO{ID: "notify-" + actionCode, Title: "品质标准通知", CommandIDs: []string{command.ID}, DynamicTargetField: &dynamicOperator}
		if actionCode == "CREATED" {
			segment.AssigneeUsernames = []string{fixture.requester.Username}
		}
		rule := models.NotificationRule{BaseModel: models.BaseModel{ID: uuid.NewString()}, Name: "Lifecycle " + actionCode, Entity: "QUALITY", SourceCode: "QUALITY_STANDARD",
			ActionCode: actionCode, Enabled: true, Version: 1, Segments: mustJSONRawMessage([]RuleSegmentDTO{segment})}
		require.NoError(t, fixture.database.Create(&rule).Error)
	}
	createQualityStandardWorkflowIndependentApprovalPolicy(t, fixture, "")
	standard := saveQualityStandardWorkflowDraft(t, fixture)
	var initialOutboxCount int64
	require.NoError(t, fixture.database.Model(&models.WorkflowNotificationOutboxEntry{}).Count(&initialOutboxCount).Error)
	require.Equal(t, int64(2), initialOutboxCount, "creation and initial status each notify once; username and actor ID resolve to one recipient")
	var initialNotificationLogs []models.RuleExecutionLog
	require.NoError(t, fixture.database.Where("execution_type = ?", "notify").Find(&initialNotificationLogs).Error)
	require.Len(t, initialNotificationLogs, 2)
	for _, logEntry := range initialNotificationLogs {
		require.Contains(t, []string{"CREATED", "STATUS_CHANGED"}, logEntry.ActionCode)
		require.Contains(t, logEntry.EventKey, ":"+logEntry.ActionCode+":DRAFT", "the shared creator must preserve the actual lifecycle action")
	}
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
	var afterDraftEditOutboxCount int64
	require.NoError(t, fixture.database.Model(&models.WorkflowNotificationOutboxEntry{}).Count(&afterDraftEditOutboxCount).Error)
	require.Equal(t, initialOutboxCount, afterDraftEditOutboxCount, "ordinary edits must not replay lifecycle notifications")
	standard.Status = "PENDING_APPROVAL"
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
	require.NoError(t, decideQualityStandardWorkflowApproval(t, fixture, standard, fixture.reviewer, "APPROVED", "通过"))
	require.NoError(t, fixture.database.First(&standard, "id = ?", standard.ID).Error)
	standard.Status = "PUBLISHED"
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
	standard.Status, standard.ArchiveReason = "ARCHIVED", "换版"
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
	var entries []models.WorkflowNotificationOutboxEntry
	require.NoError(t, fixture.database.Find(&entries).Error)
	require.Len(t, entries, 9)
	for _, entry := range entries {
		var envelope map[string]any
		require.NoError(t, json.Unmarshal(entry.Payload, &envelope))
		require.Equal(t, "NotificationInbox", envelope["module"])
		require.Contains(t, []string{fixture.requester.ID, fixture.reviewer.ID}, envelope["targetUser"])
		require.NotContains(t, envelope, "title", "delivery hints carry no business content")
	}
	var receipts []models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Find(&receipts).Error)
	require.Len(t, receipts, 8)
	for _, receipt := range receipts {
		require.Equal(t, "/quality/standards/"+standard.ID+"/preview", receipt.ActionURL)
		require.NotContains(t, receipt.Title, "[Standard")
	}

	previousPublisher := currentNotificationPublisher
	currentNotificationPublisher = func(context.Context, string, string) error { return errors.New("isolated test transport failure") }
	t.Cleanup(func() { currentNotificationPublisher = previousPublisher })
	now := time.Now().UTC().Add(time.Second)
	count, err := DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now, 20)
	require.NoError(t, err)
	require.Zero(t, count)
	var failedLog models.RuleExecutionLog
	require.NoError(t, fixture.database.Where("execution_type = ? AND execution_status = ?", "notify", "failed").First(&failedLog).Error)
	_, err = RetryRuleExecutionNotificationLogWithDB(fixture.database, failedLog.ID)
	require.NoError(t, err)
	currentNotificationPublisher = func(context.Context, string, string) error { return nil }
	count, err = DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now.Add(time.Minute), 20)
	require.NoError(t, err)
	require.Equal(t, 8, count)
	var deliveredLogCount int64
	require.NoError(t, fixture.database.Model(&models.RuleExecutionLog{}).Where("execution_type = ? AND execution_status = ?", "notify", "success").Count(&deliveredLogCount).Error)
	require.Equal(t, int64(6), deliveredLogCount)
}

func TestQualityStandardPostgresInvalidNotificationRecipientRollsBackDraftAndAllNotificationRecords(t *testing.T) {
	for _, recipientStatus := range []string{"missing", "inactive"} {
		t.Run(recipientStatus, func(t *testing.T) {
			fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
			standard := saveQualityStandardWorkflowDraft(t, fixture)
			originalVersion := standard.Version
			if recipientStatus == "inactive" {
				require.NoError(t, fixture.database.Model(&fixture.reviewer).Update("status", "inactive").Error)
			}
			recipient := fixture.reviewer.Username
			if recipientStatus == "missing" {
				recipient = "missing-notification-account"
			}
			command := models.StandardCommand{BaseModel: models.BaseModel{ID: uuid.NewString()}, SourceCode: "QUALITY_STANDARD", ActionCode: "CREATED", Title: "New standard"}
			require.NoError(t, fixture.database.Create(&command).Error)
			segment := RuleSegmentDTO{ID: "notify-created", CommandIDs: []string{command.ID}, AssigneeUsernames: []string{fixture.requester.Username, recipient}}
			rule := models.NotificationRule{BaseModel: models.BaseModel{ID: uuid.NewString()}, Name: "Invalid recipient notification", Entity: "QUALITY", SourceCode: "QUALITY_STANDARD", ActionCode: "CREATED", Enabled: true, Version: 1, Segments: mustJSONRawMessage([]RuleSegmentDTO{segment})}
			require.NoError(t, fixture.database.Create(&rule).Error)
			newStandard := models.InspectionStandard{Code: "QCP-" + uuid.NewString(), Name: standard.Name, Type: standard.Type, Status: "DRAFT", Items: standard.Items}
			require.Error(t, SaveInspectionStandard(fixture.requestContext, &newStandard))
			var standardCount int64
			require.NoError(t, fixture.database.Model(&models.InspectionStandard{}).Count(&standardCount).Error)
			require.EqualValues(t, 1, standardCount)
			require.NoError(t, fixture.database.First(&standard, "id = ?", standard.ID).Error)
			require.Equal(t, originalVersion, standard.Version)
			for _, model := range []any{&models.RuleExecutionLog{}, &models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{}} {
				var recordCount int64
				require.NoError(t, fixture.database.Model(model).Count(&recordCount).Error)
				require.Zero(t, recordCount, "no partial notification records may survive an invalid recipient")
			}
		})
	}
}

func TestQualityStandardPostgresResolutionCancelsOldRetriesAndArchivesOnlyTheOriginalDelivery(t *testing.T) {
	for _, initiallyDelivered := range []bool{false, true} {
		t.Run(map[bool]string{false: "still queued", true: "already published"}[initiallyDelivered], func(t *testing.T) {
			fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
			createQualityStandardWorkflowIndependentApprovalPolicy(t, fixture, "")
			command := models.StandardCommand{BaseModel: models.BaseModel{ID: uuid.NewString()}, SourceCode: "QUALITY_STANDARD", ActionCode: "STATUS_CHANGED", Title: "草稿待处理"}
			require.NoError(t, fixture.database.Create(&command).Error)
			segment := RuleSegmentDTO{ID: "draft-alert", Title: "草稿待处理提醒", TargetStatuses: []string{"DRAFT"}, ResolveOnStatuses: []string{"PENDING_APPROVAL"},
				CommandIDs: []string{command.ID}, AssigneeUsernames: []string{fixture.requester.Username}}
			rule := models.NotificationRule{BaseModel: models.BaseModel{ID: uuid.NewString()}, Name: "草稿通知解除规则", Entity: "QUALITY", SourceCode: "QUALITY_STANDARD",
				ActionCode: "STATUS_CHANGED", Enabled: true, Version: 1, Segments: mustJSONRawMessage([]RuleSegmentDTO{segment})}
			require.NoError(t, fixture.database.Create(&rule).Error)
			standard := saveQualityStandardWorkflowDraft(t, fixture)
			var originalDelivery models.WorkflowNotificationOutboxEntry
			require.NoError(t, fixture.database.First(&originalDelivery).Error)
			previousPublisher := currentNotificationPublisher
			var publishedMessages []map[string]any
			currentNotificationPublisher = func(_ context.Context, _ string, payload string) error {
				var message map[string]any
				require.NoError(t, json.Unmarshal([]byte(payload), &message))
				publishedMessages = append(publishedMessages, message)
				return nil
			}
			t.Cleanup(func() { currentNotificationPublisher = previousPublisher })
			if initiallyDelivered {
				count, err := DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, time.Now().UTC().Add(time.Second), 10)
				require.NoError(t, err)
				require.Equal(t, 1, count)
				publishedMessages = nil
			}
			unrelatedStandard := saveQualityStandardWorkflowDraft(t, fixture)
			standard.Status = "PENDING_APPROVAL"
			require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
			var persistedOriginal models.WorkflowNotificationOutboxEntry
			require.NoError(t, fixture.database.First(&persistedOriginal, "id = ?", originalDelivery.ID).Error)
			if initiallyDelivered {
				require.NotNil(t, persistedOriginal.DeliveredAt)
			} else {
				require.NotNil(t, persistedOriginal.CanceledAt)
				var skippedLog models.RuleExecutionLog
				require.NoError(t, fixture.database.First(&skippedLog, "id = ?", *originalDelivery.ExecutionLogID).Error)
				require.Equal(t, "skipped", skippedLog.ExecutionStatus)
			}
			count, err := DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, time.Now().UTC().Add(time.Minute), 10)
			require.NoError(t, err)
			require.Equal(t, 3, count, "the other standard's alert, the approval alert, and the resolution control remain deliverable")
			var originalReceipt models.SystemNotificationInboxEntry
			require.NoError(t, fixture.database.First(&originalReceipt, "id = ?", *originalDelivery.InboxEntryID).Error)
			require.NotNil(t, originalReceipt.ResolvedAt)
			require.Nil(t, originalReceipt.ReadAt)
			var unrelatedReceipt models.SystemNotificationInboxEntry
			require.NoError(t, fixture.database.Where("business_target_id = ?", unrelatedStandard.ID).First(&unrelatedReceipt).Error)
			require.Nil(t, unrelatedReceipt.ResolvedAt)
			for _, message := range publishedMessages {
				require.NotEqual(t, originalDelivery.ID, message["id"])
				require.Equal(t, "CHANGED", message["action"])
			}

		})
	}
}
