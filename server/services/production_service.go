package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"
	"xdfc-server/repositories"

	"gorm.io/gorm"
)

var (
	ErrProductionLineVersionConflict  = errors.New("production line version conflict")
	ErrProductionRouteVersionConflict = errors.New("production route version conflict")
	ErrInvalidProductionRoute         = errors.New("invalid production route")
	ErrInvalidProcessStep             = errors.New("invalid process step")
	ErrProductionTopologyUnauthorized = errors.New("production topology unauthorized")
)

type SaveProductionLineRequest struct {
	Line     ProductionLineDTO
	AuthCode string
	Operator string
	IP       string
}

type PatchProductionLineRequest struct {
	ID       string
	Delta    map[string]json.RawMessage
	Version  int64
	AuthCode string
	Operator string
	IP       string
}

type SaveProductionRouteRequest struct {
	Route    ProductionRouteDTO
	Operator string
	IP       string
}

type SaveProcessStepRequest struct {
	Step     ProcessStepDTO
	Operator string
	IP       string
}

type ProductionService struct {
	txManager        transactionManager
	repository       repositories.ProductionRepository
	systemConfigRepo repositories.SystemConfigRepository
}

func NewProductionService(
	txManager transactionManager,
	repository repositories.ProductionRepository,
	systemConfigRepo repositories.SystemConfigRepository,
) *ProductionService {
	return &ProductionService{
		txManager:        txManager,
		repository:       repository,
		systemConfigRepo: systemConfigRepo,
	}
}

var defaultProductionRuntime = defaultServiceRuntime()

var defaultProductionService = NewProductionService(
	defaultProductionRuntime.txManager,
	repositories.NewProductionRepository(),
	repositories.NewSystemConfigRepository(),
)

func ListProductionLines() ([]ProductionLineDTO, error) {
	return defaultProductionService.ListProductionLines()
}

func SaveProductionLine(req SaveProductionLineRequest) (ProductionLineDTO, error) {
	return defaultProductionService.SaveProductionLine(req)
}

func PatchProductionLine(req PatchProductionLineRequest) (ProductionLineDTO, error) {
	return defaultProductionService.PatchProductionLine(req)
}

func DeleteProductionLine(id string, operator string, ip string) error {
	return defaultProductionService.DeleteProductionLine(id, operator, ip)
}

func ListProductionRoutes() ([]ProductionRouteDTO, error) {
	return defaultProductionService.ListProductionRoutes()
}

func SaveProductionRoute(req SaveProductionRouteRequest) (ProductionRouteDTO, error) {
	return defaultProductionService.SaveProductionRoute(req)
}

func DeleteProductionRoute(id string, operator string, ip string) error {
	return defaultProductionService.DeleteProductionRoute(id, operator, ip)
}

func ListProcessSteps() ([]ProcessStepDTO, error) {
	return defaultProductionService.ListProcessSteps()
}

func SaveProcessStep(req SaveProcessStepRequest) (ProcessStepDTO, error) {
	return defaultProductionService.SaveProcessStep(req)
}

func DeleteProcessStep(id string, operator string, ip string) error {
	return defaultProductionService.DeleteProcessStep(id, operator, ip)
}

