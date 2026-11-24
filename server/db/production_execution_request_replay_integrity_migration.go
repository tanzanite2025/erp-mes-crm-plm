package db

import (
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
	if err := database.Exec(`DROP INDEX IF EXISTS uidx_production_work_completion_round`).Error; err != nil {
		return err
	}
	if err := database.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS uidx_production_work_completion_round_all
		 ON production_operation_executions (work_identity_key, execution_round)
		 WHERE action = 'COMPLETE'`).Error; err != nil {
		return err
	}
	return nil
}
