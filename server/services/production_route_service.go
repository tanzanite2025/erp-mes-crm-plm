package services

import (
	"fmt"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func ListProductionRoutes() ([]ProductionRouteDTO, error) {
	return defaultProductionService.ListProductionRoutes()
}

func SaveProductionRoute(req SaveProductionRouteRequest) (ProductionRouteDTO, error) {
	return defaultProductionService.SaveProductionRoute(req)
}

func DeleteProductionRoute(id string, operator string, ip string) error {
	return defaultProductionService.DeleteProductionRoute(id, operator, ip)
}

func (s *ProductionService) ListProductionRoutes() ([]ProductionRouteDTO, error) {
	routes, err := s.repository.ListProductionRoutes(s.txManager.DB())
	if err != nil {
		return nil, err
	}
	return mapProductionRoutesToDTO(routes), nil
}

func (s *ProductionService) SaveProductionRoute(req SaveProductionRouteRequest) (ProductionRouteDTO, error) {
	normalizedRoute := normalizeProductionRouteDTO(req.Route)
	if err := normalizeProductionRouteQualityRoutingForRouteDTO(&normalizedRoute); err != nil {
		return ProductionRouteDTO{}, err
	}
	if err := validateProductionRouteDTO(normalizedRoute); err != nil {
		return ProductionRouteDTO{}, err
	}

	route := mapProductionRouteDTOToModel(normalizedRoute)
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if err := validateProductionRouteReferences(tx, route.Steps); err != nil {
			return err
		}
		if err := validateProductionRouteStepIdentities(
			tx,
			route.ID,
			route.Steps,
			route.ID == "" || strings.HasPrefix(route.ID, "temp-"),
		); err != nil {
			return err
		}

		var before *ProductionRouteDTO
		auditAction := audit.AuditActionCreate
		if route.ID != "" && !strings.HasPrefix(route.ID, "temp-") {
			existing, err := s.repository.GetProductionRouteByID(tx, route.ID)
			if err != nil {
				return err
			}
			if existing.Version != route.Version {
				return ErrProductionRouteVersionConflict
			}
			if err := validateProductionRouteStatusTransition(existing.Status, route.Status, false); err != nil {
				return err
			}
			if strings.EqualFold(existing.Status, productionRouteStatusPublished) &&
				strings.EqualFold(route.Status, productionRouteStatusArchived) {
				if err := validatePublishedRouteArchival(existing, route); err != nil {
					return err
				}
			}
			beforeDTO := mapProductionRouteToDTO(existing)
			before = &beforeDTO
			auditAction = audit.AuditActionUpdate

			if strings.EqualFold(existing.Status, productionRouteStatusDraft) {
				stepIDs := collectProductionRouteStepIDs(route.Steps)
				if err := s.repository.DeleteProductionRouteStepsNotIn(tx, route.ID, stepIDs); err != nil {
					return err
				}
			}

			updated, err := s.repository.BumpProductionRouteVersion(tx, route.ID, route.Version)
			if err != nil {
				return err
			}
			if !updated {
				return ErrProductionRouteVersionConflict
			}
			route.Version++
		} else {
			if err := validateProductionRouteStatusTransition("", route.Status, true); err != nil {
				return err
			}
			route.Version = 1
		}

		if err := s.repository.SaveProductionRoute(tx, &route); err != nil {
			return err
		}

		after := mapProductionRouteToDTO(route)
		event := audit.NewAuditEvent(
			audit.AuditEntityProductionRoute,
			route.ID,
			auditAction,
			audit.AuditActor{
				Username: strings.TrimSpace(req.Operator),
				IP:       strings.TrimSpace(req.IP),
				Source:   "http",
			},
		)
		if before != nil {
			event = event.WithChanges(audit.DiffModelValues(*before, after)...)
		}
		return recordAuditEventTx(tx, event.Normalize())
	})
	return mapProductionRouteToDTO(route), err
}

func (s *ProductionService) DeleteProductionRoute(id string, operator string, ip string) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		existing, err := s.repository.GetProductionRouteByID(tx, id)
		if err != nil {
			return err
		}
		if !strings.EqualFold(existing.Status, productionRouteStatusDraft) {
			return fmt.Errorf("%w: only DRAFT routes can be deleted", ErrProductionRouteImmutable)
		}

		stepIDs := collectProductionRouteStepIDs(existing.Steps)
		hasReferences, description, err := productionRouteHasDownstreamReferences(tx, id, stepIDs)
		if err != nil {
			return err
		}
		if hasReferences {
			return fmt.Errorf("%w: route is referenced by %s", ErrProductionRouteDeleteBlocked, description)
		}

		if err := s.repository.DeleteProductionRoute(tx, id); err != nil {
			return err
		}
		if err := recordAuditEventTx(tx, audit.NewAuditEvent(audit.AuditEntityProductionRoute, id, audit.AuditActionDelete, audit.AuditActor{
			Username: strings.TrimSpace(operator),
			IP:       strings.TrimSpace(ip),
			Source:   "http",
		}).Normalize()); err != nil {
			return err
		}
		return nil
	})
}