func (s *ProductionService) ListProductionLines() ([]ProductionLineDTO, error) {
	lines, err := s.repository.ListProductionLines(s.txManager.DB())
	if err != nil {
		return nil, err
	}
	return mapProductionLinesToDTO(lines), nil
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
	if err := validateProductionRouteDTO(normalizedRoute); err != nil {
		return ProductionRouteDTO{}, err
	}

	route := mapProductionRouteDTOToModel(normalizedRoute)
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if err := validateProductionRouteReferences(tx, route.Steps); err != nil {
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
			beforeDTO := mapProductionRouteToDTO(existing)
			before = &beforeDTO
			auditAction = audit.AuditActionUpdate

			stepIDs := collectProductionRouteStepIDs(route.Steps)
			if err := s.repository.DeleteProductionRouteStepsNotIn(tx, route.ID, stepIDs); err != nil {
				return err
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

func (s *ProductionService) SaveProductionLine(req SaveProductionLineRequest) (ProductionLineDTO, error) {
	line := mapProductionLineDTOToModel(req.Line)
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var before *ProductionLineDTO
		auditAction := audit.AuditActionCreate
		if line.ID != "" && !strings.HasPrefix(line.ID, "temp-") {
			existing, err := s.repository.GetProductionLineByID(tx, line.ID)
			if err != nil {
				return err
			}
			if existing.Version != line.Version {
				return ErrProductionLineVersionConflict
			}
			beforeDTO := mapProductionLineToDTO(existing)
			before = &beforeDTO
			auditAction = audit.AuditActionUpdate
		}

		currentAuthCode, err := s.systemConfigRepo.GetSystemConfigValue(tx, "topology_auth_password", "622575")
		if err != nil {
			return err
		}
		if line.ID != "" && !strings.HasPrefix(line.ID, "temp-") && req.AuthCode != currentAuthCode {
			return ErrProductionTopologyUnauthorized
		}

		segmentIDs, processIDs := collectProductionAssociationIDs(line.Segments)
		if line.ID != "" {
			if err := s.repository.DeleteLineSegmentProcessMappingsNotIn(tx, line.ID, processIDs); err != nil {
				return err
			}
			if err := s.repository.DeleteLineSegmentsNotIn(tx, line.ID, segmentIDs); err != nil {
				return err
			}
		}

		if line.ID != "" && !strings.HasPrefix(line.ID, "temp-") {
			updated, err := s.repository.BumpProductionLineVersion(tx, line.ID, line.Version)
			if err != nil {
				return err
			}
			if !updated {
				return ErrProductionLineVersionConflict
			}
			line.Version++
		} else {
			line.Version = 1
		}

		if err := s.repository.SaveProductionLine(tx, &line); err != nil {
			return err
		}

		after := mapProductionLineToDTO(line)
		event := audit.NewAuditEvent(
			audit.AuditEntityProductionLine,
			line.ID,
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
	return mapProductionLineToDTO(line), err
}

func (s *ProductionService) PatchProductionLine(req PatchProductionLineRequest) (ProductionLineDTO, error) {
	line, err := s.repository.GetProductionLineByID(s.txManager.DB(), req.ID)
	if err != nil {
		return ProductionLineDTO{}, err
	}

	lineDTO := mapProductionLineToDTO(line)
	if err := applyProductionLineDelta(&lineDTO, req.Delta, req.Version); err != nil {
		return ProductionLineDTO{}, err
	}

	return s.SaveProductionLine(SaveProductionLineRequest{
		Line:     lineDTO,
		AuthCode: req.AuthCode,
		Operator: req.Operator,
		IP:       req.IP,
	})
}

func applyProductionLineDelta(line *ProductionLineDTO, delta map[string]json.RawMessage, version int64) error {
	line.Version = version

	if err := validateSupportedTopLevelDeltaKeys(delta, "code", "name", "description", "isActive", "segments"); err != nil {
		return fmt.Errorf("invalid production line delta: %w", err)
	}

	for key, raw := range delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return fmt.Errorf("invalid production line delta item: %w", err)
		}

		switch key {
		case "code":
			if err := json.Unmarshal(valueRaw, &line.Code); err != nil {
				return err
			}
		case "name":
			if err := json.Unmarshal(valueRaw, &line.Name); err != nil {
				return err
			}
		case "description":
			if err := json.Unmarshal(valueRaw, &line.Description); err != nil {
				return err
			}
		case "isActive":
			if err := json.Unmarshal(valueRaw, &line.IsActive); err != nil {
				return err
			}
		case "segments":
			if err := json.Unmarshal(valueRaw, &line.Segments); err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *ProductionService) DeleteProductionLine(id string, operator string, ip string) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if err := s.repository.DeleteProductionLine(tx, id); err != nil {
			return err
		}
		if err := recordAuditEventTx(tx, audit.NewAuditEvent(audit.AuditEntityProductionLine, id, audit.AuditActionDelete, audit.AuditActor{
			Username: strings.TrimSpace(operator),
			IP:       strings.TrimSpace(ip),
			Source:   "http",
		}).Normalize()); err != nil {
			return err
		}
		return nil
	})
}

func (s *ProductionService) ListProcessSteps() ([]ProcessStepDTO, error) {
	steps, err := s.repository.ListProcessSteps(s.txManager.DB())
	if err != nil {
		return nil, err
	}
	return MapProcessStepsToDTO(steps), nil
}

func (s *ProductionService) SaveProcessStep(req SaveProcessStepRequest) (ProcessStepDTO, error) {
	normalizedStep := normalizeProcessStepDTO(req.Step)
	if err := validateProcessStepDTO(normalizedStep); err != nil {
		return ProcessStepDTO{}, err
	}

	step := mapProcessStepDTOToModel(normalizedStep)
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if err := validateProcessStepPositionReferences(tx, normalizedStep.AllowedPositionIDs); err != nil {
			return err
		}
		if err := s.repository.SaveProcessStep(tx, &step); err != nil {
			return err
		}

		return tx.
			Preload("AllowedPositions", func(preload *gorm.DB) *gorm.DB {
				return preload.Order("sort_order asc, name asc")
			}).
			First(&step, "id = ?", step.ID).Error
	})
	return mapProcessStepToDTO(step), err
}

