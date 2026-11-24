package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func BindProductionPlanToCurrentPublishedRouteRevisionTx(tx *gorm.DB, plan *models.ProductionPlan) error {
	branch := models.ProductionRoute{
		ProductID:          strings.TrimSpace(plan.ProductID),
		BOMOwnerType:       strings.ToUpper(strings.TrimSpace(plan.BOMOwnerType)),
		BOMOwnerCustomerID: strings.TrimSpace(plan.BOMOwnerCustomerID),
		BOMVersionLevel:    strings.TrimSpace(plan.BOMVersionLevel),
	}
	if err := validateProductionRouteBOMBranchIdentity(branch); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidProductionPlanBOMBranch, err)
	}
	if err := hydrateProductionRouteBOMBranch(tx, &branch); err != nil {
		return fmt.Errorf("%w: selected MBOM branch is not currently effective: %v", ErrInvalidProductionPlanBOMBranch, err)
	}
	if !productionPlanHasSameBOMBranch(*plan, branch) {
		return fmt.Errorf("%w: plan product does not match its MBOM branch", ErrInvalidProductionPlanBOMBranch)
	}

	family, err := findProductionRouteFamilyForBranchTx(tx, productionRouteBOMBranchIdentityFromModel(branch), true)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("%w: no route family exists for the selected MBOM branch", ErrInvalidProductionPlanBOMBranch)
		}
		return fmt.Errorf("failed to find production route family for plan: %w", err)
	}
	if strings.TrimSpace(family.CurrentRevisionID) == "" {
		return fmt.Errorf("%w: selected MBOM branch has no current published route revision", ErrInvalidProductionPlanBOMBranch)
	}

	route, err := loadProductionRouteRevisionForExecutionTx(tx, family.CurrentRevisionID)
	if err != nil {
		return fmt.Errorf("%w: failed to load current route revision: %v", ErrInvalidProductionPlanBOMBranch, err)
	}
	if !strings.EqualFold(strings.TrimSpace(route.Status), productionRouteStatusPublished) || route.RouteFamilyID != family.ID {
		return fmt.Errorf("%w: route family points to an unavailable revision", ErrInvalidProductionPlanBOMBranch)
	}
	if err := validateProductionRouteFamilyBranch(family, route); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidProductionPlanBOMBranch, err)
	}
	if productionRouteBOMBranchIdentityFromModel(route) != productionRouteBOMBranchIdentityFromModel(branch) || !productionRouteHasBranchOperationSteps(route) {
		return fmt.Errorf("%w: current route revision does not match the selected MBOM branch or contains inactive operations", ErrInvalidProductionPlanBOMBranch)
	}
	if len(route.Steps) == 0 {
		return fmt.Errorf("%w: current route revision has no executable steps", ErrInvalidProductionPlanBOMBranch)
	}
	plan.ProductionRouteRevisionID = route.ID
	plan.ProductionRouteRevisionNo = route.RevisionNo
	return nil
}

func resolveUniquePublishedProductionRouteForPlanTx(
	tx *gorm.DB,
	plan models.ProductionPlan,
) (models.ProductionRoute, models.ProductionRouteStep, error) {
	routeRevisionID := strings.TrimSpace(plan.ProductionRouteRevisionID)
	if routeRevisionID == "" || plan.ProductionRouteRevisionNo <= 0 {
		return models.ProductionRoute{}, models.ProductionRouteStep{}, fmt.Errorf("%w: production plan has no bound route revision; reschedule the plan", ErrInvalidProductionScanCommand)
	}
	route, err := loadProductionRouteRevisionForExecutionTx(tx, routeRevisionID)
	if err != nil {
		return models.ProductionRoute{}, models.ProductionRouteStep{}, fmt.Errorf("%w: bound route revision does not exist", ErrInvalidProductionScanCommand)
	}
	branchIdentity := productionRouteBOMBranchIdentityFromModel(models.ProductionRoute{
		ProductID: plan.ProductID, BOMOwnerType: plan.BOMOwnerType,
		BOMOwnerCustomerID: plan.BOMOwnerCustomerID, BOMVersionLevel: plan.BOMVersionLevel,
	})
	if !strings.EqualFold(strings.TrimSpace(route.Status), productionRouteStatusPublished) ||
		route.RevisionNo != plan.ProductionRouteRevisionNo ||
		productionRouteBOMBranchIdentityFromModel(route) != branchIdentity ||
		!productionRouteHasBranchOperationSteps(route) || len(route.Steps) == 0 {
		return models.ProductionRoute{}, models.ProductionRouteStep{}, fmt.Errorf("%w: bound route revision is unavailable or does not match the production plan", ErrInvalidProductionScanCommand)
	}

	firstStep := route.Steps[0]
	for _, step := range route.Steps[1:] {
		if step.Sequence < firstStep.Sequence || (step.Sequence == firstStep.Sequence && step.ID < firstStep.ID) {
			firstStep = step
		}
	}
	return route, firstStep, nil
}

