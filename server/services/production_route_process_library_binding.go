package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func resolveConfiguredProductionRouteProcessesTx(tx *gorm.DB, route *models.ProductionRoute) error {
	identity := productionRouteBOMBranchIdentityFromModel(*route)
	for index := range route.Steps {
		step := &route.Steps[index]
		processStepID := strings.TrimSpace(step.ProcessStepID)
		if processStepID == "" {
			return fmt.Errorf("%w: steps[%d].processStepId is required", ErrInvalidProductionRoute, index)
		}

		var processStep models.ProcessStep
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&processStep, "id = ? AND is_active = ?", processStepID, true).Error; err != nil {
			return fmt.Errorf("%w: steps[%d] references a missing or inactive process step", ErrInvalidProductionRoute, index)
		}
		step.ProcessStep = &processStep

		var association models.ProductionMBOMBranchProcessAssociation
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where(
			"product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ? AND process_step_id = ?",
			identity.ProductID, identity.BOMOwnerType, identity.BOMOwnerCustomerID, identity.BOMVersionLevel, processStepID,
		).First(&association).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return fmt.Errorf("%w: steps[%d] process is not configured for the selected MBOM branch", ErrInvalidProductionRoute, index)
			}
			return fmt.Errorf("%w: failed to resolve steps[%d] MBOM branch process: %v", ErrInvalidProductionRoute, index, err)
		}
	}
	return nil
}
