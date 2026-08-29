package services

import (
	"path/filepath"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openAttendanceEventTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "attendance.db")), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open attendance event test db: %v", err)
	}
	sqlDB, err := database.DB()
	if err != nil {
		t.Fatalf("open attendance event sql db: %v", err)
	}
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Errorf("close attendance event test db: %v", err)
		}
	})
	createAttendanceEventTestTables(t, database)

	previousDB := db.DB
	db.DB = database
	t.Cleanup(func() {
		db.DB = previousDB
	})
	return database
}

func createAttendanceEventTestTables(t *testing.T, database *gorm.DB) {
	t.Helper()

	statements := []string{
		`CREATE TABLE attendance_devices (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			device_code TEXT NOT NULL,
			name TEXT NOT NULL,
			vendor TEXT NOT NULL,
			model TEXT,
			protocol TEXT NOT NULL,
			endpoint TEXT,
			port INTEGER,
			username TEXT,
			secret_value TEXT,
			ingress_token_hash TEXT,
			location TEXT,
			org_unit_id TEXT,
			status TEXT,
			collect_mode TEXT,
			poll_interval_seconds INTEGER,
			time_zone TEXT,
			employee_match_field TEXT,
			device_employee_key_field TEXT,
			event_time_field TEXT,
			raw_event_code_field TEXT,
			clock_direction_rule TEXT,
			deduplicate_window_sec INTEGER,
			config TEXT,
			last_sync_at DATETIME,
			last_event_at DATETIME,
			last_sync_fetched INTEGER,
			last_sync_accepted INTEGER,
			last_sync_status TEXT,
			last_sync_message TEXT,
			last_health_check_at DATETIME,
			last_health_status TEXT,
			last_health_message TEXT,
			last_health_latency_ms INTEGER,
			version INTEGER
		)`,
		`CREATE TABLE attendance_device_employee_mappings (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			device_id TEXT NOT NULL,
			employee_id TEXT NOT NULL,
			device_employee_key TEXT NOT NULL,
			match_field TEXT,
			source TEXT,
			status TEXT,
			last_seen_at DATETIME,
			notes TEXT
		)`,
		`CREATE TABLE attendance_events (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			device_id TEXT NOT NULL,
			employee_id TEXT,
			device_employee_key TEXT NOT NULL,
			external_event_id TEXT,
			occurred_at DATETIME NOT NULL,
			direction TEXT NOT NULL,
			event_type TEXT NOT NULL,
			verification_method TEXT,
			source TEXT NOT NULL,
			fingerprint TEXT NOT NULL,
			match_status TEXT NOT NULL,
			match_message TEXT,
			raw_payload TEXT
		)`,
		`CREATE UNIQUE INDEX idx_attendance_events_fingerprint ON attendance_events (fingerprint)`,
		`CREATE TABLE employees (
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
			operator TEXT
		)`,
	}
	for _, statement := range statements {
		if err := database.Exec(statement).Error; err != nil {
			t.Fatalf("create attendance event test table: %v", err)
		}
	}
}

func createAttendanceEventTestDevice(t *testing.T, database *gorm.DB) models.AttendanceDevice {
	t.Helper()

	device := models.AttendanceDevice{
		BaseModel: models.BaseModel{
			ID: "device-1",
		},
		DeviceCode:           "ATT-HIK-01",
		Name:                 "Hikvision Terminal",
		Vendor:               "hikvision",
		Protocol:             "isup-ehome",
		Status:               "active",
		CollectMode:          "push",
		TimeZone:             "Asia/Shanghai",
		EmployeeMatchField:   "staffId",
		DeduplicateWindowSec: 60,
	}
	if err := database.Create(&device).Error; err != nil {
		t.Fatalf("create attendance event test device: %v", err)
	}
	return device
}

func TestPersistAttendanceEventUsesDeviceDeduplicateWindow(t *testing.T) {
	database := openAttendanceEventTestDB(t)
	device := createAttendanceEventTestDevice(t, database)
	occurredAt := time.Date(2026, 8, 13, 9, 0, 0, 0, time.UTC)

	_, _, duplicate, err := persistAttendanceEvent(device, AttendanceEventInput{
		DeviceEmployeeKey: "1001",
		ExternalEventID:   "evt-1",
		OccurredAt:        occurredAt,
		Direction:         "check-in",
		EventType:         "attendance",
		RawPayload:        map[string]interface{}{"employeeNo": "1001"},
	})
	if err != nil {
		t.Fatalf("persist first attendance event: %v", err)
	}
	if duplicate {
		t.Fatal("first attendance event was marked duplicate")
	}

	_, _, duplicate, err = persistAttendanceEvent(device, AttendanceEventInput{
		DeviceEmployeeKey: "1001",
		ExternalEventID:   "evt-2",
		OccurredAt:        occurredAt.Add(45 * time.Second),
		Direction:         "in",
		EventType:         " Attendance ",
		RawPayload:        map[string]interface{}{"employeeNo": "1001"},
	})
	if err != nil {
		t.Fatalf("persist duplicate attendance event: %v", err)
	}
	if !duplicate {
		t.Fatal("event inside device deduplicate window was accepted")
	}

	var count int64
	if err := database.Model(&models.AttendanceEvent{}).Count(&count).Error; err != nil {
		t.Fatalf("count attendance events: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected only one stored attendance event, got %d", count)
	}
}

func TestPersistAttendanceEventWindowDeduplicateKeepsDistinctFacts(t *testing.T) {
	database := openAttendanceEventTestDB(t)
	device := createAttendanceEventTestDevice(t, database)
	occurredAt := time.Date(2026, 8, 13, 9, 0, 0, 0, time.UTC)

	inputs := []AttendanceEventInput{
		{
			DeviceEmployeeKey: "1001",
			ExternalEventID:   "evt-base",
			OccurredAt:        occurredAt,
			Direction:         "in",
			EventType:         "attendance",
		},
		{
			DeviceEmployeeKey: "1002",
			ExternalEventID:   "evt-employee",
			OccurredAt:        occurredAt.Add(30 * time.Second),
			Direction:         "in",
			EventType:         "attendance",
		},
		{
			DeviceEmployeeKey: "1001",
			ExternalEventID:   "evt-direction",
			OccurredAt:        occurredAt.Add(30 * time.Second),
			Direction:         "out",
			EventType:         "attendance",
		},
		{
			DeviceEmployeeKey: "1001",
			ExternalEventID:   "evt-type",
			OccurredAt:        occurredAt.Add(30 * time.Second),
			Direction:         "in",
			EventType:         "access-granted",
		},
		{
			DeviceEmployeeKey: "1001",
			ExternalEventID:   "evt-window",
			OccurredAt:        occurredAt.Add(61 * time.Second),
			Direction:         "in",
			EventType:         "attendance",
		},
	}

	for index, input := range inputs {
		_, _, duplicate, err := persistAttendanceEvent(device, input)
		if err != nil {
			t.Fatalf("persist distinct attendance event %d: %v", index, err)
		}
		if duplicate {
			t.Fatalf("distinct attendance event %d was marked duplicate", index)
		}
	}

	var count int64
	if err := database.Model(&models.AttendanceEvent{}).Count(&count).Error; err != nil {
		t.Fatalf("count attendance events: %v", err)
	}
	if count != int64(len(inputs)) {
		t.Fatalf("expected %d stored attendance events, got %d", len(inputs), count)
	}
}
