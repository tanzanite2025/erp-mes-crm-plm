package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func ListProductionLines() ([]ProductionLineDTO, error) {
	return defaultProductionService.ListProductionLines()
}

func ListActiveBOMProductionLineOptions() ([]BOMProductionLineOptionDTO, error) {
	return defaultProductionService.ListActiveBOMProductionLineOptions()
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

func (s *ProductionService) ListActiveBOMProductionLineOptions() ([]BOMProductionLineOptionDTO, error) {
	var options []BOMProductionLineOptionDTO
	err := s.txManager.DB().Model(&models.ProductionLine{}).
		Select("id", "code", "name").
		Where("is_active = ?", true).
		Order("code asc").
		Find(&options).Error
	return options, err
}

func (s *ProductionService) SaveProductionLine(req SaveProductionLineRequest) (ProductionLineDTO, error) {
	var saved ProductionLineDTO
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var err error
		saved, err = s.saveProductionLineTransaction(tx, req)
		return err
	})
	return saved, err
}

func (s *ProductionService) saveProductionLineTransaction(tx *gorm.DB, req SaveProductionLineRequest) (ProductionLineDTO, error) {
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
		line.Name = strings.TrimSpace(line.Name)
		line.Code = strings.ToUpper(strings.TrimSpace(line.Code))
		if line.Name == "" || line.Code == "" {
			return fmt.Errorf("%w: name and code are required", ErrInvalidProductionLine)
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
		Operator: req.Operator,
		IP:       req.IP,
	})
}

func applyProductionLineDelta(line *ProductionLineDTO, delta map[string]json.RawMessage, version int64) error {
	line.Version = version

	if err := validateSupportedTopLevelDeltaKeys(delta, "code", "name", "description", "isActive"); err != nil {
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
		}
	}

	return nil
}

func (s *ProductionService) DeleteProductionLine(id string, operator string, ip string) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if _, err := s.repository.GetProductionLineByID(tx.Clauses(clause.Locking{Strength: "UPDATE"}), id); err != nil {
			return err
		}
		if tx.Migrator().HasTable(&models.BOM{}) && tx.Migrator().HasColumn(&models.BOM{}, "production_line_id") {
			var bomReferences int64
			if err := tx.Model(&models.BOM{}).Where("production_line_id = ?", id).Count(&bomReferences).Error; err != nil {
				return err
			}
			if bomReferences > 0 {
				return ErrProductionLineReferencedByBOM
			}
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
