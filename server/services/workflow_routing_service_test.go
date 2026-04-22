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
