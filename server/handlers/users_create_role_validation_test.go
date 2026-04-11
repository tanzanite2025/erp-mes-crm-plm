package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupCreateUserHandlerTestDB(t *testing.T) {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	if err := testDB.Exec(`
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL UNIQUE,
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
	`).Error; err != nil {
		t.Fatalf("create users table failed: %v", err)
	}

	if err := testDB.Exec(`
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
	`).Error; err != nil {
		t.Fatalf("create roles table failed: %v", err)
	}

	if err := testDB.Exec(`
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
	`).Error; err != nil {
		t.Fatalf("create employees table failed: %v", err)
	}

	if err := testDB.Exec(`
		CREATE TABLE user_roles (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			role_id TEXT NOT NULL,
			is_primary BOOLEAN,
			start_date DATE,
			end_date DATE,
			status TEXT,
			source TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("create user_roles table failed: %v", err)
	}

	if err := testDB.Exec(`
		CREATE TABLE employee_roles (
			id TEXT PRIMARY KEY,
			employee_id TEXT NOT NULL,
			role_id TEXT NOT NULL,
			assignment_id TEXT,
			is_primary BOOLEAN,
			start_date DATE,
			end_date DATE,
			status TEXT,
			source TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("create employee_roles table failed: %v", err)
	}

	db.DB = testDB
	t.Cleanup(func() {
		db.DB = prevDB
		sqlDB, closeErr := testDB.DB()
		if closeErr == nil {
			_ = sqlDB.Close()
		}
	})
}

func performCreateUserRequest(requestBody string, currentRole string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")

	ctx.Request = req
	ctx.Set("role", currentRole)
	CreateUserHandler(ctx)
	return recorder
}

func performSetPrimaryRoleRequest(userID string, requestBody string, currentRole string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/users/"+userID+"/primary-role", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")

	ctx.Request = req
	ctx.Params = gin.Params{{Key: "id", Value: userID}}
	ctx.Set("role", currentRole)
	SetUserPrimaryRoleHandler(ctx)
	return recorder
}

func performGetUserRoleBindingsRequest(userID string, currentRole string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/"+userID+"/roles", nil)

	ctx.Request = req
	ctx.Params = gin.Params{{Key: "id", Value: userID}}
	ctx.Set("role", currentRole)
	GetUserRoleBindingsHandler(ctx)
	return recorder
}

func performAddUserRoleBindingRequest(userID string, requestBody string, currentRole string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/"+userID+"/roles", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")

	ctx.Request = req
	ctx.Params = gin.Params{{Key: "id", Value: userID}}
	ctx.Set("role", currentRole)
	AddUserRoleBindingHandler(ctx)
	return recorder
}

func performRemoveUserRoleBindingRequest(userID string, roleID string, currentRole string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/users/"+userID+"/roles/"+roleID, nil)

	ctx.Request = req
	ctx.Params = gin.Params{{Key: "id", Value: userID}, {Key: "roleId", Value: roleID}}
	ctx.Set("role", currentRole)
	RemoveUserRoleBindingHandler(ctx)
	return recorder
}

func performBindUserEmployeeRequest(userID string, requestBody string, currentRole string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/"+userID+"/bind-employee", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")

	ctx.Request = req
	ctx.Params = gin.Params{{Key: "id", Value: userID}}
	ctx.Set("role", currentRole)
	BindUserEmployeeHandler(ctx)
	return recorder
}

func performUnbindUserEmployeeRequest(userID string, currentRole string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/"+userID+"/unbind-employee", nil)

	ctx.Request = req
	ctx.Params = gin.Params{{Key: "id", Value: userID}}
	ctx.Set("role", currentRole)
	UnbindUserEmployeeHandler(ctx)
	return recorder
}

func TestCreateUserHandlerRejectsUnknownRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	requestBody := `{"username":"new-user","password":"secure123","email":"new@example.com","role":"ghost_role","status":"active"}`
	recorder := performCreateUserRequest(requestBody, "admin")

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 when role does not exist, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "role does not exist") {
		t.Fatalf("expected role validation error, got body=%s", recorder.Body.String())
	}
}

