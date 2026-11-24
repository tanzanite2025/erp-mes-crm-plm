package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"
	"xdfc-server/repositories"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func ListProductionLines() ([]ProductionLineDTO, error) {
	return defaultProductionService.ListProductionLines()
}

func ListProductionLineProductTemplates() ([]ProductionLineProductTemplateDTO, error) {
	return defaultProductionService.ListProductionLineProductTemplates()
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
	if err := attachProductionBOMBranchOperations(s.txManager.DB(), lines); err != nil {
		return nil, err
	}
	return mapProductionLinesToDTO(lines), nil
}

func (s *ProductionService) ListProductionLineProductTemplates() ([]ProductionLineProductTemplateDTO, error) {
	var templates []models.ProductTemplate
	if err := s.txManager.DB().
		Select("id", "name", "code", "active").
		Order("name asc, code asc").
		Find(&templates).Error; err != nil {
		return nil, err
	}

	items := make([]ProductionLineProductTemplateDTO, 0, len(templates))
	for _, template := range templates {
		items = append(items, ProductionLineProductTemplateDTO{
			ID:     template.ID,
			Name:   template.Name,
			Code:   template.Code,
			Active: template.Active,
		})
	}
	return items, nil
}

func (s *ProductionService) SaveProductionLine(req SaveProductionLineRequest) (ProductionLineDTO, error) {
	var saved ProductionLineDTO
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var err error
		saved, err = s.saveProductionLineWithBOMBranchAssociationsTx(tx, req)
		return err
	})
	return saved, err
}

func (s *ProductionService) saveProductionLineWithBOMBranchAssociationsTx(tx *gorm.DB, req SaveProductionLineRequest) (ProductionLineDTO, error) {
	line := mapProductionLineDTOToModel(req.Line)
	err := func() error {
		var before *ProductionLineDTO
		var existing *models.ProductionLine
		auditAction := audit.AuditActionCreate
		if line.ID != "" && !strings.HasPrefix(line.ID, "temp-") {
			existingLine, err := s.repository.GetProductionLineByID(tx.Clauses(clause.Locking{Strength: "UPDATE"}), line.ID)
			if err != nil {
				return err
			}
			existing = &existingLine
			line.CreatedAt = existingLine.CreatedAt
			if existingLine.Version != line.Version {
				return ErrProductionLineVersionConflict
			}
			beforeDTO := mapProductionLineToDTO(existingLine)
			before = &beforeDTO
			auditAction = audit.AuditActionUpdate
		}
		if err := validateProductionLineSegmentOwnership(tx, &line); err != nil {
			return err
		}
		if line.ProductTemplateID == nil && existing != nil {
			line.ProductTemplateID = existing.ProductTemplateID
		}
		if line.ProductTemplateID == nil {
			if existing == nil {
				return fmt.Errorf("%w: productTemplateId is required for a new L1", ErrInvalidProductionLineTemplate)
			}
		} else {
			var template models.ProductTemplate
			if err := tx.First(&template, "id = ?", *line.ProductTemplateID).Error; err != nil {
				return fmt.Errorf("%w: selected product template does not exist", ErrInvalidProductionLineTemplate)
			}
			isExistingTemplate := existing != nil && existing.ProductTemplateID != nil && *existing.ProductTemplateID == template.ID
			if !template.Active && !isExistingTemplate {
				return fmt.Errorf("%w: selected product template is inactive", ErrInvalidProductionLineTemplate)
			}
			line.Name = template.Name
			line.ProductTemplate = &template
		}
		if err := validateAndHydrateProductionLineBOMBranches(tx, &line); err != nil {
			return err
		}

		currentAuthCode, err := s.systemConfigRepo.GetSystemConfigValue(tx, "topology_auth_password", "622575")
		if err != nil {
			return err
		}
		if existing != nil && req.AuthCode != currentAuthCode {
			return ErrProductionTopologyUnauthorized
		}

		segmentIDs := collectProductionLineSegmentIDs(line.Segments)
		if existing != nil {
			if err := s.repository.DeleteLineSegmentsNotIn(tx, line.ID, segmentIDs); err != nil {
				return err
			}
		}

		if existing != nil {
			updated, err := s.repository.BumpProductionLineVersion(tx, line.ID, line.Version)
			if err != nil {
				return err
			}
			if !updated {
				return ErrProductionLineVersionConflict
			}
			line.Version++
		} else {
			line.ID = uuid.NewString()
			line.Version = 1
		}

		if err := s.repository.SaveProductionLine(tx, &line, existing); err != nil {
			if errors.Is(err, repositories.ErrProductionLineSegmentIdentityConflict) {
				return fmt.Errorf("%w: L2 ID 已被其他请求使用，请刷新后重新添加分支关联", ErrInvalidProductionLineSegmentOwnership)
			}
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
	}()
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

	if err := validateSupportedTopLevelDeltaKeys(delta, "code", "name", "productTemplateId", "description", "isActive", "segments"); err != nil {
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
		case "productTemplateId":
			if err := json.Unmarshal(valueRaw, &line.ProductTemplateID); err != nil {
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
		if _, err := s.repository.GetProductionLineByID(tx.Clauses(clause.Locking{Strength: "UPDATE"}), id); err != nil {
			return err
		}
		if err := s.repository.DeleteLineSegmentsNotIn(tx, id, nil); err != nil {
			return err
		}
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

func collectProductionLineSegmentIDs(segments []models.LineSegment) []string {
	var segmentIDs []string

	for _, segment := range segments {
		if segment.ID != "" && !strings.HasPrefix(segment.ID, "temp-") {
			segmentIDs = append(segmentIDs, segment.ID)
		}
	}

	return segmentIDs
}
