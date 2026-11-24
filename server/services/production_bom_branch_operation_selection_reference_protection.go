package services

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
)

// validateProductionBOMBranchOperationSelectionRemovalReferencesTx prevents
// removing an L2 selection while any route or execution fact still uses the
// branch operation identity.
func validateProductionBOMBranchOperationSelectionRemovalReferencesTx(tx *gorm.DB, operationID string) error {
	operationID = strings.TrimSpace(operationID)
	if operationID == "" {
		return nil
	}
	references := []struct {
		table       string
		column      string
		description string
	}{
		{table: "production_route_steps", column: "branch_operation_id", description: "生产路线"},
		{table: "product_barcode_states", column: "current_branch_operation_id", description: "条码状态"},
		{table: "product_barcode_state_events", column: "from_branch_operation_id", description: "条码状态事件"},
		{table: "product_barcode_state_events", column: "to_branch_operation_id", description: "条码状态事件"},
		{table: "product_barcode_transfer_events", column: "from_branch_operation_id", description: "条码转移事件"},
		{table: "product_barcode_transfer_events", column: "to_branch_operation_id", description: "条码转移事件"},
		{table: "production_operation_executions", column: "branch_operation_id", description: "工序执行事实"},
		{table: "production_outsource_transfers", column: "branch_operation_id", description: "委外收发事实"},
		{table: "production_outsource_inspections", column: "branch_operation_id", description: "委外检验事实"},
	}
	for _, reference := range references {
		if !tx.Migrator().HasTable(reference.table) || !tx.Migrator().HasColumn(reference.table, reference.column) {
			continue
		}
		var count int64
		if err := tx.Table(reference.table).Where(reference.column+" = ?", operationID).Count(&count).Error; err != nil {
			return fmt.Errorf("check %s references: %w", reference.description, err)
		}
		if count > 0 {
			return fmt.Errorf("%w: 工序已被%s引用，不能取消 L2 选配", ErrProductionBOMBranchOperationSelectionConflict, reference.description)
		}
	}
	return nil
}
