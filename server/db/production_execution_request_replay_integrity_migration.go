package db

import (
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func EnsureProductionExecutionRequestReplayIntegrity(database *gorm.DB) error {
	for _, field := range []string{"WorkIdentityKey", "ExecutionRound", "ScanCommandEffectsApplied", "SubmittedByUserID"} {
		if !database.Migrator().HasColumn(&models.ProductionOperationExecution{}, field) {
			if err := database.Migrator().AddColumn(&models.ProductionOperationExecution{}, field); err != nil {
				return err
			}
		}
	}
	if err := database.AutoMigrate(&models.ProductionExecutionCommandRequestReceipt{}); err != nil {
		return err
	}
	if database.Migrator().HasTable(&models.ProductBarcodeTransferEvent{}) {
		if err := database.Exec(`UPDATE production_operation_executions
			SET scan_command_effects_applied = true
			WHERE scan_command_effects_applied = false
				AND EXISTS (SELECT 1 FROM product_barcode_transfer_events
				WHERE operation_id = production_operation_executions.id)`).Error; err != nil {
			return err
		}
	}
	if database.Migrator().HasTable(&models.AuditLog{}) {
		if err := database.Exec(`UPDATE production_operation_executions
			SET scan_command_effects_applied = true
			WHERE scan_command_effects_applied = false
				AND EXISTS (SELECT 1 FROM audit_logs
				WHERE target_id = CAST(production_operation_executions.id AS TEXT)
				AND module = ? AND action = ?)`,
			string(audit.AuditEntityProductionOperation), string(audit.AuditActionCreate)).Error; err != nil {
			return err
		}
	}
	for _, statement := range []string{
		`CREATE UNIQUE INDEX IF NOT EXISTS uidx_production_work_completion_round
		 ON production_operation_executions (work_identity_key, execution_round)
		 WHERE action = 'COMPLETE' AND work_identity_key <> ''`,
	} {
		if err := database.Exec(statement).Error; err != nil {
			return err
		}
	}
	return nil
}
