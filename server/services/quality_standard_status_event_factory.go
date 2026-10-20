package services

import (
	"context"
	"fmt"
	"xdfc-server/audit"
	"xdfc-server/models"
)

func buildQualityStandardStatusChangedEvent(ctx context.Context, standard models.InspectionStandard, previousStatus string) BusinessStatusChangedEvent {
	actor, _ := audit.ActorFromContext(ctx)
	return normalizeBusinessStatusChangedEvent(BusinessStatusChangedEvent{
		EventKey: fmt.Sprintf("QUALITY_STANDARD:%s:%.1f:STATUS_CHANGED:%s", standard.ID, standard.Version, standard.Status),
		Entity:   "QUALITY", SourceCode: qualityStandardEventSourceCode, TargetID: standard.ID,
		PreviousStatus: previousStatus, NextStatus: standard.Status, ActorID: actor.UserID,
		Operator: actor.Username, ActionURL: "/quality/standards/" + standard.ID + "/preview",
		Metadata: map[string]any{
			"targetId": standard.ID, "standardId": standard.ID, "standardCode": standard.Code,
			"standardName": standard.Name, "version": standard.Version,
			"auditor": standard.Auditor, "reviewComment": standard.ReviewComment,
			"rejectReason": standard.RejectReason, "archiveReason": standard.ArchiveReason,
		},
		TemplateValues: map[string]string{
			"StandardId": standard.ID, "StandardCode": standard.Code, "StandardName": standard.Name,
			"Operator": actor.Username, "Auditor": standard.Auditor, "ReviewComment": standard.ReviewComment,
			"RejectReason": standard.RejectReason, "ArchiveReason": standard.ArchiveReason,
		},
	})
}
