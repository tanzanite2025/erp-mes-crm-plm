package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

var (
	ErrEngineeringSpecVersionConflict      = errors.New("engineering spec version conflict")
	ErrEngineeringSpecPatchVersionConflict = errors.New("engineering spec patch version conflict")
	ErrEngineeringSpecLinkedProducts       = errors.New("engineering spec linked by products")
	ErrEngineeringSpecLinkedBOM            = errors.New("engineering spec linked by bom")
	ErrEngineeringSpecLinkedDrilling       = errors.New("engineering spec linked by drilling plan")
	ErrEngineeringSpecDuplicateKey         = errors.New("engineering spec duplicate normalized ratio key")
)

const (
	engineeringMasterWeavingModeType = "ENGINEERING_MASTER_WEAVING_MODE"
	drillingPlanSpecType             = "DRILLING_PLAN"
)

type EngineeringSpecListQuery struct {
	Page     int
	PageSize int
	Options  bool
	SpecType string
}

type SaveEngineeringSpecInput = models.EngineeringSpec
type BulkSyncEngineeringSpecInput = models.EngineeringSpec

type PatchEngineeringSpecRequest struct {
	ID              string
	ExpectedVersion int
	DeltaKeys       []string
	Values          map[string]json.RawMessage
}

func parseEngineeringJSON(raw []byte) map[string]any {
	if len(raw) == 0 {
		return nil
	}

	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil
	}

	return payload
}

func engineeringJSONString(raw []byte, key string) string {
	payload := parseEngineeringJSON(raw)
	if payload == nil {
		return ""
	}

	value, ok := payload[key]
	if !ok || value == nil {
		return ""
	}

	return strings.TrimSpace(fmt.Sprint(value))
}

func ensureWeavingModeNormalizedKeyUnique(tx *gorm.DB, input models.EngineeringSpec) error {
	if input.Type != engineeringMasterWeavingModeType {
		return nil
	}

	normalizedRatioKey := engineeringJSONString(input.SpecData, "normalizedRatioKey")
	if normalizedRatioKey == "" {
		return nil
	}

	var specs []models.EngineeringSpec
	if err := tx.Where("type = ?", engineeringMasterWeavingModeType).Find(&specs).Error; err != nil {
		return err
	}

	for _, item := range specs {
		if item.ID == input.ID {
			continue
		}
		if engineeringJSONString(item.SpecData, "normalizedRatioKey") == normalizedRatioKey {
			return ErrEngineeringSpecDuplicateKey
		}
	}

	return nil
}

func countDrillingPlansReferencingWeavingMode(tx *gorm.DB, weavingModeID string) (int64, error) {
	var specs []models.EngineeringSpec
	if err := tx.Where("type = ?", drillingPlanSpecType).Find(&specs).Error; err != nil {
		return 0, err
	}

	var count int64
	for _, item := range specs {
		if engineeringJSONString(item.DrillingData, "weavingModeId") == weavingModeID {
			count++
		}
	}

	return count, nil
}

func parseEngineeringPatchOptionalTime(raw json.RawMessage) (*time.Time, error) {
	if string(raw) == "null" {
		return nil, nil
	}

	var text string
	if err := json.Unmarshal(raw, &text); err == nil {
		if text == "" {
			return nil, nil
		}
		parsed, err := time.Parse(time.RFC3339, text)
		if err != nil {
			return nil, err
		}
		return &parsed, nil
	}

	var parsed time.Time
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, err
	}
	return &parsed, nil
}

func applyEngineeringJSONDelta(raw []byte, path string, valueRaw json.RawMessage) (datatypes.JSON, error) {
	trimmedPath := strings.TrimSpace(path)
	if trimmedPath == "" {
		return nil, errors.New("engineering spec delta path is required")
	}

	payload := parseEngineeringJSON(raw)
	if payload == nil {
		payload = map[string]any{}
	}

	var value any
	if err := json.Unmarshal(valueRaw, &value); err != nil {
		return nil, err
	}

	setEngineeringNestedValue(payload, strings.Split(trimmedPath, "."), value)
	encoded, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return datatypes.JSON(encoded), nil
}

func setEngineeringNestedValue(target map[string]any, parts []string, value any) {
	if len(parts) == 1 {
		target[parts[0]] = value
		return
	}

	child, ok := target[parts[0]].(map[string]any)
	if !ok || child == nil {
		child = map[string]any{}
		target[parts[0]] = child
	}

	setEngineeringNestedValue(child, parts[1:], value)
}

