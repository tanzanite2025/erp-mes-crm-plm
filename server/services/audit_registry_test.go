package services

import "testing"

func TestQualityStandardAllowsModuleLevelTimeline(t *testing.T) {
	canonicalModule := NormalizeAuditModule("quality-standard")
	if canonicalModule != AuditModuleInspectionStandard {
		t.Fatalf("quality-standard should normalize to %q, got %q", AuditModuleInspectionStandard, canonicalModule)
	}

	if !IsAuditModuleTimelineAllowed(canonicalModule) {
		t.Fatalf("%q should allow module-level timeline queries for the quality standards page header", canonicalModule)
	}
}

func TestEmployeeAllowsModuleLevelTimeline(t *testing.T) {
	if !IsAuditModuleTimelineAllowed(AuditModuleEmployee) {
		t.Fatalf("%q should allow module-level timeline queries for the personnel profile page", AuditModuleEmployee)
	}
}

func TestVehicleModelTemplateAuditRegistration(t *testing.T) {
	canonicalModule := NormalizeAuditModule("LogisticsVehicleModelTemplate")
	if canonicalModule != AuditModuleVehicleModelTemplate {
		t.Fatalf("LogisticsVehicleModelTemplate should normalize to %q, got %q", AuditModuleVehicleModelTemplate, canonicalModule)
	}

	registration, ok := GetAuditEntityRegistration(canonicalModule)
	if !ok {
		t.Fatalf("%q should be registered in audit entity registry", canonicalModule)
	}
	if !registration.Integrated {
		t.Fatalf("%q should be marked as integrated", canonicalModule)
	}
	if registration.EngineModule != AuditEngineModuleTrading {
		t.Fatalf("%q should belong to %q engine module, got %q", canonicalModule, AuditEngineModuleTrading, registration.EngineModule)
	}
}
