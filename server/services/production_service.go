package services

import (
	"errors"
	"strings"
	"xdfc-server/models"
	"xdfc-server/repositories"

	"gorm.io/gorm"
)

var (
	ErrProductionLineVersionConflict  = errors.New("production line version conflict")
	ErrProductionTopologyUnauthorized = errors.New("production topology unauthorized")
)

type SaveProductionLineRequest struct {
	Line     ProductionLineDTO
	AuthCode string
	Operator string
	IP       string
}

type SaveProcessStepRequest struct {
	Step      ProcessStepDTO
	StationID string
	Operator  string
	IP        string
}

type StationProcessMappingRequest struct {
	StationID string
	ProcessID string
	Operator  string
	IP        string
}

type ProductionService struct {
	txManager        transactionManager
	auditLogger      auditLogger
	repository       repositories.ProductionRepository
	systemConfigRepo repositories.SystemConfigRepository
}

func NewProductionService(
	txManager transactionManager,
	auditLogger auditLogger,
	repository repositories.ProductionRepository,
	systemConfigRepo repositories.SystemConfigRepository,
) *ProductionService {
	return &ProductionService{
		txManager:        txManager,
		auditLogger:      auditLogger,
		repository:       repository,
		systemConfigRepo: systemConfigRepo,
	}
}

var defaultProductionRuntime = defaultServiceRuntime()

var defaultProductionService = NewProductionService(
	defaultProductionRuntime.txManager,
	defaultProductionRuntime.auditLogger,
	repositories.NewProductionRepository(),
	repositories.NewSystemConfigRepository(),
)

func ListProductionLines() ([]ProductionLineDTO, error) {
	return defaultProductionService.ListProductionLines()
}

func SaveProductionLine(req SaveProductionLineRequest) (ProductionLineDTO, error) {
	return defaultProductionService.SaveProductionLine(req)
}

func DeleteProductionLine(id string, operator string, ip string) error {
	return defaultProductionService.DeleteProductionLine(id, operator, ip)
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

func AssignProcessToStation(req StationProcessMappingRequest) error {
	return defaultProductionService.AssignProcessToStation(req)
}

func RemoveProcessFromStation(req StationProcessMappingRequest) error {
	return defaultProductionService.RemoveProcessFromStation(req)
}

func ListStationMappings() (StationProcessMappingsResponse, error) {
	return defaultProductionService.ListStationMappings()
}

func (s *ProductionService) ListProductionLines() ([]ProductionLineDTO, error) {
	lines, err := s.repository.ListProductionLines(s.txManager.DB())
	if err != nil {
		return nil, err
	}
	return mapProductionLinesToDTO(lines), nil
}

func (s *ProductionService) SaveProductionLine(req SaveProductionLineRequest) (ProductionLineDTO, error) {
	line := mapProductionLineDTOToModel(req.Line)
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if line.ID != "" && !strings.HasPrefix(line.ID, "temp-") {
			existing, err := s.repository.GetProductionLineByID(tx, line.ID)
			if err != nil {
				return err
			}
			if existing.Version != line.Version {
				return ErrProductionLineVersionConflict
			}
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
			if err := s.repository.DeleteSegmentProcessMappingsNotIn(tx, line.ID, processIDs); err != nil {
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

		return s.repository.SaveProductionLine(tx, &line)
	})
	return mapProductionLineToDTO(line), err
}

func (s *ProductionService) DeleteProductionLine(id string, operator string, ip string) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if err := s.repository.DeleteProductionLine(tx, id); err != nil {
			return err
		}
		if s.auditLogger != nil {
			if err := s.auditLogger.Write(tx, AuditEntry{
				Module:   "ProductionLine",
				TargetID: id,
				Action:   "Delete",
				Operator: operator,
				IP:       ip,
			}); err != nil {
				return err
			}
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
	step := mapProcessStepDTOToModel(req.Step)
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if err := s.repository.SaveProcessStep(tx, &step); err != nil {
			return err
		}

		return s.repository.AppendProcessToStation(tx, req.StationID, step.ID)
	})
	return mapProcessStepToDTO(step), err
}

func (s *ProductionService) DeleteProcessStep(id string, operator string, ip string) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		return s.repository.DeleteProcessStep(tx, id)
	})
}

func (s *ProductionService) AssignProcessToStation(req StationProcessMappingRequest) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		return s.repository.AppendProcessToStation(tx, req.StationID, req.ProcessID)
	})
}

func (s *ProductionService) RemoveProcessFromStation(req StationProcessMappingRequest) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		return s.repository.RemoveProcessFromStation(tx, req.StationID, req.ProcessID)
	})
}

func (s *ProductionService) ListStationMappings() (StationProcessMappingsResponse, error) {
	stations, err := s.repository.ListStationsWithProcesses(s.txManager.DB())
	if err != nil {
		return nil, err
	}

	mappings := make(map[string][]string, len(stations))
	for _, station := range stations {
		processIDs := make([]string, 0, len(station.Processes))
		for _, process := range station.Processes {
			processIDs = append(processIDs, process.ID)
		}
		mappings[station.ID] = processIDs
	}
	return MapStationMappingsToResponse(mappings), nil
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
