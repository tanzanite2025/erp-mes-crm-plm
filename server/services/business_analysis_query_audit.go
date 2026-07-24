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
	return recordBusinessAnalysisProductionCapacityAudit(
		ctx,
		query,
		audit.AuditAction("Query"),
	)
}

func RecordBusinessAnalysisProductionCapacityExportAudit(
	ctx context.Context,
	query BusinessAnalysisProductionCapacityQuery,
) error {
	return recordBusinessAnalysisProductionCapacityAudit(
		ctx,
		query,
		audit.AuditAction("Export"),
	)
}

func recordBusinessAnalysisProductionCapacityAudit(
	ctx context.Context,
	query BusinessAnalysisProductionCapacityQuery,
	action audit.AuditAction,
) error {
	if db.DB == nil {
		return errors.New("business analysis audit database is unavailable")
	}
	return RecordBusinessAnalysisProductionCapacityQueryAuditWithRecorder(
		ctx,
		query,
		action,
		func(event audit.AuditEvent) error {
			return recordAuditEventTx(db.DB, event)
		},
	)
}

func RecordBusinessAnalysisProductionCapacityQueryAuditWithRecorder(
	ctx context.Context,
	query BusinessAnalysisProductionCapacityQuery,
	action audit.AuditAction,
	record func(audit.AuditEvent) error,
) error {
	if record == nil {
		return nil
	}
	if strings.TrimSpace(string(action)) == "" {
		action = audit.AuditAction("Query")
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
		action,
		actor,
	).WithMetadata("report", payload.Report).
		WithMetadata("filters", string(metadata)).
		WithMetadata("source", "business-analysis")

	return record(event.Normalize())
}
