package dependencies

import (
	"fmt"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupEffectiveAccessTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevDB := db.DB

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	schema := []string{
		`
		CREATE TABLE employees (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			staff_id TEXT,
			name TEXT NOT NULL,
			gender TEXT,
			birthday DATETIME,
			id_card TEXT,
			phone TEXT,
			emergency_phone TEXT,
			address TEXT,
			bank_card TEXT,
			bank_name TEXT,
			education TEXT,
			age INTEGER,
			status TEXT,
			joined_date DATETIME,
			dept_id TEXT,
			line_id TEXT,
			process_id TEXT
		);
		`,
		`
		CREATE TABLE users (
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
		);
		`,
		`
		CREATE TABLE roles (
			id TEXT PRIMARY KEY,
			role_id TEXT NOT NULL UNIQUE,
			label TEXT,
			color TEXT,
			permissions TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
		`,
		`
		CREATE TABLE user_permissions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			source TEXT,
			permission_id TEXT NOT NULL,
			granted_by TEXT,
			reason TEXT,
			batch_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
		`,
	}
	for _, statement := range schema {
		if err := testDB.Exec(statement).Error; err != nil {
			t.Fatalf("create schema failed: %v", err)
		}
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

func seedEmployee(t *testing.T, testDB *gorm.DB, employeeID string, deptID string) {
	t.Helper()

	employee := models.Employee{
		BaseModel: models.BaseModel{ID: employeeID},
		Name:      employeeID,
		DeptID:    deptID,
	}
	if err := testDB.Create(&employee).Error; err != nil {
		t.Fatalf("seed employee %s failed: %v", employeeID, err)
	}
}

func seedUserPermission(t *testing.T, testDB *gorm.DB, userID string, permissionID string, updatedAt time.Time) {
	t.Helper()

	permission := models.UserPermission{
		BaseModel: models.BaseModel{
			ID:        userID + "-" + permissionID + "-permission",
			CreatedAt: updatedAt.Add(-time.Minute),
			UpdatedAt: updatedAt,
		},
		UserID:       userID,
		PermissionID: permissionID,
		Source:       "test",
	}
	if err := testDB.Create(&permission).Error; err != nil {
		t.Fatalf("seed user permission %s for %s failed: %v", permissionID, userID, err)
	}
}

func seedRole(t *testing.T, testDB *gorm.DB, roleID string, permissions string, updatedAt time.Time) {
	t.Helper()

	role := models.Role{
		BaseModel: models.BaseModel{
			ID:        roleID + "-row",
			CreatedAt: updatedAt.Add(-time.Minute),
			UpdatedAt: updatedAt,
		},
		RoleID:      roleID,
		Label:       roleID,
		Color:       "bg-slate-500/10 text-slate-600 border-slate-200",
		Permissions: permissions,
	}
	if err := testDB.Create(&role).Error; err != nil {
		t.Fatalf("seed role %s failed: %v", roleID, err)
	}
}

func containsAll(values []string, expected ...string) bool {
	set := make(map[string]struct{}, len(values))
	for _, value := range values {
		set[value] = struct{}{}
	}
	for _, item := range expected {
		if _, ok := set[item]; !ok {
			return false
		}
	}
	return true
}

func TestResolveEffectiveAccessProfileForUserReadsExplicitUserPermissions(t *testing.T) {
	testDB := setupEffectiveAccessTestDB(t)
	seedUserPermission(t, testDB, "user-1", "MENU_SETTINGS", time.Unix(100, 0))
	seedUserPermission(t, testDB, "user-1", "user_view", time.Unix(101, 0))

	profile := ResolveEffectiveAccessProfileForUser(models.User{ID: "user-1"})

	if !containsAll(profile.Permissions, "menu_settings", "user_view") {
		t.Fatalf("expected explicit user permissions, got %#v", profile.Permissions)
	}
}

func TestResolveEffectiveAccessProfileForUserKeepsEmployeeIDAndReadsOnlyUserPermissions(t *testing.T) {
	testDB := setupEffectiveAccessTestDB(t)
	seedEmployee(t, testDB, "emp-1", "dept-sales")
	seedUserPermission(t, testDB, "user-employee", "menu_org", time.Unix(100, 0))

	profile := ResolveEffectiveAccessProfileForUser(models.User{
		ID:         "user-employee",
		EmployeeID: "emp-1",
	})

	if profile.EmployeeID != "emp-1" {
		t.Fatalf("expected employee id passthrough, got %s", profile.EmployeeID)
	}
	if !containsAll(profile.Permissions, "menu_org") {
		t.Fatalf("expected explicit permissions only, got %#v", profile.Permissions)
	}
}

func TestResolveEffectiveAccessProfileForUserReturnsEmptyWhenNoExplicitPermissions(t *testing.T) {
	setupEffectiveAccessTestDB(t)

	profile := ResolveEffectiveAccessProfileForUser(models.User{ID: "user-empty", EmployeeID: "emp-empty"})

	if len(profile.Permissions) != 0 {
		t.Fatalf("expected no explicit permissions, got %#v", profile.Permissions)
	}
	if profile.EmployeeID != "emp-empty" {
		t.Fatalf("expected employee id passthrough, got %s", profile.EmployeeID)
	}
}

func TestResolveEffectiveAccessProfileForUserMergesRoleAndExplicitPermissions(t *testing.T) {
	testDB := setupEffectiveAccessTestDB(t)
	seedRole(t, testDB, "finance-manager", `["menu_trading","action_trading_sales_order_manage"]`, time.Unix(99, 0))
	seedUserPermission(t, testDB, "user-role-1", "user_view", time.Unix(101, 0))

	profile := ResolveEffectiveAccessProfileForUser(models.User{
		ID:         "user-role-1",
		Role:       "finance-manager",
		EmployeeID: "emp-role-1",
	})

	if profile.EmployeeID != "emp-role-1" {
		t.Fatalf("expected employee id passthrough, got %s", profile.EmployeeID)
	}
	if !containsAll(profile.Permissions, "menu_trading", "action_trading_sales_order_manage", "user_view") {
		t.Fatalf("expected merged role and explicit permissions, got %#v", profile.Permissions)
	}
}
