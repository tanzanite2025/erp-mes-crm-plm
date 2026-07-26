package access

import (
	"fmt"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openIdentityAccessServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:identity_access_%d?mode=memory&cache=shared", time.Now().UnixNano())
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatalf("open sqlite connection: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Errorf("close sqlite: %v", err)
		}
	})

	if err := testDB.Exec(`
		CREATE TABLE users (
			id text PRIMARY KEY,
			username text NOT NULL,
			employee_id text,
			permission_preset_id text,
			deleted_at datetime
		);
	`).Error; err != nil {
		t.Fatalf("create users schema: %v", err)
	}
	if err := testDB.Exec(`
		CREATE TABLE permission_presets (
			id text PRIMARY KEY,
			permission_preset_id text NOT NULL,
			permissions text,
			deleted_at datetime
		);
	`).Error; err != nil {
		t.Fatalf("create permission_presets schema: %v", err)
	}
	if err := testDB.Exec(`
		CREATE TABLE user_permissions (
			id text PRIMARY KEY,
			user_id text NOT NULL,
			permission_id text NOT NULL,
			deleted_at datetime
		);
	`).Error; err != nil {
		t.Fatalf("create user_permissions schema: %v", err)
	}

	return testDB
}

func TestIdentityAccessSnapshotSeparatesPermissionPresetAndDirectPermissions(t *testing.T) {
	testDB := openIdentityAccessServiceTestDB(t)

	if err := testDB.Exec(
		"INSERT INTO users (id, username, employee_id, permission_preset_id) VALUES (?, ?, ?, ?)",
		"user-1", "operator", "employee-1", "planner",
	).Error; err != nil {
		t.Fatalf("insert user: %v", err)
	}
	if err := testDB.Exec(
		"INSERT INTO permission_presets (id, permission_preset_id, permissions) VALUES (?, ?, ?)",
		"preset-1", "planner", `["user_view","user_edit"]`,
	).Error; err != nil {
		t.Fatalf("insert permission preset: %v", err)
	}
	if err := testDB.Exec(
		"INSERT INTO user_permissions (id, user_id, permission_id) VALUES (?, ?, ?), (?, ?, ?)",
		"perm-1", "user-1", "user_delete",
		"perm-2", "user-1", "user_edit",
	).Error; err != nil {
		t.Fatalf("insert user permissions: %v", err)
	}

	snapshot, err := NewIdentityAccessServiceWithDB(testDB).ResolveSnapshotByUserID("user-1")
	if err != nil {
		t.Fatalf("resolve snapshot: %v", err)
	}

	assertStringSlicesEqual(t, snapshot.PresetPermissionIDs, []string{"user_view", "user_edit"})
	assertStringSlicesEqual(t, snapshot.DirectPermissionIDs, []string{"user_delete", "user_edit"})
	assertStringSlicesEqual(t, snapshot.Permissions, []string{"user_view", "user_edit", "user_delete"})

	if snapshot.PermissionPresetID != "planner" {
		t.Fatalf("permission preset id = %q, want planner", snapshot.PermissionPresetID)
	}
	if snapshot.EmployeeID != "employee-1" {
		t.Fatalf("employee id = %q, want employee-1", snapshot.EmployeeID)
	}
}

func TestIdentityAccessSnapshotReportsMissingPermissionPresetWithoutInferringAccess(t *testing.T) {
	testDB := openIdentityAccessServiceTestDB(t)

	if err := testDB.Exec(
		"INSERT INTO users (id, username, employee_id, permission_preset_id) VALUES (?, ?, ?, ?)",
		"user-1", "operator", "employee-1", "missing-preset",
	).Error; err != nil {
		t.Fatalf("insert user: %v", err)
	}

	snapshot, err := NewIdentityAccessServiceWithDB(testDB).ResolveSnapshotByUserID("user-1")
	if err != nil {
		t.Fatalf("resolve snapshot: %v", err)
	}

	assertStringSlicesEqual(t, snapshot.PresetPermissionIDs, []string{})
	assertStringSlicesEqual(t, snapshot.DirectPermissionIDs, []string{})
	assertStringSlicesEqual(t, snapshot.Permissions, []string{})

	if snapshot.PermissionPresetID != "missing-preset" {
		t.Fatalf("permission preset id = %q, want missing-preset", snapshot.PermissionPresetID)
	}
	if !containsString(snapshot.Diagnostics, "permission_preset_not_found") {
		t.Fatalf("diagnostics = %#v, want permission_preset_not_found", snapshot.Diagnostics)
	}
	if !containsString(snapshot.Diagnostics, "effective_permissions_empty") {
		t.Fatalf("diagnostics = %#v, want effective_permissions_empty", snapshot.Diagnostics)
	}
}

func assertStringSlicesEqual(t *testing.T, got []string, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("slice length = %d (%#v), want %d (%#v)", len(got), got, len(want), want)
	}
	for index := range want {
		if got[index] != want[index] {
			t.Fatalf("slice[%d] = %q in %#v, want %q in %#v", index, got[index], got, want[index], want)
		}
	}
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
