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
