package repositories

import (
	"strings"
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
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

func TestSaveOrganizationCreatesOrgUnitWithValidJSONPayloads(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	if err := database.Exec(`
		CREATE TABLE org_units (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT NOT NULL,
			parent_id TEXT,
			code TEXT,
			unit_type TEXT,
			manager_employee_id TEXT,
			status TEXT,
			sort_order INTEGER,
			metadata TEXT,
			legacy_payload TEXT
		)
	`).Error; err != nil {
		t.Fatalf("create org_units schema: %v", err)
	}

	repository := GormOrgPersonnelRepository{}
	organization := models.Organization{
		BaseModel:   models.BaseModel{ID: "org-1"},
		Name:        "纤镀复材",
		Type:        "company",
		Manager:     "张三",
		Description: "根机构",
	}

	if err := repository.SaveOrganization(database, &organization); err != nil {
		t.Fatalf("save organization: %v", err)
	}

	var stored struct {
		Metadata      string
		LegacyPayload string
	}
	if err := database.Table("org_units").
		Select("metadata, legacy_payload").
		Where("id = ?", "org-1").
		Scan(&stored).Error; err != nil {
		t.Fatalf("load stored org unit: %v", err)
	}

	if strings.TrimSpace(stored.Metadata) == "" {
		t.Fatal("metadata should be valid non-empty JSON")
	}
	if strings.TrimSpace(stored.LegacyPayload) != "{}" {
		t.Fatalf("legacy_payload should be a valid empty JSON object, got %q", stored.LegacyPayload)
	}
}