func (s *ProductionService) DeleteProcessStep(id string, operator string, ip string) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		return s.repository.DeleteProcessStep(tx, id)
	})
}

func collectProductionAssociationIDs(segments []models.LineSegment) ([]string, []string) {
	var segmentIDs []string
	var processIDs []string

	for _, segment := range segments {
		if segment.ID != "" && !strings.HasPrefix(segment.ID, "temp-") {
			segmentIDs = append(segmentIDs, segment.ID)
		}
		for _, process := range segment.Processes {
			if process.ID != "" && !strings.HasPrefix(process.ID, "temp-") {
				processIDs = append(processIDs, process.ID)
			}
		}
	}

	return segmentIDs, processIDs
}

func normalizeProcessStepDTO(step ProcessStepDTO) ProcessStepDTO {
	step.ID = strings.TrimSpace(step.ID)
	step.Code = strings.TrimSpace(step.Code)
	step.Name = strings.TrimSpace(step.Name)
	step.Description = strings.TrimSpace(step.Description)
	step.AllowedPositionIDs = normalizeProcessStepAllowedPositionIDs(step)
	step.AllowedPositions = nil
	return step
}

func validateProcessStepDTO(step ProcessStepDTO) error {
	if step.Code == "" {
		return fmt.Errorf("%w: code is required", ErrInvalidProcessStep)
	}
	if step.Name == "" {
		return fmt.Errorf("%w: name is required", ErrInvalidProcessStep)
	}
	if len(step.AllowedPositionIDs) > 80 {
		return fmt.Errorf("%w: allowedPositionIds cannot exceed 80", ErrInvalidProcessStep)
	}
	return nil
}

func validateProcessStepPositionReferences(tx *gorm.DB, positionIDs []string) error {
	if len(positionIDs) == 0 {
		return nil
	}

	var count int64
	if err := tx.Model(&models.Position{}).
		Where("id IN ?", positionIDs).
		Count(&count).Error; err != nil {
		return fmt.Errorf("%w: failed to validate allowed positions: %v", ErrInvalidProcessStep, err)
	}
	if count != int64(len(positionIDs)) {
		return fmt.Errorf("%w: one or more allowed positions do not exist", ErrInvalidProcessStep)
	}
	return nil
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
