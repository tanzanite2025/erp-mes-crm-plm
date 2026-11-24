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

		familiesByBranch := make(map[productionRouteFamilyMigrationBranch]models.ProductionRouteFamily)
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

			family, exists := familiesByBranch[branch]
			if !exists {
				if err := tx.Where(
					"product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ?",
					branch.productID, branch.bomOwnerType, branch.bomOwnerCustomerID, branch.bomVersionLevel,
				).First(&family).Error; err != nil {
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
					}
					if family.Code == "" {
						family.Code = "route-" + strings.ReplaceAll(family.ID, "-", "")[:12]
					}
					if err := tx.Create(&family).Error; err != nil {
						return fmt.Errorf("failed to create production route family for %s: %w", route.ID, err)
					}
				}
				familiesByBranch[branch] = family
			}

			if strings.TrimSpace(route.RouteFamilyID) == "" || route.RevisionNo <= 0 {
				revisionCounts[family.ID]++
				route.RouteFamilyID = family.ID
				route.RevisionNo = revisionCounts[family.ID]
				var basedOnRouteID interface{}
				if previousRevisionID := strings.TrimSpace(lastRevisionByFamily[family.ID]); previousRevisionID != "" {
					basedOnRouteID = previousRevisionID
				}
				if err := tx.Model(&models.ProductionRoute{}).Where("id = ?", route.ID).Updates(map[string]interface{}{
					"route_family_id":   route.RouteFamilyID,
					"revision_no":       route.RevisionNo,
					"based_on_route_id": basedOnRouteID,
					"code":              family.Code,
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
			familiesByBranch[branch] = family
			if strings.EqualFold(strings.TrimSpace(route.Status), "PUBLISHED") {
				if err := backfillProductionRouteStepSnapshotsTx(tx, route.ID); err != nil {
					return err
				}
			}
		}

		for _, family := range familiesByBranch {
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
				family, exists := familiesByBranch[branch]
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

func backfillProductionRouteStepSnapshotsTx(tx *gorm.DB, routeID string) error {
	var steps []models.ProductionRouteStep
	if err := tx.Where("route_id = ?", routeID).Find(&steps).Error; err != nil {
		return fmt.Errorf("failed to load published route steps for snapshot migration: %w", err)
	}
	for _, step := range steps {
		if strings.TrimSpace(step.BranchOperationNameSnapshot) != "" {
			continue
		}
		var operation models.ProductionBOMBranchOperation
		if err := tx.First(&operation, "id = ?", step.BranchOperationID).Error; err != nil {
			return fmt.Errorf("failed to snapshot branch operation for published route step %s: %w", step.ID, err)
		}
		if err := tx.Model(&models.ProductionRouteStep{}).Where("id = ?", step.ID).Updates(map[string]interface{}{
			"branch_operation_name_snapshot":        operation.Name,
			"branch_operation_description_snapshot": operation.Description,
		}).Error; err != nil {
			return fmt.Errorf("failed to write published route step snapshot %s: %w", step.ID, err)
		}
	}
	return nil
}
