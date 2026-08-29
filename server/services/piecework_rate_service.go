package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrPieceworkRateVersionConflict = errors.New("piecework rate version conflict")
	ErrInvalidPieceworkRate         = errors.New("invalid piecework rate")
)

func PatchPieceworkRate(
	ctx context.Context,
	id string,
	command PieceworkRatePatchCommand,
	expectedVersion int64,
) (PieceworkRateDTO, error) {
	return defaultPieceworkService.PatchPieceworkRate(ctx, id, command, expectedVersion)
}

func DeletePieceworkRate(ctx context.Context, id string, expectedVersion int64) error {
	return defaultPieceworkService.DeletePieceworkRate(ctx, id, expectedVersion)
}

func ListPieceworkRates() ([]PieceworkRateDTO, error) {
	return defaultPieceworkService.ListPieceworkRates()
}

func (s *PieceworkService) ListPieceworkRates() ([]PieceworkRateDTO, error) {
	var rates []models.PieceworkRate
	if err := s.txManager.DB().
		Preload("Product").
		Preload("ProcessStep").
		Preload("RouteStep").
		Order("created_at desc").
		Find(&rates).Error; err != nil {
		return nil, err
	}

	result := make([]PieceworkRateDTO, 0, len(rates))
	for _, rate := range rates {
		result = append(result, mapPieceworkRateToDTO(rate))
	}
	return result, nil
}

func SavePieceworkRateDTO(ctx context.Context, input PieceworkRateWriteDTO) (PieceworkRateDTO, error) {
	return defaultPieceworkService.SavePieceworkRateDTO(ctx, input)
}

func CreatePieceworkRate(ctx context.Context, command PieceworkRateCommand) (PieceworkRateDTO, error) {
	return defaultPieceworkService.CreatePieceworkRate(ctx, command)
}

func UpdatePieceworkRate(
	ctx context.Context,
	id string,
	command PieceworkRateCommand,
	expectedVersion int64,
) (PieceworkRateDTO, error) {
	return defaultPieceworkService.UpdatePieceworkRate(ctx, id, command, expectedVersion)
}

func (s *PieceworkService) SavePieceworkRateDTO(ctx context.Context, input PieceworkRateWriteDTO) (PieceworkRateDTO, error) {
	command, err := s.canonicalCommandFromWriteDTO(input)
	if err != nil {
		return PieceworkRateDTO{}, err
	}
	if strings.TrimSpace(input.ID) == "" {
		return s.CreatePieceworkRate(ctx, command)
	}

	expectedVersion := input.Version
	if expectedVersion <= 0 {
		var existing models.PieceworkRate
		if err := s.txManager.DB().First(&existing, "id = ?", strings.TrimSpace(input.ID)).Error; err != nil {
			return PieceworkRateDTO{}, err
		}
		// Compatibility-only behavior for old POST editors that did not send
		// a version. The canonical PATCH path never takes this branch.
		expectedVersion = existing.Version
	}
	return s.UpdatePieceworkRate(ctx, input.ID, command, expectedVersion)
}

func (s *PieceworkService) CreatePieceworkRate(
	ctx context.Context,
	command PieceworkRateCommand,
) (PieceworkRateDTO, error) {
	rate := pieceworkRateModelFromCommand(command)
	if err := s.savePieceworkRate(ctx, &rate); err != nil {
		return PieceworkRateDTO{}, err
	}
	return s.pieceworkRateDTOByID(rate.ID)
}

func (s *PieceworkService) UpdatePieceworkRate(
	ctx context.Context,
	id string,
	command PieceworkRateCommand,
	expectedVersion int64,
) (PieceworkRateDTO, error) {
	if expectedVersion <= 0 {
		return PieceworkRateDTO{}, ErrPieceworkRateVersionConflict
	}
	rate := pieceworkRateModelFromCommand(command)
	rate.ID = strings.TrimSpace(id)
	rate.Version = expectedVersion
	if err := s.savePieceworkRate(ctx, &rate); err != nil {
		return PieceworkRateDTO{}, err
	}
	return s.pieceworkRateDTOByID(rate.ID)
}

func (s *PieceworkService) pieceworkRateDTOByID(id string) (PieceworkRateDTO, error) {
	var saved models.PieceworkRate
	if err := s.txManager.DB().
		Preload("ProcessStep").
		Preload("RouteStep").
		First(&saved, "id = ?", strings.TrimSpace(id)).Error; err != nil {
		return PieceworkRateDTO{}, err
	}
	return mapPieceworkRateToDTO(saved), nil
}

