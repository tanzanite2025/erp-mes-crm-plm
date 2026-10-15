package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"strings"
	"time"
	"xdfc-server/models"
)

var (
	ErrPieceworkRateVersionConflict = errors.New("piecework rate version conflict")
	ErrInvalidPieceworkRate         = errors.New("invalid piecework rate")
)

type PieceworkRateService struct{ txManager transactionManager }

func NewPieceworkRateService(manager transactionManager) *PieceworkRateService {
	return &PieceworkRateService{txManager: manager}
}

var defaultPieceworkRateService = NewPieceworkRateService(defaultServiceRuntime().txManager)

func ListPieceworkRates() ([]PieceworkRateDTO, error) {
	return defaultPieceworkRateService.ListPieceworkRates()
}
func CreatePieceworkRate(ctx context.Context, cmd PieceworkRateCommand) (PieceworkRateDTO, error) {
	return defaultPieceworkRateService.CreatePieceworkRate(ctx, cmd)
}
func UpdatePieceworkRate(ctx context.Context, id string, cmd PieceworkRateCommand, version int64) (PieceworkRateDTO, error) {
	return defaultPieceworkRateService.UpdatePieceworkRate(ctx, id, cmd, version)
}
func PatchPieceworkRate(ctx context.Context, id string, cmd PieceworkRatePatchCommand, version int64) (PieceworkRateDTO, error) {
	return defaultPieceworkRateService.PatchPieceworkRate(ctx, id, cmd, version)
}
func DeletePieceworkRate(ctx context.Context, id string, version int64) error {
	return defaultPieceworkRateService.DeletePieceworkRate(ctx, id, version)
}

func (s *PieceworkRateService) ListPieceworkRates() ([]PieceworkRateDTO, error) {
	rates := []models.PieceworkRate{}
	if err := s.txManager.DB().Order("created_at DESC, id").Find(&rates).Error; err != nil {
		return nil, err
	}
	result := make([]PieceworkRateDTO, 0, len(rates))
	for _, rate := range rates {
		result = append(result, mapPieceworkRateToDTO(rate))
	}
	return result, nil
}

func (s *PieceworkRateService) CreatePieceworkRate(ctx context.Context, command PieceworkRateCommand) (PieceworkRateDTO, error) {
	rate := pieceworkRateModelFromCommand(command)
	rate.ID, rate.Version = uuid.NewString(), 1
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		tx = tx.WithContext(ctx)
		if err := normalizeAndValidatePieceworkRate(tx, &rate); err != nil {
			return err
		}
		if err := ensurePieceworkRateIntervalAvailable(tx, &rate, ""); err != nil {
			return err
		}
		rate.Operator = auditOperatorFromContext(ctx)
		if err := tx.Create(&rate).Error; err != nil {
			return err
		}
		return recordPieceworkPayrollSnapshotAudit(ctx, tx, "PieceworkRate", rate.ID, "create", map[string]any{"after": mapPieceworkRateToDTO(rate)})
	})
	return mapPieceworkRateToDTO(rate), err
}

func (s *PieceworkRateService) UpdatePieceworkRate(ctx context.Context, id string, command PieceworkRateCommand, version int64) (PieceworkRateDTO, error) {
	patch := PieceworkRatePatchCommand{
		PayItemID:     PieceworkRatePatchField[string]{Set: true, Value: &command.PayItemID},
		Unit:          PieceworkRatePatchField[string]{Set: true, Value: &command.Unit},
		UnitPrice:     PieceworkRatePatchField[float64]{Set: true, Value: &command.UnitPrice},
		Currency:      PieceworkRatePatchField[string]{Set: true, Value: &command.Currency},
		EffectiveFrom: PieceworkRatePatchField[time.Time]{Set: true, Value: command.EffectiveFrom},
		EffectiveTo:   PieceworkRatePatchField[time.Time]{Set: true, Value: command.EffectiveTo},
		Status:        PieceworkRatePatchField[string]{Set: true, Value: &command.Status},
		Remarks:       PieceworkRatePatchField[string]{Set: true, Value: &command.Remarks},
	}
	return s.PatchPieceworkRate(ctx, id, patch, version)
}

