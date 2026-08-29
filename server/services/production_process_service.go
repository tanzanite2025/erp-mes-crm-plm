package services

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
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
		if err := s.repository.SaveProcessStep(tx, &step); err != nil {
			return err
		}

		return tx.First(&step, "id = ?", step.ID).Error
	})
	return mapProcessStepToDTO(step), err
}

func (s *ProductionService) DeleteProcessStep(id string, operator string, ip string) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		return s.repository.DeleteProcessStep(tx, id)
	})
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