// SavePieceworkRate remains as a compatibility entry point for existing
// callers. It adapts the legacy model at the boundary and then delegates to
// the canonical command path.
func (s *PieceworkService) SavePieceworkRate(ctx context.Context, rate *models.PieceworkRate) error {
	input, err := legacyPieceworkRateWriteDTO(rate)
	if err != nil {
		return err
	}

	saved, err := s.SavePieceworkRateDTO(ctx, input)
	if err != nil {
		return err
	}
	applyPieceworkRateDTOToModel(rate, saved)
	return nil
}

func (s *PieceworkService) savePieceworkRate(ctx context.Context, rate *models.PieceworkRate) error {
	if rate == nil {
		return fmt.Errorf("%w: rate is required", ErrInvalidPieceworkRate)
	}

	actor, _ := audit.ActorFromContext(ctx)
	rate.Operator = strings.TrimSpace(actor.Username)
	if rate.Operator == "" {
		rate.Operator = strings.TrimSpace(actor.UserID)
	}
	if rate.Operator == "" {
		rate.Operator = "system"
	}

	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if err := normalizeAndValidatePieceworkRate(tx, rate); err != nil {
			return err
		}

		if rate.ID == "" {
			rate.ID = uuid.NewString()
			if rate.Version <= 0 {
				rate.Version = 1
			}
			if err := ensurePieceworkRateIntervalAvailable(tx, rate, ""); err != nil {
				return err
			}
			if err := tx.Create(rate).Error; err != nil {
				return err
			}
		} else {
			var existing models.PieceworkRate
			if err := tx.First(&existing, "id = ?", rate.ID).Error; err != nil {
				return err
			}
			if rate.Version > 0 && existing.Version != rate.Version {
				return ErrPieceworkRateVersionConflict
			}
			if rate.Version <= 0 {
				rate.Version = existing.Version
			}
			if err := ensurePieceworkRateIntervalAvailable(tx, rate, rate.ID); err != nil {
				return err
			}

			nextVersion := existing.Version + 1
			result := tx.Model(&models.PieceworkRate{}).
				Where("id = ? AND version = ?", rate.ID, existing.Version).
				Updates(map[string]interface{}{
					"product_id":      rate.ProductID,
					"process_step_id": nullablePieceworkID(rate.ProcessStepID),
					"route_step_id":   nullablePieceworkID(rate.RouteStepID),
					"process_code":    rate.ProcessCode,
					"process_name":    rate.ProcessName,
					"unit":            rate.Unit,
					"unit_price":      rate.UnitPrice,
					"currency":        rate.Currency,
					"effective_from":  rate.EffectiveFrom,
					"effective_to":    rate.EffectiveTo,
					"status":          rate.Status,
					"remarks":         rate.Remarks,
					"version":         nextVersion,
					"operator":        rate.Operator,
					"updated_at":      time.Now().UTC(),
				})
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				return ErrPieceworkRateVersionConflict
			}
			rate.Version = nextVersion
		}

		return recordLegacyAuditEntryWithContext(ctx, tx, "PieceworkRate", rate.ID, "save", nil)
	})
}

func (s *PieceworkService) PatchPieceworkRate(
	ctx context.Context,
	id string,
	command PieceworkRatePatchCommand,
	expectedVersion int64,
) (PieceworkRateDTO, error) {
	var updated models.PieceworkRate
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var existing models.PieceworkRate
		if err := tx.First(&existing, "id = ?", strings.TrimSpace(id)).Error; err != nil {
			return err
		}
		if expectedVersion <= 0 || existing.Version != expectedVersion {
			return ErrPieceworkRateVersionConflict
		}
		if err := applyPieceworkRatePatch(&existing, command); err != nil {
			return err
		}
		if err := normalizeAndValidatePieceworkRate(tx, &existing); err != nil {
			return err
		}
		if err := ensurePieceworkRateIntervalAvailable(tx, &existing, existing.ID); err != nil {
			return err
		}

		nextVersion := expectedVersion + 1
		result := tx.Model(&models.PieceworkRate{}).
			Where("id = ? AND version = ?", existing.ID, expectedVersion).
			Updates(map[string]interface{}{
				"product_id":      existing.ProductID,
				"process_step_id": nullablePieceworkID(existing.ProcessStepID),
				"route_step_id":   nullablePieceworkID(existing.RouteStepID),
				"process_code":    existing.ProcessCode,
				"process_name":    existing.ProcessName,
				"unit":            existing.Unit,
				"unit_price":      existing.UnitPrice,
				"currency":        existing.Currency,
				"effective_from":  existing.EffectiveFrom,
				"effective_to":    existing.EffectiveTo,
				"status":          existing.Status,
				"remarks":         existing.Remarks,
				"version":         nextVersion,
				"operator":        auditOperatorFromContext(ctx),
				"updated_at":      time.Now().UTC(),
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrPieceworkRateVersionConflict
		}

		return tx.Preload("ProcessStep").Preload("RouteStep").First(&updated, "id = ?", existing.ID).Error
	})
	if err != nil {
		return PieceworkRateDTO{}, err
	}
	return mapPieceworkRateToDTO(updated), nil
}

