package handlers

import (
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
			station TEXT,
			status TEXT,
			joined_date DATETIME,
			dept_id TEXT,
			line_id TEXT,
			process_id TEXT
		);
	`).Error; err != nil {
		t.Fatalf("create employees table failed: %v", err)
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

	requestBody := `{"username":"dept-user","password":"secure123","email":"dept@example.com","role":"ghost_role","status":"active","employeeId":"EMP-STAFF-1"}`
	recorder := performCreateUserRequest(requestBody, "admin")

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201 when employee department role exists, got %d body=%s", recorder.Code, recorder.Body.String())
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

func TestCreateUserHandlerRejectsWhenEmployeeDepartmentRoleMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-2"},
		StaffID:   "EMP-STAFF-2",
		Name:      "Bob",
		DeptID:    "dept-missing",
	}).Error)

	requestBody := `{"username":"dept-missing-user","password":"secure123","email":"dept-missing@example.com","role":"ghost_role","status":"active","employeeId":"EMP-STAFF-2"}`
	recorder := performCreateUserRequest(requestBody, "admin")

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 when employee department role missing, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "employee department role does not exist") {
		t.Fatalf("expected employee department role validation error, got body=%s", recorder.Body.String())
	}
}
