package services

import (
	"encoding/json"
	"errors"
	"fmt"
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

type PatchProductionLineRequest struct {
	ID       string
	Delta    map[string]json.RawMessage
	Version  int64
	AuthCode string
	Operator string
	IP       string
}

type SaveProcessStepRequest struct {
	Step     ProcessStepDTO
	Operator string
	IP       string
}

type JobCategoryProcessMappingRequest struct {
	JobCategoryID string
	ProcessID     string
	Operator      string
	IP            string
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

func PatchProductionLine(req PatchProductionLineRequest) (ProductionLineDTO, error) {
	return defaultProductionService.PatchProductionLine(req)
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

func AssignProcessToJobCategory(req JobCategoryProcessMappingRequest) error {
	return defaultProductionService.AssignProcessToJobCategory(req)
}

func RemoveProcessFromJobCategory(req JobCategoryProcessMappingRequest) error {
	return defaultProductionService.RemoveProcessFromJobCategory(req)
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

		segmentIDs, categoryIDs, categoryProcessIDs := collectProductionAssociationIDs(line.Segments)
		if line.ID != "" {
			if err := s.repository.DeleteJobCategoryProcessMappingsNotIn(tx, line.ID, categoryProcessIDs); err != nil {
				return err
			}
			if err := s.repository.DeleteJobCategoriesNotIn(tx, line.ID, categoryIDs); err != nil {
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
		return s.repository.SaveProcessStep(tx, &step)
	})
	return mapProcessStepToDTO(step), err
}

func (s *ProductionService) DeleteProcessStep(id string, operator string, ip string) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		return s.repository.DeleteProcessStep(tx, id)
	})
}

func (s *ProductionService) AssignProcessToJobCategory(req JobCategoryProcessMappingRequest) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		return s.repository.AppendProcessToJobCategory(tx, req.JobCategoryID, req.ProcessID)
	})
}

func (s *ProductionService) RemoveProcessFromJobCategory(req JobCategoryProcessMappingRequest) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		return s.repository.RemoveProcessFromJobCategory(tx, req.JobCategoryID, req.ProcessID)
	})
}

func collectProductionAssociationIDs(segments []models.LineSegment) ([]string, []string, []string) {
	var segmentIDs []string
	var categoryIDs []string
	var categoryProcessIDs []string

	for _, segment := range segments {
		if segment.ID != "" && !strings.HasPrefix(segment.ID, "temp-") {
			segmentIDs = append(segmentIDs, segment.ID)
		}
		for _, category := range segment.JobCategories {
			if category.ID != "" && !strings.HasPrefix(category.ID, "temp-") {
				categoryIDs = append(categoryIDs, category.ID)
			}
			for _, process := range category.Processes {
				if process.ID != "" && !strings.HasPrefix(process.ID, "temp-") {
					categoryProcessIDs = append(categoryProcessIDs, process.ID)
				}
			}
		}
	}

	return segmentIDs, categoryIDs, categoryProcessIDs
}