func TestCreateUserHandlerCreatesUserWithExistingRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	seedRole := models.Role{
		BaseModel: models.BaseModel{ID: "role-finance"},
		RoleID:    "finance_manager",
		Label:     "Finance Manager",
		Color:     "",
	}
	if err := db.DB.Create(&seedRole).Error; err != nil {
		t.Fatalf("seed role failed: %v", err)
	}

	requestBody := `{"username":"finance-user","password":"secure123","email":"finance@example.com","role":"finance_manager","status":"active"}`
	recorder := performCreateUserRequest(requestBody, "admin")

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201 when role exists, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var created models.User
	if err := db.DB.Where("username = ?", "finance-user").First(&created).Error; err != nil {
		t.Fatalf("expected created user persisted, query err=%v", err)
	}
	if created.Role != "finance_manager" {
		t.Fatalf("expected role finance_manager, got %s", created.Role)
	}
}

func TestCreateUserHandlerAutoBindsDepartmentRoleWhenEmployeeDepartmentRoleExists(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-1"},
		StaffID:   "EMP-STAFF-1",
		Name:      "Alice",
		DeptID:    "dept-finance",
	}).Error)
	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-org-finance"},
		RoleID:    "org_dept-finance",
		Label:     "财务部",
		Color:     "",
	}).Error)

	requestBody := `{"username":"dept-user","password":"secure123","email":"dept@example.com","role":"","status":"active","employeeId":"EMP-STAFF-1"}`
	recorder := performCreateUserRequest(requestBody, "admin")

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201 when employee role is empty but department default role exists, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var created models.User
	if err := db.DB.Where("username = ?", "dept-user").First(&created).Error; err != nil {
		t.Fatalf("expected created user persisted, query err=%v", err)
	}
	if created.Role != "org_dept-finance" {
		t.Fatalf("expected auto bound role org_dept-finance, got %s", created.Role)
	}
	if created.EmployeeID != "EMP-STAFF-1" {
		t.Fatalf("expected employee binding preserved, got %s", created.EmployeeID)
	}
}

func TestCreateUserHandlerKeepsExplicitRoleWhenEmployeeIsBound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-3"},
		StaffID:   "EMP-STAFF-3",
		Name:      "Carol",
		DeptID:    "dept-finance",
	}).Error)
	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-explicit-ops"},
		RoleID:    "ops_manager",
		Label:     "Ops Manager",
	}).Error)
	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-org-finance-2"},
		RoleID:    "org_dept-finance",
		Label:     "财务部",
	}).Error)

	requestBody := `{"username":"dept-explicit-role-user","password":"secure123","email":"dept-explicit@example.com","role":"ops_manager","status":"active","employeeId":"EMP-STAFF-3"}`
	recorder := performCreateUserRequest(requestBody, "admin")

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201 when explicit role is valid, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var created models.User
	if err := db.DB.Where("username = ?", "dept-explicit-role-user").First(&created).Error; err != nil {
		t.Fatalf("expected created user persisted, query err=%v", err)
	}
	if created.Role != "ops_manager" {
		t.Fatalf("expected explicit role ops_manager to be preserved, got %s", created.Role)
	}
}

func TestCreateUserHandlerRejectsWhenEmployeeDepartmentRoleMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-2"},
		StaffID:   "EMP-STAFF-2",
		Name:      "Bob",
		DeptID:    "dept-missing",
	}).Error)

	requestBody := `{"username":"dept-missing-user","password":"secure123","email":"dept-missing@example.com","role":"","status":"active","employeeId":"EMP-STAFF-2"}`
	recorder := performCreateUserRequest(requestBody, "admin")

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 when role is empty and no department default role exists, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "role cannot be empty") {
		t.Fatalf("expected role empty validation error, got body=%s", recorder.Body.String())
	}
}