func (s *PieceworkRateService) PatchPieceworkRate(ctx context.Context, id string, command PieceworkRatePatchCommand, version int64) (PieceworkRateDTO, error) {
	var rate models.PieceworkRate
	if strings.TrimSpace(id) == "" {
		return PieceworkRateDTO{}, fmt.Errorf("%w: id is required", ErrInvalidPieceworkRate)
	}
	if version <= 0 {
		return PieceworkRateDTO{}, ErrPieceworkRateVersionConflict
	}
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		tx = tx.WithContext(ctx)
		if err := tx.First(&rate, "id = ?", id).Error; err != nil {
			return err
		}
		if rate.Version != version {
			return ErrPieceworkRateVersionConflict
		}
		before := mapPieceworkRateToDTO(rate)
		if err := applyPieceworkRatePatch(&rate, command); err != nil {
			return err
		}
		if before.PayItemID != normalizeUUIDIdentity(rate.PayItemID) {
			var lockedItems []models.PieceworkPayItem
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id IN ?", []string{before.PayItemID, normalizeUUIDIdentity(rate.PayItemID)}).Order("id").Find(&lockedItems).Error; err != nil {
				return err
			}
		}
		if err := normalizeAndValidatePieceworkRate(tx, &rate); err != nil {
			return err
		}
		if err := ensurePieceworkRateIntervalAvailable(tx, &rate, id); err != nil {
			return err
		}
		rate.Version, rate.Operator = version+1, auditOperatorFromContext(ctx)
		result := tx.Model(&models.PieceworkRate{}).Where("id = ? AND version = ?", id, version).Updates(map[string]any{
			"pay_item_id": rate.PayItemID, "pay_item_code": rate.PayItemCode, "pay_item_name": rate.PayItemName,
			"unit": rate.Unit, "unit_price": rate.UnitPrice, "currency": rate.Currency, "effective_from": rate.EffectiveFrom, "effective_to": rate.EffectiveTo, "status": rate.Status, "remarks": rate.Remarks, "version": rate.Version, "operator": rate.Operator, "updated_at": time.Now().UTC(),
		})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrPieceworkRateVersionConflict
		}
		if err := recordPieceworkPayrollSnapshotAudit(ctx, tx, "PieceworkRate", id, "update", map[string]any{"before": before, "after": mapPieceworkRateToDTO(rate)}); err != nil {
			return err
		}
		return tx.First(&rate, "id = ?", id).Error
	})
	return mapPieceworkRateToDTO(rate), err
}

func (s *PieceworkRateService) DeletePieceworkRate(ctx context.Context, id string, version int64) error {
	if version <= 0 {
		return ErrPieceworkRateVersionConflict
	}
	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		tx = tx.WithContext(ctx)
		var rate models.PieceworkRate
		if err := tx.First(&rate, "id = ?", id).Error; err != nil {
			return err
		}
		if rate.Version != version {
			return ErrPieceworkRateVersionConflict
		}
		var item models.PieceworkPayItem
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&item, "id = ?", rate.PayItemID).Error; err != nil {
			return err
		}
		result := tx.Where("id = ? AND version = ?", id, version).Delete(&models.PieceworkRate{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrPieceworkRateVersionConflict
		}
		return recordPieceworkPayrollSnapshotAudit(ctx, tx, "PieceworkRate", id, "delete", map[string]any{"before": mapPieceworkRateToDTO(rate)})
	})
}

func pieceworkRateModelFromCommand(command PieceworkRateCommand) models.PieceworkRate {
	return models.PieceworkRate{PayItemID: command.PayItemID, Unit: command.Unit, UnitPrice: command.UnitPrice, Currency: command.Currency, EffectiveFrom: command.EffectiveFrom, EffectiveTo: command.EffectiveTo, Status: command.Status, Remarks: command.Remarks}
}

