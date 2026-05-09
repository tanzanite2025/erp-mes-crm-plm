package services

import (
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func seedBusinessEventStatusTransactionSource(t *testing.T, testDB *gorm.DB) models.BusinessEventSource {
	t.Helper()

	source := models.BusinessEventSource{
		BaseModel: models.BaseModel{
			ID:        "source-1",
			CreatedAt: time.Date(2026, 5, 9, 0, 0, 0, 0, time.UTC),
			UpdatedAt: time.Date(2026, 5, 9, 0, 0, 0, 0, time.UTC),
		},
		Code:        "SALES_ORDER",
		Name:        "Sales Order",
		Module:      "Trading",
		Entity:      "ORDER",
		Enabled:     true,
		Description: "default source",
		Config: []byte(`{
			"actions":[{"id":"action-1","order":0,"code":"STATUS_CHANGED","name":"Status Changed","kind":"status"}],
			"statuses":[
				{"id":"status-1","order":0,"code":"Pending"},
				{"id":"status-2","order":1,"code":"Done"}
			],
			"fields":[],
			"dynamicResolvers":[],
			"defaultActionUrlTemplate":"/trading/orders/[OrderId]"
		}`),
	}
	require.NoError(t, testDB.Create(&source).Error)
	return source
}

func seedBusinessEventStatusTransactionRule(
	t *testing.T,
	testDB *gorm.DB,
	approvalAction string,
	version int,
) models.NotificationRule {
	t.Helper()

	rule := models.NotificationRule{
		BaseModel:  models.BaseModel{ID: "rule-1"},
		Name:       "销售订单待处理规则",
		Enabled:    true,
		Entity:     "ORDER",
		SourceCode: "SALES_ORDER",
		ActionCode: "STATUS_CHANGED",
		Segments:   []byte(`[{"id":"segment-1","title":"待处理阶段","targetStatuses":["Pending"],"commandIds":[],"assigneeGroups":[],"assigneeUsernames":[],"resolveOnStatuses":["Done"],"dynamicTargetField":null,"approval":{"enabled":true,"module":"Trading","action":"` + approvalAction + `","approver1Id":"u1","approver2Id":"","dynamicApproverField":null,"reasonTemplate":"审批"}}]`),
		Version:    version,
	}
	require.NoError(t, testDB.Create(&rule).Error)
	return rule
}

func TestCommitBusinessEventStatusRenameTransaction_SucceedsAtomically(t *testing.T) {
	testDB := setupWorkflowRoutingServiceTestDB(t)
	source := seedBusinessEventStatusTransactionSource(t, testDB)
	seedBusinessEventStatusTransactionRule(t, testDB, "SALES_ORDER_Pending_APPROVAL", 3)

	result, err := CommitBusinessEventStatusRenameTransaction(source.ID, BusinessEventStatusRenameTransactionRequest{
		ExpectedUpdatedAt: source.UpdatedAt.Format(time.RFC3339Nano),
		Statuses: []BusinessEventStatusTransactionStatusRequest{
			{ID: "status-1", Order: 0, Code: "Queued"},
			{ID: "status-2", Order: 1, Code: "Done"},
		},
		AffectedRules: []BusinessEventStatusTransactionAffectedRuleRequest{
			{RuleID: "rule-1", ExpectedVersion: 3},
		},
	})
	require.NoError(t, err)
	require.Equal(t, 1, result.Summary.RenamedStatusCount)
	require.Len(t, result.Rules, 1)
	require.Equal(t, "Queued", result.EventSource.Config.Statuses[0].Code)
	require.Equal(t, "Queued", result.Rules[0].Segments[0].TargetStatuses[0])
	require.Equal(t, "SALES_ORDER_Queued_APPROVAL", result.Rules[0].Segments[0].Approval.Action)

	var storedRule models.NotificationRule
	require.NoError(t, testDB.First(&storedRule, "id = ?", "rule-1").Error)
	segments, err := unmarshalNotificationRuleSegments(storedRule.Segments)
	require.NoError(t, err)
	require.Equal(t, 4, storedRule.Version)
	require.Equal(t, []string{"Queued"}, segments[0].TargetStatuses)

	var storedSource models.BusinessEventSource
	require.NoError(t, testDB.First(&storedSource, "id = ?", source.ID).Error)
	config, err := unmarshalBusinessEventSourceStoredConfig(storedSource.Config)
	require.NoError(t, err)
	require.Equal(t, "Queued", config.Statuses[0].Code)
	require.Empty(t, config.Statuses[0].Label)
	require.Empty(t, config.Statuses[0].Phase)
	require.False(t, config.Statuses[0].IsTerminal)
	require.False(t, config.Statuses[0].DefaultResolve)
	require.Equal(t, "Done", config.Statuses[1].Code)
	require.Empty(t, config.Statuses[1].Label)
	require.Empty(t, config.Statuses[1].Phase)
	require.False(t, config.Statuses[1].IsTerminal)
	require.False(t, config.Statuses[1].DefaultResolve)

	require.Len(t, result.EventSource.Config.Statuses, 2)
	done := result.EventSource.Config.Statuses[1]
	expectedDone := indexBusinessEventSourceCompatibilityStatuses("SALES_ORDER")[done.Code]
	require.Equal(t, expectedDone.Label, done.Label)
	require.Equal(t, expectedDone.Phase, done.Phase)
	require.Equal(t, expectedDone.IsTerminal, done.IsTerminal)
	require.Equal(t, expectedDone.DefaultResolve, done.DefaultResolve)
}

func TestCommitBusinessEventStatusRenameTransaction_BlocksCustomApprovalAction(t *testing.T) {
	testDB := setupWorkflowRoutingServiceTestDB(t)
	source := seedBusinessEventStatusTransactionSource(t, testDB)
	seedBusinessEventStatusTransactionRule(t, testDB, "CUSTOM_APPROVAL_ACTION", 3)

	_, err := CommitBusinessEventStatusRenameTransaction(source.ID, BusinessEventStatusRenameTransactionRequest{
		ExpectedUpdatedAt: source.UpdatedAt.Format(time.RFC3339Nano),
		Statuses: []BusinessEventStatusTransactionStatusRequest{
			{ID: "status-1", Order: 0, Code: "Queued"},
			{ID: "status-2", Order: 1, Code: "Done"},
		},
		AffectedRules: []BusinessEventStatusTransactionAffectedRuleRequest{
			{RuleID: "rule-1", ExpectedVersion: 3},
		},
	})
	require.Error(t, err)
	require.ErrorIs(t, err, ErrBusinessEventStatusTransactionBlocked)

	var storedSource models.BusinessEventSource
	require.NoError(t, testDB.First(&storedSource, "id = ?", source.ID).Error)
	config, configErr := unmarshalBusinessEventSourceStoredConfig(storedSource.Config)
	require.NoError(t, configErr)
	require.Equal(t, "Pending", config.Statuses[0].Code)
}

func TestCommitBusinessEventStatusRenameTransaction_RejectsRuleVersionConflict(t *testing.T) {
	testDB := setupWorkflowRoutingServiceTestDB(t)
	source := seedBusinessEventStatusTransactionSource(t, testDB)
	seedBusinessEventStatusTransactionRule(t, testDB, "SALES_ORDER_Pending_APPROVAL", 3)

	_, err := CommitBusinessEventStatusRenameTransaction(source.ID, BusinessEventStatusRenameTransactionRequest{
		ExpectedUpdatedAt: source.UpdatedAt.Format(time.RFC3339Nano),
		Statuses: []BusinessEventStatusTransactionStatusRequest{
			{ID: "status-1", Order: 0, Code: "Queued"},
			{ID: "status-2", Order: 1, Code: "Done"},
		},
		AffectedRules: []BusinessEventStatusTransactionAffectedRuleRequest{
			{RuleID: "rule-1", ExpectedVersion: 2},
		},
	})
	require.Error(t, err)
	require.ErrorIs(t, err, ErrBusinessEventStatusTransactionConflict)

	var storedRule models.NotificationRule
	require.NoError(t, testDB.First(&storedRule, "id = ?", "rule-1").Error)
	require.Equal(t, 3, storedRule.Version)
}
