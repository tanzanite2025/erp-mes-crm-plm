package services

import (
	"context"
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
		`CREATE TABLE approval_requests (
			id TEXT PRIMARY KEY,
			requester_id TEXT,
			target_id TEXT,
			reason TEXT,
			approver1_id TEXT,
			approver2_id TEXT,
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

func TestRequestApproval_UsesRuleDrivenApprovers(t *testing.T) {
	testDB := setupApprovalServiceTestDB(t)

	result, err := RequestApproval(context.Background(), RequestApprovalInput{
		Module:      "Trading",
		Action:      "ORDER_REVIEW",
		TargetID:    "order-1",
		Reason:      "rule matched",
		RequesterID: "requester-1",
		Approver1ID: "user-9",
		Approver2ID: "user-10",
	})
	require.NoError(t, err)
	require.Equal(t, "user-9", result.NotifyTargetUser)
	require.Equal(t, "user-9", result.Request.Approver1ID)
	require.Equal(t, "user-10", result.Request.Approver2ID)

	var stored models.ApprovalRequest
	require.NoError(t, testDB.First(&stored, "id = ?", result.Request.ID).Error)
	require.Equal(t, "user-9", stored.Approver1ID)
	require.Equal(t, "user-10", stored.Approver2ID)
}

func TestApproveRequest_UsesRuleDrivenApprovers(t *testing.T) {
	testDB := setupApprovalServiceTestDB(t)

	requestResult, err := RequestApproval(context.Background(), RequestApprovalInput{
		Module:      "Trading",
		Action:      "ORDER_REVIEW",
		TargetID:    "order-2",
		Reason:      "rule matched",
		RequesterID: "requester-2",
		Approver1ID: "user-9",
		Approver2ID: "user-10",
	})
	require.NoError(t, err)

	approveResult, err := ApproveRequest(context.Background(), ApproveRequestInput{
		RequestID:      requestResult.Request.ID,
		Status:         "APPROVED",
		ApproverUserID: "user-9",
	}, time.Now(), func() string { return "123456" })
	require.NoError(t, err)
	require.Equal(t, "L2_WAITING", approveResult.NotifyAction)
	require.Equal(t, "user-10", approveResult.NotifyTargetUser)

	var updated models.ApprovalRequest
	require.NoError(t, testDB.First(&updated, "id = ?", requestResult.Request.ID).Error)
	require.Equal(t, "APPROVED_L1", updated.Status)
	require.Equal(t, 2, updated.CurrentLevel)
}

func TestRequestApproval_AllowsRuleDrivenApproversWithoutLegacyConfig(t *testing.T) {
	testDB := setupApprovalServiceTestDB(t)

	result, err := RequestApproval(context.Background(), RequestApprovalInput{
		Module:      "Trading",
		Action:      "ORDER_REVIEW",
		TargetID:    "order-3",
		Reason:      "rule only",
		RequesterID: "requester-3",
		Approver1ID: "user-11",
		Approver2ID: "user-12",
	})
	require.NoError(t, err)
	require.Equal(t, "user-11", result.NotifyTargetUser)

	var stored models.ApprovalRequest
	require.NoError(t, testDB.First(&stored, "id = ?", result.Request.ID).Error)
	require.Equal(t, "user-11", stored.Approver1ID)
	require.Equal(t, "user-12", stored.Approver2ID)
}

func TestRequestApproval_StillRequiresConfigWhenNoApproverChainProvided(t *testing.T) {
	setupApprovalServiceTestDB(t)

	_, err := RequestApproval(context.Background(), RequestApprovalInput{
		Module:      "Trading",
		Action:      "ORDER_REVIEW",
		TargetID:    "order-4",
		Reason:      "missing approver",
		RequesterID: "requester-4",
	})
	require.ErrorIs(t, err, ErrApprovalApproverMissing)
}
