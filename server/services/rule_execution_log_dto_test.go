package services

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestNormalizeRuleExecutionLogRequest_TrimsAndNormalizesPayload(t *testing.T) {
	triggeredAt := time.Date(2026, 4, 18, 10, 0, 0, 0, time.FixedZone("UTC+8", 8*60*60))

	normalized, err := normalizeRuleExecutionLogRequest(RuleExecutionLogRequest{
		ID:              " log-1 ",
		EventKey:        " event-1 ",
		Entity:          " ORDER ",
		SourceCode:      " SALES_ORDER ",
		ActionCode:      " STATUS_CHANGED ",
		StatusCode:      " Pending ",
		RuleID:          " rule-1 ",
		RuleName:        " Sales Order Pending ",
		SegmentID:       " segment-1 ",
		SegmentTitle:    " Pending Review ",
		ExecutionType:   " NOTIFY ",
		ExecutionStatus: " SUCCESS ",
		CommandID:       " cmd-1 ",
		Title:           " Pending Order ",
		Content:         " Order SO-001 is pending ",
		ActionURL:       " /trading/orders/order-1 ",
		Targets:         json.RawMessage(` ["alice","bob"] `),
		Metadata:        json.RawMessage(` {"OrderId":"order-1"} `),
		Result:          json.RawMessage(` {"mode":"live"} `),
		ErrorMessage:    " failed message ",
		TriggeredAt:     &triggeredAt,
	})

	require.NoError(t, err)
	require.Equal(t, "log-1", normalized.ID)
	require.Equal(t, "event-1", normalized.EventKey)
	require.Equal(t, "ORDER", normalized.Entity)
	require.Equal(t, "SALES_ORDER", normalized.SourceCode)
	require.Equal(t, "STATUS_CHANGED", normalized.ActionCode)
	require.Equal(t, "Pending", normalized.StatusCode)
	require.Equal(t, "rule-1", normalized.RuleID)
	require.Equal(t, "Sales Order Pending", normalized.RuleName)
	require.Equal(t, "segment-1", normalized.SegmentID)
	require.Equal(t, "Pending Review", normalized.SegmentTitle)
	require.Equal(t, "notify", normalized.ExecutionType)
	require.Equal(t, "success", normalized.ExecutionStatus)
	require.Equal(t, "cmd-1", normalized.CommandID)
	require.Equal(t, "Pending Order", normalized.Title)
	require.Equal(t, "Order SO-001 is pending", normalized.Content)
	require.Equal(t, "/trading/orders/order-1", normalized.ActionURL)
	require.Equal(t, "failed message", normalized.ErrorMessage)
	require.JSONEq(t, `["alice","bob"]`, string(normalized.Targets))
	require.JSONEq(t, `{"OrderId":"order-1"}`, string(normalized.Metadata))
	require.JSONEq(t, `{"mode":"live"}`, string(normalized.Result))
	require.Same(t, &triggeredAt, normalized.TriggeredAt)
}

func TestNormalizeRuleExecutionLogRequest_FillsDefaultJSONPayloads(t *testing.T) {
	normalized, err := normalizeRuleExecutionLogRequest(RuleExecutionLogRequest{})

	require.NoError(t, err)
	require.JSONEq(t, `[]`, string(normalized.Targets))
	require.JSONEq(t, `{}`, string(normalized.Metadata))
	require.JSONEq(t, `{}`, string(normalized.Result))
}

func TestNormalizeRuleExecutionLogRequest_RejectsInvalidJSONPayload(t *testing.T) {
	_, err := normalizeRuleExecutionLogRequest(RuleExecutionLogRequest{
		Targets: json.RawMessage(`{invalid json}`),
	})

	require.Error(t, err)
	require.Contains(t, err.Error(), "targets")
}

func TestValidateRuleExecutionLogRequest_RejectsMissingAndInvalidEnums(t *testing.T) {
	err := validateRuleExecutionLogRequest(RuleExecutionLogRequest{
		SourceCode:      "SALES_ORDER",
		ActionCode:      "STATUS_CHANGED",
		ExecutionType:   "invalid",
		ExecutionStatus: "success",
	})

	require.Error(t, err)
	require.Contains(t, err.Error(), "executionType")

	err = validateRuleExecutionLogRequest(RuleExecutionLogRequest{
		SourceCode:      "SALES_ORDER",
		ActionCode:      "STATUS_CHANGED",
		ExecutionType:   "notify",
		ExecutionStatus: "invalid",
	})

	require.Error(t, err)
	require.Contains(t, err.Error(), "executionStatus")
}