func TestCreateUserHandlerSyncsRoleBindingsIntoNewTables(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-4"},
		StaffID:   "EMP-STAFF-4",
		Name:      "Dylan",
		DeptID:    "dept-ops",
	}).Error)
	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-ops"},
		RoleID:    "ops_manager",
		Label:     "Ops Manager",
		Color:     "",
	}).Error)

	requestBody := `{"username":"binding-user","password":"secure123","email":"binding@example.com","role":"ops_manager","status":"active","employeeId":"EMP-STAFF-4"}`
	recorder := performCreateUserRequest(requestBody, "admin")

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	type userRoleRow struct {
		UserID    string
		RoleID    string
		IsPrimary bool
		Status    string
		Source    string
	}
	var userRole userRoleRow
	require.NoError(t, db.DB.Table("user_roles").Select("user_id, role_id, is_primary, status, source").First(&userRole).Error)
	require.Equal(t, "ops_manager", userRole.RoleID)
	require.True(t, userRole.IsPrimary)
	require.Equal(t, "active", strings.ToLower(strings.TrimSpace(userRole.Status)))
	require.Equal(t, "from_user_account", userRole.Source)

	type employeeRoleRow struct {
		EmployeeID string
		RoleID     string
		IsPrimary  bool
		Status     string
		Source     string
	}
	var employeeRole employeeRoleRow
	require.NoError(t, db.DB.Table("employee_roles").Select("employee_id, role_id, is_primary, status, source").First(&employeeRole).Error)
	require.Equal(t, "emp-4", employeeRole.EmployeeID)
	require.Equal(t, "ops_manager", employeeRole.RoleID)
	require.True(t, employeeRole.IsPrimary)
	require.Equal(t, "active", strings.ToLower(strings.TrimSpace(employeeRole.Status)))
	require.Equal(t, "from_user_account", employeeRole.Source)
}

func TestSetUserPrimaryRoleHandlerSwitchesPrimaryRoleWithUniquePrimaryConstraint(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-finance-switch"},
		RoleID:    "finance_manager",
		Label:     "Finance Manager",
	}).Error)
	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-ops-switch"},
		RoleID:    "ops_manager",
		Label:     "Ops Manager",
	}).Error)
	require.NoError(t, db.DB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-5"},
		StaffID:   "EMP-STAFF-5",
		Name:      "Evan",
		DeptID:    "dept-ops",
	}).Error)

	userID := "user-switch-primary"
	require.NoError(t, db.DB.Create(&models.User{
		ID:         userID,
		Username:   "switch-primary-user",
		Password:   "$2a$11$abcdefghijklmnopqrstuv",
		Role:       "finance_manager",
		Status:     "active",
		EmployeeID: "EMP-STAFF-5",
	}).Error)
	require.NoError(t, db.DB.Create(&models.UserRole{
		BaseModel: models.BaseModel{ID: "user-role-finance-primary"},
		UserID:    userID,
		RoleID:    "finance_manager",
		IsPrimary: true,
		Status:    "active",
		Source:    "from_user_account",
	}).Error)
	require.NoError(t, db.DB.Create(&models.UserRole{
		BaseModel: models.BaseModel{ID: "user-role-ops-secondary"},
		UserID:    userID,
		RoleID:    "ops_manager",
		IsPrimary: false,
		Status:    "inactive",
		Source:    "from_user_account",
	}).Error)
	require.NoError(t, db.DB.Create(&models.EmployeeRole{
		BaseModel:  models.BaseModel{ID: "employee-role-finance-primary"},
		EmployeeID: "emp-5",
		RoleID:     "finance_manager",
		IsPrimary:  true,
		Status:     "active",
		Source:     "from_user_account",
	}).Error)

	recorder := performSetPrimaryRoleRequest(userID, `{"role":"ops_manager"}`, "admin")
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var updatedUser models.User
	require.NoError(t, db.DB.First(&updatedUser, "id = ?", userID).Error)
	require.Equal(t, "ops_manager", updatedUser.Role)

	type userRoleState struct {
		RoleID    string
		IsPrimary bool
		Status    string
	}
	var userRoles []userRoleState
	require.NoError(t, db.DB.Table("user_roles").
		Select("role_id, is_primary, status").
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Find(&userRoles).Error)

	primaryCount := int64(0)
	for _, row := range userRoles {
		if row.IsPrimary {
			primaryCount++
		}
		if row.RoleID == "ops_manager" {
			require.True(t, row.IsPrimary)
			require.Equal(t, "active", strings.ToLower(strings.TrimSpace(row.Status)))
		}
		if row.RoleID == "finance_manager" {
			require.False(t, row.IsPrimary)
			require.Equal(t, "inactive", strings.ToLower(strings.TrimSpace(row.Status)))
		}
	}
	require.Equal(t, int64(1), primaryCount)

	type employeeRoleState struct {
		RoleID    string
		IsPrimary bool
		Status    string
	}
	var employeeRoles []employeeRoleState
	require.NoError(t, db.DB.Table("employee_roles").
		Select("role_id, is_primary, status").
		Where("employee_id = ? AND deleted_at IS NULL AND source = ?", "emp-5", "from_user_account").
		Find(&employeeRoles).Error)
	require.NotEmpty(t, employeeRoles)
}

