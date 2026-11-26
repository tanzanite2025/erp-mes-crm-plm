package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func materializeCurrentBranchDefaultProductionRouteRevisionTx(
	tx *gorm.DB,
	branch models.ProductionRoute,
) (models.ProductionRouteFamily, models.ProductionRoute, error) {
	identity := productionRouteBOMBranchIdentityFromModel(branch)
	var associations []models.ProductionMBOMBranchProcessAssociation
	if err := tx.Where(
		"product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ?",
		identity.ProductID, identity.BOMOwnerType, identity.BOMOwnerCustomerID, identity.BOMVersionLevel,
	).Order("sort_order ASC, id ASC").Find(&associations).Error; err != nil {
		return models.ProductionRouteFamily{}, models.ProductionRoute{}, fmt.Errorf("failed to load MBOM branch default operations: %w", err)
	}
	if len(associations) == 0 {
		return models.ProductionRouteFamily{}, models.ProductionRoute{}, fmt.Errorf("%w: selected MBOM branch has no configured default operations", ErrInvalidProductionPlanBOMBranch)
	}

	processStepIDs := make([]string, 0, len(associations))
	for _, association := range associations {
		processStepIDs = append(processStepIDs, strings.TrimSpace(association.ProcessStepID))
	}
	var processSteps []models.ProcessStep
	if err := tx.Where("id IN ?", processStepIDs).Find(&processSteps).Error; err != nil {
		return models.ProductionRouteFamily{}, models.ProductionRoute{}, fmt.Errorf("failed to load MBOM branch operations: %w", err)
	}
	processStepsByID := make(map[string]models.ProcessStep, len(processSteps))
	for _, processStep := range processSteps {
		processStepsByID[processStep.ID] = processStep
	}
	for index, association := range associations {
		processStep, exists := processStepsByID[strings.TrimSpace(association.ProcessStepID)]
		if !exists || !processStep.IsActive {
			return models.ProductionRouteFamily{}, models.ProductionRoute{}, fmt.Errorf("%w: default operation %d is missing or inactive", ErrInvalidProductionPlanBOMBranch, index+1)
		}
	}

	family, err := findProductionRouteFamilyForBranchTx(tx, identity, true)
	if err != nil && err != gorm.ErrRecordNotFound {
		return models.ProductionRouteFamily{}, models.ProductionRoute{}, fmt.Errorf("failed to load MBOM branch default route family: %w", err)
	}
	if err == gorm.ErrRecordNotFound {
		family = models.ProductionRouteFamily{
			BaseModel:          models.BaseModel{ID: uuid.NewString()},
			Code:               "MBOM-" + strings.ToUpper(strings.ReplaceAll(uuid.NewString()[:8], "-", "")),
			ProductID:          identity.ProductID,
			BOMOwnerType:       identity.BOMOwnerType,
			BOMOwnerCustomerID: identity.BOMOwnerCustomerID,
			BOMVersionLevel:    identity.BOMVersionLevel,
			ScopeType:          productionRouteScopeBranchDefault,
		}
		if err := tx.Create(&family).Error; err != nil {
			return models.ProductionRouteFamily{}, models.ProductionRoute{}, fmt.Errorf("failed to create MBOM branch default route identity: %w", err)
		}
	}

	if strings.TrimSpace(family.CurrentRevisionID) != "" {
		current, loadErr := loadProductionRouteRevisionForExecutionTx(tx, family.CurrentRevisionID)
		if loadErr != nil {
			return models.ProductionRouteFamily{}, models.ProductionRoute{}, fmt.Errorf("failed to load MBOM branch default route revision: %w", loadErr)
		}
		if productionRouteRevisionMatchesBranchOperations(current, family, associations) {
			return family, current, nil
		}
	}

	var latestRevisionNo int
	if err := tx.Model(&models.ProductionRoute{}).
		Where("route_family_id = ?", family.ID).
		Select("COALESCE(MAX(revision_no), 0)").Scan(&latestRevisionNo).Error; err != nil {
		return models.ProductionRouteFamily{}, models.ProductionRoute{}, fmt.Errorf("failed to read MBOM branch default route revision: %w", err)
	}

	route := models.ProductionRoute{
		BaseModel:            models.BaseModel{ID: uuid.NewString()},
		RouteFamilyID:        family.ID,
		RevisionNo:           latestRevisionNo + 1,
		Code:                 family.Code,
		Name:                 productionBranchDefaultRouteName(branch),
		ProductID:            branch.ProductID,
		ProductSKU:           branch.ProductSKU,
		ProductName:          branch.ProductName,
		BOMOwnerType:         branch.BOMOwnerType,
		BOMOwnerCustomerID:   branch.BOMOwnerCustomerID,
		BOMOwnerCustomerName: branch.BOMOwnerCustomerName,
		BOMVersionLevel:      branch.BOMVersionLevel,
		ScopeType:            productionRouteScopeBranchDefault,
		Version:              1,
		Status:               productionRouteStatusPublished,
		RouteFamily:          &family,
	}
	for index, association := range associations {
		processStep := processStepsByID[strings.TrimSpace(association.ProcessStepID)]
		route.Steps = append(route.Steps, models.ProductionRouteStep{
			BaseModel:                  models.BaseModel{ID: uuid.NewString()},
			RouteID:                    route.ID,
			Sequence:                   index + 1,
			ProcessStepID:              processStep.ID,
			ProcessStep:                &processStep,
			ProcessNameSnapshot:        strings.TrimSpace(processStep.Name),
			ProcessDescriptionSnapshot: processStep.Description,
			ExecutionMode:              "IN_HOUSE",
			QualityGate:                "NONE",
		})
	}
	if err := tx.Omit("RouteFamily", "Steps").Create(&route).Error; err != nil {
		return models.ProductionRouteFamily{}, models.ProductionRoute{}, fmt.Errorf("failed to materialize MBOM branch default route revision: %w", err)
	}
	for _, step := range route.Steps {
		if err := tx.Omit("ProcessStep").Create(&step).Error; err != nil {
			return models.ProductionRouteFamily{}, models.ProductionRoute{}, fmt.Errorf("failed to materialize MBOM branch default route step: %w", err)
		}
	}
	if err := tx.Model(&models.ProductionRouteFamily{}).
		Where("id = ?", family.ID).
		Update("current_revision_id", route.ID).Error; err != nil {
		return models.ProductionRouteFamily{}, models.ProductionRoute{}, fmt.Errorf("failed to select MBOM branch default route revision: %w", err)
	}
	family.CurrentRevisionID = route.ID
	return family, route, nil
}

func productionRouteRevisionMatchesBranchOperations(
	route models.ProductionRoute,
	family models.ProductionRouteFamily,
	associations []models.ProductionMBOMBranchProcessAssociation,
) bool {
	if route.RouteFamilyID != family.ID ||
		!strings.EqualFold(strings.TrimSpace(route.Status), productionRouteStatusPublished) ||
		strings.ToUpper(strings.TrimSpace(route.ScopeType)) != productionRouteScopeBranchDefault ||
		len(route.Steps) != len(associations) || !productionRouteHasValidProcessSteps(route) {
		return false
	}
	for index, association := range associations {
		if route.Steps[index].Sequence != index+1 ||
			strings.TrimSpace(route.Steps[index].ProcessStepID) != strings.TrimSpace(association.ProcessStepID) {
			return false
		}
	}
	return true
}

func productionBranchDefaultRouteName(branch models.ProductionRoute) string {
	name := strings.TrimSpace(branch.ProductName)
	if version := strings.TrimSpace(branch.BOMVersionLevel); version != "" {
		name += " · " + version
	}
	return name + " · 默认工序路线"
}
