package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func setupMoldCapacityHandlerTestDB(t *testing.T) {
	t.Helper()

	setupHandlerSQLiteTestDB(t)
	require.NoError(t, db.DB.Exec(`
		CREATE TABLE molds (
			id TEXT PRIMARY KEY,
			sn TEXT NOT NULL,
			name TEXT NOT NULL,
			max_cycles INTEGER,
			current_cycles INTEGER,
			maintenance_threshold INTEGER,
			total_life_cycles INTEGER,
			group_name TEXT,
			status TEXT,
			location TEXT,
			description TEXT,
			is_alerted BOOLEAN,
			last_checked_at DATETIME,
			image_url TEXT,
			created_by TEXT,
			updated_by TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error)
}

func TestGetMoldCapacityHandlerReturnsAggregatedCapacity(t *testing.T) {
	setupMoldCapacityHandlerTestDB(t)
	now := time.Now()

	require.NoError(t, db.DB.Exec(`
		INSERT INTO molds (id, sn, name, max_cycles, current_cycles, group_name, status, created_at, updated_at)
		VALUES
			('mold-1', 'M-001', 'Mold 1', 100, 20, 'MODEL-A', 'IDLE', ?, ?),
			('mold-2', 'M-002', 'Mold 2', 100, 85, 'MODEL-A', 'CHECKING', ?, ?),
			('mold-3', 'M-003', 'Mold 3', 100, 10, 'MODEL-A', 'LENT_OUT', ?, ?)
	`, now, now, now, now, now, now).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/molds/capacity?groupName=MODEL-A&requestedQty=90", nil)

	GetMoldCapacityHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response services.MoldCapacityCheckResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.False(t, response.IsSufficient)
	require.Equal(t, 80, response.TotalRemaining)
	require.Equal(t, 10, response.Shortage)
	require.Len(t, response.Instances, 3)
	require.Equal(t, "M-002", response.Instances[1].SN)
	require.Equal(t, 15, response.Instances[1].Health)
	require.Equal(t, "CHECKING", response.Instances[1].Status)
}

func TestCheckMoldCapacityAlertsHandlerReturnsOnlyAlertingModels(t *testing.T) {
	setupMoldCapacityHandlerTestDB(t)
	now := time.Now()

	require.NoError(t, db.DB.Exec(`
		INSERT INTO molds (id, sn, name, max_cycles, current_cycles, group_name, status, created_at, updated_at)
		VALUES
			('mold-1', 'M-001', 'Mold 1', 100, 20, 'MODEL-A', 'IDLE', ?, ?),
			('mold-2', 'M-002', 'Mold 2', 100, 85, 'MODEL-A', 'CHECKING', ?, ?),
			('mold-3', 'M-003', 'Mold 3', 100, 10, 'MODEL-B', 'IDLE', ?, ?)
	`, now, now, now, now, now, now).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(
		http.MethodPost,
		"/api/v1/molds/capacity-alerts",
		strings.NewReader(`[{"groupName":"MODEL-A","requestedQty":50},{"groupName":"MODEL-B","requestedQty":20}]`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")

	CheckMoldCapacityAlertsHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []services.MoldCapacityAlert
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 1)
	require.Equal(t, "MODEL-A", response[0].ModelName)
	require.Equal(t, 50, response[0].TotalQty)
	require.True(t, response[0].IsSufficient)
	require.Equal(t, 80, response[0].TotalRemaining)
	require.Len(t, response[0].CriticalMolds, 1)
	require.Equal(t, "M-002", response[0].CriticalMolds[0].SN)
}
