package services

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrOrganizationPatchVersionConflict = errors.New("organization patch version conflict")

type PatchOrganizationRequest struct {
	ID                    string
	ExpectedVersion       int
	DeltaKeys             []string
	Name                  *string
	ParentID              *string
	ParentIDSet           bool
	Manager               *string
	Description           *string
	Type                  *string
	LinkedArchitecture    json.RawMessage
	LinkedArchitectureSet bool
}

func (s *OrganizationService) PatchOrganization(ctx context.Context, input PatchOrganizationRequest) (OrganizationTreeNodeResponse, error) {
	var updated models.Organization

	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		current, found, err := s.repository.GetOrganizationByID(
			tx.Clauses(clause.Locking{Strength: "UPDATE"}),
			strings.TrimSpace(input.ID),
		)
		if err != nil {
			return err
		}
		if !found {
			return gorm.ErrRecordNotFound
		}

		if input.ExpectedVersion != optimisticVersionFromTimestamps(current.UpdatedAt, current.CreatedAt) {
			return ErrOrganizationPatchVersionConflict
		}

		if input.Name != nil {
			current.Name = strings.TrimSpace(*input.Name)
		}
		if input.ParentIDSet {
			if input.ParentID == nil || strings.TrimSpace(*input.ParentID) == "" {
				current.ParentID = nil
			} else {
				parentID := strings.TrimSpace(*input.ParentID)
				current.ParentID = &parentID
			}
		}
		if input.Manager != nil {
			current.Manager = strings.TrimSpace(*input.Manager)
		}
		if input.Description != nil {
			current.Description = strings.TrimSpace(*input.Description)
		}
		if input.Type != nil {
			current.Type = strings.TrimSpace(*input.Type)
		}
		if input.LinkedArchitectureSet {
			current.LinkedArchitecture = append(json.RawMessage(nil), input.LinkedArchitecture...)
		}

		if err := s.validateOrganizationHierarchyWithDB(tx, &current); err != nil {
			return err
		}

		nameExists, err := s.repository.OrganizationNameExists(tx, current.Name, current.ParentID, current.ID)
		if err != nil {
			return err
		}
		if nameExists {
			return ErrOrganizationNameConflict
		}

		if err := s.repository.SaveOrganization(tx, &current); err != nil {
			return err
		}
		if err := recordLegacyAuditEntryWithContext(ctx, tx, "Organization", current.ID, "PATCH", auditDeltaKeys(input.DeltaKeys)); err != nil {
			return err
		}

		updated = current
		return nil
	})
	if err != nil {
		return OrganizationTreeNodeResponse{}, err
	}

	return MapOrganizationNodeToResponse(&updated), nil
}
