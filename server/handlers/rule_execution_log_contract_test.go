package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func setupRuleExecutionLogHandlerTestDB(t *testing.T) {
	t.Helper()

	testDB := setupHandlerSQLiteTestDB(t)
	require.NoError(t, testDB.Exec(`CREATE TABLE rule_execution_logs (
		id TEXT PRIMARY KEY,
		created_at DATETIME,
		updated_at DATETIME,
		deleted_at DATETIME,
		event_key TEXT,
		entity TEXT,
		source_code TEXT,
		action_code TEXT,
		status_code TEXT,
		rule_id TEXT,
		rule_name TEXT,
		segment_id TEXT,
		segment_title TEXT,
		execution_type TEXT,
		execution_status TEXT,
		command_id TEXT,
		title TEXT,
		content TEXT,
		action_url TEXT,
		targets TEXT,
		metadata TEXT,
		result TEXT,
		error_message TEXT,
		triggered_at DATETIME
	)`).Error)
}

func TestSaveRuleExecutionLogHandler_NormalizesAndPersistsDTO(t *testing.T) {
	setupRuleExecutionLogHandlerTestDB(t)
	gin.SetMode(gin.TestMode)

	triggeredAt := time.Date(2026, 4, 18, 7, 30, 0, 0, time.UTC)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(
		http.MethodPost,
		"/system/routing/execution-logs",
		strings.NewReader(`{
			"id":"log-1",
			"eventKey":" event-1 ",
			"entity":" ORDER ",
			"sourceCode":" SALES_ORDER ",
			"actionCode":" STATUS_CHANGED ",
			"statusCode":" Pending ",
			"ruleId":" rule-1 ",
			"ruleName":" Sales Order Pending ",
			"segmentId":" segment-1 ",
			"segmentTitle":" Pending Review ",
			"executionType":" NOTIFY ",
			"executionStatus":" SUCCESS ",
			"commandId":" cmd-1 ",
			"title":" Pending Order ",
			"content":" Order SO-001 is pending ",
			"actionUrl":" /trading/orders/order-1 ",
			"targets":["alice","bob"],
			"metadata":{"OrderId":"order-1","sourceCode":"SALES_ORDER"},
			"result":{"mode":"live","targetCount":2},
			"errorMessage":" ",
			"triggeredAt":"2026-04-18T07:30:00Z"
		}`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")

	SaveRuleExecutionLogHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response services.RuleExecutionLogResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, "log-1", response.ID)
	require.Equal(t, "event-1", response.EventKey)
	require.Equal(t, "ORDER", response.Entity)
	require.Equal(t, "SALES_ORDER", response.SourceCode)
	require.Equal(t, "STATUS_CHANGED", response.ActionCode)
	require.Equal(t, "Pending", response.StatusCode)
	require.Equal(t, "rule-1", response.RuleID)
	require.Equal(t, "Sales Order Pending", response.RuleName)
	require.Equal(t, "segment-1", response.SegmentID)
	require.Equal(t, "Pending Review", response.SegmentTitle)
	require.Equal(t, "notify", response.ExecutionType)
	require.Equal(t, "success", response.ExecutionStatus)
	require.Equal(t, "cmd-1", response.CommandID)
	require.Equal(t, "Pending Order", response.Title)
	require.Equal(t, "Order SO-001 is pending", response.Content)
	require.Equal(t, "/trading/orders/order-1", response.ActionURL)
	require.True(t, response.TriggeredAt.Equal(triggeredAt))

	var responseTargets []string
	require.NoError(t, json.Unmarshal(response.Targets, &responseTargets))
	require.Equal(t, []string{"alice", "bob"}, responseTargets)

	var responseMetadata map[string]any
	require.NoError(t, json.Unmarshal(response.Metadata, &responseMetadata))
	require.Equal(t, "order-1", responseMetadata["OrderId"])
	require.Equal(t, "SALES_ORDER", responseMetadata["sourceCode"])

	var responseResult map[string]any
	require.NoError(t, json.Unmarshal(response.Result, &responseResult))
	require.Equal(t, "live", responseResult["mode"])
	require.Equal(t, float64(2), responseResult["targetCount"])

	var stored models.RuleExecutionLog
	require.NoError(t, db.DB.First(&stored, "id = ?", "log-1").Error)
	require.Equal(t, "event-1", stored.EventKey)
	require.Equal(t, "ORDER", stored.Entity)
	require.Equal(t, "SALES_ORDER", stored.SourceCode)
	require.Equal(t, "STATUS_CHANGED", stored.ActionCode)
	require.Equal(t, "Pending", stored.StatusCode)
	require.Equal(t, "rule-1", stored.RuleID)
	require.Equal(t, "Sales Order Pending", stored.RuleName)
	require.Equal(t, "segment-1", stored.SegmentID)
	require.Equal(t, "Pending Review", stored.SegmentTitle)
	require.Equal(t, "notify", stored.ExecutionType)
	require.Equal(t, "success", stored.ExecutionStatus)
	require.Equal(t, "cmd-1", stored.CommandID)
	require.Equal(t, "Pending Order", stored.Title)
	require.Equal(t, "Order SO-001 is pending", stored.Content)
	require.Equal(t, "/trading/orders/order-1", stored.ActionURL)
	require.True(t, stored.TriggeredAt.Equal(triggeredAt))
}

func TestGetRuleExecutionLogsHandler_ReturnsFilteredPaginatedDTO(t *testing.T) {
	setupRuleExecutionLogHandlerTestDB(t)
	gin.SetMode(gin.TestMode)

	seeded := []models.RuleExecutionLog{
		{
			BaseModel:       models.BaseModel{ID: "log-1"},
			EventKey:        "event-1",
			Entity:          "ORDER",
			SourceCode:      "SALES_ORDER",
			ActionCode:      "STATUS_CHANGED",
			StatusCode:      "Pending",
			RuleID:          "rule-1",
			RuleName:        "Sales Order Pending",
			SegmentID:       "segment-1",
			SegmentTitle:    "Pending Review",
			ExecutionType:   "notify",
			ExecutionStatus: "success",
			CommandID:       "cmd-1",
			Title:           "Pending Order",
			Content:         "Order SO-001 is pending",
			ActionURL:       "/trading/orders/order-1",
			Targets:         json.RawMessage(`["alice"]`),
			Metadata:        json.RawMessage(`{"OrderId":"order-1"}`),
			Result:          json.RawMessage(`{"mode":"live"}`),
			TriggeredAt:     time.Date(2026, 4, 18, 7, 30, 0, 0, time.UTC),
		},
		{
			BaseModel:       models.BaseModel{ID: "log-2"},
			EventKey:        "event-2",
			Entity:          "ORDER",
			SourceCode:      "SALES_ORDER",
			ActionCode:      "STATUS_CHANGED",
			StatusCode:      "Done",
			RuleID:          "rule-2",
			RuleName:        "Sales Order Done",
			SegmentID:       "segment-2",
			SegmentTitle:    "Done Review",
			ExecutionType:   "approval",
			ExecutionStatus: "success",
			CommandID:       "",
			Title:           "Approval Created",
			Content:         "Approval generated",
			ActionURL:       "/trading/orders/order-2",
			Targets:         json.RawMessage(`["manager-1"]`),
			Metadata:        json.RawMessage(`{"OrderId":"order-2"}`),
			Result:          json.RawMessage(`{"approvalProcessKey":"pk-2"}`),
			TriggeredAt:     time.Date(2026, 4, 18, 7, 0, 0, 0, time.UTC),
		},
	}
	for _, item := range seeded {
		require.NoError(t, db.DB.Create(&item).Error)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(
		http.MethodGet,
		"/system/routing/execution-logs?sourceCode=SALES_ORDER&executionType=NOTIFY&executionStatus=SUCCESS&page=1&pageSize=1",
		nil,
	)

	GetRuleExecutionLogsHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response services.RuleExecutionLogListResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, int64(1), response.Total)
	require.Equal(t, 1, response.Page)
	require.Equal(t, 1, response.PageSize)
	require.Len(t, response.Items, 1)
	require.Equal(t, "log-1", response.Items[0].ID)
	require.Equal(t, "notify", response.Items[0].ExecutionType)
	require.Equal(t, "success", response.Items[0].ExecutionStatus)
	require.Equal(t, "SALES_ORDER", response.Items[0].SourceCode)
}

func TestSaveRuleExecutionLogHandler_RejectsInvalidExecutionType(t *testing.T) {
	setupRuleExecutionLogHandlerTestDB(t)
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(
		http.MethodPost,
		"/system/routing/execution-logs",
		strings.NewReader(`{
			"id":"log-invalid",
			"sourceCode":"SALES_ORDER",
			"actionCode":"STATUS_CHANGED",
			"executionType":"INVALID_TYPE",
			"executionStatus":"SUCCESS"
		}`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")

	SaveRuleExecutionLogHandler(ctx)

	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "executionType")

	var count int64
	require.NoError(t, db.DB.Model(&models.RuleExecutionLog{}).Count(&count).Error)
	require.Zero(t, count)
}
