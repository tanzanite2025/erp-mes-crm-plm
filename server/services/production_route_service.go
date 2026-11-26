package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func ListProductionRoutes() ([]ProductionRouteDTO, error) {
	return defaultProductionService.ListProductionRoutes()
}

func SaveProductionRoute(req SaveProductionRouteRequest) (ProductionRouteDTO, error) {
	return defaultProductionService.SaveProductionRoute(req)
}

func PublishProductionRoute(id string, version int64, operator string, ip string) (ProductionRouteDTO, error) {
	return defaultProductionService.PublishProductionRoute(id, version, operator, ip)
}

func CreateProductionRouteRevision(id string, operator string, ip string) (ProductionRouteDTO, error) {
	return defaultProductionService.CreateProductionRouteRevision(id, operator, ip)
}

func DeleteProductionRoute(id string, operator string, ip string) error {
	return defaultProductionService.DeleteProductionRoute(id, operator, ip)
}

func (s *ProductionService) lockProductionRouteFamilyAndRevisionTx(
	tx *gorm.DB,
	routeID string,
) (models.ProductionRouteFamily, models.ProductionRoute, error) {
	var routeIdentity models.ProductionRoute
	if err := tx.Select("route_family_id").First(&routeIdentity, "id = ?", routeID).Error; err != nil {
		return models.ProductionRouteFamily{}, models.ProductionRoute{}, err
	}

	var family models.ProductionRouteFamily
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&family, "id = ?", routeIdentity.RouteFamilyID).Error; err != nil {
		return models.ProductionRouteFamily{}, models.ProductionRoute{}, err
	}

	route, err := s.repository.GetProductionRouteByID(tx.Clauses(clause.Locking{Strength: "UPDATE"}), routeID)
	if err != nil {
		return models.ProductionRouteFamily{}, models.ProductionRoute{}, err
	}
	return family, route, nil
}

func (s *ProductionService) ListProductionRoutes() ([]ProductionRouteDTO, error) {
	routes, err := s.repository.ListProductionRoutes(s.txManager.DB())
	if err != nil {
		return nil, err
	}
	lineIDs := make([]uint, 0, len(routes))
	for _, route := range routes {
		lineID := productionRouteSalesOrderLineID(route.SalesOrderLineID)
		if lineID != 0 {
			lineIDs = append(lineIDs, lineID)
		}
	}
	lineRouteModes := make(map[uint]string, len(lineIDs))
	if len(lineIDs) > 0 {
		var lines []models.SalesOrderLine
		if err := s.txManager.DB().Select("id", "production_route_mode").Where("id IN ?", lineIDs).Find(&lines).Error; err != nil {
			return nil, fmt.Errorf("failed to load production route order line modes: %w", err)
		}
		for _, line := range lines {
			lineRouteModes[line.ID] = strings.ToUpper(strings.TrimSpace(line.ProductionRouteMode))
		}
	}
	branches, err := s.ListProductionRouteBOMBranches()
	if err != nil {
		return nil, err
	}
	availableBranches := make(map[productionRouteBOMBranchIdentity]struct{}, len(branches))
	for _, branch := range branches {
		availableBranches[productionRouteBOMBranchIdentity{
			ProductID:          strings.TrimSpace(branch.ProductID),
			BOMOwnerType:       strings.ToUpper(strings.TrimSpace(branch.BOMOwnerType)),
			BOMOwnerCustomerID: strings.TrimSpace(branch.BOMOwnerCustomerID),
			BOMVersionLevel:    strings.TrimSpace(branch.BOMVersionLevel),
		}] = struct{}{}
	}

	currentRoutes := make([]models.ProductionRoute, 0, len(routes))
	for _, route := range routes {
		status := strings.ToUpper(strings.TrimSpace(route.Status))
		if status != productionRouteStatusDraft && status != productionRouteStatusPublished {
			continue
		}
		if strings.ToUpper(strings.TrimSpace(route.ScopeType)) != productionRouteScopeSalesOrderLine {
			continue
		}
		if lineRouteModes[productionRouteSalesOrderLineID(route.SalesOrderLineID)] != "CUSTOM" {
			continue
		}
		if _, exists := availableBranches[productionRouteBOMBranchIdentityFromModel(route)]; !exists {
			continue
		}
		if !productionRouteHasValidProcessSteps(route) {
			continue
		}
		currentRoutes = append(currentRoutes, route)
	}
	dtos := mapProductionRoutesToDTO(currentRoutes)
	if err := addProductionRouteSalesOrderLineDetails(s.txManager.DB(), dtos); err != nil {
		return nil, err
	}
	return dtos, nil
}

