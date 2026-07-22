package db

import (
	"fmt"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openUnitSeedTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	oldDB := DB
	oldRDB := RDB
	database, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:unit_seed_%d?mode=memory&cache=shared", time.Now().UnixNano())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB, err := database.DB()
	if err != nil {
		t.Fatalf("open sqlite connection: %v", err)
	}
	t.Cleanup(func() {
		DB = oldDB
		RDB = oldRDB
		if err := sqlDB.Close(); err != nil {
			t.Errorf("close sqlite: %v", err)
		}
	})

	DB = database
	RDB = nil
	if err := DB.Exec(`
		CREATE TABLE units (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			category TEXT,
			precision INTEGER DEFAULT 0,
			status TEXT DEFAULT 'active',
			is_system BOOLEAN DEFAULT false,
			description TEXT
		)
	`).Error; err != nil {
		t.Fatalf("create unit schema: %v", err)
	}
	if err := DB.Exec(`CREATE INDEX idx_units_deleted_at ON units (deleted_at)`).Error; err != nil {
		t.Fatalf("create unit deleted_at index: %v", err)
	}
	return database
}

func TestEnsureDefaultUnitsSeedsEmptyTable(t *testing.T) {
	testDB := openUnitSeedTestDB(t)

	ensureDefaultUnits()

	var count int64
	if err := testDB.Model(&models.Unit{}).Count(&count).Error; err != nil {
		t.Fatalf("count units: %v", err)
	}
	if count != int64(len(defaultUnitSeeds())) {
		t.Fatalf("expected %d default units, got %d", len(defaultUnitSeeds()), count)
	}

	var kilogram models.Unit
	if err := testDB.First(&kilogram, "code = ?", "KG").Error; err != nil {
		t.Fatalf("load KG unit: %v", err)
	}
	if kilogram.Name != "千克" || kilogram.Category != "WEIGHT" || !kilogram.IsSystem || kilogram.Status != "active" {
		t.Fatalf("unexpected KG seed: %+v", kilogram)
	}
}

func TestEnsureDefaultUnitsMarksExistingCodeWithoutOverwritingBusinessFields(t *testing.T) {
	testDB := openUnitSeedTestDB(t)
	existing := models.Unit{
		BaseModel: models.BaseModel{ID: "11111111-1111-1111-1111-111111111111"},
		Code:      "KG",
		Name:      "公斤",
		Category:  "OTHER",
		Precision: 6,
		Status:    "inactive",
		IsSystem:  false,
	}
	if err := testDB.Create(&existing).Error; err != nil {
		t.Fatalf("seed existing unit: %v", err)
	}

	ensureDefaultUnits()

	var kilogram models.Unit
	if err := testDB.First(&kilogram, "code = ?", "KG").Error; err != nil {
		t.Fatalf("load KG unit: %v", err)
	}
	if !kilogram.IsSystem {
		t.Fatalf("expected existing KG to be marked as system: %+v", kilogram)
	}
	if kilogram.Name != "公斤" || kilogram.Category != "OTHER" || kilogram.Precision != 6 || kilogram.Status != "inactive" {
		t.Fatalf("default seed must not overwrite existing business fields: %+v", kilogram)
	}
}

func TestEnsureDefaultUnitsRestoresSoftDeletedDefault(t *testing.T) {
	testDB := openUnitSeedTestDB(t)
	deleted := models.Unit{
		BaseModel: models.BaseModel{ID: "22222222-2222-2222-2222-222222222222"},
		Code:      "PCS",
		Name:      "件",
		Category:  "QUANTITY",
		Precision: 0,
		Status:    "inactive",
		IsSystem:  false,
	}
	if err := testDB.Create(&deleted).Error; err != nil {
		t.Fatalf("seed deleted unit: %v", err)
	}
	if err := testDB.Delete(&deleted).Error; err != nil {
		t.Fatalf("soft delete unit: %v", err)
	}

	ensureDefaultUnits()

	var restored models.Unit
	if err := testDB.Unscoped().First(&restored, "code = ?", "PCS").Error; err != nil {
		t.Fatalf("load restored PCS: %v", err)
	}
	if restored.DeletedAt.Valid || !restored.IsSystem || restored.Status != "active" {
		t.Fatalf("expected PCS to be restored as active system unit: %+v", restored)
	}
}
