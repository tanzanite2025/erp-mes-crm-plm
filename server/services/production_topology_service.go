package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
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
