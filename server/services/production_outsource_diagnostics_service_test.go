package services

import (
	"encoding/json"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestOutsourceDiagnosticsCleanReleasedOrderHasNoIssues(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)

	response, err := service.GetOutsourceDiagnostics()

	require.NoError(t, err)
	require.Equal(t, 1, response.Summary.OpenOrders)
	require.Equal(t, 1, response.Summary.ActiveLines)
	require.Zero(t, response.Summary.TotalIssues)
	require.Empty(t, response.Issues)
}

func TestOutsourceDiagnosticsDetectsLineTransferSummaryMismatch(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	seedOutsourceBarcodeState(t, database, "BC-DIAG-MISMATCH")
	_, err := service.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-DIAG-MISMATCH",
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "tester",
	})
	require.NoError(t, err)
	require.NoError(t, database.Model(&models.OutsourceOrderLine{}).
		Where("id = ?", line.ID).
		Update("sent_quantity", 0.25).Error)

	response, err := service.GetOutsourceDiagnostics()

	require.NoError(t, err)
	issue := requireOutsourceDiagnosticsIssue(t, response, outsourceDiagnosticsIssueLineTransferSummaryMismatch)
	require.Equal(t, OutsourceDiagnosticsSeverityCritical, issue.Severity)
	require.Equal(t, line.ID, issue.LineID)
	require.InDelta(t, 0.75, issue.QuantityDiff, outsourceQuantityEpsilon)
}

func TestOutsourceDiagnosticsDetectsMissingInventoryLedger(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	seedOutsourceBarcodeState(t, database, "BC-DIAG-LEDGER")
	result, err := service.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       "BC-DIAG-LEDGER",
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "tester",
	})
	require.NoError(t, err)
	require.NoError(t, database.
		Where("source_fact_id = ?", result.Transfer.ID).
		Delete(&models.InventoryLedgerEntry{}).Error)

	response, err := service.GetOutsourceDiagnostics()

	require.NoError(t, err)
	issue := requireOutsourceDiagnosticsIssue(t, response, outsourceDiagnosticsIssueMissingInventoryLedger)
	require.Equal(t, OutsourceDiagnosticsSeverityCritical, issue.Severity)
	require.Equal(t, result.Transfer.ID, issue.Metadata["transferId"])
	require.Equal(t, "0", issue.Metadata["ledgerCount"])
}

func TestOutsourceDiagnosticsIgnoresRecoveredNotificationFailure(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	now := time.Now().UTC()
	failed := models.RuleExecutionLog{
		BaseModel:       models.BaseModel{ID: "notify-failed-1"},
		SourceCode:      businessEventSourceProductionOutsource,
		ActionCode:      businessEventActionStatusChange,
		StatusCode:      OutsourceOrderStatusReleased,
		ExecutionType:   "notify",
		ExecutionStatus: "failed",
		RuleName:        "委外通知",
		ErrorMessage:    "channel offline",
		TriggeredAt:     now.Add(-time.Minute),
	}
	retryResult, err := json.Marshal(map[string]string{"retryOfLogId": failed.ID})
	require.NoError(t, err)
	retry := models.RuleExecutionLog{
		BaseModel:       models.BaseModel{ID: "notify-retry-1"},
		SourceCode:      businessEventSourceProductionOutsource,
		ActionCode:      businessEventActionStatusChange,
		StatusCode:      OutsourceOrderStatusReleased,
		ExecutionType:   "notify",
		ExecutionStatus: "success",
		RuleName:        "委外通知",
		Result:          retryResult,
		TriggeredAt:     now,
	}
	unresolved := models.RuleExecutionLog{
		BaseModel:       models.BaseModel{ID: "notify-failed-2"},
		SourceCode:      businessEventSourceProductionOutsource,
		ActionCode:      businessEventActionStatusChange,
		StatusCode:      OutsourceOrderStatusSent,
		ExecutionType:   "notify",
		ExecutionStatus: "failed",
		RuleName:        "委外通知",
		ErrorMessage:    "target unavailable",
		TriggeredAt:     now,
	}
	require.NoError(t, database.Create(&failed).Error)
	require.NoError(t, database.Create(&retry).Error)
	require.NoError(t, database.Create(&unresolved).Error)

	response, err := service.GetOutsourceDiagnostics()

	require.NoError(t, err)
	require.Equal(t, 1, response.Summary.NotificationFailed)
	issue := requireOutsourceDiagnosticsIssue(t, response, outsourceDiagnosticsIssueNotificationFailure)
	require.Equal(t, "notify-failed-2", issue.Metadata["logId"])
}

func requireOutsourceDiagnosticsIssue(t *testing.T, response OutsourceDiagnosticsResponse, issueType string) OutsourceDiagnosticsIssue {
	t.Helper()

	for _, issue := range response.Issues {
		if issue.Type == issueType {
			return issue
		}
	}
	require.Failf(t, "missing outsource diagnostics issue", "type=%s issues=%v", issueType, response.Issues)
	return OutsourceDiagnosticsIssue{}
}
