package services

import (
	"context"
	"encoding/json"
	"testing"
	"time"
	"xdfc-server/audit"

	"github.com/stretchr/testify/require"
)

func TestRecordBusinessAnalysisProductionCapacityQueryAuditBuildsStableEvent(t *testing.T) {
	ctx := audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "user-001",
		Username: "analyst",
		IP:       "127.0.0.1",
		Source:   "http",
	})
	query := BusinessAnalysisProductionCapacityQuery{
		From:            time.Date(2026, time.July, 1, 0, 0, 0, 0, time.UTC),
		To:              time.Date(2026, time.August, 1, 0, 0, 0, 0, time.UTC),
		CustomerID:      "customer-001",
		ProductID:       "product-001",
		Status:          "COMPLETED",
		IncludeCanceled: true,
	}

	var recorded audit.AuditEvent
	err := RecordBusinessAnalysisProductionCapacityQueryAuditWithRecorder(
		ctx,
		query,
		audit.AuditAction("Query"),
		func(event audit.AuditEvent) error {
			recorded = event
			return nil
		},
	)

	require.NoError(t, err)
	require.Equal(t, audit.AuditEntityKey(AuditModuleBusinessAnalysisQuery), recorded.EntityKey)
	require.Equal(t, businessAnalysisProductionCapacityAuditTargetID, recorded.EntityID)
	require.Equal(t, audit.AuditAction("Query"), recorded.Action)
	require.Equal(t, "analyst", recorded.Actor.Username)
	require.Equal(t, "127.0.0.1", recorded.Actor.IP)
	require.Equal(t, "business-analysis", recorded.Metadata["source"])
	require.Equal(t, businessAnalysisProductionCapacityAuditTargetID, recorded.Metadata["report"])

	var filters businessAnalysisProductionCapacityAuditPayload
	require.NoError(t, json.Unmarshal([]byte(recorded.Metadata["filters"]), &filters))
	require.Equal(t, "2026-07-01", filters.From)
	require.Equal(t, "2026-08-01", filters.To)
	require.Equal(t, "customer-001", filters.CustomerID)
	require.Equal(t, "product-001", filters.ProductID)
	require.Equal(t, "COMPLETED", filters.Status)
	require.True(t, filters.IncludeCanceled)
}

func TestRecordBusinessAnalysisProductionCapacityExportAuditUsesExportAction(t *testing.T) {
	query := BusinessAnalysisProductionCapacityQuery{
		From: time.Date(2026, time.July, 1, 0, 0, 0, 0, time.UTC),
		To:   time.Date(2026, time.August, 1, 0, 0, 0, 0, time.UTC),
	}

	var recorded audit.AuditEvent
	err := RecordBusinessAnalysisProductionCapacityQueryAuditWithRecorder(
		context.Background(),
		query,
		audit.AuditAction("Export"),
		func(event audit.AuditEvent) error {
			recorded = event
			return nil
		},
	)

	require.NoError(t, err)
	require.Equal(t, audit.AuditAction("Export"), recorded.Action)
	require.Equal(t, businessAnalysisProductionCapacityAuditTargetID, recorded.Metadata["report"])
}

func TestRecordBusinessAnalysisProductionCapacityDrilldownAuditIncludesDimensionAndValue(t *testing.T) {
	query := BusinessAnalysisProductionCapacityDrilldownQuery{
		BusinessAnalysisProductionCapacityQuery: BusinessAnalysisProductionCapacityQuery{
			From: time.Date(2026, time.July, 1, 0, 0, 0, 0, time.UTC),
			To:   time.Date(2026, time.August, 1, 0, 0, 0, 0, time.UTC),
		},
		Dimension: "customer",
		Value:     "customer-001",
	}

	var recorded audit.AuditEvent
	err := RecordBusinessAnalysisProductionCapacityDrilldownAuditWithRecorder(
		context.Background(),
		query,
		audit.AuditAction("Drilldown"),
		func(event audit.AuditEvent) error {
			recorded = event
			return nil
		},
	)

	require.NoError(t, err)
	require.Equal(t, audit.AuditAction("Drilldown"), recorded.Action)

	var filters businessAnalysisProductionCapacityAuditPayload
	require.NoError(t, json.Unmarshal([]byte(recorded.Metadata["filters"]), &filters))
	require.Equal(t, "customer", filters.Dimension)
	require.Equal(t, "customer-001", filters.Value)
}
