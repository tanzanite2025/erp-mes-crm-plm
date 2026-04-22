package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetProductionPlansHandlerRejectsInvalidStatusQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/production/plans?status=PLANNING", nil)

	GetProductionPlansHandler(c)

	require.Equal(t, http.StatusBadRequest, recorder.Code)
	require.Contains(t, recorder.Body.String(), "非法生产计划状态")
	require.Contains(t, recorder.Body.String(), "PLANNING")
}

func TestSaveProductionPlanHandlerRejectsInvalidPlanStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(
		http.MethodPost,
		"/production/plans",
		strings.NewReader(`{"orderNo":"SO-001","status":"PLANNING","tasks":[]}`),
	)
	c.Request.Header.Set("Content-Type", "application/json")

	SaveProductionPlanHandler(c)

	require.Equal(t, http.StatusBadRequest, recorder.Code)
	require.Contains(t, recorder.Body.String(), "invalid production plan status")
	require.Contains(t, recorder.Body.String(), "PLANNING")
}

func TestSaveProductionPlanHandlerRejectsInvalidTaskStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(
		http.MethodPost,
		"/production/plans",
		strings.NewReader(`{"orderNo":"SO-001","status":"SCHEDULED","tasks":[{"status":"SCHEDULED"}]}`),
	)
	c.Request.Header.Set("Content-Type", "application/json")

	SaveProductionPlanHandler(c)

	require.Equal(t, http.StatusBadRequest, recorder.Code)
	require.Contains(t, recorder.Body.String(), "invalid production task status")
	require.Contains(t, recorder.Body.String(), "tasks[0]")
}
