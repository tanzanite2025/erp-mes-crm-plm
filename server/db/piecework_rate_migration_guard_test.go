package db

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestPieceworkRateContractMigrationBackfillsRouteStepBeforeLegacyProcessCode(t *testing.T) {
	source := readDBSourceForPieceworkMigrationGuard(t)

	routeStepBackfill := "UPDATE piecework_rates AS rate\n\t\t\tSET process_step_id = route_step.process_step_id\n\t\t\tFROM production_route_steps AS route_step"
	legacyProcessCodeBackfill := "UPDATE piecework_rates AS rate\n\t\t\tSET process_step_id = process.id\n\t\t\tFROM process_steps AS process"
	routeStepIndex := strings.Index(source, routeStepBackfill)
	if routeStepIndex < 0 {
		t.Fatal("piecework rate migration must backfill process_step_id from route_step_id first")
	}
	legacyProcessCodeIndex := strings.Index(source, legacyProcessCodeBackfill)
	if legacyProcessCodeIndex < 0 {
		t.Fatal("piecework rate migration must retain legacy process_code backfill as a compatibility fallback")
	}
	if routeStepIndex > legacyProcessCodeIndex {
		t.Fatal("route_step_id backfill must run before legacy process_code backfill")
	}
}

func TestPieceworkRateContractMigrationRecordsIssuesBeforeEnforcingConstraints(t *testing.T) {
	source := readDBSourceForPieceworkMigrationGuard(t)

	requiredSnippets := []string{
		"CREATE TABLE IF NOT EXISTS piecework_rate_contract_issues",
		"MISSING_PROCESS_STEP_ID",
		"PROCESS_CODE_NOT_RESOLVED",
		"MISSING_EFFECTIVE_FROM",
		"OVERLAPPING_ACTIVE_INTERVAL",
		"if unresolved > 0 || overlapping > 0",
		"CREATE EXTENSION IF NOT EXISTS btree_gist",
		"ALTER TABLE piecework_rates ALTER COLUMN process_step_id SET NOT NULL",
		"ALTER TABLE piecework_rates ALTER COLUMN effective_from SET NOT NULL",
		"ex_piecework_rates_process_interval",
		"ex_piecework_rates_route_interval",
	}
	for _, snippet := range requiredSnippets {
		if !strings.Contains(source, snippet) {
			t.Fatalf("piecework rate migration contract guard missing %q", snippet)
		}
	}

	issueIndex := strings.Index(source, "recordPieceworkRateContractIssues()")
	constraintIndex := strings.Index(source, "ensurePieceworkRateIntegrityConstraints()")
	if issueIndex < 0 || constraintIndex < 0 {
		t.Fatal("piecework rate migration must record issues and then enforce constraints")
	}
	if issueIndex > constraintIndex {
		t.Fatal("piecework rate issue recording must run before constraint enforcement")
	}
}

func readDBSourceForPieceworkMigrationGuard(t *testing.T) string {
	t.Helper()

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("failed to locate db package source")
	}

	sourcePath := filepath.Join(filepath.Dir(currentFile), "db.go")
	source, err := os.ReadFile(sourcePath)
	if err != nil {
		t.Fatalf("read db.go: %v", err)
	}
	return string(source)
}
