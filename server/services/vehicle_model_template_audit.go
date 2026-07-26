package services

import (
	"fmt"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func recordVehicleModelTemplateAuditEventTx(
	tx *gorm.DB,
	action audit.AuditAction,
	previous *models.LogisticsVehicleModelTemplate,
	next models.LogisticsVehicleModelTemplate,
	request SaveVehicleModelTemplateRequest,
	extraMetadata ...map[string]string,
) error {
	event := audit.NewAuditEvent(
		audit.AuditEntityVehicleModelTemplate,
		next.ID,
		action,
		vehicleModelTemplateAuditActor(request.ActorID, request.Operator, request.IP),
	).
		WithMetadata("name", next.Name).
		WithMetadata("seedVehicleSpecId", next.SeedVehicleSpecID).
		WithMetadata("sourceFormat", next.SourceFormat).
		WithMetadata("status", next.Status).
		WithMetadata("version", fmt.Sprintf("%d", next.Version))

	for _, metadata := range extraMetadata {
		for key, value := range metadata {
			event = event.WithMetadata(key, value)
		}
	}

	if previous != nil {
		event = event.WithChanges(audit.DiffModelValues(
			mapVehicleModelTemplateAuditSnapshot(*previous),
			mapVehicleModelTemplateAuditSnapshot(next),
		)...)
	}

	return recordAuditEventTx(tx, event.Normalize())
}

func vehicleModelTemplateAuditActor(
	actorID string,
	username string,
	ip string,
) audit.AuditActor {
	return audit.AuditActor{
		UserID:   strings.TrimSpace(actorID),
		Username: strings.TrimSpace(username),
		IP:       strings.TrimSpace(ip),
		Source:   "http",
	}
}
