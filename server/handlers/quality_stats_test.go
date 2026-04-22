package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetInspectionStatsHandlerCountsTaskResults(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)

	require.NoError(t, db.DB.Exec(`
		CREATE TABLE inspection_tasks (
			id TEXT PRIMARY KEY,
			batch_no TEXT,
			result TEXT,
			deleted_at DATETIME
		)
	`).Error)

	require.NoError(t, db.DB.Exec(`
		INSERT INTO inspection_tasks (id, batch_no, result, deleted_at)
		VALUES
			('task-pending-1', 'LOT-PENDING-1', 'PENDING', NULL),
			('task-pending-2', 'LOT-PENDING-2', 'PENDING', NULL),
			('task-pass-1', 'LOT-PASS-1', 'PASS', NULL),
			('task-fail-1', 'LOT-FAIL-1', 'FAIL', NULL),
			('task-conditional-1', 'LOT-CONDITIONAL-1', 'CONDITIONAL', NULL),
			('task-deleted-pending', 'LOT-DELETED-PENDING', 'PENDING', CURRENT_TIMESTAMP)
	`).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/quality/stats", nil)

	GetInspectionStatsHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response InspectionStatsResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, int64(2), response.PendingCount)
	require.Equal(t, int64(1), response.PassCount)
	require.Equal(t, int64(1), response.FailCount)
}
