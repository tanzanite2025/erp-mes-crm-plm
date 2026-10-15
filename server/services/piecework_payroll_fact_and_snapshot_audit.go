package services

import (
	"context"
	"encoding/json"
	"gorm.io/gorm"
)

func recordPieceworkPayrollSnapshotAudit(ctx context.Context, tx *gorm.DB, entity, id, action string, snapshots map[string]any) error {
	payload, err := json.Marshal(snapshots)
	if err != nil {
		return err
	}
	return recordLegacyAuditEntryWithContext(ctx, tx, entity, id, action, payload)
}