func TestSetUserPrimaryRoleHandlerRejectsUnknownRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	userID := "user-switch-unknown-role"
	require.NoError(t, db.DB.Create(&models.User{
		ID:       userID,
		Username: "unknown-role-user",
		Password: "$2a$11$abcdefghijklmnopqrstuv",
		Role:     "finance_manager",
		Status:   "active",
	}).Error)

	recorder := performSetPrimaryRoleRequest(userID, `{"role":"ghost_role"}`, "admin")
	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "role does not exist")
}

func TestSetUserPrimaryRoleHandlerBlocksNonAdminManagingAdminRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-admin-switch"},
		RoleID:    "admin",
		Label:     "Admin",
	}).Error)

	userID := "user-switch-admin-role"
	require.NoError(t, db.DB.Create(&models.User{
		ID:       userID,
		Username: "target-admin-user",
		Password: "$2a$11$abcdefghijklmnopqrstuv",
		Role:     "admin",
		Status:   "active",
	}).Error)

	recorder := performSetPrimaryRoleRequest(userID, `{"role":"admin"}`, "finance_manager")
	require.Equal(t, http.StatusForbidden, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "Only admin can manage admin roles")
}

func TestGetUserRoleBindingsHandlerReturnsBindingListWithPrimaryRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-finance-query"},
		RoleID:    "finance_manager",
		Label:     "Finance Manager",
		Color:     "blue",
	}).Error)
	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-ops-query"},
		RoleID:    "ops_manager",
		Label:     "Ops Manager",
		Color:     "green",
	}).Error)

	userID := "user-role-bindings-query"
	require.NoError(t, db.DB.Create(&models.User{
		ID:       userID,
		Username: "query-user",
		Password: "$2a$11$abcdefghijklmnopqrstuv",
		Role:     "ops_manager",
		Status:   "active",
	}).Error)
	require.NoError(t, db.DB.Create(&models.UserRole{
		BaseModel: models.BaseModel{ID: "user-role-query-primary"},
		UserID:    userID,
		RoleID:    "ops_manager",
		IsPrimary: true,
		Status:    "active",
		Source:    "manual",
	}).Error)
	require.NoError(t, db.DB.Create(&models.UserRole{
		BaseModel: models.BaseModel{ID: "user-role-query-secondary"},
		UserID:    userID,
		RoleID:    "finance_manager",
		IsPrimary: false,
		Status:    "inactive",
		Source:    "manual",
	}).Error)

	recorder := performGetUserRoleBindingsRequest(userID, "admin")
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload GetUserRoleBindingsResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, userID, payload.UserID)
	require.Equal(t, "ops_manager", payload.PrimaryRoleID)
	require.NotEmpty(t, payload.EffectiveRoles)
	require.Len(t, payload.RoleBindings, 2)

	require.Equal(t, "ops_manager", payload.RoleBindings[0].RoleID)
	require.True(t, payload.RoleBindings[0].IsPrimary)
	require.Equal(t, "active", payload.RoleBindings[0].Status)
	require.Equal(t, "Ops Manager", payload.RoleBindings[0].RoleLabel)
}

func TestGetUserRoleBindingsHandlerFallsBackToUsersRoleWhenBindingsMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-fallback-query"},
		RoleID:    "finance_manager",
		Label:     "Finance Manager",
	}).Error)

	userID := "user-role-bindings-fallback"
	require.NoError(t, db.DB.Create(&models.User{
		ID:       userID,
		Username: "fallback-user",
		Password: "$2a$11$abcdefghijklmnopqrstuv",
		Role:     "finance_manager",
		Status:   "active",
	}).Error)

	recorder := performGetUserRoleBindingsRequest(userID, "admin")
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload GetUserRoleBindingsResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, "finance_manager", payload.PrimaryRoleID)
	require.Len(t, payload.RoleBindings, 1)
	require.Equal(t, "finance_manager", payload.RoleBindings[0].RoleID)
	require.True(t, payload.RoleBindings[0].IsPrimary)
	require.Equal(t, "from_users_role_fallback", payload.RoleBindings[0].Source)
}

func TestGetUserRoleBindingsHandlerReturns404WhenUserMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	recorder := performGetUserRoleBindingsRequest("missing-user", "admin")
	require.Equal(t, http.StatusNotFound, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "User not found")
}

