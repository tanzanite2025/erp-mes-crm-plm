package services

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"
	"xdfc-server/audit"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openApprovalServiceTestDB(t *testing.T, withAuditTable bool) *gorm.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:approval_service_%d?mode=memory&cache=shared", time.Now().UnixNano())
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatalf("open sqlite connection: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Errorf("close sqlite: %v", err)
		}
	})

	if err := testDB.Exec(`CREATE TABLE approval_requests (
		id text PRIMARY KEY, requester_id text NOT NULL, target_id text, reason text,
		approver1_id text, approver2_id text, current_level integer, status text,
		auth_code text, expires_at datetime, module text, action text, verifier_id text,
		created_at datetime, updated_at datetime, deleted_at datetime
	)`).Error; err != nil {
		t.Fatalf("create approval request schema: %v", err)
	}
	if withAuditTable {
		if err := testDB.Exec(`CREATE TABLE audit_logs (
			id text PRIMARY KEY, module text, target_id text, action text, diff blob,
			operator text, ip text, created_at datetime
		)`).Error; err != nil {
			t.Fatalf("create audit schema: %v", err)
		}
	}
	return testDB
}

func approvalServiceTestInput(targetID string) RequestApprovalInput {
	return RequestApprovalInput{
		Module:      "SalesOrder",
		Action:      "release",
		TargetID:    targetID,
		Reason:      "approval regression test",
		RequesterID: "requester-1",
		Approver1ID: "approver-1",
	}
}

func TestRequestApprovalHelperHandlesNilTransactionWithoutDuplicateAudit(t *testing.T) {
	testDB := openApprovalServiceTestDB(t, true)
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	direct, err := RequestApprovalTx(nil, approvalServiceTestInput("order-direct"))
	if err != nil {
		t.Fatalf("request approval with nil transaction: %v", err)
	}
	ctx := audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "requester-2",
		Username: "approval-tester",
		IP:       "127.0.0.1",
	})
	public, err := RequestApproval(ctx, approvalServiceTestInput("order-public"))
	if err != nil {
		t.Fatalf("request approval through public entry: %v", err)
	}

	for _, requestID := range []string{direct.Request.ID, public.Request.ID} {
		var count int64
		if err := testDB.Model(&models.AuditLog{}).
			Where("module = ? AND target_id = ? AND action = ?", AuditModuleApprovalRequest, requestID, "request").
			Count(&count).Error; err != nil {
			t.Fatalf("count approval audit rows: %v", err)
		}
		if count != 1 {
			t.Fatalf("approval %s should have exactly one request audit row, got %d", requestID, count)
		}
	}

	var publicAudit models.AuditLog
	if err := testDB.Where("target_id = ?", public.Request.ID).First(&publicAudit).Error; err != nil {
		t.Fatalf("load public approval audit: %v", err)
	}
	if publicAudit.Operator != "approval-tester" || publicAudit.IP != "127.0.0.1" {
		t.Fatalf("public approval audit lost actor identity: %+v", publicAudit)
	}
}

func TestRequestApprovalHelperUsesCallerTransaction(t *testing.T) {
	testDB := openApprovalServiceTestDB(t, true)
	tx := testDB.Begin()
	if tx.Error != nil {
		t.Fatalf("begin transaction: %v", tx.Error)
	}
	result, err := RequestApprovalTxWithContext(context.Background(), tx, approvalServiceTestInput("order-rollback"))
	if err != nil {
		_ = tx.Rollback()
		t.Fatalf("create approval in caller transaction: %v", err)
	}
	if err := tx.Rollback().Error; err != nil {
		t.Fatalf("rollback caller transaction: %v", err)
	}

	var requestCount int64
	if err := testDB.Model(&models.ApprovalRequest{}).Where("id = ?", result.Request.ID).Count(&requestCount).Error; err != nil {
		t.Fatalf("count rolled-back approval: %v", err)
	}
	var auditCount int64
	if err := testDB.Model(&models.AuditLog{}).Where("target_id = ?", result.Request.ID).Count(&auditCount).Error; err != nil {
		t.Fatalf("count rolled-back approval audit: %v", err)
	}
	if requestCount != 0 || auditCount != 0 {
		t.Fatalf("caller rollback must remove approval and audit together, got request=%d audit=%d", requestCount, auditCount)
	}
}

func TestRequestApprovalNilTransactionRollsBackWhenAuditWriteFails(t *testing.T) {
	testDB := openApprovalServiceTestDB(t, false)
	previousDB := appdb.DB
	appdb.DB = testDB
	t.Cleanup(func() { appdb.DB = previousDB })

	_, err := RequestApprovalTx(nil, approvalServiceTestInput("order-no-audit"))
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "audit_logs") {
		t.Fatalf("expected missing audit table failure, got %v", err)
	}
	var count int64
	if err := testDB.Model(&models.ApprovalRequest{}).Count(&count).Error; err != nil {
		t.Fatalf("count approvals after rollback: %v", err)
	}
	if count != 0 {
		t.Fatalf("approval must roll back when audit write fails, got %d rows", count)
	}
}
