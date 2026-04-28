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

func setupPositionsContractRegressionTestDB(t *testing.T, includeOrganizations bool) {
	t.Helper()
	setupHandlerSQLiteTestDB(t)

	statements := []string{
		`CREATE TABLE positions (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT NOT NULL,
			code TEXT,
			org_unit_id TEXT,
			production_unit_id TEXT,
			category TEXT,
			level INTEGER,
			is_managerial BOOLEAN,
			status TEXT,
			sort_order INTEGER,
			metadata TEXT
		)`,
	}

	if includeOrganizations {
		statements = append(statements, `CREATE TABLE organizations (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT NOT NULL,
			parent_id TEXT,
			manager TEXT,
			description TEXT,
			type TEXT,
			linked_architecture BLOB
		)`)
	}

	for _, stmt := range statements {
		require.NoError(t, db.DB.Exec(stmt).Error)
	}
}

func performGetPositionsRequest(t *testing.T) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/positions", nil)
	GetPositionsHandler(ctx)
	return recorder
}

func TestGetPositionsHandlerReturns200WithoutOrganizationsTable(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupPositionsContractRegressionTestDB(t, false)

	require.NoError(t, db.DB.Exec(`
		INSERT INTO positions (id, name, code, org_unit_id, status, sort_order, metadata)
		VALUES ('position-1', 'Supervisor', 'SUP', 'org-missing', 'active', 1, '{}')
	`).Error)

	recorder := performGetPositionsRequest(t)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload []struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		OrgUnitName string `json:"orgUnitName"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Len(t, payload, 1)
	require.Equal(t, "position-1", payload[0].ID)
	require.Equal(t, "Supervisor", payload[0].Name)
	require.Equal(t, "", payload[0].OrgUnitName)
}

func TestGetPositionsHandlerReturnsJoinedOrganizationNameWhenTableExists(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupPositionsContractRegressionTestDB(t, true)

	require.NoError(t, db.DB.Exec(`
		INSERT INTO organizations (id, name)
		VALUES ('org-1', 'Manufacturing')
	`).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO positions (id, name, code, org_unit_id, status, sort_order, metadata)
		VALUES ('position-2', 'Lead Operator', 'LOP', 'org-1', 'active', 2, '{}')
	`).Error)

	recorder := performGetPositionsRequest(t)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload []struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		OrgUnitName string `json:"orgUnitName"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Len(t, payload, 1)
	require.Equal(t, "position-2", payload[0].ID)
	require.Equal(t, "Lead Operator", payload[0].Name)
	require.Equal(t, "Manufacturing", payload[0].OrgUnitName)
}