func loadProductionRouteRevisionForExecutionTx(tx *gorm.DB, routeRevisionID string) (models.ProductionRoute, error) {
	var route models.ProductionRoute
	err := tx.Preload("Steps", func(query *gorm.DB) *gorm.DB {
		return query.Order("sequence asc, id asc")
	}).Preload("Steps.BranchOperation").First(&route, "id = ?", strings.TrimSpace(routeRevisionID)).Error
	return route, err
}

func resolveProductionPlanForExecutionLotTx(
	tx *gorm.DB,
	productBarcode string,
) (models.ProductionExecutionLot, models.ProductionPlan, error) {
	var lot models.ProductionExecutionLot
	if err := tx.Where("product_barcode = ? AND UPPER(status) = ?", normalizeProductBarcodeValue(productBarcode), ProductionExecutionLotStatusActive).First(&lot).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.ProductionExecutionLot{}, models.ProductionPlan{}, fmt.Errorf("%w: no active execution lot is linked to this product barcode", ErrInvalidProductionScanCommand)
		}
		return models.ProductionExecutionLot{}, models.ProductionPlan{}, fmt.Errorf("failed to load production execution lot: %w", err)
	}
	if strings.TrimSpace(lot.PlanID) == "" {
		return models.ProductionExecutionLot{}, models.ProductionPlan{}, fmt.Errorf("%w: execution lot has no production plan", ErrInvalidProductionScanCommand)
	}

	var plan models.ProductionPlan
	if err := tx.First(&plan, "id = ?", strings.TrimSpace(lot.PlanID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.ProductionExecutionLot{}, models.ProductionPlan{}, fmt.Errorf("%w: execution lot production plan does not exist", ErrInvalidProductionScanCommand)
		}
		return models.ProductionExecutionLot{}, models.ProductionPlan{}, fmt.Errorf("failed to load production plan for execution lot: %w", err)
	}
	if lotProductID := strings.TrimSpace(lot.ProductID); lotProductID == "" || lotProductID != strings.TrimSpace(plan.ProductID) {
		return models.ProductionExecutionLot{}, models.ProductionPlan{}, fmt.Errorf("%w: execution lot product does not match its production plan", ErrInvalidProductionScanCommand)
	}
	if strings.EqualFold(strings.TrimSpace(plan.Status), "CANCELED") || strings.EqualFold(strings.TrimSpace(plan.Status), "COMPLETED") {
		return models.ProductionExecutionLot{}, models.ProductionPlan{}, fmt.Errorf("%w: canceled or completed production plans cannot start barcode execution", ErrInvalidProductionScanCommand)
	}
	branch := models.ProductionRoute{
		ProductID:          strings.TrimSpace(plan.ProductID),
		BOMOwnerType:       strings.ToUpper(strings.TrimSpace(plan.BOMOwnerType)),
		BOMOwnerCustomerID: strings.TrimSpace(plan.BOMOwnerCustomerID),
		BOMVersionLevel:    strings.TrimSpace(plan.BOMVersionLevel),
	}
	if err := validateProductionRouteBOMBranchIdentity(branch); err != nil {
		return models.ProductionExecutionLot{}, models.ProductionPlan{}, fmt.Errorf("%w: production plan MBOM branch is invalid: %v", ErrInvalidProductionScanCommand, err)
	}
	if err := hydrateProductionRouteBOMBranch(tx, &branch); err != nil {
		return models.ProductionExecutionLot{}, models.ProductionPlan{}, fmt.Errorf("%w: production plan MBOM branch is no longer effective: %v", ErrInvalidProductionScanCommand, err)
	}
	return lot, plan, nil
}
