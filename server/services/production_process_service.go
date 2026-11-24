package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func ListProcessSteps() ([]ProcessStepDTO, error) {
	return defaultProductionService.ListProcessSteps()
}

func SaveProcessStep(req SaveProcessStepRequest) (ProcessStepDTO, error) {
	return defaultProductionService.SaveProcessStep(req)
}

func DeleteProcessStep(id string, operator string, ip string) error {
	return defaultProductionService.DeleteProcessStep(id, operator, ip)
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
		if step.ID != "" && !step.IsActive {
			var existing models.ProcessStep
			lookupErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&existing, "id = ?", step.ID).Error
			if lookupErr == nil {
				if err := validateProductionProcessLibraryEntryCanBeDeactivated(tx, step.ID); err != nil {
					return err
				}
			} else if lookupErr != gorm.ErrRecordNotFound {
				return lookupErr
			}
		}
		if err := s.repository.SaveProcessStep(tx, &step); err != nil {
			return err
		}
		if step.IsActive != normalizedStep.IsActive {
			step.IsActive = normalizedStep.IsActive
			if err := tx.Model(&step).Update("is_active", step.IsActive).Error; err != nil {
				return err
			}
		}

		return tx.First(&step, "id = ?", step.ID).Error
	})
	return mapProcessStepToDTO(step), err
}

func (s *ProductionService) DeleteProcessStep(id string, operator string, ip string) error {
	id = strings.TrimSpace(id)
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var existing models.ProcessStep
		lookupErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&existing, "id = ?", id).Error
		if lookupErr != nil && lookupErr != gorm.ErrRecordNotFound {
			return lookupErr
		}
		if lookupErr == gorm.ErrRecordNotFound {
			return s.repository.DeleteProcessStep(tx, id)
		}
		if err := validateProductionProcessLibraryEntryCanBeDeleted(tx, strings.TrimSpace(id)); err != nil {
			return err
		}
		return s.repository.DeleteProcessStep(tx, id)
	})
}

func validateProductionProcessLibraryEntryCanBeDeactivated(database *gorm.DB, processLibraryID string) error {
	return validateProductionProcessLibraryEntryReferences(database, processLibraryID)
}

func validateProductionProcessLibraryEntryCanBeDeleted(database *gorm.DB, processLibraryID string) error {
	return validateProductionProcessLibraryEntryReferences(database, processLibraryID)
}

func validateProductionProcessLibraryEntryReferences(database *gorm.DB, processLibraryID string) error {
	if database == nil || processLibraryID == "" {
		return nil
	}

	var selectionCount int64
	if err := database.Model(&models.ProductionBOMBranchOperationProcessLibrarySelection{}).
		Where("process_library_id = ?", processLibraryID).
		Count(&selectionCount).Error; err != nil {
		return err
	}
	if selectionCount > 0 {
		return fmt.Errorf("%w: process library entry %s is selected by an MBOM branch", ErrProductionProcessLibraryReferenceConflict, processLibraryID)
	}
	return nil
}

func normalizeProcessStepDTO(step ProcessStepDTO) ProcessStepDTO {
	step.ID = strings.TrimSpace(step.ID)
	step.Code = strings.TrimSpace(step.Code)
	step.Name = strings.TrimSpace(step.Name)
	step.Description = strings.TrimSpace(step.Description)
	return step
}

func validateProcessStepDTO(step ProcessStepDTO) error {
	if step.Code == "" {
		return fmt.Errorf("%w: code is required", ErrInvalidProcessStep)
	}
	if step.Name == "" {
		return fmt.Errorf("%w: name is required", ErrInvalidProcessStep)
	}
	return nil
}
