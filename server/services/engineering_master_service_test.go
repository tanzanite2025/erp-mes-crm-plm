package services

import (
	"fmt"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupEngineeringMasterServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE engineering_specs (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			revision_no TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			change_type TEXT,
			change_order_no TEXT,
			site_code TEXT,
			is_default_site NUMERIC,
			name TEXT NOT NULL,
			code TEXT NOT NULL,
			type TEXT,
			description TEXT,
			active NUMERIC DEFAULT 1,
			spec_data BLOB,
			drilling_data BLOB,
			labeling_data BLOB,
			version INTEGER DEFAULT 1
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE UNIQUE INDEX idx_engineering_specs_code ON engineering_specs(code)`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_engineering_specs_deleted_at ON engineering_specs(deleted_at)`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE products (
			id TEXT PRIMARY KEY,
			engineering_spec_id TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE boms (
			id TEXT PRIMARY KEY,
			description TEXT
		)
	`).Error)

	prevDB := db.DB
	db.DB = testDB

	sqlDB, err := testDB.DB()
	require.NoError(t, err)
	t.Cleanup(func() {
		db.DB = prevDB
		_ = sqlDB.Close()
	})

	return testDB
}

func TestSaveEngineeringSpecRejectsDuplicateWeavingModeNormalizedRatioKey(t *testing.T) {
	testDB := setupEngineeringMasterServiceTestDB(t)
	now := time.Now()

	require.NoError(t, testDB.Create(&models.EngineeringSpec{
		BaseModel: models.BaseModel{ID: "weaving-1", CreatedAt: now, UpdatedAt: now},
		MasterDataControl: models.MasterDataControl{RevisionNo: "R1", ChangeType: "MANUAL", IsDefaultSite: true},
		Name: "1:1",
		Code: "ENGINEERING_MASTER_WEAVING_MODE_1_1",
		Type: engineeringMasterWeavingModeType,
		Description: "",
		Active: true,
		SpecData: datatypes.JSON([]byte(`{"normalizedRatioKey":"1:1","label":"1:1","code":"ENGINEERING_MASTER_WEAVING_MODE_1_1"}`)),
		Version: 1,
	}).Error)

	_, err := SaveEngineeringSpec(SaveEngineeringSpecInput{
		BaseModel: models.BaseModel{ID: "weaving-2"},
		MasterDataControl: models.MasterDataControl{RevisionNo: "R1", ChangeType: "MANUAL", IsDefaultSite: true},
		Name: "1:1 Copy",
		Code: "ENGINEERING_MASTER_WEAVING_MODE_2_2",
		Type: engineeringMasterWeavingModeType,
		Description: "",
		Active: true,
		SpecData: datatypes.JSON([]byte(`{"normalizedRatioKey":"1:1","label":"1:1","code":"ENGINEERING_MASTER_WEAVING_MODE_2_2"}`)),
	})

	require.ErrorIs(t, err, ErrEngineeringSpecDuplicateKey)
}

func TestDeleteEngineeringSpecRejectsWeavingModeReferencedByDrillingPlan(t *testing.T) {
	testDB := setupEngineeringMasterServiceTestDB(t)
	now := time.Now()

	require.NoError(t, testDB.Create(&models.EngineeringSpec{
		BaseModel: models.BaseModel{ID: "weaving-1", CreatedAt: now, UpdatedAt: now},
		MasterDataControl: models.MasterDataControl{RevisionNo: "R1", ChangeType: "MANUAL", IsDefaultSite: true},
		Name: "1:1",
		Code: "ENGINEERING_MASTER_WEAVING_MODE_1_1",
		Type: engineeringMasterWeavingModeType,
		Description: "",
		Active: true,
		SpecData: datatypes.JSON([]byte(`{"normalizedRatioKey":"1:1","label":"1:1","code":"ENGINEERING_MASTER_WEAVING_MODE_1_1"}`)),
		Version: 1,
	}).Error)

	require.NoError(t, testDB.Create(&models.EngineeringSpec{
		BaseModel: models.BaseModel{ID: "drilling-1", CreatedAt: now, UpdatedAt: now},
		MasterDataControl: models.MasterDataControl{RevisionNo: "R1", ChangeType: "MANUAL", IsDefaultSite: true},
		Name: "Drilling Plan A",
		Code: "DRILLING_PLAN_A",
		Type: drillingPlanSpecType,
		Description: "",
		Active: true,
		DrillingData: datatypes.JSON([]byte(`{"weavingModeId":"weaving-1","weavingModeLabel":"1:1"}`)),
		Version: 1,
	}).Error)

	err := DeleteEngineeringSpec("weaving-1")
	require.ErrorIs(t, err, ErrEngineeringSpecLinkedDrilling)

	var count int64
	require.NoError(t, testDB.Model(&models.EngineeringSpec{}).Where("id = ?", "weaving-1").Count(&count).Error)
	require.Equal(t, int64(1), count)
}