func validateAndNormalizeEngineeringSpec(tx *gorm.DB, input *models.EngineeringSpec) error {
	switch strings.TrimSpace(input.Type) {
	case cuttingPlanSpecType:
		return validateAndNormalizeCuttingPlanSpec(tx, input)
	default:
		return nil
	}
}

func ListEngineeringSpecs(query EngineeringSpecListQuery) ([]models.EngineeringSpec, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	specType := strings.TrimSpace(query.SpecType)
	tx := db.DB.Model(&models.EngineeringSpec{})
	if specType != "" {
		tx = tx.Where("type = ?", specType)
	}

	if query.Options {
		var specs []models.EngineeringSpec
		if err := tx.Order("type asc, code asc").Find(&specs).Error; err != nil {
			return nil, 0, err
		}
		return specs, int64(len(specs)), nil
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []models.EngineeringSpec
	if err := tx.Order("type asc, code asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func GetEngineeringSpecByID(id string) (models.EngineeringSpec, error) {
	var spec models.EngineeringSpec
	if err := db.DB.First(&spec, "id = ?", id).Error; err != nil {
		return models.EngineeringSpec{}, err
	}
	return spec, nil
}

func SaveEngineeringSpec(ctx context.Context, input SaveEngineeringSpecInput) (models.EngineeringSpec, error) {
	var saved models.EngineeringSpec

	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := validateAndNormalizeEngineeringSpec(tx, &input); err != nil {
			return err
		}
		if err := ensureWeavingModeNormalizedKeyUnique(tx, input); err != nil {
			return err
		}

		if input.ID != "" {
			var existing models.EngineeringSpec
			if err := tx.Where("id = ?", input.ID).First(&existing).Error; err == nil {
				before := engineeringSpecAuditSnapshot(existing)
				if input.Version != existing.Version {
					return ErrEngineeringSpecVersionConflict
				}

				input.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, "R1")
				input.Version = existing.Version + 1
				if err := tx.Model(&existing).Updates(input).Error; err != nil {
					return err
				}
				if err := tx.First(&saved, "id = ?", existing.ID).Error; err != nil {
					return err
				}
				payload := engineeringSpecAuditSnapshot(saved)
				payload["operation"] = "update"
				return writeEngineeringSpecAuditEntryWithContext(ctx, tx, saved.Type, saved.ID, "SAVE", before, payload)
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
		}

		input.MasterDataControl.Normalize("R1")
		input.Version = 1
		if err := tx.Create(&input).Error; err != nil {
			return err
		}
		saved = input
		payload := engineeringSpecAuditSnapshot(saved)
		payload["operation"] = "create"
		return writeEngineeringSpecAuditEntryWithContext(ctx, tx, saved.Type, engineeringSpecAuditTargetID(saved), "SAVE", nil, payload)
	})
	if err != nil {
		return models.EngineeringSpec{}, err
	}
	return saved, nil
}

