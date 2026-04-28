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
			cutting_data BLOB,
			labeling_data BLOB,
			version INTEGER DEFAULT 1
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE UNIQUE INDEX idx_engineering_specs_code ON engineering_specs(code)`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_engineering_specs_deleted_at ON engineering_specs(deleted_at)`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE products (
			id TEXT PRIMARY KEY,
			deleted_at DATETIME,
			sku TEXT,
			name TEXT,
			status TEXT,
			engineering_spec_id TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE prepreg_material_specs (
			id TEXT PRIMARY KEY,
			deleted_at DATETIME,
			status TEXT
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
		BaseModel:         models.BaseModel{ID: "weaving-1", CreatedAt: now, UpdatedAt: now},
		MasterDataControl: models.MasterDataControl{RevisionNo: "R1", ChangeType: "MANUAL", IsDefaultSite: true},
		Name:              "1:1",
		Code:              "ENGINEERING_MASTER_WEAVING_MODE_1_1",
		Type:              engineeringMasterWeavingModeType,
		Description:       "",
		Active:            true,
		SpecData:          datatypes.JSON([]byte(`{"normalizedRatioKey":"1:1","label":"1:1","code":"ENGINEERING_MASTER_WEAVING_MODE_1_1"}`)),
		Version:           1,
	}).Error)

	_, err := SaveEngineeringSpec(SaveEngineeringSpecInput{
		BaseModel:         models.BaseModel{ID: "weaving-2"},
		MasterDataControl: models.MasterDataControl{RevisionNo: "R1", ChangeType: "MANUAL", IsDefaultSite: true},
		Name:              "1:1 Copy",
		Code:              "ENGINEERING_MASTER_WEAVING_MODE_2_2",
		Type:              engineeringMasterWeavingModeType,
		Description:       "",
		Active:            true,
		SpecData:          datatypes.JSON([]byte(`{"normalizedRatioKey":"1:1","label":"1:1","code":"ENGINEERING_MASTER_WEAVING_MODE_2_2"}`)),
	})

	require.ErrorIs(t, err, ErrEngineeringSpecDuplicateKey)
}

func TestDeleteEngineeringSpecRejectsWeavingModeReferencedByDrillingPlan(t *testing.T) {
	testDB := setupEngineeringMasterServiceTestDB(t)
	now := time.Now()

	require.NoError(t, testDB.Create(&models.EngineeringSpec{
		BaseModel:         models.BaseModel{ID: "weaving-1", CreatedAt: now, UpdatedAt: now},
		MasterDataControl: models.MasterDataControl{RevisionNo: "R1", ChangeType: "MANUAL", IsDefaultSite: true},
		Name:              "1:1",
		Code:              "ENGINEERING_MASTER_WEAVING_MODE_1_1",
		Type:              engineeringMasterWeavingModeType,
		Description:       "",
		Active:            true,
		SpecData:          datatypes.JSON([]byte(`{"normalizedRatioKey":"1:1","label":"1:1","code":"ENGINEERING_MASTER_WEAVING_MODE_1_1"}`)),
		Version:           1,
	}).Error)

	require.NoError(t, testDB.Create(&models.EngineeringSpec{
		BaseModel:         models.BaseModel{ID: "drilling-1", CreatedAt: now, UpdatedAt: now},
		MasterDataControl: models.MasterDataControl{RevisionNo: "R1", ChangeType: "MANUAL", IsDefaultSite: true},
		Name:              "Drilling Plan A",
		Code:              "DRILLING_PLAN_A",
		Type:              drillingPlanSpecType,
		Description:       "",
		Active:            true,
		DrillingData:      datatypes.JSON([]byte(`{"weavingModeId":"weaving-1","weavingModeLabel":"1:1"}`)),
		Version:           1,
	}).Error)

	err := DeleteEngineeringSpec("weaving-1")
	require.ErrorIs(t, err, ErrEngineeringSpecLinkedDrilling)

	var count int64
	require.NoError(t, testDB.Model(&models.EngineeringSpec{}).Where("id = ?", "weaving-1").Count(&count).Error)
	require.Equal(t, int64(1), count)
}

