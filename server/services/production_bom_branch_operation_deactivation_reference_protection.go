package services

import (
	"fmt"

	"gorm.io/gorm"
)

func validateProductionBOMBranchOperationDeactivationReferencesTx(tx *gorm.DB, operationID string) error {
	if tx.Migrator().HasTable("production_routes") && tx.Migrator().HasTable("production_route_steps") {
		var count int64
		if err := tx.Table("production_route_steps AS step").
			Joins("JOIN production_routes AS route ON route.id = step.route_id").
			Where("step.branch_operation_id = ? AND step.deleted_at IS NULL AND route.deleted_at IS NULL AND UPPER(route.status) = ?", operationID, productionRouteStatusPublished).
			Count(&count).Error; err != nil {
			return fmt.Errorf("check published route references for branch operation: %w", err)
		}
		if count > 0 {
			return fmt.Errorf("%w: 工序已被已发布生产路线引用，不能停用", ErrProductionBOMBranchOperationDeactivationBlocked)
		}
	}

	for _, reference := range []struct {
		table       string
		condition   string
		description string
	}{
		{"product_barcode_states", "current_branch_operation_id = @operation_id", "产品码当前工序"},
		{"product_barcode_state_events", "from_branch_operation_id = @operation_id OR to_branch_operation_id = @operation_id", "产品码状态历史"},
		{"product_barcode_transfer_events", "from_branch_operation_id = @operation_id OR to_branch_operation_id = @operation_id", "生产流转历史"},
		{"production_operation_executions", "branch_operation_id = @operation_id", "工序执行记录"},
		{"production_outsource_transfers", "branch_operation_id = @operation_id", "委外收发记录"},
		{"production_outsource_inspections", "branch_operation_id = @operation_id", "委外检验记录"},
	} {
		if !tx.Migrator().HasTable(reference.table) {
			continue
		}
		var count int64
		if err := tx.Table(reference.table).Where(reference.condition, map[string]any{"operation_id": operationID}).Count(&count).Error; err != nil {
			return fmt.Errorf("check branch operation references in %s: %w", reference.table, err)
		}
		if count > 0 {
			return fmt.Errorf("%w: 工序已有%s引用，不能停用", ErrProductionBOMBranchOperationDeactivationBlocked, reference.description)
		}
	}
	return nil
}
