package services

import (
	"encoding/json"
	"fmt"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupSalesOrderBusinessEventTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(
		sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())),
		&gorm.Config{},
	)
	require.NoError(t, err)

	ddl := []string{
		`CREATE TABLE notification_rules (
			id text PRIMARY KEY,
			created_at datetime,
			updated_at datetime,
			deleted_at datetime,
			name text,
			enabled numeric,
			entity text,
			source_code text,
			action_code text,
			segments blob,
			version integer
		)`,
		`CREATE TABLE standard_commands (
			id text PRIMARY KEY,
			created_at datetime,
			updated_at datetime,
			deleted_at datetime,
			action_type text,
			bind_type text,
			node_type text,
			title text,
			content text,
			target_link text,
			params blob
		)`,
		`CREATE TABLE rule_execution_logs (
			id text PRIMARY KEY,
			created_at datetime,
			updated_at datetime,
			deleted_at datetime,
			event_key text,
			entity text,
			source_code text,
			action_code text,
			status_code text,
			rule_id text,
			rule_name text,
			segment_id text,
			segment_title text,
			execution_type text,
			execution_status text,
			command_id text,
			title text,
			content text,
			action_url text,
			targets blob,
			metadata blob,
			result blob,
			error_message text,
			triggered_at datetime
		)`,
		`CREATE TABLE approval_requests (
			id text PRIMARY KEY,
			requester_id text,
			target_id text,
			reason text,
			approver1_id text,
			approver2_id text,
			current_level integer,
			status text,
			auth_code text,
			expires_at datetime,
			module text,
			action text,
			created_at datetime,
			updated_at datetime,
			deleted_at datetime
		)`,
	}
	for _, sql := range ddl {
		require.NoError(t, testDB.Exec(sql).Error)
	}

	prevDB := db.DB
	prevRDB := db.RDB
	db.DB = testDB
	db.RDB = nil
	t.Cleanup(func() {
		db.DB = prevDB
		db.RDB = prevRDB
	})

	return testDB
}

func seedSalesOrderStatusRule(
	t *testing.T,
	testDB *gorm.DB,
	ruleID string,
	segment RuleSegmentDTO,
) {
	t.Helper()

	segments, err := json.Marshal([]RuleSegmentDTO{segment})
	require.NoError(t, err)
	require.NoError(t, testDB.Create(&models.NotificationRule{
		BaseModel:  models.BaseModel{ID: ruleID},
		Name:       "Sales order status routing",
		Enabled:    true,
		Entity:     businessEventEntityOrder,
		SourceCode: businessEventSourceSalesOrder,
		ActionCode: businessEventActionStatusChange,
		Segments:   segments,
		Version:    1,
	}).Error)
}

func TestDispatchSalesOrderStatusChangedTxExecutesCommandRule(t *testing.T) {
	testDB := setupSalesOrderBusinessEventTestDB(t)

	require.NoError(t, testDB.Create(&models.StandardCommand{
		BaseModel:  models.BaseModel{ID: "command-1"},
		Title:      "Order [OrderNo] is [Status]",
		Content:    "[Customer] changed from [PreviousStatus] to [NextStatus]",
		TargetLink: "/trading/orders/[OrderId]",
	}).Error)
	seedSalesOrderStatusRule(t, testDB, "rule-1", RuleSegmentDTO{
		ID:                "segment-pending",
		Title:             "Pending notification",
		TargetStatuses:    []string{"Pending"},
		CommandIDs:        []string{"command-1"},
		AssigneeUsernames: []string{"user-1"},
	})

	err := DispatchSalesOrderStatusChangedTx(testDB, models.SalesOrder{
		ID:           "order-1",
		OrderNo:      "SO-001",
		CustomerName: "Acme",
		Status:       "Pending",
		Version:      2,
	}, "Draft", "Pending", "actor-1", "operator-1")
	require.NoError(t, err)

	var logs []models.RuleExecutionLog
	require.NoError(t, testDB.Order("execution_type asc").Find(&logs).Error)
	require.Len(t, logs, 2)
	require.Equal(t, "match", logs[0].ExecutionType)
	require.Equal(t, "matched", logs[0].ExecutionStatus)
	require.Equal(t, "notify", logs[1].ExecutionType)
	require.Equal(t, "success", logs[1].ExecutionStatus)
	require.Equal(t, "Order SO-001 is Pending", logs[1].Title)
	require.Equal(t, "/trading/orders/order-1", logs[1].ActionURL)
	require.JSONEq(t, `["user-1"]`, string(logs[1].Targets))
	require.Contains(t, string(logs[1].Metadata), `"previousStatus":"Draft"`)
	require.Contains(t, string(logs[1].Metadata), `"nextStatus":"Pending"`)
}

func TestDispatchSalesOrderStatusChangedTxExecutesApprovalRule(t *testing.T) {
	testDB := setupSalesOrderBusinessEventTestDB(t)

	seedSalesOrderStatusRule(t, testDB, "rule-approval", RuleSegmentDTO{
		ID:             "segment-review",
		Title:          "Needs review",
		TargetStatuses: []string{"Pending"},
		Approval: &NotificationRuleApprovalDTO{
			Enabled:        true,
			Module:         "Trading",
			Action:         "ORDER_REVIEW",
			Approver1ID:    "approver-1",
			ReasonTemplate: "Review [OrderNo] for [Customer]",
		},
	})

	err := DispatchSalesOrderStatusChangedTx(testDB, models.SalesOrder{
		ID:           "order-2",
		OrderNo:      "SO-002",
		CustomerName: "Beta",
		Status:       "Pending",
		Version:      3,
	}, "Draft", "Pending", "requester-1", "operator-1")
	require.NoError(t, err)

	var request models.ApprovalRequest
	require.NoError(t, testDB.First(&request, "target_id = ?", "order-2").Error)
	require.Equal(t, "requester-1", request.RequesterID)
	require.Equal(t, "approver-1", request.Approver1ID)
	require.Equal(t, "Review SO-002 for Beta", request.Reason)

	var approvalLog models.RuleExecutionLog
	require.NoError(t, testDB.First(&approvalLog, "execution_type = ?", "approval").Error)
	require.Equal(t, "success", approvalLog.ExecutionStatus)
	require.JSONEq(t, `["approver-1"]`, string(approvalLog.Targets))
}
