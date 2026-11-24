package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	productionRouteScopeBranchDefault  = "BRANCH_DEFAULT"
	productionRouteScopeSalesOrderLine = "SALES_ORDER_LINE"
)

func findProductionRouteFamilyForBranchTx(
	tx *gorm.DB,
	branch productionRouteBOMBranchIdentity,
	lock bool,
) (models.ProductionRouteFamily, error) {
	return findProductionRouteFamilyForScopeTx(
		tx,
		branch,
		productionRouteScopeBranchDefault,
		0,
		lock,
	)
}

func findProductionRouteFamilyForScopeTx(
	tx *gorm.DB,
	branch productionRouteBOMBranchIdentity,
	scopeType string,
	salesOrderLineID uint,
	lock bool,
) (models.ProductionRouteFamily, error) {
	query := tx
	if lock {
		query = query.Clauses(clause.Locking{Strength: "UPDATE"})
	}
	var family models.ProductionRouteFamily
	query = query.Where(
		"product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ?",
		strings.TrimSpace(branch.ProductID), strings.ToUpper(strings.TrimSpace(branch.BOMOwnerType)),
		strings.TrimSpace(branch.BOMOwnerCustomerID), strings.TrimSpace(branch.BOMVersionLevel),
	).Where("scope_type = ?", strings.ToUpper(strings.TrimSpace(scopeType)))
	if scopeType == productionRouteScopeBranchDefault {
		query = query.Where("sales_order_line_id IS NULL")
	} else {
		query = query.Where("sales_order_line_id = ?", salesOrderLineID)
	}
	err := query.First(&family).Error
	return family, err
}

func createProductionRouteFamilyForDraftTx(tx *gorm.DB, route *models.ProductionRoute) error {
	branch := productionRouteBOMBranchIdentityFromModel(*route)
	if _, err := findProductionRouteFamilyForScopeTx(
		tx,
		branch,
		route.ScopeType,
		productionRouteSalesOrderLineID(route.SalesOrderLineID),
		true,
	); err == nil {
		return fmt.Errorf("%w: this MBOM branch and route scope already have a route family; create a new revision from its current route", ErrProductionRouteRevisionConflict)
	} else if err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to check route family for MBOM branch and route scope: %w", err)
	}

	family := models.ProductionRouteFamily{
		BaseModel:          models.BaseModel{ID: uuid.NewString()},
		Code:               strings.TrimSpace(route.Code),
		ProductID:          branch.ProductID,
		BOMOwnerType:       branch.BOMOwnerType,
		BOMOwnerCustomerID: branch.BOMOwnerCustomerID,
		BOMVersionLevel:    branch.BOMVersionLevel,
		ScopeType:          route.ScopeType,
		SalesOrderLineID:   productionRouteSalesOrderLineIDPointer(productionRouteSalesOrderLineID(route.SalesOrderLineID)),
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
	if strings.ToUpper(strings.TrimSpace(route.ScopeType)) != strings.ToUpper(strings.TrimSpace(family.ScopeType)) ||
		productionRouteSalesOrderLineID(route.SalesOrderLineID) != productionRouteFamilySalesOrderLineID(family) {
		return fmt.Errorf("%w: route revision scope differs from its route family", ErrInvalidProductionRoute)
	}
	return nil
}

func productionRouteSalesOrderLineIDPointer(id uint) *uint {
	if id == 0 {
		return nil
	}
	return &id
}

func productionRouteSalesOrderLineID(id *uint) uint {
	if id == nil {
		return 0
	}
	return *id
}

func productionRouteFamilySalesOrderLineID(family models.ProductionRouteFamily) uint {
	return productionRouteSalesOrderLineID(family.SalesOrderLineID)
}

func normalizeProductionRouteScope(scopeType string, salesOrderLineID uint) (string, error) {
	scopeType = strings.ToUpper(strings.TrimSpace(scopeType))
	switch scopeType {
	case productionRouteScopeBranchDefault:
		if salesOrderLineID != 0 {
			return "", fmt.Errorf("%w: branch default route cannot reference a sales order line", ErrInvalidProductionRoute)
		}
	case productionRouteScopeSalesOrderLine:
		if salesOrderLineID == 0 {
			return "", fmt.Errorf("%w: sales order line route requires salesOrderLineId", ErrInvalidProductionRoute)
		}
	default:
		return "", fmt.Errorf("%w: scopeType must be BRANCH_DEFAULT or SALES_ORDER_LINE", ErrInvalidProductionRoute)
	}
	return scopeType, nil
}
