package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupLeaveHandlerSQLiteTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL,
			password TEXT NOT NULL,
			email TEXT,
			phone_number TEXT,
			first_name TEXT,
			last_name TEXT,
			status TEXT,
			employee_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error)
	require.NoError(t, testDB.Exec(`
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
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE leave_requests (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			employee_id TEXT NOT NULL,
			submitted_by_user_id TEXT,
			leave_type TEXT NOT NULL,
			start_time DATETIME NOT NULL,
			end_time DATETIME NOT NULL,
			duration_days REAL NOT NULL,
			reason TEXT,
			status TEXT,
			approval_id TEXT,
			version INTEGER
		);
	`).Error)

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

func seedLeaveHandlerUserAndEmployee(t *testing.T, userID, employeeID, employeeName string) {
	t.Helper()
	now := time.Now().UTC()
	require.NoError(t, db.DB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: employeeID, CreatedAt: now, UpdatedAt: now},
		Name:      employeeName,
		Status:    "active",
	}).Error)
	require.NoError(t, db.DB.Create(&models.User{
		ID:         userID,
		Username:   userID,
		Password:   "hashed",
		Status:     "active",
		EmployeeID: employeeID,
		CreatedAt:  now,
		UpdatedAt:  now,
	}).Error)
}

func TestPreviewMyLeaveRequestHandlerReturnsUnauthorizedWhenUserMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupLeaveHandlerSQLiteTestDB(t)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/leaves/preview", strings.NewReader(`{"employeeId":"emp-missing","leaveType":"annual","startTime":"2026-04-09T08:00:00Z","endTime":"2026-04-10T08:00:00Z"}`))
	ctx.Request.Header.Set("Content-Type", "application/json")

	PreviewLeaveRequestHandler(ctx)

	require.Equal(t, http.StatusUnauthorized, recorder.Code)
}

func TestCreateLeaveRequestHandlerCreatesLeaveForSelectedEmployee(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupLeaveHandlerSQLiteTestDB(t)
	seedLeaveHandlerUserAndEmployee(t, "u-handler", "emp-handler", "测试员工")

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/leaves", strings.NewReader(`{"employeeId":"emp-handler","leaveType":"personal","startTime":"2026-04-09T08:00:00Z","endTime":"2026-04-10T08:00:00Z","reason":"家中有事"}`))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("userId", "u-handler")

	CreateLeaveRequestHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response struct {
		ID                string  `json:"id"`
		EmployeeID        string  `json:"employeeId"`
		SubmittedByUserID string  `json:"submittedByUserId"`
		EmployeeName      string  `json:"employeeName"`
		Status            string  `json:"status"`
		DurationDays      float64 `json:"durationDays"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.NotEmpty(t, response.ID)
	require.Equal(t, "emp-handler", response.EmployeeID)
	require.Equal(t, "u-handler", response.SubmittedByUserID)
	require.Equal(t, "测试员工", response.EmployeeName)
	require.Equal(t, "PENDING", response.Status)
	require.Equal(t, 1.0, response.DurationDays)
}
