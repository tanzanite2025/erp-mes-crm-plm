package services

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openEquipmentAssetTestDB(t *testing.T, withAuditTable bool) *gorm.DB {
	t.Helper()
	dsnName := strings.NewReplacer("/", "_", " ", "_").Replace(t.Name())
	testDB, err := gorm.Open(sqlite.Open("file:"+dsnName+"?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatalf("open sqlite connection: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Errorf("close sqlite: %v", err)
		}
	})

	schema := []string{
		`CREATE TABLE molds (
			id text PRIMARY KEY, sn text, name text, max_cycles integer, current_cycles integer,
			maintenance_threshold integer, total_life_cycles integer, group_name text, status text,
			location text, description text, is_alerted boolean, last_checked_at datetime, image_url text,
			created_by text, updated_by text, created_at datetime, updated_at datetime, deleted_at datetime
		)`,
		`CREATE TABLE furnaces (
			id text PRIMARY KEY, sn text, name text, type text, max_temp real, current_temp real,
			status text, location text, description text, created_by text, updated_by text,
			created_at datetime, updated_at datetime, deleted_at datetime
		)`,
		`CREATE TABLE equipment_partners (
			id text PRIMARY KEY, name text, type text, contact_person text, phone text, address text,
			created_at datetime, updated_at datetime
		)`,
		`CREATE TABLE mold_drawings (
			id text PRIMARY KEY, mold_id text, mold_sn text, name text, type text, file_url text,
			version text, status text, uploaded_at datetime, remarks text, created_at datetime, updated_at datetime
		)`,
		`CREATE TABLE mold_drawing_logs (
			id text PRIMARY KEY, drawing_id text, action text, details text, operator text, timestamp datetime
		)`,
		`CREATE TABLE mold_loans (
			id text PRIMARY KEY, mold_id text, mold_sn text, mold_name text, from_factory text,
			to_factory text, contact_person text, loan_date datetime, expected_return_date datetime,
			actual_return_date datetime, status text, remarks text, photo_url text, created_by text, created_at datetime
		)`,
	}
	if withAuditTable {
		schema = append(schema, `CREATE TABLE audit_logs (
			id text PRIMARY KEY, module text, target_id text, action text, diff blob,
			operator text, ip text, created_at datetime
		)`)
	}
	for _, statement := range schema {
		if err := testDB.Exec(statement).Error; err != nil {
			t.Fatalf("create equipment test schema: %v", err)
		}
	}
	return testDB
}

func equipmentAssetTestContext() context.Context {
	return audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "user-1",
		Username: "auditor",
		IP:       "127.0.0.1",
		Source:   "test",
	})
}