func TestValidateRuleExecutionLogRequest_AcceptsAllowedShape(t *testing.T) {
	err := validateRuleExecutionLogRequest(RuleExecutionLogRequest{
		SourceCode:      "SALES_ORDER",
		ActionCode:      "STATUS_CHANGED",
		ExecutionType:   "notify",
		ExecutionStatus: "success",
	})

	require.NoError(t, err)
}

func TestMapRuleExecutionLogRequestToModel_NormalizesAndMapsUTCTriggeredAt(t *testing.T) {
	triggeredAt := time.Date(2026, 4, 18, 10, 0, 0, 0, time.FixedZone("UTC+8", 8*60*60))

	model, err := MapRuleExecutionLogRequestToModel(RuleExecutionLogRequest{
		ID:              " log-1 ",
		EventKey:        " event-1 ",
		Entity:          " ORDER ",
		SourceCode:      " SALES_ORDER ",
		ActionCode:      " STATUS_CHANGED ",
		StatusCode:      " Pending ",
		RuleID:          " rule-1 ",
		RuleName:        " Sales Order Pending ",
		SegmentID:       " segment-1 ",
		SegmentTitle:    " Pending Review ",
		ExecutionType:   " NOTIFY ",
		ExecutionStatus: " SUCCESS ",
		CommandID:       " cmd-1 ",
		Title:           " Pending Order ",
		Content:         " Order SO-001 is pending ",
		ActionURL:       " /trading/orders/order-1 ",
		Targets:         json.RawMessage(`["alice"]`),
		Metadata:        json.RawMessage(`{"OrderId":"order-1"}`),
		Result:          json.RawMessage(`{"mode":"live"}`),
		TriggeredAt:     &triggeredAt,
	})

	require.NoError(t, err)
	require.Equal(t, "log-1", model.ID)
	require.Equal(t, "event-1", model.EventKey)
	require.Equal(t, "ORDER", model.Entity)
	require.Equal(t, "SALES_ORDER", model.SourceCode)
	require.Equal(t, "STATUS_CHANGED", model.ActionCode)
	require.Equal(t, "Pending", model.StatusCode)
	require.Equal(t, "rule-1", model.RuleID)
	require.Equal(t, "Sales Order Pending", model.RuleName)
	require.Equal(t, "segment-1", model.SegmentID)
	require.Equal(t, "Pending Review", model.SegmentTitle)
	require.Equal(t, "notify", model.ExecutionType)
	require.Equal(t, "success", model.ExecutionStatus)
	require.Equal(t, "cmd-1", model.CommandID)
	require.Equal(t, "Pending Order", model.Title)
	require.Equal(t, "Order SO-001 is pending", model.Content)
	require.Equal(t, "/trading/orders/order-1", model.ActionURL)
	require.JSONEq(t, `["alice"]`, string(model.Targets))
	require.JSONEq(t, `{"OrderId":"order-1"}`, string(model.Metadata))
	require.JSONEq(t, `{"mode":"live"}`, string(model.Result))
	require.True(t, model.TriggeredAt.Equal(triggeredAt.UTC()))
}

func TestMapRuleExecutionLogRequestToModel_DefaultsTriggeredAtWhenMissing(t *testing.T) {
	before := time.Now().Add(-1 * time.Second)
	model, err := MapRuleExecutionLogRequestToModel(RuleExecutionLogRequest{
		SourceCode:      "SALES_ORDER",
		ActionCode:      "STATUS_CHANGED",
		ExecutionType:   "notify",
		ExecutionStatus: "success",
	})
	after := time.Now().Add(1 * time.Second)

	require.NoError(t, err)
	require.True(t, !model.TriggeredAt.Before(before))
	require.True(t, !model.TriggeredAt.After(after))
	require.JSONEq(t, `[]`, string(model.Targets))
	require.JSONEq(t, `{}`, string(model.Metadata))
	require.JSONEq(t, `{}`, string(model.Result))
}