func normalizeAndValidatePieceworkRate(tx *gorm.DB, rate *models.PieceworkRate) error {
	rate.PayItemID = normalizeUUIDIdentity(rate.PayItemID)
	rate.Unit, rate.Currency, rate.Status, rate.Remarks = strings.TrimSpace(rate.Unit), strings.ToUpper(strings.TrimSpace(rate.Currency)), strings.ToLower(strings.TrimSpace(rate.Status)), strings.TrimSpace(rate.Remarks)
	if rate.Currency == "" {
		rate.Currency = "CNY"
	}
	if rate.Status == "" {
		rate.Status = "active"
	}
	if rate.Status != "active" && rate.Status != "inactive" {
		return fmt.Errorf("%w: unsupported status", ErrInvalidPieceworkRate)
	}
	if len(rate.Currency) != 3 || strings.IndexFunc(rate.Currency, func(r rune) bool { return r < 'A' || r > 'Z' }) >= 0 {
		return fmt.Errorf("%w: currency must be a three-letter code", ErrInvalidPieceworkRate)
	}
	if err := validatePieceworkDecimalPrecision(rate.UnitPrice, 999999.9999); err != nil {
		return fmt.Errorf("%w: unitPrice: %v", ErrInvalidPieceworkRate, err)
	}
	if rate.EffectiveFrom == nil {
		return fmt.Errorf("%w: effectiveFrom is required", ErrInvalidPieceworkRate)
	}
	start := rate.EffectiveFrom.UTC()
	rate.EffectiveFrom = &start
	if err := validatePieceworkCalendarDate(*rate.EffectiveFrom); err != nil {
		return fmt.Errorf("%w: effectiveFrom: %v", ErrInvalidPieceworkRate, err)
	}
	if rate.EffectiveTo != nil {
		end := rate.EffectiveTo.UTC()
		rate.EffectiveTo = &end
		if err := validatePieceworkCalendarDate(*rate.EffectiveTo); err != nil {
			return fmt.Errorf("%w: effectiveTo: %v", ErrInvalidPieceworkRate, err)
		}
		if !rate.EffectiveTo.After(*rate.EffectiveFrom) {
			return fmt.Errorf("%w: effectiveTo must be after effectiveFrom", ErrInvalidPieceworkRate)
		}
	}
	item, err := lockActivePieceworkPayItemTx(tx, rate.PayItemID, rate.Unit)
	if err != nil {
		return err
	}
	rate.PayItemCode, rate.PayItemName = item.Code, item.Name
	return nil
}

func ensurePieceworkRateIntervalAvailable(tx *gorm.DB, rate *models.PieceworkRate, excludeID string) error {
	if rate.Status != "active" {
		return nil
	}
	query := tx.Model(&models.PieceworkRate{}).Where("pay_item_id = ? AND unit = ? AND status = 'active'", rate.PayItemID, rate.Unit).
		Where("effective_to IS NULL OR effective_to > ?", rate.EffectiveFrom)
	if rate.EffectiveTo != nil {
		query = query.Where("effective_from < ?", rate.EffectiveTo)
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

func applyPieceworkRatePatch(rate *models.PieceworkRate, command PieceworkRatePatchCommand) error {
	if command.PayItemID.Set {
		rate.PayItemID = stringFromPatch(command.PayItemID.Value)
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

func parsePieceworkTime(value string) (*time.Time, error) { return parsePieceworkTimeValue(value) }
func parsePieceworkTimeValue(value interface{}) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	text, ok := value.(string)
	if !ok {
		return nil, fmt.Errorf("unsupported date value")
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
	return nil, fmt.Errorf("unsupported date format %q", text)
}
func stringFromPatch(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
func ValidatePieceworkRateDelta(delta map[string]json.RawMessage) error {
	return validateSupportedTopLevelDeltaKeys(delta, "payItemId", "unit", "unitPrice", "currency", "effectiveFrom", "effectiveTo", "status", "remarks")
}
