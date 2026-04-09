package services

import (
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupDictionaryServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	schemaStatements := []string{
		`CREATE TABLE dict_groups (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT NOT NULL,
			code TEXT NOT NULL,
			description TEXT,
			active BOOLEAN DEFAULT true,
			is_system BOOLEAN DEFAULT false
		)`,
		`CREATE UNIQUE INDEX idx_dict_groups_code ON dict_groups(code)`,
		`CREATE INDEX idx_dict_groups_deleted_at ON dict_groups(deleted_at)`,
		`CREATE TABLE dict_entries (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			group_id TEXT,
			label TEXT NOT NULL,
			code TEXT NOT NULL,
			description TEXT,
			options BLOB,
			sort_order INTEGER DEFAULT 0,
			active BOOLEAN DEFAULT true,
			is_system BOOLEAN DEFAULT false
		)`,
		`CREATE UNIQUE INDEX idx_dict_entries_code ON dict_entries(code)`,
		`CREATE INDEX idx_dict_entries_deleted_at ON dict_entries(deleted_at)`,
	}
	for _, stmt := range schemaStatements {
		require.NoError(t, testDB.Exec(stmt).Error)
	}

	prevDB := db.DB
	prevRDB := db.RDB
	db.DB = testDB
	db.RDB = redis.NewClient(&redis.Options{Addr: "127.0.0.1:0"})

	t.Cleanup(func() {
		db.DB = prevDB
		if db.RDB != nil {
			_ = db.RDB.Close()
		}
		db.RDB = prevRDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return testDB
}

func TestPatchDictGroupReturnsConflictForStaleVersion(t *testing.T) {
	testDB := setupDictionaryServiceTestDB(t)

	now := time.Now().UTC().Truncate(time.Millisecond)
	require.NoError(t, testDB.Exec(`
		INSERT INTO dict_groups (id, created_at, updated_at, code, name, description, active, is_system)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "grp-1", now, now, "WHEEL_SPEC", "Wheel Spec", "spec group", true, false).Error)

	_, err := PatchDictGroup(PatchDictGroupInput{
		Code:    "WHEEL_SPEC",
		Name:    ptrString("Wheel Spec Updated"),
		Version: now.Add(-2 * time.Second).Format(time.RFC3339Nano),
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "stale dictionary group version")

	var persisted models.DictGroup
	require.NoError(t, testDB.Where("id = ?", "grp-1").First(&persisted).Error)
	require.Equal(t, "Wheel Spec", persisted.Name)
}

func TestPatchDictEntryReturnsConflictForStaleVersion(t *testing.T) {
	testDB := setupDictionaryServiceTestDB(t)

	now := time.Now().UTC().Truncate(time.Millisecond)
	require.NoError(t, testDB.Exec(`
		INSERT INTO dict_groups (id, created_at, updated_at, code, name, description, active, is_system)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "grp-1", now, now, "BRAKE_GROUP", "Brake Group", "", true, false).Error)

	require.NoError(t, testDB.Exec(`
		INSERT INTO dict_entries (id, created_at, updated_at, group_id, label, code, description, options, sort_order, active, is_system)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "ent-1", now, now, "grp-1", "Brake Type", "BRAKE_TYPE", "", []byte(`[{"label":"Disc","value":"DISC"}]`), 0, true, false).Error)

	_, err := PatchDictEntry(PatchDictEntryInput{
		Code:    "BRAKE_TYPE",
		Label:   ptrString("Brake Type Updated"),
		Version: now.Add(-1500 * time.Millisecond).Format(time.RFC3339Nano),
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "stale dictionary entry version")

	var persisted models.DictEntry
	require.NoError(t, testDB.Where("id = ?", "ent-1").First(&persisted).Error)
	require.Equal(t, "Brake Type", persisted.Label)
}

func TestCreateDictGroupRejectsCodeConflict(t *testing.T) {
	testDB := setupDictionaryServiceTestDB(t)

	now := time.Now().UTC().Truncate(time.Millisecond)
	require.NoError(t, testDB.Exec(`
		INSERT INTO dict_groups (id, created_at, updated_at, code, name, description, active, is_system)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "grp-1", now, now, "MATERIAL_LEVEL", "Material Level", "", true, false).Error)

	_, err := CreateDictGroup(CreateDictGroupInput{
		Name: "Material Level Duplicate",
		Code: "material_level",
	})
	require.Error(t, err)
	require.True(t, strings.HasPrefix(err.Error(), "conflict:"))
}

func TestDeleteDictGroupRejectsSystemGroup(t *testing.T) {
	testDB := setupDictionaryServiceTestDB(t)

	now := time.Now().UTC().Truncate(time.Millisecond)
	require.NoError(t, testDB.Exec(`
		INSERT INTO dict_groups (id, created_at, updated_at, code, name, description, active, is_system)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "grp-sys", now, now, "SYS_GROUP", "System Group", "", true, true).Error)

	err := DeleteDictGroup("SYS_GROUP")
	require.Error(t, err)
	require.Contains(t, err.Error(), "system groups cannot be deleted")

	var persisted models.DictGroup
	require.NoError(t, testDB.Where("id = ?", "grp-sys").First(&persisted).Error)
}

func TestPatchDictEntryRejectsSystemMetadataMutation(t *testing.T) {
	testDB := setupDictionaryServiceTestDB(t)

	now := time.Now().UTC().Truncate(time.Millisecond)
	require.NoError(t, testDB.Exec(`
		INSERT INTO dict_groups (id, created_at, updated_at, code, name, description, active, is_system)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "grp-1", now, now, "SYS_GROUP", "System Group", "", true, true).Error)

	require.NoError(t, testDB.Exec(`
		INSERT INTO dict_entries (id, created_at, updated_at, group_id, label, code, description, options, sort_order, active, is_system)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "ent-sys", now, now, "grp-1", "System Entry", "SYS_ENTRY", "", []byte(`[]`), 0, true, true).Error)

	_, err := PatchDictEntry(PatchDictEntryInput{
		Code:    "SYS_ENTRY",
		Active:  ptrBool(false),
		Version: now.Format(time.RFC3339Nano),
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "system entry metadata is immutable")
}

func ptrString(v string) *string {
	return &v
}

func ptrBool(v bool) *bool {
	return &v
}