func (s *PieceworkService) DeletePieceworkRate(ctx context.Context, id string, expectedVersion int64) error {
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var existing models.PieceworkRate
		if err := tx.First(&existing, "id = ?", strings.TrimSpace(id)).Error; err != nil {
			return err
		}
		if expectedVersion <= 0 || existing.Version != expectedVersion {
			return ErrPieceworkRateVersionConflict
		}
		result := tx.Model(&models.PieceworkRate{}).
			Where("id = ? AND version = ?", existing.ID, expectedVersion).
			Delete(&models.PieceworkRate{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrPieceworkRateVersionConflict
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, "PieceworkRate", existing.ID, "delete", nil)
	})
}

func normalizeAndValidatePieceworkRate(tx *gorm.DB, rate *models.PieceworkRate) error {
	rate.ProductID = strings.TrimSpace(rate.ProductID)
	rate.Unit = strings.TrimSpace(rate.Unit)
	rate.Currency = strings.TrimSpace(rate.Currency)
	rate.Status = strings.ToLower(strings.TrimSpace(rate.Status))
	rate.Remarks = strings.TrimSpace(rate.Remarks)

	if rate.ProductID == "" {
		return fmt.Errorf("%w: productId is required", ErrInvalidPieceworkRate)
	}
	if rate.Unit == "" {
		rate.Unit = "PCS"
	}
	if rate.Currency == "" {
		rate.Currency = "CNY"
	}
	if rate.Status == "" {
		rate.Status = "active"
	}
	if rate.UnitPrice < 0 {
		return fmt.Errorf("%w: unitPrice cannot be negative", ErrInvalidPieceworkRate)
	}
	if rate.EffectiveFrom == nil {
		value := time.Now().UTC()
		rate.EffectiveFrom = &value
	}
	if rate.EffectiveTo != nil && !rate.EffectiveTo.After(*rate.EffectiveFrom) {
		return fmt.Errorf("%w: effectiveTo must be after effectiveFrom", ErrInvalidPieceworkRate)
	}

	processStepID := optionalPieceworkID(rate.ProcessStepID)
	routeStepID := optionalPieceworkID(rate.RouteStepID)

	if routeStepID != "" {
		var routeStep models.ProductionRouteStep
		if err := tx.Preload("ProcessStep").First(&routeStep, "id = ?", routeStepID).Error; err != nil {
			return fmt.Errorf("%w: routeStepId does not exist", ErrInvalidPieceworkRate)
		}
		if routeStep.ProcessStepID != "" && processStepID != "" && routeStep.ProcessStepID != processStepID {
			return fmt.Errorf("%w: routeStepId does not match processStepId", ErrInvalidPieceworkRate)
		}
		if routeStep.ProcessStepID == "" {
			return fmt.Errorf("%w: routeStepId has no processStepId", ErrInvalidPieceworkRate)
		}
		processStepID = routeStep.ProcessStepID
		rate.ProcessStepID = &processStepID
		var route models.ProductionRoute
		if err := tx.First(&route, "id = ?", routeStep.RouteID).Error; err != nil {
			return fmt.Errorf("%w: route for routeStepId does not exist", ErrInvalidPieceworkRate)
		}
		if route.ProductID != "" && route.ProductID != rate.ProductID {
			return fmt.Errorf("%w: routeStepId does not belong to productId", ErrInvalidPieceworkRate)
		}
	}

	if processStepID == "" {
		return fmt.Errorf("%w: processStepId is required", ErrInvalidPieceworkRate)
	}

	var process models.ProcessStep
	if err := tx.First(&process, "id = ?", processStepID).Error; err != nil {
		return fmt.Errorf("%w: processStepId does not exist", ErrInvalidPieceworkRate)
	}
	rate.ProcessCode = process.Code
	rate.ProcessName = process.Name
	return nil
}