func normalizeProductionRouteDTO(route ProductionRouteDTO) ProductionRouteDTO {
	route.Code = strings.TrimSpace(route.Code)
	route.Name = strings.TrimSpace(route.Name)
	route.ProductID = strings.TrimSpace(route.ProductID)
	route.ProductName = strings.TrimSpace(route.ProductName)
	route.ProductTemplateID = strings.TrimSpace(route.ProductTemplateID)
	route.Description = strings.TrimSpace(route.Description)
	route.Status = strings.ToUpper(strings.TrimSpace(route.Status))
	if route.Status == "" {
		route.Status = "DRAFT"
	}

	for index := range route.Steps {
		route.Steps[index].RouteID = route.ID
		route.Steps[index].ProcessStepID = strings.TrimSpace(route.Steps[index].ProcessStepID)
		route.Steps[index].SegmentID = strings.TrimSpace(route.Steps[index].SegmentID)
		route.Steps[index].ExecutionMode = strings.ToUpper(strings.TrimSpace(route.Steps[index].ExecutionMode))
		if route.Steps[index].ExecutionMode == "" {
			route.Steps[index].ExecutionMode = "IN_HOUSE"
		}
		route.Steps[index].QualityGate = strings.ToUpper(strings.TrimSpace(route.Steps[index].QualityGate))
		if route.Steps[index].QualityGate == "" {
			route.Steps[index].QualityGate = "NONE"
		}
		route.Steps[index].QualityRouting = cloneRawMessage(route.Steps[index].QualityRouting)
		route.Steps[index].Description = strings.TrimSpace(route.Steps[index].Description)
		if route.Steps[index].Sequence <= 0 {
			route.Steps[index].Sequence = index + 1
		}
	}

	return route
}

func validateProductionRouteDTO(route ProductionRouteDTO) error {
	if route.Code == "" {
		return fmt.Errorf("%w: code is required", ErrInvalidProductionRoute)
	}
	if route.Name == "" {
		return fmt.Errorf("%w: name is required", ErrInvalidProductionRoute)
	}
	if route.Status != "DRAFT" && route.Status != "PUBLISHED" && route.Status != "ARCHIVED" {
		return fmt.Errorf("%w: unsupported status %s", ErrInvalidProductionRoute, route.Status)
	}
	if route.Status == "PUBLISHED" && len(route.Steps) == 0 {
		return fmt.Errorf("%w: published route requires at least one step", ErrInvalidProductionRoute)
	}

	for index, step := range route.Steps {
		if step.ProcessStepID == "" {
			return fmt.Errorf("%w: steps[%d].processStepId is required", ErrInvalidProductionRoute, index)
		}
		if step.SegmentID == "" {
			return fmt.Errorf("%w: steps[%d].segmentId is required", ErrInvalidProductionRoute, index)
		}
		if step.ExecutionMode != "IN_HOUSE" && step.ExecutionMode != "OUTSOURCE_ALLOWED" && step.ExecutionMode != "OUTSOURCE_REQUIRED" {
			return fmt.Errorf("%w: unsupported steps[%d].executionMode %s", ErrInvalidProductionRoute, index, step.ExecutionMode)
		}
		if step.ExecutionMode != "IN_HOUSE" && !step.TransferRequired {
			return fmt.Errorf("%w: steps[%d].transferRequired must be true for outsourced execution", ErrInvalidProductionRoute, index)
		}
		if step.QualityGate != "NONE" && step.QualityGate != "OPTIONAL" && step.QualityGate != "REQUIRED" {
			return fmt.Errorf("%w: unsupported steps[%d].qualityGate %s", ErrInvalidProductionRoute, index, step.QualityGate)
		}
	}
	if err := validateProductionRouteQualityRoutingDTO(route); err != nil {
		return err
	}

	return nil
}

func validateProductionRouteReferences(tx *gorm.DB, steps []models.ProductionRouteStep) error {
	for index, step := range steps {
		var processCount int64
		if err := tx.Model(&models.ProcessStep{}).
			Where("id = ?", step.ProcessStepID).
			Count(&processCount).Error; err != nil {
			return fmt.Errorf("%w: failed to validate steps[%d].processStepId: %v", ErrInvalidProductionRoute, index, err)
		}
		if processCount == 0 {
			return fmt.Errorf("%w: steps[%d].processStepId does not exist", ErrInvalidProductionRoute, index)
		}

		var segmentCount int64
		if err := tx.Model(&models.LineSegment{}).
			Where("id = ?", step.SegmentID).
			Count(&segmentCount).Error; err != nil {
			return fmt.Errorf("%w: failed to validate steps[%d].segmentId: %v", ErrInvalidProductionRoute, index, err)
		}
		if segmentCount == 0 {
			return fmt.Errorf("%w: steps[%d].segmentId does not exist", ErrInvalidProductionRoute, index)
		}

		var mappingCount int64
		if err := tx.Table("line_segment_process_mappings").
			Where("line_segment_id = ? AND process_step_id = ?", step.SegmentID, step.ProcessStepID).
			Count(&mappingCount).Error; err != nil {
			return fmt.Errorf("%w: failed to validate steps[%d] segment-process mapping: %v", ErrInvalidProductionRoute, index, err)
		}
		if mappingCount == 0 {
			return fmt.Errorf("%w: steps[%d] process is not mapped to the selected segment", ErrInvalidProductionRoute, index)
		}
	}

	return nil
}

func collectProductionRouteStepIDs(steps []models.ProductionRouteStep) []string {
	stepIDs := make([]string, 0, len(steps))
	for _, step := range steps {
		if step.ID != "" && !strings.HasPrefix(step.ID, "temp-") {
			stepIDs = append(stepIDs, step.ID)
		}
	}
	return stepIDs
}
