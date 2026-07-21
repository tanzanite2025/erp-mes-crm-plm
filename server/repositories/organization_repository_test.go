package repositories

import (
	"strings"
	"testing"
)

func TestPositionOrganizationJoinClauseUsesUUIDComparison(t *testing.T) {
	joinClause := positionOrganizationJoinClause()

	for _, invalidClause := range []string{
		"positions.org_unit_id = CAST(organizations.id AS TEXT)",
		"CAST(positions.org_unit_id AS TEXT) = organizations.id",
	} {
		if strings.Contains(joinClause, invalidClause) {
			t.Fatalf("join clause still contains an unsafe uuid/text comparison: %s", joinClause)
		}
	}

	if !strings.Contains(joinClause, "positions.org_unit_id = organizations.id") {
		t.Fatalf("join clause should compare positions.org_unit_id and organizations.id as uuid columns: %s", joinClause)
	}
}
