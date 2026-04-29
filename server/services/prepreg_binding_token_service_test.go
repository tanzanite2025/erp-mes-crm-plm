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

func setupPrepregBindingTokenServiceTestDB(t *testing.T) *gorm.DB {
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
			bound_roll_instance_id TEXT,
			bound_at DATETIME,
			expires_at DATETIME
		);
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE prepreg_roll_instances (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			binding_token TEXT NOT NULL UNIQUE,
			spec_id TEXT NOT NULL,
			spec_code TEXT NOT NULL,
			spec_name TEXT NOT NULL,
			resin_content_percent TEXT,
			supplier_batch_no TEXT,
			width_mm TEXT,
			length_m TEXT,
			nominal_area_m2 TEXT,
			inspector TEXT,
			box_no TEXT,
			production_date TEXT,
			ocr_raw_payload TEXT,
			activated_at DATETIME,
			activated_by TEXT,
			status TEXT NOT NULL
		);
	`).Error)
	db.DB = testDB

	t.Cleanup(func() {
		db.DB = prevDB
	})

	return testDB
}

func TestCreatePrepregBindingTokenBatch(t *testing.T) {
	testDB := setupPrepregBindingTokenServiceTestDB(t)

	result, err := CreatePrepregBindingTokenBatch(3)
	require.NoError(t, err)
	require.Len(t, result.Items, 3)

	var count int64
	require.NoError(t, testDB.Table("prepreg_binding_tokens").Count(&count).Error)
	require.EqualValues(t, 3, count)

	for _, item := range result.Items {
		require.NotEmpty(t, item.ID)
		require.True(t, IsValidPrepregBindingToken(item.Token))
		require.NotNil(t, item.ExpiresAt)
		require.True(t, item.ExpiresAt.After(time.Now()))
	}
}

func TestGetPrepregBindingTokenStateReturnsExpiredAndCleansUp(t *testing.T) {
	testDB := setupPrepregBindingTokenServiceTestDB(t)

	expiresAt := time.Now().Add(-time.Hour)
	tokenID := uuid.NewString()
	tokenValue := "PREPREG-BIND-20260429-001-EXPIRED1"
	require.NoError(t, testDB.Exec(
		`INSERT INTO prepreg_binding_tokens (id, created_at, updated_at, token, expires_at) VALUES (?, ?, ?, ?, ?)`,
		tokenID,
		time.Now(),
		time.Now(),
		tokenValue,
		expiresAt,
	).Error)

	_, err := GetPrepregBindingTokenState(tokenValue)
	require.ErrorIs(t, err, ErrPrepregBindingTokenExpired)

	var count int64
	require.NoError(t, testDB.Table("prepreg_binding_tokens").Where("id = ?", tokenID).Count(&count).Error)
	require.Zero(t, count)
}

func TestBindPrepregBindingTokenToSpecClearsExpiry(t *testing.T) {
	testDB := setupPrepregBindingTokenServiceTestDB(t)

	specID := uuid.NewString()
	require.NoError(t, testDB.Exec(
		`INSERT INTO prepreg_material_specs (id, created_at, updated_at, code, name, status, version) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		specID,
		time.Now(),
		time.Now(),
		"PP-SPEC-001",
		"Test Prepreg",
		"Active",
		1,
	).Error)

	expiresAt := time.Now().Add(24 * time.Hour)
	tokenID := uuid.NewString()
	tokenValue := "PREPREG-BIND-20260429-001-ACTIVE01"
	require.NoError(t, testDB.Exec(
		`INSERT INTO prepreg_binding_tokens (id, created_at, updated_at, token, expires_at) VALUES (?, ?, ?, ?, ?)`,
		tokenID,
		time.Now(),
		time.Now(),
		tokenValue,
		expiresAt,
	).Error)

	result, err := BindPrepregBindingTokenToSpec(tokenValue, specID)
	require.NoError(t, err)
	require.Equal(t, PrepregBindingTokenStatusBound, result.Status)
	require.Equal(t, specID, result.SpecID)

	var saved struct {
		BoundSpecID string
		BoundAt     *time.Time
		ExpiresAt   *time.Time
	}
	require.NoError(t, testDB.Table("prepreg_binding_tokens").Select("bound_spec_id, bound_at, expires_at").Where("id = ?", tokenID).Take(&saved).Error)
	require.Equal(t, specID, saved.BoundSpecID)
	require.NotNil(t, saved.BoundAt)
	require.Nil(t, saved.ExpiresAt)
}

func TestGetPrepregBindingTokenStateInvalidatesOrphanBoundToken(t *testing.T) {
	testDB := setupPrepregBindingTokenServiceTestDB(t)

	tokenID := uuid.NewString()
	tokenValue := "PREPREG-BIND-20260429-001-ORPHAN01"
	now := time.Now()
	require.NoError(t, testDB.Exec(
		`INSERT INTO prepreg_binding_tokens (id, created_at, updated_at, token, bound_spec_id, bound_at) VALUES (?, ?, ?, ?, ?, ?)`,
		tokenID,
		now,
		now,
		tokenValue,
		uuid.NewString(),
		now,
	).Error)

	_, err := GetPrepregBindingTokenState(tokenValue)
	var validationErr *PrepregMaterialSpecValidationError
	require.ErrorAs(t, err, &validationErr)
	require.Equal(t, "绑定二维码无效，请重新生成", validationErr.Error())

	var count int64
	require.NoError(t, testDB.Table("prepreg_binding_tokens").Where("id = ?", tokenID).Count(&count).Error)
	require.Zero(t, count)
}