func TestAddUserRoleBindingHandlerAddsSecondaryBinding(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-finance-add"},
		RoleID:    "finance_manager",
		Label:     "Finance Manager",
	}).Error)
	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-ops-add"},
		RoleID:    "ops_manager",
		Label:     "Ops Manager",
	}).Error)

	userID := "user-role-bindings-add"
	require.NoError(t, db.DB.Create(&models.User{
		ID:       userID,
		Username: "add-role-user",
		Password: "$2a$11$abcdefghijklmnopqrstuv",
		Role:     "ops_manager",
		Status:   "active",
	}).Error)
	require.NoError(t, db.DB.Create(&models.UserRole{
		BaseModel: models.BaseModel{ID: "user-role-add-primary"},
		UserID:    userID,
		RoleID:    "ops_manager",
		IsPrimary: true,
		Status:    "active",
		Source:    "from_user_account",
	}).Error)

	recorder := performAddUserRoleBindingRequest(userID, `{"role":"finance_manager","source":"manual"}`, "admin")
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload GetUserRoleBindingsResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, "ops_manager", payload.PrimaryRoleID)
	require.Len(t, payload.RoleBindings, 2)

	foundSecondary := false
	for _, item := range payload.RoleBindings {
		if item.RoleID == "finance_manager" {
			foundSecondary = true
			require.False(t, item.IsPrimary)
			require.Equal(t, "active", item.Status)
		}
	}
	require.True(t, foundSecondary)
}

func TestAddUserRoleBindingHandlerRejectsUnknownRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	userID := "user-role-bindings-add-unknown"
	require.NoError(t, db.DB.Create(&models.User{
		ID:       userID,
		Username: "add-role-unknown-user",
		Password: "$2a$11$abcdefghijklmnopqrstuv",
		Role:     "ops_manager",
		Status:   "active",
	}).Error)

	recorder := performAddUserRoleBindingRequest(userID, `{"role":"ghost_role"}`, "admin")
	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "role does not exist")
}

func TestRemoveUserRoleBindingHandlerDeactivatesSecondaryBinding(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-finance-remove"},
		RoleID:    "finance_manager",
		Label:     "Finance Manager",
	}).Error)
	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-ops-remove"},
		RoleID:    "ops_manager",
		Label:     "Ops Manager",
	}).Error)

	userID := "user-role-bindings-remove"
	require.NoError(t, db.DB.Create(&models.User{
		ID:       userID,
		Username: "remove-role-user",
		Password: "$2a$11$abcdefghijklmnopqrstuv",
		Role:     "ops_manager",
		Status:   "active",
	}).Error)
	require.NoError(t, db.DB.Create(&models.UserRole{
		BaseModel: models.BaseModel{ID: "user-role-remove-primary"},
		UserID:    userID,
		RoleID:    "ops_manager",
		IsPrimary: true,
		Status:    "active",
		Source:    "from_user_account",
	}).Error)
	require.NoError(t, db.DB.Create(&models.UserRole{
		BaseModel: models.BaseModel{ID: "user-role-remove-secondary"},
		UserID:    userID,
		RoleID:    "finance_manager",
		IsPrimary: false,
		Status:    "active",
		Source:    "manual",
	}).Error)

	recorder := performRemoveUserRoleBindingRequest(userID, "finance_manager", "admin")
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload GetUserRoleBindingsResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, "ops_manager", payload.PrimaryRoleID)

	foundInactive := false
	for _, item := range payload.RoleBindings {
		if item.RoleID == "finance_manager" {
			foundInactive = true
			require.Equal(t, "inactive", item.Status)
			require.False(t, item.IsPrimary)
		}
	}
	require.True(t, foundInactive)
}

func TestRemoveUserRoleBindingHandlerRejectsPrimaryRoleBinding(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-ops-remove-primary"},
		RoleID:    "ops_manager",
		Label:     "Ops Manager",
	}).Error)

	userID := "user-role-bindings-remove-primary"
	require.NoError(t, db.DB.Create(&models.User{
		ID:       userID,
		Username: "remove-primary-role-user",
		Password: "$2a$11$abcdefghijklmnopqrstuv",
		Role:     "ops_manager",
		Status:   "active",
	}).Error)
	require.NoError(t, db.DB.Create(&models.UserRole{
		BaseModel: models.BaseModel{ID: "user-role-remove-primary-only"},
		UserID:    userID,
		RoleID:    "ops_manager",
		IsPrimary: true,
		Status:    "active",
		Source:    "from_user_account",
	}).Error)

	recorder := performRemoveUserRoleBindingRequest(userID, "ops_manager", "admin")
	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "cannot remove primary role binding")
}

