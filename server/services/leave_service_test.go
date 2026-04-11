package services

import (
	"fmt"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupLeaveServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
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
			role TEXT,
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

func seedLeaveUserAndEmployee(t *testing.T, userID, employeeID, employeeName string) {
	t.Helper()
	now := time.Now()
	require.NoError(t, db.DB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: employeeID, CreatedAt: now, UpdatedAt: now},
		Name:      employeeName,
		Status:    "active",
	}).Error)
	require.NoError(t, db.DB.Create(&models.User{
		ID:         userID,
		Username:   userID,
		Password:   "hashed",
		Role:       "org_manager",
		Status:     "active",
		EmployeeID: employeeID,
		CreatedAt:  now,
		UpdatedAt:  now,
	}).Error)
}

func TestPreviewMyLeaveRequestUsesCurrentBoundEmployee(t *testing.T) {
	setupLeaveServiceTestDB(t)
	seedLeaveUserAndEmployee(t, "u-1", "emp-1", "张三")

	startTime := time.Date(2026, 4, 9, 8, 0, 0, 0, time.UTC)
	endTime := startTime.Add(30 * time.Hour)

	preview, err := PreviewMyLeaveRequest("u-1", LeavePreviewInput{
		LeaveType: "annual",
		StartTime: startTime,
		EndTime:   endTime,
	})

	require.NoError(t, err)
	require.Equal(t, "emp-1", preview.EmployeeID)
	require.Equal(t, "张三", preview.EmployeeName)
	require.Equal(t, 1.5, preview.DurationDays)
}

func TestCreateMyLeaveRequestPersistsPendingLeaveForCurrentEmployee(t *testing.T) {
	setupLeaveServiceTestDB(t)
	seedLeaveUserAndEmployee(t, "u-2", "emp-2", "李四")

	startTime := time.Date(2026, 4, 10, 8, 0, 0, 0, time.UTC)
	endTime := startTime.Add(8 * time.Hour)

	created, err := CreateMyLeaveRequest("u-2", CreateLeaveInput{
		LeaveType: "sick",
		StartTime: startTime,
		EndTime:   endTime,
		Reason:    "发烧就医",
	})

	require.NoError(t, err)
	require.Equal(t, "emp-2", created.EmployeeID)
	require.Equal(t, "PENDING", created.Status)
	require.Equal(t, 0.5, created.DurationDays)

	var persisted models.LeaveRequest
	require.NoError(t, db.DB.Where("id = ?", created.ID).Take(&persisted).Error)
	require.Equal(t, "emp-2", persisted.EmployeeID)
	require.Equal(t, "发烧就医", persisted.Reason)
}

func TestCancelMyLeaveRequestRejectsOtherEmployeesLeave(t *testing.T) {
	setupLeaveServiceTestDB(t)
	seedLeaveUserAndEmployee(t, "u-owner", "emp-owner", "王五")
	seedLeaveUserAndEmployee(t, "u-other", "emp-other", "赵六")

	now := time.Now().UTC()
	leave := models.LeaveRequest{
		BaseModel:    models.BaseModel{ID: "leave-1", CreatedAt: now, UpdatedAt: now},
		EmployeeID:   "emp-owner",
		LeaveType:    "annual",
		StartTime:    now,
		EndTime:      now.Add(24 * time.Hour),
		DurationDays: 1,
		Reason:       "休假",
		Status:       "PENDING",
		Version:      1,
	}
	require.NoError(t, db.DB.Create(&leave).Error)

	err := CancelMyLeaveRequest("u-other", "leave-1")
	require.ErrorIs(t, err, ErrLeaveCancelForbidden)
}

func TestGetMyLeaveStatsAggregatesPendingApprovedRejectedAndApprovedDays(t *testing.T) {
	setupLeaveServiceTestDB(t)
	seedLeaveUserAndEmployee(t, "u-3", "emp-3", "钱七")

	now := time.Now().UTC()
	leaves := []models.LeaveRequest{
		{BaseModel: models.BaseModel{ID: "l1", CreatedAt: now, UpdatedAt: now}, EmployeeID: "emp-3", LeaveType: "annual", StartTime: now, EndTime: now.Add(24 * time.Hour), DurationDays: 1, Reason: "A", Status: "PENDING", Version: 1},
		{BaseModel: models.BaseModel{ID: "l2", CreatedAt: now, UpdatedAt: now}, EmployeeID: "emp-3", LeaveType: "annual", StartTime: now, EndTime: now.Add(24 * time.Hour), DurationDays: 2, Reason: "B", Status: "APPROVED", Version: 1},
		{BaseModel: models.BaseModel{ID: "l3", CreatedAt: now, UpdatedAt: now}, EmployeeID: "emp-3", LeaveType: "annual", StartTime: now, EndTime: now.Add(24 * time.Hour), DurationDays: 0.5, Reason: "C", Status: "REJECTED", Version: 1},
		{BaseModel: models.BaseModel{ID: "l4", CreatedAt: now, UpdatedAt: now}, EmployeeID: "emp-other", LeaveType: "annual", StartTime: now, EndTime: now.Add(24 * time.Hour), DurationDays: 9, Reason: "D", Status: "APPROVED", Version: 1},
	}
	require.NoError(t, db.DB.Create(&leaves).Error)

	stats, err := GetMyLeaveStats("u-3")
	require.NoError(t, err)
	require.Equal(t, int64(1), stats.PendingCount)
	require.Equal(t, int64(1), stats.ApprovedCount)
	require.Equal(t, int64(1), stats.RejectedCount)
	require.Equal(t, 2.0, stats.TotalDays)
}
