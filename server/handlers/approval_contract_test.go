package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

func setupApprovalHandlerContractDB(t *testing.T) {
	t.Helper()

	testDB := setupHandlerSQLiteTestDB(t)
	require.NoError(t, testDB.Exec(`CREATE TABLE approval_requests (
		id TEXT PRIMARY KEY,
		requester_id TEXT,
		target_id TEXT,
		reason TEXT,
		approver1_id TEXT,
		approver2_id TEXT,
		current_level INTEGER,
		status TEXT,
		auth_code TEXT,
		expires_at DATETIME,
		module TEXT,
		action TEXT,
		created_at DATETIME,
		updated_at DATETIME,
		deleted_at DATETIME
	)`).Error)

	prevRDB := db.RDB
	db.RDB = redis.NewClient(&redis.Options{Addr: "127.0.0.1:0"})
	t.Cleanup(func() {
		_ = db.RDB.Close()
		db.RDB = prevRDB
	})
}

func TestRequestApprovalHandler_CreatesRuleDrivenApprovalRequest(t *testing.T) {
	setupApprovalHandlerContractDB(t)
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(
		http.MethodPost,
		"/approvals/request",
		strings.NewReader(`{
			"module":"Trading",
			"action":"ORDER_REVIEW",
			"targetId":"order-1",
			"reason":"rule matched",
			"approver1Id":"11111111-1111-1111-1111-111111111111",
			"approver2Id":"22222222-2222-2222-2222-222222222222"
		}`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("userId", "33333333-3333-3333-3333-333333333333")

	RequestApprovalHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Body.String(), `"module":"Trading"`)
	require.Contains(t, recorder.Body.String(), `"action":"ORDER_REVIEW"`)
	require.Contains(t, recorder.Body.String(), `"targetId":"order-1"`)
	require.Contains(
		t,
		recorder.Body.String(),
		`"approver1Id":"11111111-1111-1111-1111-111111111111"`,
	)
	require.Contains(
		t,
		recorder.Body.String(),
		`"approver2Id":"22222222-2222-2222-2222-222222222222"`,
	)

	var stored models.ApprovalRequest
	require.NoError(t, db.DB.First(&stored).Error)
	require.Equal(t, "Trading", stored.Module)
	require.Equal(t, "ORDER_REVIEW", stored.Action)
	require.Equal(t, "order-1", stored.TargetID)
	require.Equal(t, "33333333-3333-3333-3333-333333333333", stored.RequesterID)
	require.Equal(t, "11111111-1111-1111-1111-111111111111", stored.Approver1ID)
	require.Equal(t, "22222222-2222-2222-2222-222222222222", stored.Approver2ID)
}

func TestRequestApprovalHandler_RejectsMissingApproverChain(t *testing.T) {
	setupApprovalHandlerContractDB(t)
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(
		http.MethodPost,
		"/approvals/request",
		strings.NewReader(`{
			"module":"Trading",
			"action":"ORDER_REVIEW",
			"targetId":"order-2",
			"reason":"missing approver"
		}`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("userId", "44444444-4444-4444-4444-444444444444")

	RequestApprovalHandler(ctx)

	require.Equal(t, http.StatusBadRequest, recorder.Code)

	var count int64
	require.NoError(t, db.DB.Model(&models.ApprovalRequest{}).Count(&count).Error)
	require.Zero(t, count)
}
