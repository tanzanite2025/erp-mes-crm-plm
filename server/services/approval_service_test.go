package services

import (
	"fmt"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupApprovalServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	require.NoError(t, err)
	ddl := []string{
		`CREATE TABLE approval_configs (
			id TEXT PRIMARY KEY,
			module TEXT,
			action TEXT,
			approver1_id TEXT,
			approver2_id TEXT,
			is_active BOOLEAN,
			description TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE approval_requests (
			id TEXT PRIMARY KEY,
			config_id TEXT,
			requester_id TEXT,
			target_id TEXT,
			reason TEXT,
			current_level INTEGER,
			status TEXT,
			auth_code TEXT,
			expires_at DATETIME,
			module TEXT,
			action TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
	}
	for _, sql := range ddl {
		require.NoError(t, testDB.Exec(sql).Error)
	}

	prev := db.DB
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = prev
	})

	return testDB
}

func seedApprovalConfig(t *testing.T, testDB *gorm.DB, module string, action string) models.ApprovalConfig {
	t.Helper()
	config := models.ApprovalConfig{
		BaseModel: models.BaseModel{ID: "cfg-1"},
		Module:    module,
		Action:    action,
		IsActive:  true,
		Approver1ID: "user-1",
	}
	require.NoError(t, testDB.Create(&config).Error)
	return config
}

func TestCheckAndConsumeApproval_AllowsWhenNoConfig(t *testing.T) {
	setupApprovalServiceTestDB(t)

	err := CheckAndConsumeApproval("Inventory", "VOID", "shipment-1", "")
	require.NoError(t, err)
}

func TestCheckAndConsumeApproval_RejectsMissingApprovalID(t *testing.T) {
	testDB := setupApprovalServiceTestDB(t)
	seedApprovalConfig(t, testDB, "Inventory", "VOID")

	err := CheckAndConsumeApproval("Inventory", "VOID", "shipment-1", "")
	require.Error(t, err)
	require.Contains(t, err.Error(), "Missing Approval ID")
}

func TestCheckAndConsumeApproval_ConsumesVerifiedToken(t *testing.T) {
	testDB := setupApprovalServiceTestDB(t)
	config := seedApprovalConfig(t, testDB, "Inventory", "VOID")

	request := models.ApprovalRequest{
		BaseModel:    models.BaseModel{ID: "req-1"},
		ConfigID:     config.ID,
		RequesterID:  "requester-1",
		TargetID:     "shipment-1",
		Module:       "Inventory",
		Action:       "VOID",
		Status:       "VERIFIED",
		CurrentLevel: 1,
		ExpiresAt:    ptrTime(time.Now().Add(10 * time.Minute)),
	}
	require.NoError(t, testDB.Create(&request).Error)

	err := CheckAndConsumeApproval("Inventory", "VOID", "shipment-1", request.ID)
	require.NoError(t, err)

	var updated models.ApprovalRequest
	require.NoError(t, testDB.First(&updated, "id = ?", request.ID).Error)
	require.Equal(t, "CONSUMED", updated.Status)
}

func ptrTime(v time.Time) *time.Time {
	return &v
}
