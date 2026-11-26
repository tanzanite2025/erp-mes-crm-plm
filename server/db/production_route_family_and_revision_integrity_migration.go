package db

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type productionRouteFamilyMigrationBranch struct {
	productID          string
	bomOwnerType       string
	bomOwnerCustomerID string
	bomVersionLevel    string
}

type productionRouteFamilyMigrationScope struct {
	branch           productionRouteFamilyMigrationBranch
	scopeType        string
	salesOrderLineID uint
}

func EnsureProductionRouteFamilyRevisionIntegrity(database *gorm.DB) error {
	if database == nil || !database.Migrator().HasTable(&models.ProductionRoute{}) || !database.Migrator().HasTable(&models.ProductionPlan{}) {
		return nil
	}

	return database.Transaction(func(tx *gorm.DB) error {
		if !tx.Migrator().HasTable(&models.ProductionRouteFamily{}) {
			return fmt.Errorf("production route family table is missing")
		}
		if tx.Migrator().HasIndex(&models.ProductionRoute{}, "idx_production_routes_code") {
			if err := tx.Migrator().DropIndex(&models.ProductionRoute{}, "idx_production_routes_code"); err != nil {
				return fmt.Errorf("failed to remove per-revision production route code index: %w", err)
			}
		}

		var routes []models.ProductionRoute
		if err := tx.Order("created_at asc, id asc").Find(&routes).Error; err != nil {
			return fmt.Errorf("failed to load production routes for revision migration: %w", err)
		}

		familiesByScope := make(map[productionRouteFamilyMigrationScope]models.ProductionRouteFamily)
		familiesByID := make(map[string]models.ProductionRouteFamily)
		revisionCounts := make(map[string]int)
		lastRevisionByFamily := make(map[string]string)
		for _, route := range routes {
			branch := productionRouteFamilyMigrationBranch{
				productID:          strings.TrimSpace(route.ProductID),
				bomOwnerType:       strings.ToUpper(strings.TrimSpace(route.BOMOwnerType)),
				bomOwnerCustomerID: strings.TrimSpace(route.BOMOwnerCustomerID),
				bomVersionLevel:    strings.TrimSpace(route.BOMVersionLevel),
			}
			if branch.productID == "" || branch.bomOwnerType == "" {
				return fmt.Errorf("production route %s has an incomplete MBOM branch identity", route.ID)
			}

			scopeType := productionRouteScopeTypeForMigration(route.ScopeType)
			salesOrderLineID := routeFamilyMigrationSalesOrderLineID(route.SalesOrderLineID)
			family := models.ProductionRouteFamily{}
			if routeFamilyID := strings.TrimSpace(route.RouteFamilyID); routeFamilyID != "" {
				var exists bool
				family, exists = familiesByID[routeFamilyID]
				if !exists {
					if err := tx.First(&family, "id = ?", routeFamilyID).Error; err != nil {
						return fmt.Errorf("failed to load route family %s for revision %s: %w", routeFamilyID, route.ID, err)
					}
				}
				scopeType = productionRouteScopeTypeForMigration(family.ScopeType)
				salesOrderLineID = routeFamilyMigrationFamilySalesOrderLineID(family)
			} else {
				scopeKey := productionRouteFamilyMigrationScope{
					branch: branch, scopeType: scopeType, salesOrderLineID: salesOrderLineID,
				}
				var exists bool
				family, exists = familiesByScope[scopeKey]
				if !exists {
					query := tx.Where(
						"product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ? AND scope_type = ?",
						branch.productID, branch.bomOwnerType, branch.bomOwnerCustomerID, branch.bomVersionLevel, scopeType,
					)
					if scopeType == "BRANCH_DEFAULT" {
						query = query.Where("sales_order_line_id IS NULL")
					} else {
						query = query.Where("sales_order_line_id = ?", salesOrderLineID)
					}
					if err := query.First(&family).Error; err != nil {
						if err != gorm.ErrRecordNotFound {
							return fmt.Errorf("failed to find production route family: %w", err)
						}
						family = models.ProductionRouteFamily{
							BaseModel:          models.BaseModel{ID: uuid.NewString()},
							Code:               strings.TrimSpace(route.Code),
							ProductID:          branch.productID,
							BOMOwnerType:       branch.bomOwnerType,
							BOMOwnerCustomerID: branch.bomOwnerCustomerID,
							BOMVersionLevel:    branch.bomVersionLevel,
							ScopeType:          scopeType,
							SalesOrderLineID:   routeFamilyMigrationSalesOrderLineIDPointer(salesOrderLineID),
						}
						if family.Code == "" {
							family.Code = "route-" + strings.ReplaceAll(family.ID, "-", "")[:12]
						}
						if err := tx.Create(&family).Error; err != nil {
							return fmt.Errorf("failed to create production route family for %s: %w", route.ID, err)
						}
					}
				}
			}
			if family.ProductID != branch.productID ||
				strings.ToUpper(strings.TrimSpace(family.BOMOwnerType)) != branch.bomOwnerType ||
				strings.TrimSpace(family.BOMOwnerCustomerID) != branch.bomOwnerCustomerID ||
				strings.TrimSpace(family.BOMVersionLevel) != branch.bomVersionLevel ||
				productionRouteScopeTypeForMigration(family.ScopeType) != scopeType ||
				routeFamilyMigrationFamilySalesOrderLineID(family) != salesOrderLineID {
				return fmt.Errorf("production route %s scope does not match its route family", route.ID)
			}
			familiesByScope[productionRouteFamilyMigrationScope{
				branch: branch, scopeType: scopeType, salesOrderLineID: salesOrderLineID,
			}] = family
			familiesByID[family.ID] = family

			if strings.TrimSpace(route.RouteFamilyID) == "" || route.RevisionNo <= 0 {
				revisionCounts[family.ID]++
				route.RouteFamilyID = family.ID
				route.RevisionNo = revisionCounts[family.ID]
				var basedOnRouteID interface{}
				if previousRevisionID := strings.TrimSpace(lastRevisionByFamily[family.ID]); previousRevisionID != "" {
					basedOnRouteID = previousRevisionID
				}
				if err := tx.Model(&models.ProductionRoute{}).Where("id = ?", route.ID).Updates(map[string]interface{}{
					"route_family_id":     route.RouteFamilyID,
					"revision_no":         route.RevisionNo,
					"based_on_route_id":   basedOnRouteID,
					"code":                family.Code,
					"scope_type":          scopeType,
					"sales_order_line_id": routeFamilyMigrationSalesOrderLineIDPointer(salesOrderLineID),
				}).Error; err != nil {
					return fmt.Errorf("failed to assign revision identity to production route %s: %w", route.ID, err)
				}
			} else if route.RevisionNo > revisionCounts[family.ID] {
				revisionCounts[family.ID] = route.RevisionNo
			}
			lastRevisionByFamily[family.ID] = route.ID

			if strings.EqualFold(strings.TrimSpace(route.Status), "PUBLISHED") {
				family.CurrentRevisionID = route.ID
			}
			familiesByScope[productionRouteFamilyMigrationScope{
				branch: branch, scopeType: scopeType, salesOrderLineID: salesOrderLineID,
			}] = family
			familiesByID[family.ID] = family
			if strings.EqualFold(strings.TrimSpace(route.Status), "PUBLISHED") {
				if err := backfillProductionRouteStepSnapshotsTx(tx, route.ID); err != nil {
					return err
				}
			}
		}

		for _, family := range familiesByID {
			if family.CurrentRevisionID == "" {
				continue
			}
			if err := tx.Model(&models.ProductionRouteFamily{}).Where("id = ?", family.ID).
				Update("current_revision_id", family.CurrentRevisionID).Error; err != nil {
				return fmt.Errorf("failed to set current production route revision: %w", err)
			}
		}

		if tx.Migrator().HasColumn(&models.ProductionPlan{}, "production_route_revision_id") {
			var plans []models.ProductionPlan
			if err := tx.Where("COALESCE(CAST(production_route_revision_id AS TEXT), '') = ''").Find(&plans).Error; err != nil {
				return fmt.Errorf("failed to load production plans for route revision migration: %w", err)
			}
			for _, plan := range plans {
				branch := productionRouteFamilyMigrationBranch{
					productID:          strings.TrimSpace(plan.ProductID),
					bomOwnerType:       strings.ToUpper(strings.TrimSpace(plan.BOMOwnerType)),
					bomOwnerCustomerID: strings.TrimSpace(plan.BOMOwnerCustomerID),
					bomVersionLevel:    strings.TrimSpace(plan.BOMVersionLevel),
				}
				scopeType := "BRANCH_DEFAULT"
				if plan.SalesOrderLineID != 0 {
					scopeType = "SALES_ORDER_LINE"
				}
				family, exists := familiesByScope[productionRouteFamilyMigrationScope{
					branch: branch, scopeType: scopeType, salesOrderLineID: plan.SalesOrderLineID,
				}]
				if !exists || strings.TrimSpace(family.CurrentRevisionID) == "" {
					continue
				}
				route := models.ProductionRoute{}
				if err := tx.Select("id", "revision_no").First(&route, "id = ?", family.CurrentRevisionID).Error; err != nil {
					return fmt.Errorf("failed to load current route revision for production plan %s: %w", plan.ID, err)
				}
				if err := tx.Model(&models.ProductionPlan{}).Where("id = ?", plan.ID).Updates(map[string]interface{}{
					"production_route_revision_id": route.ID,
					"production_route_revision_no": route.RevisionNo,
				}).Error; err != nil {
					return fmt.Errorf("failed to bind current route revision to production plan %s: %w", plan.ID, err)
				}
			}
		}
		if tx.Dialector.Name() == "postgres" {
			if err := tx.Exec("ALTER TABLE production_routes ALTER COLUMN route_family_id SET NOT NULL").Error; err != nil {
				return fmt.Errorf("failed to require production route family identity: %w", err)
			}
		}
		return nil
	})
}

