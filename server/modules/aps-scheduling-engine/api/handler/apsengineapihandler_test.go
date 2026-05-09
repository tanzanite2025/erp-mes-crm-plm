package apsschedulingengine

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestBuildCalendarInputReturnsNonEmptyCalendarDays(t *testing.T) {
	calendar, err := buildCalendarInput(nil, "2026-04-23", "2026-04-25")
	require.NoError(t, err)
	require.Len(t, calendar, 3)
	require.True(t, calendar[0].IsWorkday)
}

func TestBuildCalendarInputRejectsInvalidDateRange(t *testing.T) {
	calendar, err := buildCalendarInput(nil, "2026-04-25", "2026-04-23")
	require.Error(t, err)
	require.Nil(t, calendar)
}

func TestBuildCalendarInputMarksWeekendAsStopDay(t *testing.T) {
	calendar, err := buildCalendarInput(nil, "2026-04-26", "2026-04-26")
	require.NoError(t, err)
	require.Len(t, calendar, 1)
	require.True(t, calendar[0].IsStopDay)
}

func TestCreatePlanRejectsInvalidDateRange(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewAPIHandler(nil)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/aps-scheduling/plans", strings.NewReader(`{"orderIds":["A-001"],"startDate":"2026-04-25","endDate":"2026-04-23"}`))
	ctx.Request.Header.Set("Content-Type", "application/json")

	handler.CreatePlan(ctx)

	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())
}

func TestCreatePlanReturnsOKWithCalendarInput(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewAPIHandler(nil)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/aps-scheduling/plans", strings.NewReader(`{"orderIds":["A-001"],"startDate":"2026-04-23","endDate":"2026-04-24"}`))
	ctx.Request.Header.Set("Content-Type", "application/json")

	handler.CreatePlan(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
}

func TestListPlansReturnsStablePaginatedResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewAPIHandler(nil)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/aps-scheduling/plans?page=2&pageSize=25", nil)

	handler.ListPlans(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, float64(2), payload["page"])
	require.Equal(t, float64(25), payload["pageSize"])
	require.Equal(t, float64(0), payload["total"])
	require.Contains(t, payload, "items")
	require.IsType(t, []any{}, payload["items"])
}

func TestRecalculatePlanReturnsOKWithCalendarInput(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewAPIHandler(nil)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: "plan-1"}}
	ctx.Request = httptest.NewRequest(http.MethodPost, "/aps-scheduling/plans/plan-1/recalculate", strings.NewReader(`{"reason":"calendar refresh","scope":"global","startDate":"2026-04-23","endDate":"2026-04-24"}`))
	ctx.Request.Header.Set("Content-Type", "application/json")

	handler.RecalculatePlan(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
}

func TestIngestEventReturnsOKWithSystemDefaultCalendarInput(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewAPIHandler(nil)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/aps-scheduling/events", strings.NewReader(`{"type":"calendar.changed","source":"aps","payload":{"reason":"holiday sync"},"startDate":"2026-04-27","endDate":"2026-04-27"}`))
	ctx.Request.Header.Set("Content-Type", "application/json")

	handler.IngestEvent(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, true, payload["accepted"])
}
