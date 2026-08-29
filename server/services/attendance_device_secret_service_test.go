package services

import (
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/security"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openAttendanceDeviceSecretTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "attendance-secrets.db")), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open attendance secret test db: %v", err)
	}
	sqlDB, err := database.DB()
	if err != nil {
		t.Fatalf("open attendance secret sql db: %v", err)
	}
	t.Cleanup(func() {
		_ = sqlDB.Close()
	})
	if err := database.Exec(`
		CREATE TABLE attendance_devices (
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
		)
	`).Error; err != nil {
		t.Fatalf("create attendance secret test db: %v", err)
	}
	return database
}

func TestMigrateAttendanceDeviceSecretsAtRestAndDecryptsOnFind(t *testing.T) {
	t.Setenv(security.AttendanceSecretEncryptionKeyEnv, "local-attendance-secret-key-20260813-strong")
	database := openAttendanceDeviceSecretTestDB(t)

	legacySecret := "legacy-device-password"
	device := models.AttendanceDevice{
		BaseModel:   models.BaseModel{ID: "device-secret-1"},
		DeviceCode:  "ATT-SECRET-01",
		Name:        "Secret test device",
		Vendor:      "hikvision",
		Protocol:    "isapi",
		SecretValue: legacySecret,
		Status:      "active",
	}
	if err := database.Exec(`
		INSERT INTO attendance_devices
			(id, device_code, name, vendor, protocol, secret_value, status, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, device.ID, device.DeviceCode, device.Name, device.Vendor, device.Protocol, legacySecret, device.Status, 1).Error; err != nil {
		t.Fatalf("insert legacy attendance device: %v", err)
	}

	migrated, err := MigrateAttendanceDeviceSecretsAtRest(database)
	if err != nil {
		t.Fatalf("migrate attendance device secret: %v", err)
	}
	if migrated != 1 {
		t.Fatalf("expected one migrated secret, got %d", migrated)
	}

	var stored string
	if err := database.Table("attendance_devices").
		Select("secret_value").
		Where("id = ?", device.ID).
		Scan(&stored).Error; err != nil {
		t.Fatalf("read stored attendance secret: %v", err)
	}
	if stored == legacySecret || !security.IsAttendanceSecretCiphertext(stored) {
		t.Fatalf("database still contains legacy secret: %q", stored)
	}

	var loaded models.AttendanceDevice
	if err := database.Where("id = ?", device.ID).Take(&loaded).Error; err != nil {
		t.Fatalf("load attendance device with decrypted secret: %v", err)
	}
	if loaded.SecretValue != legacySecret {
		t.Fatalf("expected runtime plaintext secret %q, got %q", legacySecret, loaded.SecretValue)
	}

	migrated, err = MigrateAttendanceDeviceSecretsAtRest(database)
	if err != nil {
		t.Fatalf("repeat attendance device secret migration: %v", err)
	}
	if migrated != 0 {
		t.Fatalf("expected repeat migration to be idempotent, migrated %d rows", migrated)
	}
}

func TestAttendanceDeviceStorageCopyEncryptsWithoutMutatingRuntimeObject(t *testing.T) {
	t.Setenv(security.AttendanceSecretEncryptionKeyEnv, "local-attendance-secret-key-20260813-strong")
	database := openAttendanceDeviceSecretTestDB(t)

	device := models.AttendanceDevice{
		BaseModel:   models.BaseModel{ID: "device-secret-2"},
		DeviceCode:  "ATT-SECRET-02",
		Name:        "Secret test device",
		Vendor:      "hikvision",
		Protocol:    "isapi",
		SecretValue: "runtime-plaintext",
		Status:      "active",
	}
	if err := createAttendanceDeviceWithEncryptedSecret(database, device); err != nil {
		t.Fatalf("create encrypted attendance device: %v", err)
	}
	if device.SecretValue != "runtime-plaintext" {
		t.Fatalf("storage helper mutated runtime plaintext: %q", device.SecretValue)
	}

	var stored string
	if err := database.Table("attendance_devices").
		Select("secret_value").
		Where("id = ?", device.ID).
		Scan(&stored).Error; err != nil {
		t.Fatalf("read encrypted attendance secret: %v", err)
	}
	if stored == device.SecretValue || !security.IsAttendanceSecretCiphertext(stored) {
		t.Fatalf("attendance secret was not encrypted at rest: %q", stored)
	}
}

func TestAttendanceDeviceViewDoesNotExposeSecret(t *testing.T) {
	device := models.AttendanceDevice{
		BaseModel:        models.BaseModel{ID: "device-secret-3"},
		DeviceCode:       "ATT-SECRET-03",
		SecretValue:      "api-secret-must-not-leak",
		IngressTokenHash: "hash",
	}

	view := toAttendanceDeviceView(device)
	if !view.HasSecret || !view.HasIngressToken {
		t.Fatal("credential presence flags were not set")
	}
	if view.SecretValue != "" || view.IngressTokenHash != "" {
		t.Fatal("credential values remain in API view")
	}

	encoded, err := json.Marshal(view)
	if err != nil {
		t.Fatalf("marshal attendance device view: %v", err)
	}
	if strings.Contains(string(encoded), "api-secret-must-not-leak") {
		t.Fatal("API view JSON contains the device secret")
	}
}

func TestSaveAttendanceDeviceBlankSecretPreservesExistingCredential(t *testing.T) {
	t.Setenv(security.AttendanceSecretEncryptionKeyEnv, "local-attendance-secret-key-20260813-strong")
	database := openAttendanceDeviceSecretTestDB(t)
	previousDB := db.DB
	db.DB = database
	t.Cleanup(func() {
		db.DB = previousDB
	})

	device := models.AttendanceDevice{
		BaseModel:   models.BaseModel{ID: "device-secret-4"},
		DeviceCode:  "ATT-SECRET-04",
		Name:        "Existing secret device",
		Vendor:      "hikvision",
		Protocol:    "isapi",
		Endpoint:    "http://127.0.0.1",
		Port:        80,
		Username:    "admin",
		SecretValue: "existing-device-password",
		Status:      "active",
		Version:     1,
	}
	if err := createAttendanceDeviceWithEncryptedSecret(database, device); err != nil {
		t.Fatalf("create existing attendance device: %v", err)
	}

	view, err := SaveAttendanceDevice(AttendanceDeviceInput{
		ID:          device.ID,
		DeviceCode:  device.DeviceCode,
		Name:        "Renamed device",
		Vendor:      device.Vendor,
		Protocol:    device.Protocol,
		Endpoint:    device.Endpoint,
		Port:        device.Port,
		Username:    device.Username,
		Secret:      "",
		Status:      "active",
		CollectMode: "pull",
	})
	if err != nil {
		t.Fatalf("save attendance device without changing secret: %v", err)
	}
	if view.HasSecret != true || view.SecretValue != "" {
		t.Fatalf("saved view changed credential exposure state: %#v", view)
	}

	var stored string
	if err := database.Table("attendance_devices").
		Select("secret_value").
		Where("id = ?", device.ID).
		Scan(&stored).Error; err != nil {
		t.Fatalf("read preserved attendance secret: %v", err)
	}
	if stored == device.SecretValue || !security.IsAttendanceSecretCiphertext(stored) {
		t.Fatalf("existing attendance secret was not preserved as ciphertext: %q", stored)
	}
	if decrypted, err := security.DecryptAttendanceSecret(stored); err != nil || decrypted != device.SecretValue {
		t.Fatalf("preserved attendance secret cannot be decrypted: value=%q err=%v", decrypted, err)
	}
}
