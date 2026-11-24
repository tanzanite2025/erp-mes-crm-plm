package services

import (
	"errors"
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	productionRouteStatusDraft     = "DRAFT"
	productionRouteStatusPublished = "PUBLISHED"
)

func validateProductionRouteStatusTransition(currentStatus string, requestedStatus string, isCreate bool) error {
	currentStatus = strings.ToUpper(strings.TrimSpace(currentStatus))
	requestedStatus = strings.ToUpper(strings.TrimSpace(requestedStatus))
	if requestedStatus != productionRouteStatusDraft {
		return fmt.Errorf("%w: production routes can only be saved as DRAFT", ErrInvalidProductionRouteStatus)
	}
	if !isCreate && currentStatus != productionRouteStatusDraft {
		return fmt.Errorf("%w: only DRAFT production routes can be edited", ErrProductionRouteImmutable)
	}
	return nil
}

func productionRouteIsPublishedTx(tx *gorm.DB, routeID string) (bool, error) {
	var route models.ProductionRoute
	if err := tx.Select("status").First(&route, "id = ?", strings.TrimSpace(routeID)).Error; err != nil {
		return false, err
	}
	return strings.EqualFold(strings.TrimSpace(route.Status), productionRouteStatusPublished), nil
}

func validateProductionRouteStepIdentities(
	tx *gorm.DB,
	routeID string,
	steps []models.ProductionRouteStep,
	isCreate bool,
) error {
	seen := make(map[string]struct{}, len(steps))

	for index, step := range steps {
		stepID := strings.TrimSpace(step.ID)
		if stepID == "" || strings.HasPrefix(stepID, "temp-") {
			continue
		}
		if _, exists := seen[stepID]; exists {
			return fmt.Errorf("%w: steps[%d].id is duplicated", ErrInvalidProductionRoute, index)
		}
		seen[stepID] = struct{}{}

		var existing models.ProductionRouteStep
		err := tx.Unscoped().
			Select("id", "route_id", "deleted_at").
			First(&existing, "id = ?", stepID).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			continue
		}
		if err != nil {
			return fmt.Errorf("%w: failed to validate steps[%d].id: %v", ErrInvalidProductionRoute, index, err)
		}

		if isCreate || !strings.EqualFold(strings.TrimSpace(existing.RouteID), strings.TrimSpace(routeID)) {
			return fmt.Errorf("%w: steps[%d].id belongs to another route", ErrInvalidProductionRoute, index)
		}
		if existing.DeletedAt.Valid {
			return fmt.Errorf("%w: steps[%d].id refers to a deleted route step", ErrInvalidProductionRoute, index)
		}
	}

	return nil
}

func productionRouteHasDownstreamReferences(tx *gorm.DB, routeID string, stepIDs []string) (bool, string, error) {
	references := []struct {
		table       string
		condition   string
		arguments   func() []interface{}
		description string
	}{
		{
			table:       "product_barcode_states",
			condition:   "route_id = ? OR route_step_id IN ?",
			arguments:   func() []interface{} { return []interface{}{routeID, stepIDs} },
			description: "product barcode states",
		},
		{
			table:       "product_barcode_state_events",
			condition:   "route_id = ? OR route_step_id IN ?",
			arguments:   func() []interface{} { return []interface{}{routeID, stepIDs} },
			description: "product barcode state events",
		},
		{
			table:       "product_barcode_transfer_events",
			condition:   "route_id = ? OR from_route_step_id IN ? OR to_route_step_id IN ?",
			arguments:   func() []interface{} { return []interface{}{routeID, stepIDs, stepIDs} },
			description: "product barcode transfer events",
		},
		{
			table:       "production_operation_executions",
			condition:   "route_id = ? OR route_step_id IN ?",
			arguments:   func() []interface{} { return []interface{}{routeID, stepIDs} },
			description: "production operation executions",
		},
		{
			table:       "production_outsource_transfers",
			condition:   "route_id = ? OR route_step_id IN ?",
			arguments:   func() []interface{} { return []interface{}{routeID, stepIDs} },
			description: "outsource transfers",
		},
		{
			table:       "production_outsource_inspections",
			condition:   "route_id = ? OR route_step_id IN ?",
			arguments:   func() []interface{} { return []interface{}{routeID, stepIDs} },
			description: "outsource inspections",
		},
	}

	for _, reference := range references {
		if !tx.Migrator().HasTable(reference.table) {
			continue
		}

		var count int64
		query := tx.Table(reference.table).Where(reference.condition, reference.arguments()...)
		if err := query.Count(&count).Error; err != nil {
			return false, "", err
		}
		if count > 0 {
			return true, reference.description, nil
		}
	}

	return false, "", nil
}
