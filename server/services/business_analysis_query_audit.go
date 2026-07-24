package services

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/db"
)

const businessAnalysisProductionCapacityAuditTargetID = "production-capacity"

type businessAnalysisProductionCapacityAuditPayload struct {
	Report          string `json:"report"`
	From            string `json:"from"`
	To              string `json:"to"`
	CustomerID      string `json:"customerId,omitempty"`
	ProductID       string `json:"productId,omitempty"`
	Status          string `json:"status,omitempty"`
	IncludeCanceled bool   `json:"includeCanceled"`
}

func businessAnalysisProductionCapacityAuditPayloadFromQuery(
	query BusinessAnalysisProductionCapacityQuery,
) businessAnalysisProductionCapacityAuditPayload {
	return businessAnalysisProductionCapacityAuditPayload{
		Report:          businessAnalysisProductionCapacityAuditTargetID,
		From:            query.From.Format("2006-01-02"),
		To:              query.To.Format("2006-01-02"),
		CustomerID:      strings.TrimSpace(query.CustomerID),
		ProductID:       strings.TrimSpace(query.ProductID),
		Status:          strings.TrimSpace(query.Status),
		IncludeCanceled: query.IncludeCanceled,
	}
}

func RecordBusinessAnalysisProductionCapacityQueryAudit(
	ctx context.Context,
	query BusinessAnalysisProductionCapacityQuery,
) error {
	if db.DB == nil {
		return errors.New("business analysis audit database is unavailable")
	}
	return RecordBusinessAnalysisProductionCapacityQueryAuditWithRecorder(
		ctx,
		query,
		func(event audit.AuditEvent) error {
			return recordAuditEventTx(db.DB, event)
		},
	)
}

func RecordBusinessAnalysisProductionCapacityQueryAuditWithRecorder(
	ctx context.Context,
	query BusinessAnalysisProductionCapacityQuery,
	record func(audit.AuditEvent) error,
) error {
	if record == nil {
		return nil
	}

	actor, ok := audit.ActorFromContext(ctx)
	if !ok {
		actor = audit.AuditActor{Source: "system"}
	}

	payload := businessAnalysisProductionCapacityAuditPayloadFromQuery(query)
	metadata, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	event := audit.NewAuditEvent(
		audit.AuditEntityKey(AuditModuleBusinessAnalysisQuery),
		businessAnalysisProductionCapacityAuditTargetID,
		audit.AuditAction("Query"),
		actor,
	).WithMetadata("report", payload.Report).
		WithMetadata("filters", string(metadata)).
		WithMetadata("source", "business-analysis")

	return record(event.Normalize())
}
