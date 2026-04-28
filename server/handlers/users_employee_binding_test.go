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
			status TEXT,
			role TEXT,
			employee_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("create users table failed: %v", err)
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

	db.DB = testDB
	t.Cleanup(func() {
		db.DB = prevDB
		sqlDB, closeErr := testDB.DB()
		if closeErr == nil {
			_ = sqlDB.Close()
		}
	})
}

func performCreateUserRequest(requestBody string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")

	ctx.Request = req
	CreateUserHandler(ctx)
	return recorder
}

func performBindUserEmployeeRequest(userID string, requestBody string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/"+userID+"/bind-employee", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")

	ctx.Request = req
	ctx.Params = gin.Params{{Key: "id", Value: userID}}
	BindUserEmployeeHandler(ctx)
	return recorder
}

func performUnbindUserEmployeeRequest(userID string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/"+userID+"/unbind-employee", nil)

	ctx.Request = req
	ctx.Params = gin.Params{{Key: "id", Value: userID}}
	UnbindUserEmployeeHandler(ctx)
	return recorder
}

func TestCreateUserHandlerCreatesUserWithCleanPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	requestBody := `{"username":"new-user","password":"secure123","email":"new@example.com","status":"active"}`
	recorder := performCreateUserRequest(requestBody)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201 when creating user without deprecated permission fields, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var created models.User
	if err := db.DB.Where("username = ?", "new-user").First(&created).Error; err != nil {
		t.Fatalf("expected created user persisted, query err=%v", err)
	}
	if created.Status != "active" {
		t.Fatalf("expected active status preserved, got %s", created.Status)
	}
}

func TestCreateUserHandlerPreservesEmployeeBindingWithoutDepartmentPermissionFallback(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-1"},
		StaffID:   "EMP-STAFF-1",
		Name:      "Alice",
		DeptID:    "dept-finance",
	}).Error)

	requestBody := `{"username":"dept-user","password":"secure123","email":"dept@example.com","status":"active","employeeId":"EMP-STAFF-1"}`
	recorder := performCreateUserRequest(requestBody)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201 when employee binding is present without permission fallback, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var created models.User
	if err := db.DB.Where("username = ?", "dept-user").First(&created).Error; err != nil {
		t.Fatalf("expected created user persisted, query err=%v", err)
	}
	if created.EmployeeID != "EMP-STAFF-1" {
		t.Fatalf("expected employee binding preserved, got %s", created.EmployeeID)
	}
}

func TestCreateUserHandlerPreservesEmployeeBindingWithoutPermissionPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-3"},
		StaffID:   "EMP-STAFF-3",
		Name:      "Carol",
		DeptID:    "dept-finance",
	}).Error)

	requestBody := `{"username":"dept-explicit-permission-user","password":"secure123","email":"dept-explicit@example.com","status":"active","employeeId":"EMP-STAFF-3"}`
	recorder := performCreateUserRequest(requestBody)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201 when employee binding is created without permission payload, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var created models.User
	if err := db.DB.Where("username = ?", "dept-explicit-permission-user").First(&created).Error; err != nil {
		t.Fatalf("expected created user persisted, query err=%v", err)
	}
	if created.EmployeeID != "EMP-STAFF-3" {
		t.Fatalf("expected employee binding preserved, got %s", created.EmployeeID)
	}
}

func TestCreateUserHandlerAllowsEmployeeBindingWithCleanPayloads(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

	require.NoError(t, db.DB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-2"},
		StaffID:   "EMP-STAFF-2",
		Name:      "Bob",
		DeptID:    "dept-missing",
	}).Error)

	requestBody := `{"username":"dept-missing-user","password":"secure123","email":"dept-missing@example.com","status":"active","employeeId":"EMP-STAFF-2"}`
	recorder := performCreateUserRequest(requestBody)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201 when permission fields are absent, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestBindUserEmployeeHandlerBindsEmployeeWithoutMirroringPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCreateUserHandlerTestDB(t)

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
		Status:   "active",
	}).Error)

	recorder := performBindUserEmployeeRequest(userID, `{"employeeId":"emp-bind-1"}`)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var user models.User
	require.NoError(t, db.DB.First(&user, "id = ?", userID).Error)
	require.Equal(t, "emp-bind-1", user.EmployeeID)

}