func (s *ProductionService) PublishProductionRoute(id string, version int64, operator string, ip string) (ProductionRouteDTO, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return ProductionRouteDTO{}, fmt.Errorf("%w: route id is required", ErrInvalidProductionRoute)
	}
	if version <= 0 {
		return ProductionRouteDTO{}, ErrProductionRouteVersionConflict
	}

	var publishedRoute ProductionRouteDTO
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		family, route, err := s.lockProductionRouteFamilyAndRevisionTx(tx, id)
		if err != nil {
			return err
		}
		if err := validateProductionRouteFamilyBranch(family, route); err != nil {
			return err
		}
		if route.Version != version {
			return ErrProductionRouteVersionConflict
		}
		if !strings.EqualFold(route.Status, productionRouteStatusDraft) {
			return fmt.Errorf("%w: only DRAFT routes can be published", ErrProductionRouteImmutable)
		}

		before := mapProductionRouteToDTO(route)
		if err := validateProductionRouteBOMBranchIdentity(route); err != nil {
			return err
		}
		if err := hydrateProductionRouteBOMBranch(tx, &route); err != nil {
			return err
		}
		if err := validateProductionRouteScopeReferenceTx(tx, route); err != nil {
			return err
		}
		if err := resolveConfiguredProductionRouteProcessesTx(tx, &route); err != nil {
			return err
		}
		if err := validateProductionRouteReferences(tx, route); err != nil {
			return err
		}
		if err := validateProductionRouteDTO(mapProductionRouteToDTO(route)); err != nil {
			return err
		}
		for index := range route.Steps {
			var processStep models.ProcessStep
			if err := tx.First(&processStep, "id = ?", route.Steps[index].ProcessStepID).Error; err != nil {
				return fmt.Errorf("%w: route step %s has no process step to snapshot", ErrInvalidProductionRoute, route.Steps[index].ID)
			}
			route.Steps[index].ProcessStep = &processStep
			route.Steps[index].ProcessNameSnapshot = strings.TrimSpace(processStep.Name)
			route.Steps[index].ProcessDescriptionSnapshot = processStep.Description
			if err := tx.Model(&models.ProductionRouteStep{}).Where("id = ?", route.Steps[index].ID).Updates(map[string]interface{}{
				"process_name_snapshot":        route.Steps[index].ProcessNameSnapshot,
				"process_description_snapshot": route.Steps[index].ProcessDescriptionSnapshot,
			}).Error; err != nil {
				return fmt.Errorf("failed to snapshot route step %s: %w", route.Steps[index].ID, err)
			}
		}

		result := tx.Model(&models.ProductionRoute{}).
			Where("id = ? AND version = ? AND status = ?", id, version, productionRouteStatusDraft).
			Updates(map[string]interface{}{
				"status":  productionRouteStatusPublished,
				"version": gorm.Expr("version + 1"),
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrProductionRouteVersionConflict
		}
		if err := tx.Model(&models.ProductionRouteFamily{}).Where("id = ?", family.ID).
			Update("current_revision_id", route.ID).Error; err != nil {
			return fmt.Errorf("failed to select current production route revision: %w", err)
		}

		published, err := s.repository.GetProductionRouteByID(tx, id)
		if err != nil {
			return err
		}
		publishedRoute = mapProductionRouteToDTO(published)
		return recordAuditEventTx(tx, audit.NewAuditEvent(
			audit.AuditEntityProductionRoute,
			id,
			audit.AuditActionStatus,
			audit.AuditActor{Username: strings.TrimSpace(operator), IP: strings.TrimSpace(ip), Source: "http"},
		).WithChanges(audit.DiffModelValues(before, publishedRoute)...).Normalize())
	})
	return publishedRoute, err
}

