package db

import (
	"encoding/json"
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestRetireOrganizationProductionArchitectureReferencesPreservesOtherMetadata(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	require.NoError(t, database.Exec(`
		CREATE TABLE org_units (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT NOT NULL,
			code TEXT,
			parent_id TEXT,
			unit_type TEXT,
			manager_employee_id TEXT,
			status TEXT,
			sort_order INTEGER,
			metadata TEXT,
			legacy_payload TEXT
		)
	`).Error)
	require.NoError(t, database.Create(&models.OrgUnit{
		BaseModel: models.BaseModel{ID: "org-unit-1"},
		Name:      "生产部",
		UnitType:  "department",
		Status:    "active",
		Metadata:  `{"manager":"张三","description":"负责制造","linkedArchitecture":[{"type":"segment","id":"segment-1","name":"旧分支"}],"custom":"保留"}`,
	}).Error)

	require.NoError(t, retireOrganizationProductionArchitectureReferences(database))
	require.NoError(t, retireOrganizationProductionArchitectureReferences(database))

	var stored models.OrgUnit
	require.NoError(t, database.First(&stored, "id = ?", "org-unit-1").Error)
	var metadata map[string]any
	require.NoError(t, json.Unmarshal([]byte(stored.Metadata), &metadata))
	require.Equal(t, "张三", metadata["manager"])
	require.Equal(t, "负责制造", metadata["description"])
	require.Equal(t, "保留", metadata["custom"])
	require.NotContains(t, metadata, "linkedArchitecture")
}