func TestBindUserEmployeeHandlerBindsEmployeeAndMirrorsPrimaryRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-bind-ops"},
		RoleID:    "ops_manager",
		Label:     "Ops Manager",
	}).Error)
	require.NoError(t, db.DB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-bind-1"},
		StaffID:   "EMP-BIND-1",
		Name:      "Binder",
		DeptID:    "dept-ops",
	}).Error)

	userID := "user-bind-employee"
	require.NoError(t, db.DB.Create(&models.User{
		ID:       userID,
		Username: "bind-user",
		Password: "$2a$11$abcdefghijklmnopqrstuv",
		Role:     "ops_manager",
		Status:   "active",
	}).Error)
	require.NoError(t, db.DB.Create(&models.UserRole{
		BaseModel: models.BaseModel{ID: "user-bind-primary"},
		UserID:    userID,
		RoleID:    "ops_manager",
		IsPrimary: true,
		Status:    "active",
		Source:    "from_user_account",
	}).Error)

	recorder := performBindUserEmployeeRequest(userID, `{"employeeId":"EMP-BIND-1"}`, "admin")
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var user models.User
	require.NoError(t, db.DB.First(&user, "id = ?", userID).Error)
	require.Equal(t, "EMP-BIND-1", user.EmployeeID)

	type employeeRoleRow struct {
		EmployeeID string
		RoleID     string
		IsPrimary  bool
		Status     string
		Source     string
	}
	var roleRow employeeRoleRow
	require.NoError(t, db.DB.Table("employee_roles").
		Select("employee_id, role_id, is_primary, status, source").
		Where("employee_id = ?", "emp-bind-1").
		First(&roleRow).Error)
	require.Equal(t, "ops_manager", roleRow.RoleID)
	require.True(t, roleRow.IsPrimary)
	require.Equal(t, "active", strings.ToLower(strings.TrimSpace(roleRow.Status)))
	require.Equal(t, "from_user_account", roleRow.Source)
}

func TestUnbindUserEmployeeHandlerClearsBindingAndDeactivatesMirroredRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: "role-unbind-ops"},
		RoleID:    "ops_manager",
		Label:     "Ops Manager",
	}).Error)
	require.NoError(t, db.DB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-unbind-1"},
		StaffID:   "EMP-UNBIND-1",
		Name:      "Unbinder",
		DeptID:    "dept-ops",
	}).Error)

	userID := "user-unbind-employee"
	require.NoError(t, db.DB.Create(&models.User{
		ID:         userID,
		Username:   "unbind-user",
		Password:   "$2a$11$abcdefghijklmnopqrstuv",
		Role:       "ops_manager",
		Status:     "active",
		EmployeeID: "EMP-UNBIND-1",
	}).Error)
	require.NoError(t, db.DB.Create(&models.UserRole{
		BaseModel: models.BaseModel{ID: "user-unbind-primary"},
		UserID:    userID,
		RoleID:    "ops_manager",
		IsPrimary: true,
		Status:    "active",
		Source:    "from_user_account",
	}).Error)
	require.NoError(t, db.DB.Create(&models.EmployeeRole{
		BaseModel:  models.BaseModel{ID: "employee-unbind-primary"},
		EmployeeID: "emp-unbind-1",
		RoleID:     "ops_manager",
		IsPrimary:  true,
		Status:     "active",
		Source:     "from_user_account",
	}).Error)

	recorder := performUnbindUserEmployeeRequest(userID, "admin")
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var user models.User
	require.NoError(t, db.DB.First(&user, "id = ?", userID).Error)
	require.Equal(t, "", user.EmployeeID)

	type employeeRoleRow struct {
		IsPrimary bool
		Status    string
	}
	var roleRow employeeRoleRow
	require.NoError(t, db.DB.Table("employee_roles").
		Select("is_primary, status").
		Where("employee_id = ? AND role_id = ?", "emp-unbind-1", "ops_manager").
		First(&roleRow).Error)
	require.False(t, roleRow.IsPrimary)
	require.Equal(t, "inactive", strings.ToLower(strings.TrimSpace(roleRow.Status)))
}