func TestEquipmentAssetServiceAuditsEveryEquipmentWritePath(t *testing.T) {
	testDB := openEquipmentAssetTestDB(t, true)
	service := NewEquipmentAssetService(testDB)
	ctx := equipmentAssetTestContext()

	mold, err := service.SaveMold(ctx, SaveMoldRequest{SN: "M-1", Name: "Mold", Status: "IDLE"})
	if err != nil {
		t.Fatalf("create mold: %v", err)
	}
	mold, err = service.PatchMold(ctx, mold.ID, map[string]json.RawMessage{
		"name": json.RawMessage(`{"o":"Mold","n":"Mold patched"}`),
	})
	if err != nil {
		t.Fatalf("patch mold: %v", err)
	}
	if err := service.UpdateMoldTelemetry(ctx, mold.ID, 4); err != nil {
		t.Fatalf("update mold telemetry: %v", err)
	}
	if err := service.BulkSyncMolds(ctx, []models.Mold{mold}); err != nil {
		t.Fatalf("bulk sync molds: %v", err)
	}

	furnace, err := service.SaveFurnace(ctx, SaveFurnaceRequest{SN: "F-1", Name: "Furnace", Status: "IDLE"})
	if err != nil {
		t.Fatalf("create furnace: %v", err)
	}
	furnace, err = service.PatchFurnace(ctx, furnace.ID, map[string]json.RawMessage{
		"status": json.RawMessage(`{"o":"IDLE","n":"HEATING"}`),
	})
	if err != nil {
		t.Fatalf("patch furnace: %v", err)
	}
	if err := service.UpdateFurnaceTelemetry(ctx, furnace.ID, 180.5); err != nil {
		t.Fatalf("update furnace telemetry: %v", err)
	}
	if err := service.BulkSyncFurnaces(ctx, []models.Furnace{furnace}); err != nil {
		t.Fatalf("bulk sync furnaces: %v", err)
	}

	partner, err := service.SaveEquipmentPartner(ctx, SaveEquipmentPartnerRequest{Name: "Partner", Type: "EXTERNAL"})
	if err != nil {
		t.Fatalf("create equipment partner: %v", err)
	}
	partner, err = service.PatchEquipmentPartner(ctx, partner.ID, map[string]json.RawMessage{
		"phone": json.RawMessage(`{"o":"","n":"123"}`),
	})
	if err != nil {
		t.Fatalf("patch equipment partner: %v", err)
	}
	if err := service.DeleteEquipmentPartner(ctx, partner.ID); err != nil {
		t.Fatalf("delete equipment partner: %v", err)
	}

	drawing, err := service.SaveMoldDrawing(ctx, SaveMoldDrawingRequest{MoldID: mold.ID, MoldSN: mold.SN, Name: "Drawing", FileURL: "/drawing.pdf", Version: "V1"})
	if err != nil {
		t.Fatalf("create mold drawing: %v", err)
	}
	drawing, err = service.PatchMoldDrawing(ctx, drawing.ID, map[string]json.RawMessage{
		"version": json.RawMessage(`{"o":"V1","n":"V2"}`),
	})
	if err != nil {
		t.Fatalf("patch mold drawing: %v", err)
	}
	if err := service.DeleteMoldDrawing(ctx, drawing.ID); err != nil {
		t.Fatalf("delete mold drawing: %v", err)
	}

	loan, err := service.CreateMoldLoan(ctx, models.MoldLoan{
		MoldID:             mold.ID,
		ToFactory:          "Factory B",
		ExpectedReturnDate: time.Now().Add(24 * time.Hour),
		Status:             "ACTIVE",
	}, "LENT_OUT")
	if err != nil {
		t.Fatalf("create mold loan: %v", err)
	}
	if _, err := service.ReturnMoldLoan(ctx, loan.ID); err != nil {
		t.Fatalf("return mold loan: %v", err)
	}

	for _, module := range []string{AuditModuleMold, AuditModuleFurnace, AuditModuleEquipmentPartner, AuditModuleMoldDrawing, AuditModuleMoldLoan} {
		var count int64
		if err := testDB.Table("audit_logs").Where("module = ? AND operator = ?", module, "auditor").Count(&count).Error; err != nil {
			t.Fatalf("count %s audit logs: %v", module, err)
		}
		if count == 0 {
			t.Fatalf("expected canonical %s audit entry", module)
		}
	}

	var drawingLogCount int64
	if err := testDB.Table("mold_drawing_logs").Where("drawing_id = ? AND operator = ?", drawing.ID, "auditor").Count(&drawingLogCount).Error; err != nil {
		t.Fatalf("count drawing history: %v", err)
	}
	if drawingLogCount != 2 {
		t.Fatalf("expected two transactional drawing history rows, got %d", drawingLogCount)
	}
}

