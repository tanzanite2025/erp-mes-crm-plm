package services

import (
	"fmt"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupWorkflowRoutingServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(
		sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())),
		&gorm.Config{},
	)
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE notification_rules (
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
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE business_event_sources (
			id text PRIMARY KEY,
			created_at datetime,
			updated_at datetime,
			deleted_at datetime,
			code text NOT NULL,
			name text NOT NULL,
			module text,
			entity text,
			enabled numeric,
			description text,
			config blob
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE standard_commands (
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
		)
	`).Error)

	prev := db.DB
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = prev
	})

	return testDB
}

func seedWorkflowRoutingEventSource(t *testing.T, testDB *gorm.DB) {
	t.Helper()

	require.NoError(t, testDB.Create(&models.BusinessEventSource{
		BaseModel: models.BaseModel{ID: "source-1"},
		Code:      "SALES_ORDER",
		Name:      "Sales Order",
		Module:    "Trading",
		Entity:    "ORDER",
		Enabled:   true,
		Config: []byte(`{
			"actions":[{"id":"action-1","order":0,"code":"STATUS_CHANGED","name":"Status Changed","kind":"status"}],
			"statuses":[
				{"id":"status-1","order":0,"code":"Pending","label":"Pending","phase":"pending","isTerminal":false,"defaultResolve":false},
				{"id":"status-2","order":1,"code":"Done","label":"Done","phase":"done","isTerminal":true,"defaultResolve":true}
			],
			"fields":[],
			"dynamicResolvers":[{"id":"resolver-1","order":0,"code":"createdBy","label":"Created By","path":"createdBy","type":"user"}],
			"defaultActionUrlTemplate":"/trading/orders/[OrderId]"
		}`),
	}).Error)
	require.NoError(t, testDB.Create(&models.BusinessEventSource{
		BaseModel: models.BaseModel{ID: "source-2"},
		Code:      "PURCHASE_ORDER",
		Name:      "Purchase Order",
		Module:    "Trading",
		Entity:    "ORDER",
		Enabled:   true,
		Config: []byte(`{
			"actions":[{"id":"action-1","order":0,"code":"STATUS_CHANGED","name":"Status Changed","kind":"status"}],
			"statuses":[{"id":"status-1","order":0,"code":"Received","label":"Received","phase":"done","isTerminal":true,"defaultResolve":true}],
			"fields":[],
			"dynamicResolvers":[],
			"defaultActionUrlTemplate":"/purchase/orders/[PurchaseOrderId]"
		}`),
	}).Error)
	require.NoError(t, testDB.Create(&models.BusinessEventSource{
		BaseModel: models.BaseModel{ID: "source-3"},
		Code:      "PRODUCTION_PLAN",
		Name:      "Production Plan",
		Module:    "Production",
		Entity:    "SYSTEM",
		Enabled:   true,
		Config: []byte(`{
			"actions":[{"id":"action-1","order":0,"code":"STATUS_CHANGED","name":"Status Changed","kind":"status"}],
			"statuses":[{"id":"status-1","order":0,"code":"COMPLETED","label":"Completed","phase":"done","isTerminal":true,"defaultResolve":true}],
			"fields":[],
			"dynamicResolvers":[],
			"defaultActionUrlTemplate":"/dashboard/calendar?planId=[PlanId]"
		}`),
	}).Error)
}

func TestMapNotificationRuleRequestToModel_NormalizesMissingSegmentID(t *testing.T) {
	model, err := MapNotificationRuleRequestToModel(NotificationRuleRequest{
		Name:       "Broken rule",
		Enabled:    true,
		Entity:     "ORDER",
		SourceCode: "SALES_ORDER",
		ActionCode: "STATUS_CHANGED",
		Segments: []RuleSegmentDTO{
			{
				Title:          "Missing id",
				TargetStatuses: []string{"Pending"},
			},
		},
		Version: 1,
	})

	require.NoError(t, err)

	segments, err := unmarshalNotificationRuleSegments(model.Segments)
	require.NoError(t, err)
	require.Len(t, segments, 1)
	require.Equal(t, "segment-missing-id-pending-1", segments[0].ID)
}

func TestMapNotificationRuleToResponse_NormalizesLegacySegmentIDs(t *testing.T) {
	response, err := MapNotificationRuleToResponse(models.NotificationRule{
		BaseModel:  models.BaseModel{ID: "rule-legacy"},
		Name:       "Legacy rule",
		Enabled:    true,
		Entity:     "ORDER",
		SourceCode: "SALES_ORDER",
		ActionCode: "STATUS_CHANGED",
		Segments: []byte(`[
			{
				"title":"Pending Review",
				"targetStatuses":["Pending"],
				"commandIds":[],
				"assigneeRoles":[],
				"assigneeUsernames":[],
				"resolveOnStatuses":["Done"],
				"dynamicRoleField":null
			}
		]`),
		Version: 3,
	})
	require.NoError(t, err)
	require.Len(t, response.Segments, 1)
	require.Equal(t, "segment-pending-review-pending-1", response.Segments[0].ID)
}

func TestListNotificationRules_MigratesSalesOrderRulesToStatusChangedEvent(t *testing.T) {
	testDB := setupWorkflowRoutingServiceTestDB(t)
	seedWorkflowRoutingEventSource(t, testDB)

	require.NoError(t, testDB.Create(&models.NotificationRule{
		BaseModel:  models.BaseModel{ID: "rule-legacy-sales"},
		Name:       "Legacy sales approval",
		Enabled:    true,
		Entity:     "ORDER",
		SourceCode: "ORDER",
		ActionCode: "ORDER_REVIEW",
		Segments: []byte(`[{
			"id":"segment-1",
			"title":"Pending approval",
			"targetStatuses":["Pending"],
			"commandIds":[],
			"assigneeRoles":[],
			"assigneeUsernames":[],
			"resolveOnStatuses":["Done"],
			"dynamicRoleField":null
		}]`),
		Version: 1,
	}).Error)

	rules, err := ListNotificationRules()
	require.NoError(t, err)
	require.Len(t, rules, 1)
	require.Equal(t, "ORDER", rules[0].Entity)
	require.Equal(t, "SALES_ORDER", rules[0].SourceCode)
	require.Equal(t, "STATUS_CHANGED", rules[0].ActionCode)

	var stored models.NotificationRule
	require.NoError(t, testDB.First(&stored, "id = ?", "rule-legacy-sales").Error)
	require.Equal(t, "SALES_ORDER", stored.SourceCode)
	require.Equal(t, "STATUS_CHANGED", stored.ActionCode)
}

func TestCreateNotificationRule_MigratesSalesOrderRulesBeforeValidation(t *testing.T) {
	testDB := setupWorkflowRoutingServiceTestDB(t)
	seedWorkflowRoutingEventSource(t, testDB)

	rule, err := MapNotificationRuleRequestToModel(NotificationRuleRequest{
		Name:       "Legacy sales action",
		Enabled:    true,
		Entity:     "ORDER",
		SourceCode: "SALES_ORDER",
		ActionCode: "SALES_ORDER_PENDING_APPROVAL",
		Segments: []RuleSegmentDTO{
			{
				ID:             "segment-1",
				Title:          "Pending",
				TargetStatuses: []string{"Pending"},
			},
		},
		Version: 1,
	})
	require.NoError(t, err)

	created, err := CreateNotificationRule(rule)
	require.NoError(t, err)
	require.Equal(t, "SALES_ORDER", created.SourceCode)
	require.Equal(t, "STATUS_CHANGED", created.ActionCode)
}

func TestCreateNotificationRule_MigratesPurchaseAndProductionRulesBeforeValidation(t *testing.T) {
	testDB := setupWorkflowRoutingServiceTestDB(t)
	seedWorkflowRoutingEventSource(t, testDB)

	purchaseRule, err := MapNotificationRuleRequestToModel(NotificationRuleRequest{
		Name:       "Purchase received",
		Enabled:    true,
		Entity:     "ORDER",
		SourceCode: "PURCHASE_ORDER",
		ActionCode: "RECEIVED",
		Segments: []RuleSegmentDTO{
			{ID: "segment-1", Title: "Received", TargetStatuses: []string{"Received"}},
		},
		Version: 1,
	})
	require.NoError(t, err)
	createdPurchase, err := CreateNotificationRule(purchaseRule)
	require.NoError(t, err)
	require.Equal(t, "STATUS_CHANGED", createdPurchase.ActionCode)

	productionRule, err := MapNotificationRuleRequestToModel(NotificationRuleRequest{
		Name:       "Production completed",
		Enabled:    true,
		Entity:     "SYSTEM",
		SourceCode: "PRODUCTION_PLAN",
		ActionCode: "COMPLETED",
		Segments: []RuleSegmentDTO{
			{ID: "segment-1", Title: "Completed", TargetStatuses: []string{"COMPLETED"}},
		},
		Version: 1,
	})
	require.NoError(t, err)
	createdProduction, err := CreateNotificationRule(productionRule)
	require.NoError(t, err)
	require.Equal(t, "STATUS_CHANGED", createdProduction.ActionCode)
}

func TestUpdateNotificationRule_AllowsEmptySegments(t *testing.T) {
	testDB := setupWorkflowRoutingServiceTestDB(t)
	seedWorkflowRoutingEventSource(t, testDB)
	existing := models.NotificationRule{
		BaseModel:  models.BaseModel{ID: "rule-1"},
		Name:       "Sales order routing",
		Enabled:    true,
		Entity:     "ORDER",
		SourceCode: "SALES_ORDER",
		ActionCode: "STATUS_CHANGED",
		Segments: []byte(`[
			{
				"id":"segment-1",
				"title":"Pending",
				"targetStatuses":["Pending"],
				"commandIds":[],
				"assigneeRoles":[],
				"assigneeUsernames":[],
				"resolveOnStatuses":[],
				"dynamicRoleField":null
			}
		]`),
		Version: 1,
	}
	require.NoError(t, testDB.Create(&existing).Error)

	patch, err := MapNotificationRuleRequestToModel(NotificationRuleRequest{
		Name:       existing.Name,
		Enabled:    existing.Enabled,
		Entity:     existing.Entity,
		SourceCode: existing.SourceCode,
		ActionCode: existing.ActionCode,
		Segments:   []RuleSegmentDTO{},
		Version:    2,
	})
	require.NoError(t, err)

	updated, err := UpdateNotificationRule(existing.ID, patch)
	require.NoError(t, err)
	require.JSONEq(t, `[]`, string(updated.Segments))

	response, err := MapNotificationRuleToResponse(updated)
	require.NoError(t, err)
	require.Empty(t, response.Segments)
	require.Equal(t, 2, response.Version)
}

func TestCreateNotificationRule_RejectsUnknownStatusReference(t *testing.T) {
	testDB := setupWorkflowRoutingServiceTestDB(t)
	seedWorkflowRoutingEventSource(t, testDB)

	rule, err := MapNotificationRuleRequestToModel(NotificationRuleRequest{
		Name:       "Invalid status rule",
		Enabled:    true,
		Entity:     "ORDER",
		SourceCode: "SALES_ORDER",
		ActionCode: "STATUS_CHANGED",
		Segments: []RuleSegmentDTO{
			{
				ID:             "segment-1",
				Title:          "Waiting",
				TargetStatuses: []string{"Waiting"},
			},
		},
		Version: 1,
	})
	require.NoError(t, err)

	_, err = CreateNotificationRule(rule)
	require.Error(t, err)
	require.Contains(t, err.Error(), "unknown status")
}
