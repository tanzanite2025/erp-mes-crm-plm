package services

import (
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestQualityStandardApprovalPolicyPostgresCutoverIsAtomicAndPreservesOnlyAnUnambiguousConfiguredChain(t *testing.T) {
	for _, scenario := range []string{"disabled-field", "fixed-chain", "disabled-configured-chain", "ambiguous-chains", "dynamic-chain"} {
		t.Run(scenario, func(t *testing.T) {
			fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
			approval := &NotificationRuleApprovalDTO{Enabled: scenario != "disabled-field", Module: "Quality", Action: "QUALITY_STANDARD_REVIEW", Approver1ID: fixture.reviewer.ID, Approver2ID: fixture.secondReviewer.ID}
			if scenario == "disabled-field" {
				approval.Approver1ID, approval.Approver2ID = "", ""
			}
			if scenario == "disabled-configured-chain" {
				approval.Enabled = false
			}
			if scenario == "dynamic-chain" {
				dynamic := "operator"
				approval.DynamicApproverField = &dynamic
			}
			segment := RuleSegmentDTO{ID: "pending-review", Title: "品质审批", TargetStatuses: []string{"PENDING_APPROVAL"}, CommandIDs: []string{}, AssigneeUsernames: []string{fixture.requester.Username}, Approval: approval}
			originalSegments := mustJSONRawMessage([]RuleSegmentDTO{segment})
			rule := models.NotificationRule{BaseModel: models.BaseModel{ID: uuid.NewString()}, Name: "existing notification rule", Entity: "QUALITY", SourceCode: "QUALITY_STANDARD", ActionCode: "STATUS_CHANGED", Enabled: true, Version: 3, Segments: originalSegments}
			require.NoError(t, fixture.database.Create(&rule).Error)
			if scenario == "ambiguous-chains" {
				secondRule := rule
				secondRule.ID = uuid.NewString()
				require.NoError(t, fixture.database.Create(&secondRule).Error)
			}
			err := db.SeparateQualityStandardApprovalConfigurationFromNotificationRules(fixture.database)
			if scenario == "ambiguous-chains" || scenario == "dynamic-chain" {
				require.Error(t, err)
				require.NoError(t, fixture.database.First(&rule, "id = ?", rule.ID).Error)
				require.JSONEq(t, string(originalSegments), string(rule.Segments))
				require.Equal(t, 3, rule.Version)
				var policies int64
				require.NoError(t, fixture.database.Model(&models.BusinessApprovalPolicyConfiguration{}).Count(&policies).Error)
				require.Zero(t, policies)
				return
			}
			require.NoError(t, err)
			require.NoError(t, fixture.database.First(&rule, "id = ?", rule.ID).Error)
			require.NotContains(t, string(rule.Segments), `"approval"`)
			require.Contains(t, string(rule.Segments), fixture.requester.Username)
			require.Equal(t, 4, rule.Version)
			var policies []models.BusinessApprovalPolicyConfiguration
			require.NoError(t, fixture.database.Find(&policies).Error)
			if scenario == "fixed-chain" || scenario == "disabled-configured-chain" {
				require.Len(t, policies, 1)
				require.Equal(t, fixture.reviewer.ID, policies[0].Approver1ID)
				require.Equal(t, fixture.secondReviewer.ID, policies[0].Approver2ID)
				require.Equal(t, scenario == "fixed-chain", policies[0].Enabled)
			} else {
				require.Empty(t, policies, "an unconfigured listener must never invent approvers")
			}
			require.NoError(t, db.SeparateQualityStandardApprovalConfigurationFromNotificationRules(fixture.database))
			require.NoError(t, fixture.database.First(&rule, "id = ?", rule.ID).Error)
			require.Equal(t, 4, rule.Version, "repeat startup must leave migrated configuration unchanged")
		})
	}
}