func PatchEngineeringSpec(ctx context.Context, input PatchEngineeringSpecRequest) (models.EngineeringSpec, error) {
	var updated models.EngineeringSpec

	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var current models.EngineeringSpec
		if err := tx.Where("id = ?", strings.TrimSpace(input.ID)).First(&current).Error; err != nil {
			return err
		}
		before := engineeringSpecAuditSnapshot(current)

		if input.ExpectedVersion != current.Version {
			return ErrEngineeringSpecPatchVersionConflict
		}

		for key, valueRaw := range input.Values {
			switch key {
			case "name":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return err
				}
				current.Name = strings.TrimSpace(value)
			case "code":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return err
				}
				current.Code = strings.TrimSpace(value)
			case "type":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return err
				}
				current.Type = strings.TrimSpace(value)
			case "description":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return err
				}
				current.Description = strings.TrimSpace(value)
			case "active":
				var value bool
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return err
				}
				current.Active = value
			case "revisionNo":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return err
				}
				current.RevisionNo = strings.TrimSpace(value)
			case "effectiveFrom":
				value, err := parseEngineeringPatchOptionalTime(valueRaw)
				if err != nil {
					return err
				}
				current.EffectiveFrom = value
			case "effectiveTo":
				value, err := parseEngineeringPatchOptionalTime(valueRaw)
				if err != nil {
					return err
				}
				current.EffectiveTo = value
			case "changeType":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return err
				}
				current.ChangeType = strings.TrimSpace(value)
			case "changeOrderNo":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return err
				}
				current.ChangeOrderNo = strings.TrimSpace(value)
			case "siteCode":
				var value string
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return err
				}
				current.SiteCode = strings.TrimSpace(value)
			case "isDefaultSite":
				var value bool
				if err := json.Unmarshal(valueRaw, &value); err != nil {
					return err
				}
				current.IsDefaultSite = value
			default:
				var err error
				switch {
				case strings.HasPrefix(key, "specData."):
					current.SpecData, err = applyEngineeringJSONDelta(current.SpecData, strings.TrimPrefix(key, "specData."), valueRaw)
				case strings.HasPrefix(key, "drillingData."):
					current.DrillingData, err = applyEngineeringJSONDelta(current.DrillingData, strings.TrimPrefix(key, "drillingData."), valueRaw)
				case strings.HasPrefix(key, "cuttingData."):
					current.CuttingData, err = applyEngineeringJSONDelta(current.CuttingData, strings.TrimPrefix(key, "cuttingData."), valueRaw)
				case strings.HasPrefix(key, "labelingData."):
					current.LabelingData, err = applyEngineeringJSONDelta(current.LabelingData, strings.TrimPrefix(key, "labelingData."), valueRaw)
				default:
					return errors.New("unsupported patch field: " + key)
				}
				if err != nil {
					return err
				}
			}
		}

		if err := ensureWeavingModeNormalizedKeyUnique(tx, current); err != nil {
			return err
		}
		if err := validateAndNormalizeEngineeringSpec(tx, &current); err != nil {
			return err
		}

		current.MasterDataControl.Normalize("R1")
		current.Version++
		if err := tx.Save(&current).Error; err != nil {
			return err
		}
		if err := writeEngineeringSpecAuditDiffEntryWithContext(ctx, tx, current.Type, current.ID, "PATCH", engineeringSpecPatchAuditDiff(before, input.Values)); err != nil {
			return err
		}

		updated = current
		return nil
	})
	if err != nil {
		return models.EngineeringSpec{}, err
	}

	return updated, nil
}

func BulkSyncEngineeringSpecs(inputs []BulkSyncEngineeringSpecInput) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, in := range inputs {
			spec := in
			if strings.TrimSpace(spec.Name) == "" || strings.TrimSpace(spec.Code) == "" {
				return errors.New("name/code is required")
			}
			spec.MasterDataControl.Normalize("R1")
			if err := ensureWeavingModeNormalizedKeyUnique(tx, spec); err != nil {
				return err
			}

			if spec.ID != "" {
				if err := tx.Model(&models.EngineeringSpec{}).Where("id = ?", spec.ID).Omit("CreatedAt", "BaseModel.CreatedAt").Updates(&spec).Error; err != nil {
					return err
				}
				continue
			}

			if err := tx.Create(&spec).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func DeleteEngineeringSpec(ctx context.Context, id string) error {
	return db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var target models.EngineeringSpec
		if err := tx.First(&target, "id = ?", id).Error; err != nil {
			return err
		}

		if target.Type == engineeringMasterWeavingModeType {
			drillingCount, err := countDrillingPlansReferencingWeavingMode(tx, id)
			if err != nil {
				return err
			}
			if drillingCount > 0 {
				return ErrEngineeringSpecLinkedDrilling
			}
		}

		var pCount int64
		if err := tx.Model(&models.Product{}).Where("engineering_spec_id = ?", id).Count(&pCount).Error; err != nil {
			return err
		}
		if pCount > 0 {
			return ErrEngineeringSpecLinkedProducts
		}

		var bCount int64
		if err := tx.Model(&models.BOM{}).Where("description LIKE ?", "%"+id+"%").Count(&bCount).Error; err != nil {
			return err
		}
		if bCount > 0 {
			return ErrEngineeringSpecLinkedBOM
		}

		before := engineeringSpecAuditSnapshot(target)
		if err := tx.Delete(&models.EngineeringSpec{}, "id = ?", id).Error; err != nil {
			return err
		}
		payload := map[string]any{
			"deleted": true,
			"code":    strings.TrimSpace(target.Code),
			"name":    strings.TrimSpace(target.Name),
			"type":    strings.TrimSpace(target.Type),
		}
		return writeEngineeringSpecAuditEntryWithContext(ctx, tx, target.Type, target.ID, "DELETE", before, payload)
	})
}
