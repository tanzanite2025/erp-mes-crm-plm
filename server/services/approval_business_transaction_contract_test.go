package services

import (
	"context"
	"errors"
	"testing"
	"time"
	appdb "xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type approvalBusinessTransactionRollbackTestContract struct{ failDecision bool }

func (*approvalBusinessTransactionRollbackTestContract) ValidateStandaloneRequest(RequestApprovalInput) error {
	return nil
}
func (*approvalBusinessTransactionRollbackTestContract) ValidateRequestWithinTransaction(context.Context, *gorm.DB, RequestApprovalInput) error {
	return nil
}
func (*approvalBusinessTransactionRollbackTestContract) IssuesAuthorizationCode() bool { return false }
func (*approvalBusinessTransactionRollbackTestContract) NotificationDestination(models.ApprovalRequest) ApprovalBusinessNotificationDestination {
	return ApprovalBusinessNotificationDestination{SourceCode: "INJECTED_APPROVAL_DOMAIN", ActionURL: "/approval/requests"}
}
func (contract *approvalBusinessTransactionRollbackTestContract) ApplyDecisionWithinTransaction(_ context.Context, tx *gorm.DB, request models.ApprovalRequest, _ string, now time.Time) error {
	if err := tx.Create(&models.AuditLog{ID: uuid.NewString(), Module: "InjectedBusinessDomain", TargetID: request.TargetID, Action: request.Status, CreatedAt: now}).Error; err != nil {
		return err
	}
	if contract.failDecision {
		return errors.New("forced business decision failure")
	}
	return nil
}

func TestApprovalBusinessTransactionContractRollsBackSharedApprovalAndDomainWritesTogether(t *testing.T) {
	database := openApprovalServiceTestDB(t, true)
	previousDatabase := appdb.DB
	appdb.DB = database
	t.Cleanup(func() { appdb.DB = previousDatabase })
	contract := &approvalBusinessTransactionRollbackTestContract{failDecision: true}
	service := NewApprovalServiceWithBusinessTransactionContracts(map[string]ApprovalBusinessTransactionContract{"InjectedDomain": contract})
	input := approvalServiceTestInput("domain-target")
	input.Module = "InjectedDomain"
	created, err := service.RequestApproval(context.Background(), input)
	require.NoError(t, err)
	decision := ApproveRequestInput{RequestID: created.Request.ID, ApproverUserID: input.Approver1ID, Status: "APPROVED"}
	_, err = service.ApproveRequest(context.Background(), decision, time.Now(), func() string { t.Fatal("domain contract must suppress authorization codes"); return "" })
	require.ErrorContains(t, err, "forced business decision failure")
	var persisted models.ApprovalRequest
	require.NoError(t, database.First(&persisted, "id = ?", created.Request.ID).Error)
	require.Equal(t, "PENDING", persisted.Status)
	var domainWrites int64
	require.NoError(t, database.Model(&models.AuditLog{}).Where("module = ?", "InjectedBusinessDomain").Count(&domainWrites).Error)
	require.Zero(t, domainWrites)
	contract.failDecision = false
	result, err := service.ApproveRequest(context.Background(), decision, time.Now(), nil)
	require.NoError(t, err)
	require.Equal(t, "APPROVED", result.Request.Status)
	require.Empty(t, result.Request.AuthCode)
	require.Nil(t, result.Request.ExpiresAt)
	require.NoError(t, database.Model(&models.AuditLog{}).Where("module = ?", "InjectedBusinessDomain").Count(&domainWrites).Error)
	require.EqualValues(t, 1, domainWrites)
}
