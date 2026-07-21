package services

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openAuditStatsTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:audit_engine_stats_%d?mode=memory&cache=shared", time.Now().UnixNano())
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
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

	if err := testDB.AutoMigrate(&models.AuditLog{}); err != nil {
		t.Fatalf("migrate audit logs: %v", err)
	}
	return testDB
}

func insertAuditStatsLog(t *testing.T, testDB *gorm.DB, id, module string, createdAt time.Time) {
	t.Helper()
	if err := testDB.Create(&models.AuditLog{
		ID:        id,
		Module:    module,
		TargetID:  id,
		Action:    "Create",
		Diff:      json.RawMessage(`[]`),
		Operator:  "test",
		CreatedAt: createdAt,
	}).Error; err != nil {
		t.Fatalf("insert audit log %s: %v", id, err)
	}
}

func findAuditModuleStats(t *testing.T, response AuditEngineStatsResponse, moduleID string) AuditEngineModuleStats {
	t.Helper()
	for _, module := range response.Modules {
		if module.ID == moduleID {
			return module
		}
	}
	t.Fatalf("module %q missing from response", moduleID)
	return AuditEngineModuleStats{}
}

func TestBuildAuditEngineStatsKeepsEntityOwnershipAndHotActivitySeparate(t *testing.T) {
	testDB := openAuditStatsTestDB(t)
	now := time.Now().UTC()

	// These two aliases must resolve to their canonical entities and remain in
	// their owning modules, while the old record must stay outside the hot window.
	insertAuditStatsLog(t, testDB, "engineering-recent", "EngineeringSpec", now.Add(-time.Hour))
	insertAuditStatsLog(t, testDB, "maintenance-recent", "MaintenanceRecord", now.Add(-2*time.Hour))
	insertAuditStatsLog(t, testDB, "engineering-old", "drilling", now.Add(-31*24*time.Hour))
	insertAuditStatsLog(t, testDB, "unmapped-recent", "legacy-unregistered-entity", now.Add(-time.Hour))

	response, err := BuildAuditEngineStats(testDB)
	if err != nil {
		t.Fatalf("build audit engine stats: %v", err)
	}
	if response.HotWindowDays != 30 {
		t.Fatalf("expected 30-day hot window, got %d", response.HotWindowDays)
	}

	engineering := findAuditModuleStats(t, response, AuditEngineModuleEngineering)
	if !containsString(engineering.ActiveEntities, AuditModuleEngineeringSpec) {
		t.Fatalf("engineering-spec should be active in Engineering, got %v", engineering.ActiveEntities)
	}
	if containsString(engineering.ActiveEntities, AuditModuleDrilling) {
		t.Fatalf("old drilling event should not count as hot activity, got %v", engineering.ActiveEntities)
	}
	if engineering.Status != "ALERT" {
		t.Fatalf("partially integrated Engineering should be ALERT, got %q", engineering.Status)
	}
	if engineering.Connected {
		t.Fatal("partially integrated Engineering must not be connected")
	}

	equipment := findAuditModuleStats(t, response, AuditEngineModuleEquipment)
	if !containsString(equipment.ActiveEntities, AuditModuleMaintenanceRecord) {
		t.Fatalf("maintenance-record should be active in Equipment, got %v", equipment.ActiveEntities)
	}
	if equipment.Status != "HEALTHY" {
		t.Fatalf("fully integrated Equipment should be HEALTHY, got %q", equipment.Status)
	}
	if !equipment.Connected {
		t.Fatal("fully integrated Equipment must be connected")
	}
	if equipment.IntegratedEntityCount != equipment.TargetEntityCount {
		t.Fatalf("fully integrated Equipment must have all entities connected, got %d/%d", equipment.IntegratedEntityCount, equipment.TargetEntityCount)
	}

	if response.UnmappedLogEntityCount != 1 || len(response.UnmappedLogEntities) != 1 ||
		response.UnmappedLogEntities[0] != "legacy-unregistered-entity" {
		t.Fatalf("unexpected unmapped entities: count=%d entities=%v", response.UnmappedLogEntityCount, response.UnmappedLogEntities)
	}

	for _, module := range response.Modules {
		if module.Coverage != module.IntegrationCoverage {
			t.Fatalf("compatibility Coverage must equal IntegrationCoverage for %s: %.2f != %.2f", module.ID, module.Coverage, module.IntegrationCoverage)
		}
		if module.EntryCoverage != module.IntegrationCoverage {
			t.Fatalf("compatibility EntryCoverage must equal IntegrationCoverage for %s: %.2f != %.2f", module.ID, module.EntryCoverage, module.IntegrationCoverage)
		}
	}
}

func TestBuildAuditEngineStatsTreatsWarehouseAndTeamAuditPathsAsIntegrated(t *testing.T) {
	testDB := openAuditStatsTestDB(t)
	now := time.Now().UTC()

	insertAuditStatsLog(t, testDB, "inventory-recent", "Inventory", now.Add(-time.Hour))
	insertAuditStatsLog(t, testDB, "shipment-recent", "Shipment", now.Add(-2*time.Hour))
	insertAuditStatsLog(t, testDB, "stocktake-recent", "Stocktake", now.Add(-3*time.Hour))
	insertAuditStatsLog(t, testDB, "team-recent", "Team", now.Add(-4*time.Hour))

	response, err := BuildAuditEngineStats(testDB)
	if err != nil {
		t.Fatalf("build audit engine stats: %v", err)
	}

	warehouse := findAuditModuleStats(t, response, AuditEngineModuleWarehouse)
	for _, entity := range []string{AuditModuleInventory, AuditModuleShipment, AuditModuleStocktake} {
		if !containsString(warehouse.IntegratedEntities, entity) {
			t.Fatalf("%s should be integrated in Warehouse, got %v", entity, warehouse.IntegratedEntities)
		}
		if !containsString(warehouse.ActiveEntities, entity) {
			t.Fatalf("%s should be active in Warehouse, got %v", entity, warehouse.ActiveEntities)
		}
		if containsString(warehouse.MissingIntegrationEntities, entity) {
			t.Fatalf("%s must not be pending in Warehouse, got %v", entity, warehouse.MissingIntegrationEntities)
		}
	}
	if warehouse.Status != "HEALTHY" || !warehouse.Connected {
		t.Fatalf("Warehouse should be fully integrated, got status=%s connected=%v missing=%v", warehouse.Status, warehouse.Connected, warehouse.MissingIntegrationEntities)
	}

	production := findAuditModuleStats(t, response, AuditEngineModuleProduction)
	if !containsString(production.IntegratedEntities, AuditModuleTeam) {
		t.Fatalf("team should be integrated in Production, got %v", production.IntegratedEntities)
	}
	if !containsString(production.ActiveEntities, AuditModuleTeam) {
		t.Fatalf("team should be active in Production, got %v", production.ActiveEntities)
	}
	if production.Status != "HEALTHY" || !production.Connected {
		t.Fatalf("Production should be fully integrated, got status=%s connected=%v missing=%v", production.Status, production.Connected, production.MissingIntegrationEntities)
	}
}

func containsString(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}
