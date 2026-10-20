package services

import (
	"context"
	"sync"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestBusinessApprovalPolicyPostgresConfigurationValidatesAccountsAndUsesVersionedAuditedWrites(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	policies, err := ListBusinessApprovalPolicyConfigurations(fixture.requestContext)
	require.NoError(t, err)
	require.Len(t, policies, 1)
	require.Zero(t, policies[0].Version)
	require.False(t, policies[0].Enabled)
	for _, invalid := range []BusinessApprovalPolicyConfigurationWriteInput{
		{Enabled: true},
		{Enabled: true, Approver1ID: "unknown-account"},
		{Enabled: true, Approver1ID: uuid.NewString()},
		{Enabled: true, Approver1ID: fixture.reviewer.ID, Approver2ID: fixture.reviewer.ID},
		{Approver2ID: fixture.secondReviewer.ID},
		{Version: -1},
	} {
		_, err := SaveBusinessApprovalPolicyConfiguration(fixture.requestContext, models.BusinessApprovalTypeQualityStandard, invalid)
		require.Error(t, err)
	}
	input := BusinessApprovalPolicyConfigurationWriteInput{Enabled: true, Approver1ID: fixture.reviewer.ID, Approver2ID: fixture.secondReviewer.ID}
	_, err = SaveBusinessApprovalPolicyConfiguration(context.Background(), models.BusinessApprovalTypeQualityStandard, input)
	require.ErrorContains(t, err, "操作者身份缺失")
	_, err = SaveBusinessApprovalPolicyConfiguration(fixture.requestContext, "NOT_IMPLEMENTED", input)
	require.ErrorContains(t, err, "尚未接入")
	saved, err := SaveBusinessApprovalPolicyConfiguration(fixture.requestContext, models.BusinessApprovalTypeQualityStandard, input)
	require.NoError(t, err)
	require.Equal(t, 1, saved.Version)
	require.NotNil(t, saved.UpdatedAt)
	_, err = SaveBusinessApprovalPolicyConfiguration(fixture.requestContext, models.BusinessApprovalTypeQualityStandard, input)
	require.ErrorContains(t, err, "已变更")
	input.Version, input.Enabled, input.Approver2ID = saved.Version, false, ""
	require.NoError(t, fixture.database.Model(&fixture.reviewer).Update("status", "disabled").Error)
	saved, err = SaveBusinessApprovalPolicyConfiguration(fixture.requestContext, models.BusinessApprovalTypeQualityStandard, input)
	require.NoError(t, err)
	require.False(t, saved.Enabled)
	require.Empty(t, saved.Approver2ID)
	require.Equal(t, 2, saved.Version)
	reenable := input
	reenable.Version, reenable.Enabled = saved.Version, true
	_, err = SaveBusinessApprovalPolicyConfiguration(fixture.requestContext, models.BusinessApprovalTypeQualityStandard, reenable)
	require.ErrorContains(t, err, "已停用", "disabling an inactive chain is allowed, but re-enabling it must validate active accounts")
	var logs []models.AuditLog
	require.NoError(t, fixture.database.Where("module = ?", "BusinessApprovalPolicyConfiguration").Find(&logs).Error)
	require.Len(t, logs, 2)
	var requests int64
	require.NoError(t, fixture.database.Model(&models.ApprovalRequest{}).Count(&requests).Error)
	require.Zero(t, requests, "configuring a chain must never create a business approval")
}

func TestBusinessApprovalPolicyPostgresConcurrentCreationAndUpdateHaveOneWinner(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	for _, expectedVersion := range []int{0, 1} {
		var group sync.WaitGroup
		results := make(chan error, 2)
		for range 2 {
			group.Go(func() {
				_, err := SaveBusinessApprovalPolicyConfiguration(fixture.requestContext, models.BusinessApprovalTypeQualityStandard,
					BusinessApprovalPolicyConfigurationWriteInput{Enabled: true, Approver1ID: fixture.reviewer.ID, Version: expectedVersion})
				results <- err
			})
		}
		group.Wait()
		close(results)
		winners := 0
		for err := range results {
			if err == nil {
				winners++
			} else {
				require.Contains(t, err.Error(), "[CONFLICT]")
			}
		}
		require.Equal(t, 1, winners)
	}
	var policy models.BusinessApprovalPolicyConfiguration
	require.NoError(t, fixture.database.First(&policy).Error)
	require.Equal(t, 2, policy.Version)
}

func TestQualityStandardPostgresApprovalPolicyChangesOnlyAffectNewRequestsAndNotificationsNeverOwnApproval(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	policy := createQualityStandardWorkflowIndependentApprovalPolicy(t, fixture, fixture.secondReviewer.ID)
	// No listener exists and even the notification source is deleted before submission.
	require.NoError(t, fixture.database.Where("code = ?", "QUALITY_STANDARD").Delete(&models.BusinessEventSource{}).Error)
	standard := saveQualityStandardWorkflowDraft(t, fixture)
	standard.Status = "PENDING_APPROVAL"
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
	_, err := SaveBusinessApprovalPolicyConfiguration(fixture.requestContext, models.BusinessApprovalTypeQualityStandard,
		BusinessApprovalPolicyConfigurationWriteInput{Enabled: false, Version: policy.Version})
	require.NoError(t, err)
	nextStandard := saveQualityStandardWorkflowDraft(t, fixture)
	nextStandard.Status = "PENDING_APPROVAL"
	require.ErrorContains(t, SaveInspectionStandard(fixture.requestContext, &nextStandard), "审批配置")
	require.NoError(t, decideQualityStandardWorkflowApproval(t, fixture, standard, fixture.reviewer, "APPROVED", "一级通过"))
	require.NoError(t, fixture.database.First(&standard, "id = ?", standard.ID).Error)
	require.Equal(t, "PENDING_APPROVAL", standard.Status)
	require.NoError(t, decideQualityStandardWorkflowApproval(t, fixture, standard, fixture.secondReviewer, "APPROVED", "二级通过"))
	require.NoError(t, fixture.database.First(&standard, "id = ?", standard.ID).Error)
	require.Equal(t, "APPROVED", standard.Status)
	var request models.ApprovalRequest
	require.NoError(t, fixture.database.First(&request, "id = ?", *standard.ApprovalRequestID).Error)
	require.Equal(t, fixture.reviewer.ID, request.Approver1ID)
	require.Equal(t, fixture.secondReviewer.ID, request.Approver2ID)
	require.Empty(t, request.AuthCode)
	require.Nil(t, request.ExpiresAt)
	for _, code := range []string{"", "123456"} {
		_, err := VerifyAuthCode(fixture.requestContext, VerifyAuthCodeInput{Module: "Quality", Action: qualityStandardApprovalReviewAction, TargetID: standard.ID, AuthCode: code}, time.Now())
		require.ErrorIs(t, err, ErrApprovalAuthCodeInvalid, "a business approval cannot be consumed as an authorization code")
	}
	var notices []models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Find(&notices).Error)
	require.Len(t, notices, 3, "only the real approval node/result receipts are created")
}

func TestBusinessApprovalPolicyPostgresAuditFailureRollsBackConfiguration(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	require.NoError(t, fixture.database.Exec(`CREATE FUNCTION reject_business_approval_policy_audit() RETURNS trigger AS $$ BEGIN IF NEW.module = 'BusinessApprovalPolicyConfiguration' THEN RAISE EXCEPTION 'forced policy audit failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`).Error)
	require.NoError(t, fixture.database.Exec(`CREATE TRIGGER reject_business_approval_policy_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_business_approval_policy_audit()`).Error)
	_, err := SaveBusinessApprovalPolicyConfiguration(fixture.requestContext, models.BusinessApprovalTypeQualityStandard,
		BusinessApprovalPolicyConfigurationWriteInput{Enabled: true, Approver1ID: fixture.reviewer.ID})
	require.ErrorContains(t, err, "forced policy audit failure")
	var policies int64
	require.NoError(t, fixture.database.Model(&models.BusinessApprovalPolicyConfiguration{}).Count(&policies).Error)
	require.Zero(t, policies)
}
