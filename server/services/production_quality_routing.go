package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	ProductionQualityDispositionAccept     = "ACCEPT"
	ProductionQualityDispositionConcession = "CONCESSION"
	ProductionQualityDispositionRework     = "REWORK"
	ProductionQualityDispositionScrap      = "SCRAP"
)

type productionQualityRoutingTarget struct {
	TargetRouteStepID string `json:"targetRouteStepId,omitempty"`
}

type productionQualityRouting map[string]productionQualityRoutingTarget

func normalizeProductionRouteQualityRoutingForRouteDTO(route *ProductionRouteDTO) error {
	for index := range route.Steps {
		normalized, err := normalizeProductionQualityRouting(route.Steps[index].QualityRouting, route.Steps)
		if err != nil {
			return fmt.Errorf("%w: steps[%d].qualityRouting %v", ErrInvalidProductionRoute, index, err)
		}
		route.Steps[index].QualityRouting = normalized
	}
	return nil
}

func validateProductionRouteQualityRoutingDTO(route ProductionRouteDTO) error {
	for index, step := range route.Steps {
		if _, err := normalizeProductionQualityRouting(step.QualityRouting, route.Steps); err != nil {
			return fmt.Errorf("%w: steps[%d].qualityRouting %v", ErrInvalidProductionRoute, index, err)
		}
	}
	return nil
}

func normalizeProductionQualityRouting(raw json.RawMessage, steps []ProductionRouteStepDTO) (json.RawMessage, error) {
	routing, err := parseProductionQualityRouting(raw)
	if err != nil {
		return nil, err
	}
	if len(routing) == 0 {
		return nil, nil
	}
	if err := validateProductionQualityRoutingTargets(routing, steps); err != nil {
		return nil, err
	}
	canonical, err := json.Marshal(routing)
	if err != nil {
		return nil, err
	}
	return canonical, nil
}

func parseProductionQualityRouting(raw json.RawMessage) (productionQualityRouting, error) {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || trimmed == "null" || trimmed == "{}" {
		return productionQualityRouting{}, nil
	}

	var payload map[string]json.RawMessage
	if err := json.Unmarshal([]byte(trimmed), &payload); err != nil {
		return nil, fmt.Errorf("must be a JSON object")
	}

	routing := make(productionQualityRouting)
	for rawDisposition, targetRaw := range payload {
		disposition := normalizeProductionQualityDisposition(rawDisposition)
		if !isSupportedProductionQualityDisposition(disposition) {
			return nil, fmt.Errorf("unsupported disposition %s", rawDisposition)
		}

		target, err := parseProductionQualityRoutingTarget(targetRaw)
		if err != nil {
			return nil, fmt.Errorf("%s target %v", disposition, err)
		}
		if target.isEmpty() {
			continue
		}
		routing[disposition] = target
	}
	return routing, nil
}

func parseProductionQualityRoutingTarget(raw json.RawMessage) (productionQualityRoutingTarget, error) {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || trimmed == "null" {
		return productionQualityRoutingTarget{}, nil
	}
	if strings.HasPrefix(trimmed, `"`) {
		var routeStepID string
		if err := json.Unmarshal([]byte(trimmed), &routeStepID); err != nil {
			return productionQualityRoutingTarget{}, fmt.Errorf("must be a route step id or target object")
		}
		return productionQualityRoutingTarget{
			TargetRouteStepID: strings.TrimSpace(routeStepID),
		}, nil
	}
	var targetFields map[string]json.RawMessage
	if err := json.Unmarshal([]byte(trimmed), &targetFields); err != nil {
		return productionQualityRoutingTarget{}, fmt.Errorf("must be a route step id or target object")
	}
	for field := range targetFields {
		if field != "targetRouteStepId" {
			return productionQualityRoutingTarget{}, fmt.Errorf("unsupported target field %s", field)
		}
	}

	var target productionQualityRoutingTarget
	if err := json.Unmarshal([]byte(trimmed), &target); err != nil {
		return productionQualityRoutingTarget{}, fmt.Errorf("must be a route step id or target object")
	}
	target.TargetRouteStepID = strings.TrimSpace(target.TargetRouteStepID)
	return target, nil
}

func validateProductionQualityRoutingTargets(routing productionQualityRouting, steps []ProductionRouteStepDTO) error {
	stepsByID := make(map[string]ProductionRouteStepDTO, len(steps))
	for _, step := range steps {
		stepID := strings.TrimSpace(step.ID)
		if stepID != "" {
			stepsByID[stepID] = step
		}
	}

	for disposition, target := range routing {
		switch {
		case target.TargetRouteStepID != "":
			_, ok := stepsByID[target.TargetRouteStepID]
			if !ok {
				return fmt.Errorf("%s targetRouteStepId does not belong to this route", disposition)
			}
		default:
			return fmt.Errorf("%s targetRouteStepId is required", disposition)
		}
	}
	return nil
}

func resolveProductionQualityRoutingTargetForDispositionTx(
	tx *gorm.DB,
	currentRouteStepID string,
	disposition string,
) (productionQualityRoutingTarget, bool, error) {
	currentStep, err := loadProductionRouteStepTx(tx, currentRouteStepID)
	if err != nil {
		return productionQualityRoutingTarget{}, false, err
	}

	routing, err := parseProductionQualityRouting(json.RawMessage(currentStep.QualityRouting))
	if err != nil {
		return productionQualityRoutingTarget{}, false, fmt.Errorf("invalid qualityRouting on routeStepId %s: %w", currentStep.ID, err)
	}
	target, ok := routing[normalizeProductionQualityDisposition(disposition)]
	if !ok || target.isEmpty() {
		return productionQualityRoutingTarget{}, false, nil
	}

	targetStep, found, err := resolveProductionQualityRoutingTargetStepTx(tx, currentStep.RouteID, target)
	if err != nil {
		return productionQualityRoutingTarget{}, false, err
	}
	if !found {
		return productionQualityRoutingTarget{}, false, nil
	}
	return productionQualityRoutingTarget{
		TargetRouteStepID: targetStep.ID,
	}, true, nil
}

func resolveProductionQualityRoutingTargetStepTx(
	tx *gorm.DB,
	routeID string,
	target productionQualityRoutingTarget,
) (models.ProductionRouteStep, bool, error) {
	routeID = strings.TrimSpace(routeID)
	target.TargetRouteStepID = strings.TrimSpace(target.TargetRouteStepID)
	if routeID == "" || target.TargetRouteStepID == "" {
		return models.ProductionRouteStep{}, false, nil
	}

	step, err := loadProductionRouteStepTx(tx, target.TargetRouteStepID)
	if err != nil {
		return models.ProductionRouteStep{}, false, err
	}
	if step.RouteID != routeID {
		return models.ProductionRouteStep{}, false, fmt.Errorf("%w: targetRouteStepId does not belong to routeId", ErrInvalidProductionScanCommand)
	}
	return step, true, nil
}

func normalizeProductionQualityDisposition(value string) string {
	return strings.ToUpper(strings.TrimSpace(value))
}

func isSupportedProductionQualityDisposition(value string) bool {
	switch normalizeProductionQualityDisposition(value) {
	case ProductionQualityDispositionAccept,
		ProductionQualityDispositionConcession,
		ProductionQualityDispositionRework,
		ProductionQualityDispositionScrap:
		return true
	default:
		return false
	}
}

func (target productionQualityRoutingTarget) isEmpty() bool {
	return strings.TrimSpace(target.TargetRouteStepID) == ""
}
