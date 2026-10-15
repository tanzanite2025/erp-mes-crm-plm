package services

import (
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"testing"
)

const pieceworkTestEmployeeID = "11111111-1111-4111-8111-111111111111"
const pieceworkTestTeamID = "22222222-2222-4222-8222-222222222222"
const pieceworkTestReportingUserID = "33333333-3333-4333-8333-333333333333"

func seedPieceworkAttributionTestIdentities(t *testing.T, database *gorm.DB) {
	t.Helper()
	for _, statement := range []string{
		`CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY, deleted_at DATETIME, staff_id TEXT, name TEXT, status TEXT)`,
		`CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, deleted_at DATETIME, code TEXT, name TEXT, status TEXT)`,
		`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, deleted_at DATETIME, username TEXT, employee_id TEXT, status TEXT)`,
	} {
		if database.Dialector.Name() == "sqlite" {
			require.NoError(t, database.Exec(statement).Error)
		}
	}
	require.NoError(t, database.Table("employees").Create(map[string]any{"id": pieceworkTestEmployeeID, "staff_id": "PW-001", "name": "Piecework employee", "status": "active"}).Error)
	require.NoError(t, database.Table("teams").Create(map[string]any{"id": pieceworkTestTeamID, "code": "PW-TEAM", "name": "Piecework team", "status": "active"}).Error)
	// Real PostgreSQL user tables contain additional account constraints. Self-reporting
	// integration tests create a complete account separately.
	if database.Dialector.Name() == "sqlite" {
		require.NoError(t, database.Table("users").Create(map[string]any{"id": pieceworkTestReportingUserID, "username": "reporting-account", "employee_id": pieceworkTestEmployeeID, "status": "active"}).Error)
	}
}
