package services

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"
	"xdfc-server/audit"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupUserAuditServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	statements := []string{
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
		`CREATE TABLE user_permissions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			permission_id TEXT NOT NULL,
			source TEXT,
			granted_by TEXT,
			reason TEXT,
			batch_id TEXT,
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

func userAuditServiceContext() context.Context {
	return audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "user-audit-actor-id",
		Username: "user-audit-actor",
		IP:       "203.0.113.44",
		Source:   "http",
	})
}

func TestCreateUserWritesAuditWithActorAndIP(t *testing.T) {
	testDB := setupUserAuditServiceTestDB(t)

	created, err := CreateUser(userAuditServiceContext(), models.User{
		ID:          "user-create-1",
		Username:    "created-user",
		Password:    "$2a$11$abcdefghijklmnopqrstuv0123456789abcdefghi",
		Email:       "created@example.com",
		PhoneNumber: "123456",
		FirstName:   "Created",
		LastName:    "User",
		Status:      "active",
		Role:        "system-admin",
		EmployeeID:  "EMP-101",
	})
	require.NoError(t, err)
	require.Equal(t, "user-create-1", created.ID)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "User", logs[0].Module)
	require.Equal(t, "CREATE", logs[0].Action)
	require.Equal(t, "user-audit-actor", logs[0].Operator)
	require.Equal(t, "203.0.113.44", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), "passwordChanged")
}

func TestPatchUserWritesAuditWithoutLeakingPlainPassword(t *testing.T) {
	testDB := setupUserAuditServiceTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, testDB.Exec(`
		INSERT INTO users (id, username, password, status, role, employee_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "user-patch-1", "patch-user", "$2a$11$oldhasholdhasholdhasholdhasholdhasholdhasholdhash", "active", "staff", "EMP-102", now, now).Error)

	updated, err := PatchUser(userAuditServiceContext(), "user-patch-1", map[string]interface{}{
		"password":    "$2a$11$newhashnewhashnewhashnewhashnewhashnewhashnewhash",
		"role":        "system-admin",
		"status":      "inactive",
		"employee_id": "EMP-202",
	})
	require.NoError(t, err)
	require.Equal(t, "system-admin", updated.Role)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "PATCH", logs[0].Action)
	require.Equal(t, "user-audit-actor", logs[0].Operator)
	require.Equal(t, "203.0.113.44", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), "passwordChanged")
	require.NotContains(t, string(logs[0].Diff), "newhashnewhash")
}

func TestReplaceUserWritesAuditWithActorAndIP(t *testing.T) {
	testDB := setupUserAuditServiceTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, testDB.Exec(`
		INSERT INTO users (id, username, password, status, role, employee_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "user-replace-1", "replace-user", "$2a$11$replacehashreplacehashreplacehashreplacehashreplace", "active", "staff", "EMP-103", now, now).Error)

	replaced, err := ReplaceUser(userAuditServiceContext(), "user-replace-1", map[string]interface{}{
		"username":     "replace-user-new",
		"status":       "inactive",
		"role":         "manager",
		"employee_id":  "EMP-303",
		"phone_number": "8888",
	})
	require.NoError(t, err)
	require.Equal(t, "replace-user-new", replaced.Username)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "REPLACE", logs[0].Action)
	require.Equal(t, "user-audit-actor", logs[0].Operator)
	require.Equal(t, "203.0.113.44", logs[0].IP)
}

func TestDeleteUserWritesAuditWithActorAndIP(t *testing.T) {
	testDB := setupUserAuditServiceTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, testDB.Exec(`
		INSERT INTO users (id, username, password, status, role, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, "user-delete-1", "delete-user", "$2a$11$deletehashdeletehashdeletehashdeletehashdeletehash", "active", "manager", now, now).Error)

	err := DeleteUser(userAuditServiceContext(), "user-delete-1")
	require.NoError(t, err)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "DELETE", logs[0].Action)
	require.Equal(t, "user-audit-actor", logs[0].Operator)
	require.Equal(t, "203.0.113.44", logs[0].IP)
}

func TestReplaceUserPermissionsWritesAuditWithActorAndIP(t *testing.T) {
	testDB := setupUserAuditServiceTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, testDB.Exec(`
		INSERT INTO users (id, username, password, status, role, employee_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "user-perm-1", "perm-user", "$2a$11$permhashpermhashpermhashpermhashpermhashpermhash", "active", "manager", "EMP-505", now, now).Error)
	require.NoError(t, testDB.Exec(`
		INSERT INTO user_permissions (id, user_id, permission_id, source, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)
	`, "perm-row-1", "user-perm-1", authz.PermissionUserView, "manual", now, now, "perm-row-2", "user-perm-1", authz.PermissionUserEdit, "manual", now, now).Error)

	result, err := ReplaceUserPermissions(userAuditServiceContext(), "user-perm-1", ReplaceUserPermissionsInput{
		PermissionIDs: []string{authz.PermissionUserView, authz.PermissionUserDelete},
		Source:        "manual",
		Reason:        "security hardening",
		GrantedBy:     "manager-1",
	})
	require.NoError(t, err)
	require.Equal(t, 1, result.Added)
	require.Equal(t, 1, result.Removed)

	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "UserPermission", logs[0].Module)
	require.Equal(t, "REPLACE", logs[0].Action)
	require.Equal(t, "user-audit-actor", logs[0].Operator)
	require.Equal(t, "203.0.113.44", logs[0].IP)
	require.True(t, strings.Contains(string(logs[0].Diff), "permission_user_delete") || strings.Contains(string(logs[0].Diff), "added"))
}
