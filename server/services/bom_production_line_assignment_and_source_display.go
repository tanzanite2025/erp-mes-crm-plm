package services

import (
	"errors"
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrBOMProductionLineRequired = errors.New("EBOM production line is required")
	ErrInvalidBOMProductionLine  = errors.New("invalid EBOM production line")
)

type BOMProductionLineOptionDTO struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}

type BOMProductionLineOptionsResponse struct {
	Items []BOMProductionLineOptionDTO `json:"items"`
}

func validateAndNormalizeBOMProductionLineAssignment(tx *gorm.DB, bom *models.BOM, existing *models.BOM) error {
	if bom.BOMType != models.BOMTypeEBOM {
		bom.ProductionLineID = nil
		return nil
	}

	if existing != nil && existing.BOMType == models.BOMTypeEBOM && bom.ProductionLineID == nil {
		bom.ProductionLineID = existing.ProductionLineID
	}
	if bom.ProductionLineID == nil || strings.TrimSpace(*bom.ProductionLineID) == "" {
		return fmt.Errorf("[VALIDATION] %w", ErrBOMProductionLineRequired)
	}

	lineID := strings.TrimSpace(*bom.ProductionLineID)
	var line models.ProductionLine
	query := tx.Clauses(clause.Locking{Strength: "SHARE"})
	if err := query.First(&line, "id = ?", lineID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("[VALIDATION] %w: selected line does not exist", ErrInvalidBOMProductionLine)
		}
		return err
	}

	lineChanged := existing == nil || existing.ProductionLineID == nil || strings.TrimSpace(*existing.ProductionLineID) != lineID
	if lineChanged && !line.IsActive {
		return fmt.Errorf("[VALIDATION] %w: selected line is inactive", ErrInvalidBOMProductionLine)
	}
	bom.ProductionLineID = &lineID
	return nil
}

func populateBOMProductionLineDisplay(database *gorm.DB, bom *models.BOM) error {
	bom.ResolvedProductionLineID = nil
	bom.ResolvedProductionLineName = ""
	lineID := bom.ProductionLineID
	if bom.BOMType == models.BOMTypeMBOM {
		lineID = nil
		if bom.SourceEBOMID != nil && strings.TrimSpace(*bom.SourceEBOMID) != "" {
			var sourceEBOM struct {
				ProductionLineID *string
			}
			if err := database.Unscoped().Model(&models.BOM{}).
				Select("production_line_id").
				Where("id = ?", strings.TrimSpace(*bom.SourceEBOMID)).
				Take(&sourceEBOM).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			lineID = sourceEBOM.ProductionLineID
		}
	}
	if lineID == nil || strings.TrimSpace(*lineID) == "" {
		return nil
	}
	resolvedID := strings.TrimSpace(*lineID)
	bom.ResolvedProductionLineID = &resolvedID
	var line struct {
		Name string
	}
	if err := database.Unscoped().Model(&models.ProductionLine{}).
		Select("name").Where("id = ?", resolvedID).Take(&line).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}
	bom.ResolvedProductionLineName = line.Name
	return nil
}