func (s *ProductionService) CreateProductionRouteRevision(id string, operator string, ip string) (ProductionRouteDTO, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return ProductionRouteDTO{}, fmt.Errorf("%w: route id is required", ErrInvalidProductionRoute)
	}

	var created ProductionRouteDTO
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		family, source, err := s.lockProductionRouteFamilyAndRevisionTx(tx, id)
		if err != nil {
			return err
		}
		if !strings.EqualFold(source.Status, productionRouteStatusPublished) || strings.TrimSpace(family.CurrentRevisionID) != source.ID {
			return fmt.Errorf("%w: only the current published revision can be copied", ErrProductionRouteRevisionConflict)
		}
		var draftCount int64
		if err := tx.Model(&models.ProductionRoute{}).Where("route_family_id = ? AND status = ?", family.ID, productionRouteStatusDraft).Count(&draftCount).Error; err != nil {
			return err
		}
		if draftCount > 0 {
			return fmt.Errorf("%w: this route family already has an editable draft", ErrProductionRouteRevisionConflict)
		}
		var latestRevisionNo int
		if err := tx.Model(&models.ProductionRoute{}).Where("route_family_id = ?", family.ID).
			Select("COALESCE(MAX(revision_no), 0)").Scan(&latestRevisionNo).Error; err != nil {
			return err
		}

		newRevision := models.ProductionRoute{
			BaseModel:            models.BaseModel{ID: uuid.NewString()},
			RouteFamilyID:        family.ID,
			RevisionNo:           latestRevisionNo + 1,
			BasedOnRouteID:       productionRouteBasedOnRevisionIDPointer(source.ID),
			Code:                 family.Code,
			Name:                 source.Name,
			ProductID:            source.ProductID,
			ProductSKU:           source.ProductSKU,
			ProductName:          source.ProductName,
			BOMOwnerType:         source.BOMOwnerType,
			BOMOwnerCustomerID:   source.BOMOwnerCustomerID,
			BOMOwnerCustomerName: source.BOMOwnerCustomerName,
			BOMVersionLevel:      source.BOMVersionLevel,
			ScopeType:            family.ScopeType,
			SalesOrderLineID:     productionRouteSalesOrderLineIDPointer(productionRouteFamilySalesOrderLineID(family)),
			Description:          source.Description,
			Version:              1,
			Status:               productionRouteStatusDraft,
			RouteFamily:          &family,
		}
		newStepIDs := make(map[string]string, len(source.Steps))
		for _, sourceStep := range source.Steps {
			newStepIDs[strings.TrimSpace(sourceStep.ID)] = uuid.NewString()
		}
		for _, sourceStep := range source.Steps {
			routing, err := parseProductionQualityRouting(json.RawMessage(sourceStep.QualityRouting))
			if err != nil {
				return fmt.Errorf("%w: source route step %s has invalid quality routing: %v", ErrInvalidProductionRoute, sourceStep.ID, err)
			}
			for disposition, target := range routing {
				newTargetID, exists := newStepIDs[strings.TrimSpace(target.TargetRouteStepID)]
				if !exists {
					return fmt.Errorf("%w: source route step %s targets a step outside its revision", ErrInvalidProductionRoute, sourceStep.ID)
				}
				target.TargetRouteStepID = newTargetID
				routing[disposition] = target
			}
			routingJSON, err := json.Marshal(routing)
			if err != nil {
				return err
			}
			newRevision.Steps = append(newRevision.Steps, models.ProductionRouteStep{
				BaseModel:                  models.BaseModel{ID: newStepIDs[strings.TrimSpace(sourceStep.ID)]},
				Sequence:                   sourceStep.Sequence,
				ProcessStepID:              sourceStep.ProcessStepID,
				ProcessNameSnapshot:        sourceStep.ProcessNameSnapshot,
				ProcessDescriptionSnapshot: sourceStep.ProcessDescriptionSnapshot,
				ExecutionMode:              sourceStep.ExecutionMode,
				QualityGate:                sourceStep.QualityGate,
				QualityRouting:             datatypes.JSON(routingJSON),
				EstimatedMinutes:           sourceStep.EstimatedMinutes,
				TransferRequired:           sourceStep.TransferRequired,
				Description:                sourceStep.Description,
			})
		}
		if err := validateProductionRouteReferences(tx, newRevision); err != nil {
			return err
		}
		if err := validateProductionRouteScopeReferenceTx(tx, newRevision); err != nil {
			return err
		}
		if err := resolveConfiguredProductionRouteProcessesTx(tx, &newRevision); err != nil {
			return err
		}
		if err := s.repository.SaveProductionRoute(tx, &newRevision); err != nil {
			return err
		}
		saved, err := s.repository.GetProductionRouteByID(tx, newRevision.ID)
		if err != nil {
			return err
		}
		created = mapProductionRouteToDTO(saved)
		return recordAuditEventTx(tx, audit.NewAuditEvent(
			audit.AuditEntityProductionRoute,
			created.ID,
			audit.AuditActionCreate,
			audit.AuditActor{Username: strings.TrimSpace(operator), IP: strings.TrimSpace(ip), Source: "http"},
		).WithChanges(audit.AuditChange{Field: "basedOnRouteId", OldValue: "", NewValue: source.ID}).Normalize())
	})
	return created, err
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
		var before *ProductionRouteDTO
		auditAction := audit.AuditActionCreate
		if route.ID != "" && !strings.HasPrefix(route.ID, "temp-") {
			family, existing, err := s.lockProductionRouteFamilyAndRevisionTx(tx, route.ID)
			if err != nil {
				return err
			}
			if err := validateProductionRouteStepIdentities(tx, route.ID, route.Steps, false); err != nil {
				return err
			}
			if route.RouteFamilyID != "" && strings.TrimSpace(route.RouteFamilyID) != strings.TrimSpace(existing.RouteFamilyID) {
				return fmt.Errorf("%w: route family identity cannot be changed", ErrInvalidProductionRoute)
			}
			if route.RevisionNo != 0 && route.RevisionNo != existing.RevisionNo {
				return fmt.Errorf("%w: route revision number cannot be changed", ErrInvalidProductionRoute)
			}
			if route.ScopeType != strings.ToUpper(strings.TrimSpace(existing.ScopeType)) ||
				productionRouteSalesOrderLineID(route.SalesOrderLineID) != productionRouteSalesOrderLineID(existing.SalesOrderLineID) {
				return fmt.Errorf("%w: route scope cannot be changed; create a route family for the desired scope", ErrInvalidProductionRoute)
			}
			if requestedBasedOnRevisionID := productionRouteBasedOnRevisionID(route); requestedBasedOnRevisionID != "" &&
				requestedBasedOnRevisionID != productionRouteBasedOnRevisionID(existing) {
				return fmt.Errorf("%w: source route revision cannot be changed", ErrInvalidProductionRoute)
			}
			route.RouteFamilyID = existing.RouteFamilyID
			route.RevisionNo = existing.RevisionNo
			route.BasedOnRouteID = productionRouteBasedOnRevisionIDPointer(productionRouteBasedOnRevisionID(existing))
			route.RouteFamily = &family
			if existing.Version != route.Version {
				return ErrProductionRouteVersionConflict
			}
			if err := validateProductionRouteStatusTransition(existing.Status, route.Status, false); err != nil {
				return err
			}
			if err := validateProductionRouteFamilyBranch(family, route); err != nil {
				return err
			}
			if err := validateProductionRouteBOMBranchIdentity(route); err != nil {
				return err
			}
			if err := hydrateProductionRouteBOMBranch(tx, &route); err != nil {
				return err
			}
			if err := activateSalesOrderLineCustomProductionRouteTx(tx, route, req.Operator, req.IP); err != nil {
				return err
			}
			if err := validateProductionRouteScopeReferenceTx(tx, route); err != nil {
				return err
			}
			if err := resolveConfiguredProductionRouteProcessesTx(tx, &route); err != nil {
				return err
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
			if err := validateProductionRouteStepIdentities(tx, route.ID, route.Steps, true); err != nil {
				return err
			}
			if err := validateProductionRouteStatusTransition("", route.Status, true); err != nil {
				return err
			}
			if err := validateProductionRouteBOMBranchIdentity(route); err != nil {
				return err
			}
			if err := hydrateProductionRouteBOMBranch(tx, &route); err != nil {
				return err
			}
			if err := activateSalesOrderLineCustomProductionRouteTx(tx, route, req.Operator, req.IP); err != nil {
				return err
			}
			if err := validateProductionRouteScopeReferenceTx(tx, route); err != nil {
				return err
			}
			if err := resolveConfiguredProductionRouteProcessesTx(tx, &route); err != nil {
				return err
			}
			if err := createProductionRouteFamilyForDraftTx(tx, &route); err != nil {
				return err
			}
			route.Version = 1
		}
		if err := validateProductionRouteReferences(tx, route); err != nil {
			return err
		}

		if err := s.repository.SaveProductionRoute(tx, &route); err != nil {
			return err
		}
		savedRoute, err := s.repository.GetProductionRouteByID(tx, route.ID)
		if err != nil {
			return err
		}
		route = savedRoute

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
		_, existing, err := s.lockProductionRouteFamilyAndRevisionTx(tx, id)
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
		var remainingRevisions int64
		if err := tx.Model(&models.ProductionRoute{}).Where("route_family_id = ?", existing.RouteFamilyID).Count(&remainingRevisions).Error; err != nil {
			return err
		}
		if remainingRevisions == 0 {
			if err := tx.Unscoped().Delete(&models.ProductionRouteFamily{}, "id = ?", existing.RouteFamilyID).Error; err != nil {
				return err
			}
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
	route.ProductSKU = strings.TrimSpace(route.ProductSKU)
	route.ProductName = strings.TrimSpace(route.ProductName)
	route.BOMOwnerType = strings.ToUpper(strings.TrimSpace(route.BOMOwnerType))
	route.BOMOwnerCustomerID = strings.TrimSpace(route.BOMOwnerCustomerID)
	route.BOMOwnerCustomerName = strings.TrimSpace(route.BOMOwnerCustomerName)
	route.BOMVersionLevel = strings.TrimSpace(route.BOMVersionLevel)
	route.ScopeType = strings.ToUpper(strings.TrimSpace(route.ScopeType))
	if route.ScopeType == "" {
		route.ScopeType = productionRouteScopeBranchDefault
	}
	route.Description = strings.TrimSpace(route.Description)
	route.Status = strings.ToUpper(strings.TrimSpace(route.Status))
	if route.Status == "" {
		route.Status = "DRAFT"
	}

	for index := range route.Steps {
		route.Steps[index].RouteID = route.ID
		route.Steps[index].ProcessStepID = strings.TrimSpace(route.Steps[index].ProcessStepID)
		route.Steps[index].ExecutionMode = strings.ToUpper(strings.TrimSpace(route.Steps[index].ExecutionMode))
		if route.Steps[index].ExecutionMode == "" {
			route.Steps[index].ExecutionMode = "IN_HOUSE"
		}
		route.Steps[index].QualityGate = strings.ToUpper(strings.TrimSpace(route.Steps[index].QualityGate))
		if route.Steps[index].QualityGate == "" {
			route.Steps[index].QualityGate = "NONE"
		}
		route.Steps[index].QualityRouting = cloneProductionRouteQualityRoutingJSON(route.Steps[index].QualityRouting)
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
	if route.Status != productionRouteStatusDraft {
		return fmt.Errorf("%w: save routes as DRAFT and publish them through the publish action", ErrInvalidProductionRouteStatus)
	}
	if _, err := normalizeProductionRouteScope(route.ScopeType, route.SalesOrderLineID); err != nil {
		return err
	}
	if strings.ToUpper(strings.TrimSpace(route.ScopeType)) != productionRouteScopeSalesOrderLine {
		return fmt.Errorf("%w: default route revisions are generated from MBOM branch operations", ErrInvalidProductionRoute)
	}
	if len(route.Steps) == 0 {
		return fmt.Errorf("%w: at least one process step is required", ErrInvalidProductionRoute)
	}

	for index, step := range route.Steps {
		if strings.TrimSpace(step.ProcessStepID) == "" {
			return fmt.Errorf("%w: steps[%d].processStepId is required", ErrInvalidProductionRoute, index)
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

func validateProductionRouteScopeReferenceTx(tx *gorm.DB, route models.ProductionRoute) error {
	scopeType, err := normalizeProductionRouteScope(route.ScopeType, productionRouteSalesOrderLineID(route.SalesOrderLineID))
	if err != nil {
		return err
	}
	if scopeType == productionRouteScopeBranchDefault {
		return nil
	}

	var line models.SalesOrderLine
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&line, "id = ?", productionRouteSalesOrderLineID(route.SalesOrderLineID)).Error; err != nil {
		return fmt.Errorf("%w: selected sales order line does not exist", ErrInvalidProductionRoute)
	}
	if strings.TrimSpace(line.ProductID) != strings.TrimSpace(route.ProductID) {
		return fmt.Errorf("%w: selected sales order line product does not match the MBOM branch product", ErrInvalidProductionRoute)
	}
	if (productionRouteBOMBranchIdentity{
		ProductID:          strings.TrimSpace(line.ProductID),
		BOMOwnerType:       strings.ToUpper(strings.TrimSpace(line.BOMOwnerType)),
		BOMOwnerCustomerID: strings.TrimSpace(line.BOMOwnerCustomerID),
		BOMVersionLevel:    strings.TrimSpace(line.BOMVersionLevel),
	}) != productionRouteBOMBranchIdentityFromModel(route) {
		return fmt.Errorf("%w: selected sales order line MBOM branch does not match the route", ErrInvalidProductionRoute)
	}
	if !strings.EqualFold(strings.TrimSpace(line.ProductionRouteMode), "CUSTOM") {
		return fmt.Errorf("%w: select custom operations on the sales order line before creating its route", ErrInvalidProductionRoute)
	}
	return nil
}

func activateSalesOrderLineCustomProductionRouteTx(tx *gorm.DB, route models.ProductionRoute, operator string, ip string) error {
	lineID := productionRouteSalesOrderLineID(route.SalesOrderLineID)
	if lineID == 0 {
		return fmt.Errorf("%w: custom production routes require a sales order line", ErrInvalidProductionRoute)
	}
	var line models.SalesOrderLine
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&line, "id = ?", lineID).Error; err != nil {
		return fmt.Errorf("%w: selected sales order line does not exist", ErrInvalidProductionRoute)
	}
	if strings.TrimSpace(line.ProductID) != strings.TrimSpace(route.ProductID) {
		return fmt.Errorf("%w: selected sales order line product does not match the MBOM branch product", ErrInvalidProductionRoute)
	}
	if (productionRouteBOMBranchIdentity{
		ProductID:          strings.TrimSpace(line.ProductID),
		BOMOwnerType:       strings.ToUpper(strings.TrimSpace(line.BOMOwnerType)),
		BOMOwnerCustomerID: strings.TrimSpace(line.BOMOwnerCustomerID),
		BOMVersionLevel:    strings.TrimSpace(line.BOMVersionLevel),
	}) != productionRouteBOMBranchIdentityFromModel(route) {
		return fmt.Errorf("%w: selected sales order line MBOM branch does not match the route", ErrInvalidProductionRoute)
	}
	if strings.EqualFold(strings.TrimSpace(line.ProductionRouteMode), "CUSTOM") {
		return nil
	}
	if tx.Migrator().HasTable(&models.ProductionPlan{}) {
		var planCount int64
		if err := tx.Unscoped().Model(&models.ProductionPlan{}).
			Where("sales_order_line_id = ?", lineID).
			Count(&planCount).Error; err != nil {
			return fmt.Errorf("failed to check production plan references: %w", err)
		}
		if planCount > 0 {
			return ErrProductionSalesOrderLineRouteModeLocked
		}
	}
	if err := tx.Model(&line).Update("production_route_mode", "CUSTOM").Error; err != nil {
		return fmt.Errorf("failed to set sales order line to custom production operations: %w", err)
	}
	return recordAuditEventTx(tx, audit.NewAuditEvent(
		audit.AuditEntitySalesOrder,
		line.SalesOrderID,
		audit.AuditActionUpdate,
		audit.AuditActor{Username: strings.TrimSpace(operator), IP: strings.TrimSpace(ip), Source: "http"},
	).WithChanges(audit.AuditChange{
		Field:    fmt.Sprintf("lines.%d.productionRouteMode", line.LineNo),
		OldValue: "DEFAULT",
		NewValue: "CUSTOM",
	}).Normalize())
}

func validateProductionRouteReferences(tx *gorm.DB, route models.ProductionRoute) error {
	processStepIDs := make([]string, 0, len(route.Steps))
	for _, step := range route.Steps {
		processStepIDs = append(processStepIDs, strings.TrimSpace(step.ProcessStepID))
	}
	var processSteps []models.ProcessStep
	if len(processStepIDs) > 0 {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id IN ?", processStepIDs).Order("id asc").Find(&processSteps).Error; err != nil {
			return fmt.Errorf("failed to lock production route process steps: %w", err)
		}
	}
	processStepsByID := make(map[string]models.ProcessStep, len(processSteps))
	for _, processStep := range processSteps {
		processStepsByID[processStep.ID] = processStep
	}
	for index, step := range route.Steps {
		processStepID := strings.TrimSpace(step.ProcessStepID)
		processStep, exists := processStepsByID[processStepID]
		if !exists || !processStep.IsActive {
			return fmt.Errorf("%w: steps[%d].processStepId is missing or inactive", ErrInvalidProductionRoute, index)
		}
		var associationCount int64
		if err := tx.Model(&models.ProductionMBOMBranchProcessAssociation{}).
			Where("product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ? AND process_step_id = ?",
				strings.TrimSpace(route.ProductID), strings.ToUpper(strings.TrimSpace(route.BOMOwnerType)),
				strings.TrimSpace(route.BOMOwnerCustomerID), strings.TrimSpace(route.BOMVersionLevel), processStepID).
			Count(&associationCount).Error; err != nil {
			return fmt.Errorf("failed to validate MBOM branch process association: %w", err)
		}
		if associationCount == 0 {
			return fmt.Errorf("%w: steps[%d].processStepId is not configured for the selected MBOM branch", ErrInvalidProductionRoute, index)
		}
	}

	return nil
}

func productionRouteBOMBranchIdentityFromModel(route models.ProductionRoute) productionRouteBOMBranchIdentity {
	return productionRouteBOMBranchIdentity{
		ProductID:          strings.TrimSpace(route.ProductID),
		BOMOwnerType:       strings.ToUpper(strings.TrimSpace(route.BOMOwnerType)),
		BOMOwnerCustomerID: strings.TrimSpace(route.BOMOwnerCustomerID),
		BOMVersionLevel:    strings.TrimSpace(route.BOMVersionLevel),
	}
}

func productionRouteHasValidProcessSteps(route models.ProductionRoute) bool {
	if len(route.Steps) == 0 {
		return false
	}
	for _, step := range route.Steps {
		if strings.TrimSpace(step.ProcessStepID) == "" || step.ProcessStep == nil {
			return false
		}
		if !step.ProcessStep.IsActive || step.ProcessStep.ID != step.ProcessStepID {
			return false
		}
	}
	return true
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
