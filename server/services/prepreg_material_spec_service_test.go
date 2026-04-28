package services

import (
	"fmt"
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupPrepregMaterialSpecServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(
		sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())),
		&gorm.Config{Logger: logger.Default.LogMode(logger.Silent)},
	)
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE prepreg_material_specs (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			display_alias TEXT,
			supplier_id TEXT,
			supplier_product_code TEXT,
			fiber_model TEXT,
			resin_content_percent TEXT,
			width_mm TEXT,
			length_m TEXT,
			nominal_area_m2 TEXT,
			supplier_batch_no TEXT,
			inspector TEXT,
			box_no TEXT,
			production_date TEXT,
			description TEXT,
			status TEXT,
			version INTEGER
		);
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE prepreg_binding_tokens (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			token TEXT NOT NULL UNIQUE,
			bound_spec_id TEXT,
			bound_at DATETIME,
			expires_at DATETIME
		);
	`).Error)
	db.DB = testDB

	t.Cleanup(func() {
		db.DB = prevDB
	})

	return testDB
}

func TestSavePrepregMaterialSpecReturnsNotFoundWhenIDDoesNotExist(t *testing.T) {
	setupPrepregMaterialSpecServiceTestDB(t)

	_, err := SavePrepregMaterialSpec(SavePrepregMaterialSpecRequest{
		ID:      uuid.NewString(),
		Code:    "PP-MISSING-001",
		Name:    "Missing Spec",
		Status:  "Inactive",
		Version: 1,
	})
	require.ErrorIs(t, err, ErrPrepregMaterialSpecNotFound)
}

func TestDeletePrepregMaterialSpecCleansBoundTokens(t *testing.T) {
	testDB := setupPrepregMaterialSpecServiceTestDB(t)

	specID := uuid.NewString()
	now := time.Now()
	require.NoError(t, testDB.Exec(
		`INSERT INTO prepreg_material_specs (id, created_at, updated_at, code, name, status, version) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		specID,
		now,
		now,
		"PP-DELETE-001",
		"Delete Target",
		"Active",
		1,
	).Error)

	require.NoError(t, testDB.Exec(
		`INSERT INTO prepreg_binding_tokens (id, created_at, updated_at, token, bound_spec_id, bound_at) VALUES (?, ?, ?, ?, ?, ?)`,
		uuid.NewString(),
		now,
		now,
		"PREPREG-BIND-20260429-001-DELTEST1",
		specID,
		now,
	).Error)

	require.NoError(t, DeletePrepregMaterialSpec(specID))

	var tokenCount int64
	require.NoError(t, testDB.Table("prepreg_binding_tokens").Where("bound_spec_id = ?", specID).Count(&tokenCount).Error)
	require.Zero(t, tokenCount)

	var activeSpecCount int64
	require.NoError(t, testDB.Table("prepreg_material_specs").Where("id = ? AND deleted_at IS NULL", specID).Count(&activeSpecCount).Error)
	require.Zero(t, activeSpecCount)
}
