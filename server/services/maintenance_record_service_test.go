package services

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openMaintenanceRecordTransactionTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open("file:maintenance_record_transaction?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}

	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatalf("open sqlite connection: %v", err)
	}
	sqlDB.SetMaxOpenConns(2)
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Errorf("close sqlite: %v", err)
		}
	})

	if err := testDB.Exec(`
		CREATE TABLE maintenance_records (
			id text PRIMARY KEY,
			asset_type text,
			asset_id text,
			asset_sn text,
			type text,
			status text,
			title text,
			description text,
			priority text,
			started_at datetime,
			completed_at datetime,
			cost real,
			remarks text,
			created_by text,
			updated_by text,
			version integer,
			created_at datetime,
			updated_at datetime,
			deleted_at datetime
		)
	`).Error; err != nil {
		t.Fatalf("create maintenance record schema: %v", err)
	}

	return testDB
}

func seedMaintenanceRecord(t *testing.T, testDB *gorm.DB, id string) {
	t.Helper()

	if err := testDB.Exec(`
		INSERT INTO maintenance_records (
			id, asset_type, asset_id, type, status, title, priority, version
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, id, "MOLD", "asset-1", "PREVENTIVE", "OPEN", "Original title", "MEDIUM", 1).Error; err != nil {
		t.Fatalf("seed maintenance record: %v", err)
	}
}

func TestMaintenanceRecordPatchRollsBackWhenAuditWriteFails(t *testing.T) {
	testDB := openMaintenanceRecordTransactionTestDB(t)
	const recordID = "maintenance-record-patch"
	seedMaintenanceRecord(t, testDB, recordID)

	service := NewMaintenanceRecordService(testDB)
	_, err := service.Patch(PatchInput{
		ID: recordID,
		Delta: map[string]json.RawMessage{
			"title": json.RawMessage(`{"o":"Original title","n":"Updated title"}`),
		},
		Version:  1,
		Operator: "tester",
	})
	if err == nil || !strings.Contains(err.Error(), "audit_logs") {
		t.Fatalf("expected audit write failure, got %v", err)
	}

	var stored struct {
		Title   string
		Version int
	}
	if err := testDB.Table("maintenance_records").Select("title, version").Where("id = ?", recordID).Take(&stored).Error; err != nil {
		t.Fatalf("load maintenance record after rollback: %v", err)
	}
	if stored.Title != "Original title" || stored.Version != 1 {
		t.Fatalf("expected patch rollback, got title %q and version %d", stored.Title, stored.Version)
	}
}

func TestMaintenanceRecordDeleteRollsBackWhenAuditWriteFails(t *testing.T) {
	testDB := openMaintenanceRecordTransactionTestDB(t)
	const recordID = "maintenance-record-delete"
	seedMaintenanceRecord(t, testDB, recordID)

	service := NewMaintenanceRecordService(testDB)
	err := service.Delete(recordID, "tester", "", "")
	if err == nil || !strings.Contains(err.Error(), "audit_logs") {
		t.Fatalf("expected audit write failure, got %v", err)
	}

	var active int64
	if err := testDB.Table("maintenance_records").Where("id = ? AND deleted_at IS NULL", recordID).Count(&active).Error; err != nil {
		t.Fatalf("count maintenance records after rollback: %v", err)
	}
	if active != 1 {
		t.Fatalf("expected delete rollback, got %d active records", active)
	}
}
