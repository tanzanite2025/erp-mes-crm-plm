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
		CREATE TABLE roles (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			role_id TEXT NOT NULL UNIQUE,
			label TEXT,
			color TEXT,
			permissions TEXT
		);
		`,
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
			station TEXT,
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
			username TEXT NOT NULL,
			password TEXT NOT NULL,
			email TEXT,
			phone_number TEXT,
			first_name TEXT,
			last_name TEXT,
			role TEXT,
			status TEXT,
			employee_id TEXT,
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

func seedRole(t *testing.T, testDB *gorm.DB, roleID string, permissions string, updatedAt time.Time) {
	t.Helper()

	role := models.Role{
		BaseModel: models.BaseModel{
			ID:        roleID + "-pk",
			CreatedAt: updatedAt.Add(-time.Minute),
			UpdatedAt: updatedAt,
		},
		RoleID:      roleID,
		Label:       roleID,
		Permissions: permissions,
	}
	if err := testDB.Create(&role).Error; err != nil {
		t.Fatalf("seed role %s failed: %v", roleID, err)
	}
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

func seedUser(t *testing.T, testDB *gorm.DB, user models.User) {
	t.Helper()

	if err := testDB.Create(&user).Error; err != nil {
		t.Fatalf("seed user %s failed: %v", user.ID, err)
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

func TestResolveEffectiveAccessProfileForUserExplicit(t *testing.T) {
	testDB := setupEffectiveAccessTestDB(t)
	seedRole(t, testDB, "finance_manager", `["menu_settings"]`, time.Unix(100, 0))

	profile := ResolveEffectiveAccessProfileForUser(models.User{
		ID:   "user-1",
		Role: "finance_manager",
	})

	if profile.PrimaryRoleID != "finance_manager" {
		t.Errorf("expected primary role finance_manager, got %s", profile.PrimaryRoleID)
	}
	if !containsAll(profile.Permissions, "menu_settings") {
		t.Errorf("expected explicit permissions, got %#v", profile.Permissions)
	}
}

func TestResolveEffectiveAccessProfileForUserResolvesDeptRoleFamilyByStaffID(t *testing.T) {
	testDB := setupEffectiveAccessTestDB(t)

	staffEmployee := models.Employee{
		BaseModel: models.BaseModel{ID: "emp-staff-1"},
		StaffID:   "STAFF-001",
		Name:      "Staff User",
		DeptID:    "dept-sales",
	}
	if err := testDB.Create(&staffEmployee).Error; err != nil {
		t.Fatalf("seed employee by staff_id failed: %v", err)
	}

	seedRole(t, testDB, "org_dept-sales", `["page_trading_sales_orders"]`, time.Unix(100, 0))
	seedRole(t, testDB, "org_dept-sales|Oversea", `["action_trading_customer_manage"]`, time.Unix(200, 0))

	profile := ResolveEffectiveAccessProfileForUser(models.User{
		ID:         "user-staff-1",
		EmployeeID: "staff-001",
	})

	if !containsAll(profile.EffectiveRoles, "org_dept-sales", "org_dept-sales|Oversea") {
		t.Fatalf("expected organization role family in effective roles, got %#v", profile.EffectiveRoles)
	}

	if !containsAll(profile.Permissions, "page_trading_sales_orders", "action_trading_customer_manage", "menu_trading") {
		t.Fatalf("expected expanded trading permissions, got %#v", profile.Permissions)
	}
}

func TestResolveEffectiveAccessProfileForUserReflectsUpdatedDepartmentRolePermissions(t *testing.T) {
	testDB := setupEffectiveAccessTestDB(t)
	seedEmployee(t, testDB, "emp-role-update", "dept-role-update")
	seedRole(t, testDB, "org_dept-role-update", `["page_trading_sales_orders"]`, time.Unix(100, 0))

	initialProfile := ResolveEffectiveAccessProfileForUser(models.User{
		ID:         "user-role-update",
		EmployeeID: "emp-role-update",
	})
	if !containsAll(initialProfile.Permissions, "page_trading_sales_orders", "menu_trading") {
		t.Fatalf("expected initial department role permissions, got %#v", initialProfile.Permissions)
	}

	requireErr := testDB.Model(&models.Role{}).
		Where("role_id = ?", "org_dept-role-update").
		Updates(map[string]any{"permissions": `["menu_system"]`}).Error
	if requireErr != nil {
		t.Fatalf("update role permissions failed: %v", requireErr)
	}

	updatedProfile := ResolveEffectiveAccessProfileForUser(models.User{
		ID:         "user-role-update",
		EmployeeID: "emp-role-update",
	})
	if containsAll(updatedProfile.Permissions, "page_trading_sales_orders") {
		t.Fatalf("expected stale trading permission removed after update, got %#v", updatedProfile.Permissions)
	}
	if !containsAll(updatedProfile.Permissions, "menu_system") {
		t.Fatalf("expected updated department role permissions, got %#v", updatedProfile.Permissions)
	}
}