func TestEquipmentAssetServiceRollsBackWhenAuditWriteFails(t *testing.T) {
	testDB := openEquipmentAssetTestDB(t, false)
	service := NewEquipmentAssetService(testDB)
	ctx := equipmentAssetTestContext()

	if err := testDB.Exec(`INSERT INTO molds (id, sn, name, status, current_cycles, total_life_cycles) VALUES (?, ?, ?, ?, ?, ?)`, "mold-1", "M-1", "Original", "IDLE", 0, 0).Error; err != nil {
		t.Fatalf("seed mold: %v", err)
	}
	_, err := service.PatchMold(ctx, "mold-1", map[string]json.RawMessage{
		"name": json.RawMessage(`{"o":"Original","n":"Changed"}`),
	})
	if err == nil || !strings.Contains(err.Error(), "audit_logs") {
		t.Fatalf("expected audit table failure, got %v", err)
	}
	var storedName string
	if err := testDB.Table("molds").Select("name").Where("id = ?", "mold-1").Scan(&storedName).Error; err != nil {
		t.Fatalf("load mold after rollback: %v", err)
	}
	if storedName != "Original" {
		t.Fatalf("expected mold patch rollback, got name %q", storedName)
	}

	_, err = service.CreateMoldLoan(ctx, models.MoldLoan{MoldID: "mold-1", Status: "ACTIVE"}, "LENT_OUT")
	if err == nil || !strings.Contains(err.Error(), "audit_logs") {
		t.Fatalf("expected aggregate audit failure, got %v", err)
	}
	var loanCount int64
	if err := testDB.Table("mold_loans").Count(&loanCount).Error; err != nil {
		t.Fatalf("count mold loans after rollback: %v", err)
	}
	if loanCount != 0 {
		t.Fatalf("expected loan insert rollback, got %d rows", loanCount)
	}
	var moldStatus string
	if err := testDB.Table("molds").Select("status").Where("id = ?", "mold-1").Scan(&moldStatus).Error; err != nil {
		t.Fatalf("load mold status after rollback: %v", err)
	}
	if moldStatus != "IDLE" {
		t.Fatalf("expected mold status rollback, got %q", moldStatus)
	}
}

func TestEquipmentAssetServiceBulkSyncPreservesOmittedFields(t *testing.T) {
	testDB := openEquipmentAssetTestDB(t, true)
	service := NewEquipmentAssetService(testDB)
	ctx := equipmentAssetTestContext()

	seedMold := models.Mold{
		ID:                   "mold-partial",
		SN:                   "M-ORIGINAL",
		Name:                 "Original mold",
		MaxCycles:            120000,
		CurrentCycles:        42,
		MaintenanceThreshold: 90000,
		TotalLifeCycles:      4200,
		GroupName:            "Group A",
		Status:               "IN_USE",
		Location:             "Line 1",
		Description:          "Keep this description",
		IsAlerted:            true,
	}
	if err := testDB.Create(&seedMold).Error; err != nil {
		t.Fatalf("seed mold: %v", err)
	}
	seedFurnace := models.Furnace{
		ID:          "furnace-partial",
		SN:          "F-ORIGINAL",
		Name:        "Original furnace",
		Type:        "ELECTRIC",
		MaxTemp:     1200,
		CurrentTemp: 640,
		Status:      "HEATING",
		Location:    "Bay 2",
		Description: "Keep this furnace description",
	}
	if err := testDB.Create(&seedFurnace).Error; err != nil {
		t.Fatalf("seed furnace: %v", err)
	}

	// Recovery payloads can contain only the fields received from an upstream
	// source. Struct Updates must leave all omitted zero-valued fields intact.
	if err := service.BulkSyncMolds(ctx, []models.Mold{{ID: seedMold.ID, SN: "M-RECOVERED"}}); err != nil {
		t.Fatalf("bulk sync mold: %v", err)
	}
	if err := service.BulkSyncFurnaces(ctx, []models.Furnace{{ID: seedFurnace.ID, SN: "F-RECOVERED"}}); err != nil {
		t.Fatalf("bulk sync furnace: %v", err)
	}

	var mold models.Mold
	if err := testDB.First(&mold, "id = ?", seedMold.ID).Error; err != nil {
		t.Fatalf("load mold: %v", err)
	}
	if mold.SN != "M-RECOVERED" || mold.Name != seedMold.Name || mold.Status != seedMold.Status || mold.CurrentCycles != seedMold.CurrentCycles || !mold.IsAlerted {
		t.Fatalf("partial mold sync overwrote omitted fields: %+v", mold)
	}

	var furnace models.Furnace
	if err := testDB.First(&furnace, "id = ?", seedFurnace.ID).Error; err != nil {
		t.Fatalf("load furnace: %v", err)
	}
	if furnace.SN != "F-RECOVERED" || furnace.Name != seedFurnace.Name || furnace.Type != seedFurnace.Type || furnace.Status != seedFurnace.Status || furnace.CurrentTemp != seedFurnace.CurrentTemp {
		t.Fatalf("partial furnace sync overwrote omitted fields: %+v", furnace)
	}
}