func routeFamilyMigrationSalesOrderLineIDPointer(id uint) *uint {
	if id == 0 {
		return nil
	}
	return &id
}

func routeFamilyMigrationSalesOrderLineID(id *uint) uint {
	if id == nil {
		return 0
	}
	return *id
}

func routeFamilyMigrationFamilySalesOrderLineID(family models.ProductionRouteFamily) uint {
	return routeFamilyMigrationSalesOrderLineID(family.SalesOrderLineID)
}

func backfillProductionRouteStepSnapshotsTx(tx *gorm.DB, routeID string) error {
	var steps []models.ProductionRouteStep
	if err := tx.Where("route_id = ?", routeID).Find(&steps).Error; err != nil {
		return fmt.Errorf("failed to load published route steps for snapshot migration: %w", err)
	}
	for _, step := range steps {
		if strings.TrimSpace(step.ProcessNameSnapshot) != "" {
			continue
		}
		var processStep models.ProcessStep
		if err := tx.First(&processStep, "id = ?", step.ProcessStepID).Error; err != nil {
			return fmt.Errorf("failed to snapshot process step for published route step %s: %w", step.ID, err)
		}
		if err := tx.Model(&models.ProductionRouteStep{}).Where("id = ?", step.ID).Updates(map[string]interface{}{
			"process_name_snapshot":        processStep.Name,
			"process_description_snapshot": processStep.Description,
		}).Error; err != nil {
			return fmt.Errorf("failed to write published route step snapshot %s: %w", step.ID, err)
		}
	}
	return nil
}
