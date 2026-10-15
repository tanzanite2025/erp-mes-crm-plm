package db

import (
	"github.com/stretchr/testify/require"
	"os"
	"testing"
)

func TestPayrollMigrationRemovesObsoleteColumnsAndNeverInfersIndependentPayrollFacts(t *testing.T) {
	mainSource, err := os.ReadFile("db.go")
	require.NoError(t, err)
	source, err := os.ReadFile("independent_piecework_payroll_storage_contract_migration.go")
	require.NoError(t, err)
	require.Contains(t, string(mainSource), "EnsureIndependentPieceworkPayrollStorageContract(DB)")
	for _, old := range []string{"backfillPieceworkRateContract()", "ensurePieceworkRateIntegrityConstraints()", "recordPieceworkRateContractIssues()"} {
		require.NotContains(t, string(mainSource), old)
	}
	for _, coupling := range []string{"FROM process_steps", "FROM production_route_steps", "SET pay_item_id", "UPDATE piecework_records", "UPDATE piecework_rates"} {
		require.NotContains(t, string(source), coupling)
	}
	require.Contains(t, string(source), "DROP COLUMN")
	require.Contains(t, string(source), "ex_piecework_rates_payroll_item_interval")
	require.NotContains(t, string(source), "piecework_records")
	require.NotContains(t, string(source), "settlement")
	require.NotContains(t, string(mainSource), "EnsurePieceworkRecordLegacySourceUniqueness")
	require.NotContains(t, string(mainSource), "EnsurePieceworkAttributionSnapshotContract")
}
