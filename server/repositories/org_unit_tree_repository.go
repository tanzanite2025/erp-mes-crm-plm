package repositories

import (
	"encoding/json"
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type orgUnitOrganizationMetadata struct {
	Manager            string          `json:"manager,omitempty"`
	Description        string          `json:"description,omitempty"`
	LinkedArchitecture json.RawMessage `json:"linkedArchitecture,omitempty"`
}

func (GormOrgPersonnelRepository) ListOrganizations(database *gorm.DB) ([]models.Organization, error) {
	var units []models.OrgUnit
	err := database.
		Order("sort_order asc").
		Order("id asc").
		Find(&units).Error
	if err != nil {
		return nil, err
	}

	nodes := make([]models.Organization, 0, len(units))
	for _, unit := range units {
		nodes = append(nodes, mapOrgUnitToOrganizationProjection(unit))
	}
	return nodes, nil
}

func (GormOrgPersonnelRepository) GetOrganizationByID(database *gorm.DB, id string) (models.Organization, bool, error) {
	var unit models.OrgUnit
	err := database.Where("id = ?", strings.TrimSpace(id)).First(&unit).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Organization{}, false, nil
	}
	if err != nil {
		return models.Organization{}, false, err
	}
	return mapOrgUnitToOrganizationProjection(unit), true, nil
}

func (GormOrgPersonnelRepository) OrganizationNameExists(database *gorm.DB, name string, parentID *string, excludeID string) (bool, error) {
	query := database.Model(&models.OrgUnit{}).Where("name = ?", strings.TrimSpace(name))
	parentScope, parentScopeArgs := organizationParentScope(parentID)
	query = query.Where(parentScope, parentScopeArgs...)
	if strings.TrimSpace(excludeID) != "" {
		query = query.Where("id <> ?", strings.TrimSpace(excludeID))
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func organizationParentScope(parentID *string) (string, []any) {
	if parentID == nil || strings.TrimSpace(*parentID) == "" {
		return "parent_id IS NULL", nil
	}

	return "parent_id = ?", []any{strings.TrimSpace(*parentID)}
}

func (GormOrgPersonnelRepository) SaveOrganization(database *gorm.DB, organization *models.Organization) error {
	if organization == nil {
		return gorm.ErrInvalidData
	}

	unit := mapOrganizationProjectionToOrgUnit(*organization)
	if err := database.Save(&unit).Error; err != nil {
		return err
	}

	organization.CreatedAt = unit.CreatedAt
	organization.UpdatedAt = unit.UpdatedAt
	return nil
}

func (GormOrgPersonnelRepository) CountChildOrganizations(database *gorm.DB, id string) (int64, error) {
	var count int64
	err := database.Model(&models.OrgUnit{}).Where("parent_id = ?", strings.TrimSpace(id)).Count(&count).Error
	return count, err
}

func (GormOrgPersonnelRepository) CountEmployeesByOrgUnitID(database *gorm.DB, orgUnitID string) (int64, error) {
	var count int64
	err := database.Table("employee_assignments").
		Joins("JOIN employees ON employees.id = employee_assignments.employee_id AND employees.deleted_at IS NULL").
		Where("employee_assignments.deleted_at IS NULL").
		Where("employee_assignments.is_primary = ?", true).
		Where("employee_assignments.org_unit_id = ?", strings.TrimSpace(orgUnitID)).
		Count(&count).Error
	return count, err
}

func (GormOrgPersonnelRepository) DeleteOrganization(database *gorm.DB, id string) error {
	return database.Delete(&models.OrgUnit{}, "id = ?", strings.TrimSpace(id)).Error
}

func mapOrgUnitToOrganizationProjection(unit models.OrgUnit) models.Organization {
	metadata := parseOrgUnitOrganizationMetadata(unit.Metadata)

	return models.Organization{
		BaseModel:          unit.BaseModel,
		Name:               unit.Name,
		ParentID:           cloneRepositoryStringPointer(unit.ParentID),
		Manager:            metadata.Manager,
		Description:        metadata.Description,
		Type:               normalizeOrgUnitTypeForOrganizationProjection(unit.UnitType),
		LinkedArchitecture: cloneRepositoryRawMessage(metadata.LinkedArchitecture),
	}
}

func mapOrganizationProjectionToOrgUnit(organization models.Organization) models.OrgUnit {
	return models.OrgUnit{
		BaseModel: organization.BaseModel,
		Name:      strings.TrimSpace(organization.Name),
		ParentID:  cloneRepositoryStringPointer(organization.ParentID),
		UnitType:  normalizeOrganizationTypeForOrgUnit(organization.Type),
		Status:    "active",
		SortOrder: 0,
		Metadata:  buildOrgUnitOrganizationMetadataJSON(organization),
	}
}

func parseOrgUnitOrganizationMetadata(raw string) orgUnitOrganizationMetadata {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return orgUnitOrganizationMetadata{}
	}

	var metadata orgUnitOrganizationMetadata
	if err := json.Unmarshal([]byte(trimmed), &metadata); err != nil {
		return orgUnitOrganizationMetadata{}
	}
	metadata.Manager = strings.TrimSpace(metadata.Manager)
	metadata.Description = strings.TrimSpace(metadata.Description)
	return metadata
}

func buildOrgUnitOrganizationMetadataJSON(organization models.Organization) string {
	metadata := orgUnitOrganizationMetadata{
		Manager:            strings.TrimSpace(organization.Manager),
		Description:        strings.TrimSpace(organization.Description),
		LinkedArchitecture: cloneRepositoryRawMessage(organization.LinkedArchitecture),
	}

	payload, err := json.Marshal(metadata)
	if err != nil || len(payload) == 0 {
		return "{}"
	}
	return string(payload)
}

func normalizeOrgUnitTypeForOrganizationProjection(unitType string) string {
	switch strings.ToLower(strings.TrimSpace(unitType)) {
	case "company":
		return "company"
	case "team":
		return "team"
	default:
		return "department"
	}
}

func normalizeOrganizationTypeForOrgUnit(organizationType string) string {
	switch strings.ToLower(strings.TrimSpace(organizationType)) {
	case "company":
		return "company"
	case "team":
		return "team"
	default:
		return "department"
	}
}

func cloneRepositoryStringPointer(value *string) *string {
	if value == nil {
		return nil
	}
	normalized := strings.TrimSpace(*value)
	if normalized == "" {
		return nil
	}
	return &normalized
}

func cloneRepositoryRawMessage(value json.RawMessage) json.RawMessage {
	if len(value) == 0 {
		return nil
	}
	return append(json.RawMessage(nil), value...)
}
