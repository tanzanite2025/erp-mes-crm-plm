package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func ValidateProductionPlanBOMBranchTx(
	tx *gorm.DB,
	plan *models.ProductionPlan,
	previous *models.ProductionPlan,
) error {
	if plan.ProductID == "" && previous != nil {
		plan.ProductID = strings.TrimSpace(previous.ProductID)
	}
	plan.ProductID = strings.TrimSpace(plan.ProductID)
	plan.BOMOwnerType = strings.ToUpper(strings.TrimSpace(plan.BOMOwnerType))
	plan.BOMOwnerCustomerID = strings.TrimSpace(plan.BOMOwnerCustomerID)
	plan.BOMVersionLevel = strings.TrimSpace(plan.BOMVersionLevel)

	if plan.BOMOwnerType == "" && previous != nil && strings.TrimSpace(previous.BOMOwnerType) != "" {
		plan.BOMOwnerType = strings.ToUpper(strings.TrimSpace(previous.BOMOwnerType))
		plan.BOMOwnerCustomerID = strings.TrimSpace(previous.BOMOwnerCustomerID)
		plan.BOMVersionLevel = strings.TrimSpace(previous.BOMVersionLevel)
	}

	branch := models.ProductionRoute{
		ProductID:          plan.ProductID,
		BOMOwnerType:       plan.BOMOwnerType,
		BOMOwnerCustomerID: plan.BOMOwnerCustomerID,
		BOMVersionLevel:    plan.BOMVersionLevel,
	}
	if err := validateProductionRouteBOMBranchIdentity(branch); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidProductionPlanBOMBranch, err)
	}
	if err := hydrateProductionRouteBOMBranch(tx, &branch); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidProductionPlanBOMBranch, err)
	}

	if previous != nil && !productionPlanHasSameBOMBranch(*previous, branch) {
		if strings.TrimSpace(previous.ProductionRouteRevisionID) != "" {
			return fmt.Errorf("%w: a production plan with a bound route revision cannot change its MBOM branch; create a replacement plan", ErrInvalidProductionPlanBOMBranch)
		}
		started, err := productionPlanHasExecutionActivityTx(tx, previous.ID)
		if err != nil {
			return fmt.Errorf("%w: failed to check plan execution history: %v", ErrInvalidProductionPlanBOMBranch, err)
		}
		if started || strings.EqualFold(strings.TrimSpace(previous.Status), "IN_PROGRESS") ||
			strings.EqualFold(strings.TrimSpace(previous.Status), "COMPLETED") {
			return fmt.Errorf("%w: an executing or completed production plan cannot change its MBOM branch", ErrInvalidProductionPlanBOMBranch)
		}
	}

	plan.ProductID = branch.ProductID
	plan.BOMOwnerType = branch.BOMOwnerType
	plan.BOMOwnerCustomerID = branch.BOMOwnerCustomerID
	plan.BOMVersionLevel = branch.BOMVersionLevel
	return nil
}

func productionPlanHasSameBOMBranch(plan models.ProductionPlan, branch models.ProductionRoute) bool {
	return productionRouteBOMBranchIdentityFromModel(models.ProductionRoute{
		ProductID:          plan.ProductID,
		BOMOwnerType:       plan.BOMOwnerType,
		BOMOwnerCustomerID: plan.BOMOwnerCustomerID,
		BOMVersionLevel:    plan.BOMVersionLevel,
	}) == productionRouteBOMBranchIdentityFromModel(branch)
}

func productionPlanHasExecutionActivityTx(tx *gorm.DB, planID string) (bool, error) {
	planID = strings.TrimSpace(planID)
	if planID == "" || !tx.Migrator().HasTable("production_execution_lots") {
		return false, nil
	}

	var lotCount int64
	if err := tx.Model(&models.ProductionExecutionLot{}).
		Where("plan_id = ? AND deleted_at IS NULL", planID).
		Count(&lotCount).Error; err != nil {
		return false, err
	}
	if lotCount > 0 {
		return true, nil
	}

	if tx.Migrator().HasTable("production_operation_executions") {
		var executionCount int64
		if err := tx.Table("production_execution_lots AS lot").
			Joins("JOIN production_operation_executions AS execution ON execution.execution_lot_id = lot.id").
			Where("lot.plan_id = ?", planID).
			Count(&executionCount).Error; err != nil {
			return false, err
		}
		if executionCount > 0 {
			return true, nil
		}
	}

	if tx.Migrator().HasTable("product_barcode_states") {
		var initializedCount int64
		if err := tx.Table("production_execution_lots AS lot").
			Joins("JOIN product_barcode_states AS state ON state.product_barcode = lot.product_barcode").
			Where("lot.plan_id = ? AND (COALESCE(CAST(state.route_id AS TEXT), '') <> '' OR COALESCE(CAST(state.route_step_id AS TEXT), '') <> '')", planID).
			Count(&initializedCount).Error; err != nil {
			return false, err
		}
		if initializedCount > 0 {
			return true, nil
		}
	}

	return false, nil
}
