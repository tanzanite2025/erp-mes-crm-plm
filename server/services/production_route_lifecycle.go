package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	productionRouteStatusDraft     = "DRAFT"
	productionRouteStatusPublished = "PUBLISHED"
	productionRouteStatusArchived  = "ARCHIVED"
)

func validateProductionRouteStatusTransition(currentStatus string, requestedStatus string, isCreate bool) error {
	currentStatus = strings.ToUpper(strings.TrimSpace(currentStatus))
	requestedStatus = strings.ToUpper(strings.TrimSpace(requestedStatus))

	if isCreate {
		if requestedStatus != productionRouteStatusDraft && requestedStatus != productionRouteStatusPublished {
			return fmt.Errorf("%w: new routes must start as DRAFT or PUBLISHED", ErrInvalidProductionRouteStatus)
		}
		return nil
	}

	switch currentStatus {
	case productionRouteStatusDraft:
		if requestedStatus != productionRouteStatusDraft && requestedStatus != productionRouteStatusPublished {
			return fmt.Errorf("%w: DRAFT routes can only remain DRAFT or become PUBLISHED", ErrInvalidProductionRouteStatus)
		}
	case productionRouteStatusPublished:
		if requestedStatus != productionRouteStatusArchived {
			return fmt.Errorf("%w: PUBLISHED routes can only become ARCHIVED", ErrProductionRouteImmutable)
		}
	case productionRouteStatusArchived:
		return fmt.Errorf("%w: ARCHIVED routes are read-only", ErrProductionRouteImmutable)
	default:
		return fmt.Errorf("%w: unsupported current route status %q", ErrInvalidProductionRouteStatus, currentStatus)
	}

	return nil
}

func validatePublishedRouteArchival(existing models.ProductionRoute, requested models.ProductionRoute) error {
	if !sameProductionRouteHeader(existing, requested) {
		return fmt.Errorf("%w: archiving a published route cannot change route fields", ErrProductionRouteImmutable)
	}

	if len(existing.Steps) != len(requested.Steps) {
		return fmt.Errorf("%w: archiving a published route cannot add or remove route steps", ErrProductionRouteImmutable)
	}

	existingSteps := make(map[string]models.ProductionRouteStep, len(existing.Steps))
	for _, step := range existing.Steps {
		existingSteps[strings.TrimSpace(step.ID)] = step
	}

	for _, requestedStep := range requested.Steps {
		stepID := strings.TrimSpace(requestedStep.ID)
		if stepID == "" || strings.HasPrefix(stepID, "temp-") {
			return fmt.Errorf("%w: published route steps must retain their existing IDs", ErrProductionRouteImmutable)
		}

		existingStep, ok := existingSteps[stepID]
		if !ok || !sameProductionRouteStepDefinition(existingStep, requestedStep) {
			return fmt.Errorf("%w: published route steps are immutable", ErrProductionRouteImmutable)
		}
	}

	return nil
}

func sameProductionRouteHeader(left models.ProductionRoute, right models.ProductionRoute) bool {
	return strings.TrimSpace(left.Code) == strings.TrimSpace(right.Code) &&
		strings.TrimSpace(left.Name) == strings.TrimSpace(right.Name) &&
		strings.TrimSpace(left.ProductID) == strings.TrimSpace(right.ProductID) &&
		strings.TrimSpace(left.ProductName) == strings.TrimSpace(right.ProductName) &&
		strings.TrimSpace(left.ProductTemplateID) == strings.TrimSpace(right.ProductTemplateID) &&
		strings.TrimSpace(left.Description) == strings.TrimSpace(right.Description)
}

func sameProductionRouteStepDefinition(left models.ProductionRouteStep, right models.ProductionRouteStep) bool {
	return strings.TrimSpace(left.ID) == strings.TrimSpace(right.ID) &&
		left.Sequence == right.Sequence &&
		strings.TrimSpace(left.SegmentID) == strings.TrimSpace(right.SegmentID) &&
		strings.TrimSpace(left.ProcessStepID) == strings.TrimSpace(right.ProcessStepID) &&
		strings.ToUpper(strings.TrimSpace(left.ExecutionMode)) == strings.ToUpper(strings.TrimSpace(right.ExecutionMode)) &&
		strings.ToUpper(strings.TrimSpace(left.QualityGate)) == strings.ToUpper(strings.TrimSpace(right.QualityGate)) &&
		canonicalProductionRouteJSON([]byte(left.QualityRouting)) == canonicalProductionRouteJSON([]byte(right.QualityRouting)) &&
		left.EstimatedMinutes == right.EstimatedMinutes &&
		left.TransferRequired == right.TransferRequired &&
		strings.TrimSpace(left.Description) == strings.TrimSpace(right.Description)
}

func canonicalProductionRouteJSON(value json.RawMessage) string {
	trimmed := bytes.TrimSpace(value)
	if len(trimmed) == 0 || bytes.Equal(trimmed, []byte("null")) {
		return ""
	}

	var decoded interface{}
	if err := json.Unmarshal(trimmed, &decoded); err != nil {
		return string(trimmed)
	}
	canonical, err := json.Marshal(decoded)
	if err != nil {
		return string(trimmed)
	}
	return string(canonical)
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
