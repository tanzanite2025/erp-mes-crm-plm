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

func TestOrganizationNameExistsForRootNodeDoesNotCompareUUIDParentToEmptyString(t *testing.T) {
	scope, args := organizationParentScope(nil)
	if scope != "parent_id IS NULL" {
		t.Fatalf("root organization lookup should match null parent_id, got: %s", scope)
	}
	if len(args) != 0 {
		t.Fatalf("root organization lookup should not bind an empty UUID parent argument: %#v", args)
	}
	if strings.Contains(scope, "parent_id = ''") {
		t.Fatalf("root organization lookup must not compare UUID parent_id to empty string: %s", scope)
	}
}

func TestOrganizationNameExistsForChildNodeScopesByParentID(t *testing.T) {
	parentID := "parent-1"
	scope, args := organizationParentScope(&parentID)
	if scope != "parent_id = ?" {
		t.Fatalf("child organization lookup should compare by parent id, got: %s", scope)
	}
	if len(args) != 1 || args[0] != parentID {
		t.Fatalf("child organization lookup should bind the normalized parent id: %#v", args)
	}
}
