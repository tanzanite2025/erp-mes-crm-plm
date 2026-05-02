package services

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupRoleAuditServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	statements := []string{
		`CREATE TABLE roles (
			id TEXT PRIMARY KEY,
			role_id TEXT NOT NULL UNIQUE,
			label TEXT,
			color TEXT,
			permissions TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE users (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			email TEXT,
			phone_number TEXT,
			first_name TEXT,
			last_name TEXT,
			status TEXT,
			role TEXT,
			employee_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY NOT NULL,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)`,
	}
	for _, statement := range statements {
		require.NoError(t, testDB.Exec(statement).Error)
	}

	db.DB = testDB
	t.Cleanup(func() {
		db.DB = prevDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return testDB
}

func roleAuditServiceContext() context.Context {
	return audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "role-audit-user-id",
		Username: "role-auditor",
		IP:       "203.0.113.55",
		Source:   "http",
	})
}

func TestUpsertRoleCreateWritesAuditWithActorAndIP(t *testing.T) {
	testDB := setupRoleAuditServiceTestDB(t)

	saved, err := UpsertRole(roleAuditServiceContext(), models.Role{
		RoleID:      "finance-manager",
		Label:       "财务经理",
		Color:       "bg-blue-500/10 text-blue-600 border-blue-200",
		Permissions: `["menu_trading","action_trading_sales_order_manage"]`,
	})
	require.NoError(t, err)
	require.Equal(t, "finance-manager", saved.RoleID)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "Role", logs[0].Module)
	require.Equal(t, "CREATE", logs[0].Action)
	require.Equal(t, "role-auditor", logs[0].Operator)
	require.Equal(t, "203.0.113.55", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), "afterPermissions")
}

func TestUpsertRoleUpdateWritesPermissionDeltaAudit(t *testing.T) {
	testDB := setupRoleAuditServiceTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, testDB.Exec(`
		INSERT INTO roles (id, role_id, label, color, permissions, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, "role-1", "finance-manager", "旧标签", "old-color", `["menu_org","menu_trading"]`, now, now).Error)

	saved, err := UpsertRole(roleAuditServiceContext(), models.Role{
		RoleID:      "finance-manager",
		Label:       "财务经理",
		Color:       "bg-emerald-500/10 text-emerald-600 border-emerald-200",
		Permissions: `["menu_trading","action_trading_sales_order_manage"]`,
	})
	require.NoError(t, err)
	require.Equal(t, "finance-manager", saved.RoleID)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "UPSERT", logs[0].Action)
	require.Equal(t, "role-auditor", logs[0].Operator)
	require.Equal(t, "203.0.113.55", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), "addedPermissions")
	require.True(t, strings.Contains(string(logs[0].Diff), "action_trading_sales_order_manage") || strings.Contains(string(logs[0].Diff), "menu_org"))
}

func TestDeleteRoleWritesAuditWithUnboundUserSummary(t *testing.T) {
	testDB := setupRoleAuditServiceTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, testDB.Exec(`
		INSERT INTO roles (id, role_id, label, color, permissions, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, "role-2", "finance-manager", "财务经理", "role-color", `["menu_trading"]`, now, now).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO users (id, username, password, status, role, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)
	`, "user-role-1", "finance-user-a", "$2a$11$abcdefghijklmnopqrstuv0123456789abcdefghi", "active", "finance-manager", now, now, "user-role-2", "finance-user-b", "$2a$11$abcdefghijklmnopqrstuv0123456789abcdefghj", "active", "finance-manager", now, now).Error)

	err := DeleteRole(roleAuditServiceContext(), "finance-manager")
	require.NoError(t, err)

	var userCount int64
	require.NoError(t, testDB.Model(&models.User{}).Where("LOWER(role) = ?", "finance-manager").Count(&userCount).Error)
	require.Zero(t, userCount)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "DELETE", logs[0].Action)
	require.Equal(t, "role-auditor", logs[0].Operator)
	require.Equal(t, "203.0.113.55", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), "unboundUserCount")
}
