package services

import (
	"context"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func (s *OrganizationService) ListOrganizationTree() ([]OrganizationTreeNodeResponse, error) {
	allNodes, err := s.repository.ListOrganizations(s.txManager.DB())
	if err != nil {
		return nil, err
	}

	nodeMap := make(map[string]*models.Organization, len(allNodes))
	for i := range allNodes {
		node := &allNodes[i]
		node.Children = []*models.Organization{}
		nodeMap[node.ID] = node
	}

	var rootNodes []*models.Organization
	for i := range allNodes {
		node := &allNodes[i]
		if node.ParentID == nil || strings.TrimSpace(*node.ParentID) == "" {
			rootNodes = append(rootNodes, node)
			continue
		}

		if parent, ok := nodeMap[*node.ParentID]; ok {
			parent.Children = append(parent.Children, node)
			continue
		}

		rootNodes = append(rootNodes, node)
	}

	return MapOrganizationTreeToResponse(rootNodes), nil
}

func (s *OrganizationService) SaveOrganization(ctx context.Context, input OrganizationSaveRequest) (OrganizationSaveResponse, error) {
	model := MapOrganizationSaveRequestToModel(input)
	if err := normalizeOrganizationModelBeforeSave(&model); err != nil {
		return OrganizationSaveResponse{}, err
	}
	if err := s.validateOrganizationHierarchy(&model); err != nil {
		return OrganizationSaveResponse{}, err
	}

	nameExists, err := s.repository.OrganizationNameExists(s.txManager.DB(), model.Name, model.ParentID, model.ID)
	if err != nil {
		return OrganizationSaveResponse{}, err
	}
	if nameExists {
		return OrganizationSaveResponse{}, ErrOrganizationNameConflict
	}

	if err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if err := s.repository.SaveOrganization(tx, &model); err != nil {
			return err
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, "Organization", model.ID, "save", nil)
	}); err != nil {
		return OrganizationSaveResponse{}, err
	}

	return MapOrganizationToSaveResponse(model), nil
}

func (s *OrganizationService) validateOrganizationHierarchy(input *models.Organization) error {
	return s.validateOrganizationHierarchyWithDB(s.txManager.DB(), input)
}

func (s *OrganizationService) validateOrganizationHierarchyWithDB(database *gorm.DB, input *models.Organization) error {
	normalizedType := strings.TrimSpace(input.Type)
	normalizedID := strings.TrimSpace(input.ID)

	if input.ParentID == nil || strings.TrimSpace(*input.ParentID) == "" {
		if normalizedType == "" {
			input.Type = "company"
			return nil
		}
		if normalizedType != "company" {
			return ErrOrganizationHierarchyInvalid
		}
		return nil
	}

	parentID := strings.TrimSpace(*input.ParentID)
	if normalizedID != "" && parentID == normalizedID {
		return ErrOrganizationHierarchyInvalid
	}

	parent, found, err := s.repository.GetOrganizationByID(database, parentID)
	if err != nil {
		return err
	}
	if !found {
		return ErrOrganizationParentNotFound
	}

	expectedType := ""
	switch strings.TrimSpace(parent.Type) {
	case "company":
		expectedType = "department"
	case "department":
		expectedType = "team"
	case "team":
		return ErrOrganizationDepthExceeded
	default:
		return ErrOrganizationHierarchyInvalid
	}

	if normalizedType == "" {
		input.Type = expectedType
		return nil
	}

	if normalizedType != expectedType {
		return ErrOrganizationHierarchyInvalid
	}

	return nil
}

func (s *OrganizationService) DeleteOrganization(ctx context.Context, id string) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		childCount, err := s.repository.CountChildOrganizations(tx, id)
		if err != nil {
			return err
		}
		if childCount > 0 {
			return ErrOrganizationHasChildren
		}
		employeeCount, err := s.repository.CountEmployeesByDeptID(tx, id)
		if err != nil {
			return err
		}
		if employeeCount > 0 {
			return ErrOrganizationHasEmployees
		}
		if err := s.repository.DeleteOrganization(tx, id); err != nil {
			return err
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, "Organization", id, "delete", nil)
	})
}

func (s *OrganizationService) BulkSyncOrganizations(ctx context.Context, input []BulkSyncOrganizationRequest) (int, error) {
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		for _, item := range input {
			node := MapBulkSyncOrganizationRequestToModel(item)
			if err := s.repository.SaveOrganization(tx, &node); err != nil {
				return err
			}
			if err := recordLegacyAuditEntryWithContext(ctx, tx, "Organization", node.ID, "bulk_sync", nil); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return len(input), nil
}
