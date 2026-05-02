package services

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrMaterialPatchVersionConflict = errors.New("material patch version conflict")

type PatchMaterialRequest struct {
	ID                    string
	ExpectedVersion       int
	DeltaKeys             []string
	Code                  *string
	Name                  *string
	Category              *string
	Spec                  *string
	InternalDimensions    json.RawMessage
	InternalDimensionsSet bool
	ExternalDimensions    json.RawMessage
	ExternalDimensionsSet bool
	UOM                   *string
	MinStock              *float64
	CostPrice             *float64
	SupplierID            *string
	Description           *string
	Images                json.RawMessage
	ImagesSet             bool
	Status                *string
	RevisionNo            *string
	EffectiveFrom         *time.Time
	EffectiveFromSet      bool
	EffectiveTo           *time.Time
	EffectiveToSet        bool
	ChangeType            *string
	ChangeOrderNo         *string
	SiteCode              *string
	IsDefaultSite         *bool
}

func PatchMaterial(ctx context.Context, input PatchMaterialRequest) (models.Material, error) {
	var updated models.Material

	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var current models.Material
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", strings.TrimSpace(input.ID)).
			First(&current).Error; err != nil {
			return err
		}
		before := materialAuditSnapshot(current)

		if input.ExpectedVersion != current.Version {
			return ErrMaterialPatchVersionConflict
		}

		if input.Code != nil {
			current.Code = strings.TrimSpace(*input.Code)
		}
		if input.Name != nil {
			current.Name = strings.TrimSpace(*input.Name)
		}
		if input.Category != nil {
			current.Category = strings.TrimSpace(*input.Category)
		}
		if input.Spec != nil {
			current.Spec = strings.TrimSpace(*input.Spec)
		}
		if input.InternalDimensionsSet {
			current.InternalDimensions = append(json.RawMessage(nil), input.InternalDimensions...)
		}
		if input.ExternalDimensionsSet {
			current.ExternalDimensions = append(json.RawMessage(nil), input.ExternalDimensions...)
		}
		if input.UOM != nil {
			current.UOM = strings.TrimSpace(*input.UOM)
		}
		if input.MinStock != nil {
			current.MinStock = *input.MinStock
		}
		if input.CostPrice != nil {
			current.CostPrice = *input.CostPrice
		}
		if input.SupplierID != nil {
			current.SupplierID = strings.TrimSpace(*input.SupplierID)
		}
		if input.Description != nil {
			current.Description = strings.TrimSpace(*input.Description)
		}
		if input.ImagesSet {
			current.Images = append(json.RawMessage(nil), input.Images...)
		}
		if input.Status != nil {
			current.Status = strings.TrimSpace(*input.Status)
		}
		if input.RevisionNo != nil {
			current.RevisionNo = strings.TrimSpace(*input.RevisionNo)
		}
		if input.EffectiveFromSet {
			current.EffectiveFrom = input.EffectiveFrom
		}
		if input.EffectiveToSet {
			current.EffectiveTo = input.EffectiveTo
		}
		if input.ChangeType != nil {
			current.ChangeType = strings.TrimSpace(*input.ChangeType)
		}
		if input.ChangeOrderNo != nil {
			current.ChangeOrderNo = strings.TrimSpace(*input.ChangeOrderNo)
		}
		if input.SiteCode != nil {
			current.SiteCode = strings.TrimSpace(*input.SiteCode)
		}
		if input.IsDefaultSite != nil {
			current.IsDefaultSite = *input.IsDefaultSite
		}

		current.MasterDataControl.Normalize("R1")
		current.Version++

		if err := tx.Save(&current).Error; err != nil {
			return err
		}
		payload := materialAuditSnapshot(current)
		payload["operation"] = "patch"
		payload["deltaKeys"] = append([]string(nil), input.DeltaKeys...)
		if err := writeMaterialAuditEntryWithContext(ctx, tx, current.ID, "PATCH", before, payload); err != nil {
			return err
		}

		updated = current
		return nil
	})
	if err != nil {
		return models.Material{}, err
	}

	return updated, nil
}
