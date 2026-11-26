package services

import (
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
)

func normalizeOrganizationModelBeforeSave(model *models.Organization) error {
	if model == nil {
		return nil
	}

	normalizeOrganizationTextFields(model)
	if model.Name == "" {
		return ErrOrganizationNameRequired
	}
	if err := ensureOrganizationHasStableUUIDBeforeSave(model); err != nil {
		return err
	}
	if err := normalizeOptionalOrganizationParentID(model); err != nil {
		return err
	}
	return nil
}

func normalizeOrganizationTextFields(model *models.Organization) {
	model.Name = strings.TrimSpace(model.Name)
	model.Manager = strings.TrimSpace(model.Manager)
	model.Description = strings.TrimSpace(model.Description)
	model.Type = strings.ToLower(strings.TrimSpace(model.Type))
}

func ensureOrganizationHasStableUUIDBeforeSave(model *models.Organization) error {
	normalizedID := strings.TrimSpace(model.ID)
	if normalizedID == "" {
		model.ID = uuid.NewString()
		return nil
	}

	parsedID, err := uuid.Parse(normalizedID)
	if err != nil {
		return ErrOrganizationIDInvalid
	}
	model.ID = parsedID.String()
	return nil
}

func normalizeOptionalOrganizationParentID(model *models.Organization) error {
	if model.ParentID == nil {
		return nil
	}

	normalizedParentID := strings.TrimSpace(*model.ParentID)
	if normalizedParentID == "" {
		model.ParentID = nil
		return nil
	}

	parsedParentID, err := uuid.Parse(normalizedParentID)
	if err != nil {
		return ErrOrganizationParentIDInvalid
	}
	stableParentID := parsedParentID.String()
	model.ParentID = &stableParentID
	return nil
}
