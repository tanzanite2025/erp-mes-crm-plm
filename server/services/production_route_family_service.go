package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func findProductionRouteFamilyForBranchTx(
	tx *gorm.DB,
	branch productionRouteBOMBranchIdentity,
	lock bool,
) (models.ProductionRouteFamily, error) {
	query := tx
	if lock {
		query = query.Clauses(clause.Locking{Strength: "UPDATE"})
	}
	var family models.ProductionRouteFamily
	err := query.Where(
		"product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ?",
		strings.TrimSpace(branch.ProductID), strings.ToUpper(strings.TrimSpace(branch.BOMOwnerType)),
		strings.TrimSpace(branch.BOMOwnerCustomerID), strings.TrimSpace(branch.BOMVersionLevel),
	).First(&family).Error
	return family, err
}

func createProductionRouteFamilyForDraftTx(tx *gorm.DB, route *models.ProductionRoute) error {
	branch := productionRouteBOMBranchIdentityFromModel(*route)
	if _, err := findProductionRouteFamilyForBranchTx(tx, branch, true); err == nil {
		return fmt.Errorf("%w: this MBOM branch already has a route family; create a new revision from its current route", ErrProductionRouteRevisionConflict)
	} else if err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to check route family for MBOM branch: %w", err)
	}

	family := models.ProductionRouteFamily{
		BaseModel:          models.BaseModel{ID: uuid.NewString()},
		Code:               strings.TrimSpace(route.Code),
		ProductID:          branch.ProductID,
		BOMOwnerType:       branch.BOMOwnerType,
		BOMOwnerCustomerID: branch.BOMOwnerCustomerID,
		BOMVersionLevel:    branch.BOMVersionLevel,
	}
	if err := tx.Create(&family).Error; err != nil {
		return fmt.Errorf("failed to create route family: %w", err)
	}
	route.RouteFamilyID = family.ID
	route.RevisionNo = 1
	route.RouteFamily = &family
	return nil
}

func validateProductionRouteFamilyBranch(family models.ProductionRouteFamily, route models.ProductionRoute) error {
	if strings.TrimSpace(route.RouteFamilyID) != strings.TrimSpace(family.ID) {
		return fmt.Errorf("%w: route revision does not belong to its route family", ErrInvalidProductionRoute)
	}
	if productionRouteBOMBranchIdentityFromModel(route) != (productionRouteBOMBranchIdentity{
		ProductID:          strings.TrimSpace(family.ProductID),
		BOMOwnerType:       strings.ToUpper(strings.TrimSpace(family.BOMOwnerType)),
		BOMOwnerCustomerID: strings.TrimSpace(family.BOMOwnerCustomerID),
		BOMVersionLevel:    strings.TrimSpace(family.BOMVersionLevel),
	}) {
		return fmt.Errorf("%w: route revision MBOM branch differs from its route family", ErrInvalidProductionRoute)
	}
	if strings.TrimSpace(route.Code) != strings.TrimSpace(family.Code) {
		return fmt.Errorf("%w: route family code is immutable across revisions", ErrInvalidProductionRoute)
	}
	return nil
}