func ensurePieceworkRateIntervalAvailable(tx *gorm.DB, rate *models.PieceworkRate, excludeID string) error {
	scopeColumn := "process_step_id"
	scopeValue := optionalPieceworkID(rate.ProcessStepID)
	if optionalPieceworkID(rate.RouteStepID) != "" {
		scopeColumn = "route_step_id"
		scopeValue = optionalPieceworkID(rate.RouteStepID)
	}
	if scopeValue == "" || !strings.EqualFold(rate.Status, "active") {
		return nil
	}

	query := tx.Model(&models.PieceworkRate{}).
		Where("product_id = ? AND "+scopeColumn+" = ? AND LOWER(status) = ?", rate.ProductID, scopeValue, "active").
		Where("COALESCE(effective_to, ?) > ?", time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC), rate.EffectiveFrom)
	if rate.EffectiveTo != nil {
		query = query.Where("COALESCE(effective_from, effective_at) < ?", rate.EffectiveTo)
	}
	if excludeID != "" {
		query = query.Where("id <> ?", excludeID)
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return fmt.Errorf("%w: effective interval overlaps another active rate", ErrInvalidPieceworkRate)
	}
	return nil
}

func applyPieceworkRatePatch(
	rate *models.PieceworkRate,
	command PieceworkRatePatchCommand,
) error {
	if command.ProductID.Set {
		if command.ProductID.Value == nil {
			return fmt.Errorf("%w: productId cannot be null", ErrInvalidPieceworkRate)
		}
		rate.ProductID = *command.ProductID.Value
	}
	if command.ProcessStepID.Set {
		rate.ProcessStepID = pieceworkIDPointerFromPatch(command.ProcessStepID.Value)
	}
	if command.RouteStepID.Set {
		rate.RouteStepID = pieceworkIDPointerFromPatch(command.RouteStepID.Value)
	}
	if command.Unit.Set {
		rate.Unit = stringFromPatch(command.Unit.Value)
	}
	if command.UnitPrice.Set {
		if command.UnitPrice.Value == nil {
			return fmt.Errorf("%w: unitPrice cannot be null", ErrInvalidPieceworkRate)
		}
		rate.UnitPrice = *command.UnitPrice.Value
	}
	if command.Currency.Set {
		rate.Currency = stringFromPatch(command.Currency.Value)
	}
	if command.EffectiveFrom.Set {
		if command.EffectiveFrom.Value == nil {
			return fmt.Errorf("%w: effectiveFrom cannot be null", ErrInvalidPieceworkRate)
		}
		rate.EffectiveFrom = command.EffectiveFrom.Value
	}
	if command.EffectiveTo.Set {
		rate.EffectiveTo = command.EffectiveTo.Value
	}
	if command.Status.Set {
		rate.Status = stringFromPatch(command.Status.Value)
	}
	if command.Remarks.Set {
		rate.Remarks = stringFromPatch(command.Remarks.Value)
	}
	return nil
}

func parsePieceworkTime(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" || value == "null" {
		return nil, nil
	}
	return parsePieceworkTimeValue(value)
}

func parsePieceworkTimeValue(value interface{}) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	text, ok := value.(string)
	if !ok {
		return nil, fmt.Errorf("unsupported time value")
	}
	text = strings.TrimSpace(text)
	if text == "" || text == "null" {
		return nil, nil
	}
	for _, format := range []string{time.RFC3339Nano, "2006-01-02"} {
		if parsed, err := time.Parse(format, text); err == nil {
			parsed = parsed.UTC()
			return &parsed, nil
		}
	}
	return nil, fmt.Errorf("unsupported time format %q", text)
}

func stringFromPatch(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func nullablePieceworkID(value *string) interface{} {
	if normalized := optionalPieceworkID(value); normalized != "" {
		return normalized
	}
	return nil
}

func pieceworkIDPointerFromPatch(value *string) *string {
	if value == nil {
		return nil
	}
	valueCopy := strings.TrimSpace(*value)
	if valueCopy == "" {
		return nil
	}
	return &valueCopy
}

func ValidatePieceworkRateDelta(delta map[string]json.RawMessage) error {
	return validateSupportedTopLevelDeltaKeys(
		delta,
		"productId",
		"processStepId",
		"routeStepId",
		"unit",
		"unitPrice",
		"currency",
		"effectiveFrom",
		"effectiveTo",
		"status",
		"remarks",
	)
}
