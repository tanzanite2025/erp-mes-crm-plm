package repositories

import (
	"strings"
	"testing"
)

func TestPositionOrgUnitJoinClauseUsesOrgUnitsAsPositionScope(t *testing.T) {
	joinClause := positionOrgUnitJoinClause()

	for _, invalidClause := range []string{
		"positions.org_unit_id = CAST(organizations.id AS TEXT)",
		"CAST(positions.org_unit_id AS TEXT) = organizations.id",
		"positions.org_unit_id = organizations.id",
	} {
		if strings.Contains(joinClause, invalidClause) {
			t.Fatalf("join clause still points position scope at the old organizations table: %s", joinClause)
		}
	}

	if !strings.Contains(joinClause, "positions.org_unit_id = org_units.id") {
		t.Fatalf("join clause should compare positions.org_unit_id and org_units.id: %s", joinClause)
	}
}