func TestSaveEngineeringSpecValidatesAndNormalizesCuttingPlanPayload(t *testing.T) {
	testDB := setupEngineeringMasterServiceTestDB(t)
	now := time.Now()

	require.NoError(t, testDB.Exec(
		`INSERT INTO products (id, sku, name, status, engineering_spec_id) VALUES (?, ?, ?, ?, ?)`,
		"product-1",
		"P-001",
		"产品A",
		"Active",
		"",
	).Error)

	require.NoError(t, testDB.Create(&models.EngineeringSpec{
		BaseModel:         models.BaseModel{ID: "cut-size-1", CreatedAt: now, UpdatedAt: now},
		MasterDataControl: models.MasterDataControl{RevisionNo: "R1", ChangeType: "MANUAL", IsDefaultSite: true},
		Name:              "主纱 980x34x4",
		Code:              "CS-001",
		Type:              cutSizeLibrarySpecType,
		Description:       "",
		Active:            true,
		CuttingData:       datatypes.JSON([]byte(`{"code":"CS-001","name":"主纱 980x34x4","widthMm":"980","lengthMm":"34","pieceCount":"4","areaM2":"0.13328","areaWeightGsm":"260","weightG":"34.6528","status":"Active"}`)),
		Version:           1,
	}).Error)

	saved, err := SaveEngineeringSpec(SaveEngineeringSpecInput{
		BaseModel:         models.BaseModel{},
		MasterDataControl: models.MasterDataControl{RevisionNo: "R1", ChangeType: "MANUAL", IsDefaultSite: true},
		Name:              "manual",
		Code:              "CUTTING-001",
		Type:              cuttingPlanSpecType,
		Description:       "",
		Active:            true,
		CuttingData:       datatypes.JSON([]byte(`{"name":"manual","productId":"product-1","productCode":"OLD","productName":"OLD","holeCount":"14","status":"Active","version":1,"lines":[{"id":"line-1","sequenceNo":99,"cutSizeId":"cut-size-1","cutSizeCode":"OLD-CODE","cutSizeName":"OLD-NAME","sizeExpression":"manual","faw":"999","weightG":"999","areaM2":"999"}]}`)),
	})

	require.NoError(t, err)
	require.Equal(t, true, saved.Active)

	payload, err := parseCuttingPlanPayload(saved.CuttingData)
	require.NoError(t, err)
	require.Equal(t, "产品A-14孔裁纱单", payload.Name)
	require.Equal(t, "P-001", payload.ProductCode)
	require.Equal(t, "产品A", payload.ProductName)
	require.Len(t, payload.Lines, 1)
	require.Equal(t, 1, payload.Lines[0].SequenceNo)
	require.Equal(t, "CS-001", payload.Lines[0].CutSizeCode)
	require.Equal(t, "主纱 980x34x4", payload.Lines[0].CutSizeName)
	require.Equal(t, "980x34x4", payload.Lines[0].SizeExpression)
	require.Equal(t, "260", payload.Lines[0].FAW)
	require.Equal(t, "34.6528", payload.Lines[0].WeightG)
	require.Equal(t, "0.13328", payload.Lines[0].AreaM2)
}

func TestSaveEngineeringSpecRejectsCuttingPlanWithoutCutSizeBinding(t *testing.T) {
	testDB := setupEngineeringMasterServiceTestDB(t)

	require.NoError(t, testDB.Exec(
		`INSERT INTO products (id, sku, name, status, engineering_spec_id) VALUES (?, ?, ?, ?, ?)`,
		"product-1",
		"P-001",
		"产品A",
		"Active",
		"",
	).Error)

	_, err := SaveEngineeringSpec(SaveEngineeringSpecInput{
		BaseModel:         models.BaseModel{},
		MasterDataControl: models.MasterDataControl{RevisionNo: "R1", ChangeType: "MANUAL", IsDefaultSite: true},
		Name:              "manual",
		Code:              "CUTTING-002",
		Type:              cuttingPlanSpecType,
		Description:       "",
		Active:            true,
		CuttingData:       datatypes.JSON([]byte(`{"name":"manual","productId":"product-1","holeCount":"14","status":"Active","version":1,"lines":[{"id":"line-1","sequenceNo":1}]}`)),
	})

	var validationErr *CuttingPlanValidationError
	require.ErrorAs(t, err, &validationErr)
	require.Equal(t, "裁纱单第 1 行未绑定尺寸库条目", validationErr.Message)
}
