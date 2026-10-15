package services

import (
	"context"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"strings"
	"time"
	"xdfc-server/models"
)

var ErrInvalidPieceworkPayItem = errors.New("invalid payroll item")

type PieceworkPayItemCommand struct {
	ID      string `json:"id"`
	Code    string `json:"code"`
	Name    string `json:"name"`
	Unit    string `json:"unit"`
	Status  string `json:"status"`
	Remarks string `json:"remarks"`
	Version int64  `json:"version"`
}

type PieceworkPayItemService struct{ txManager transactionManager }

func ListPieceworkPayItems(ctx context.Context) ([]models.PieceworkPayItem, error) {
	return NewPieceworkPayItemService(defaultServiceRuntime().txManager).ListPieceworkPayItems(ctx)
}

func SavePieceworkPayItem(ctx context.Context, command PieceworkPayItemCommand) (models.PieceworkPayItem, error) {
	return NewPieceworkPayItemService(defaultServiceRuntime().txManager).SavePieceworkPayItem(ctx, command)
}

func NewPieceworkPayItemService(manager transactionManager) *PieceworkPayItemService {
	return &PieceworkPayItemService{txManager: manager}
}

func (s *PieceworkPayItemService) ListPieceworkPayItems(ctx context.Context) ([]models.PieceworkPayItem, error) {
	items := []models.PieceworkPayItem{}
	err := s.txManager.DB().WithContext(ctx).Order("code, id").Find(&items).Error
	return items, err
}

func (s *PieceworkPayItemService) SavePieceworkPayItem(ctx context.Context, command PieceworkPayItemCommand) (models.PieceworkPayItem, error) {
	item := models.PieceworkPayItem{Code: strings.ToUpper(strings.TrimSpace(command.Code)), Name: strings.TrimSpace(command.Name), Unit: strings.TrimSpace(command.Unit), Status: strings.ToLower(strings.TrimSpace(command.Status)), Remarks: strings.TrimSpace(command.Remarks)}
	item.ID = normalizeUUIDIdentity(command.ID)
	if item.Status == "" {
		item.Status = "active"
	}
	if item.ID != "" {
		if _, err := uuid.Parse(item.ID); err != nil {
			return item, fmt.Errorf("%w: id must be a UUID", ErrInvalidPieceworkPayItem)
		}
	}
	if len(item.Code) > 100 {
		return item, fmt.Errorf("%w: item code must be at most 100 characters", ErrInvalidPieceworkPayItem)
	}
	if item.Name == "" || len(item.Name) > 255 || item.Unit == "" || len(item.Unit) > 20 || (item.Status != "active" && item.Status != "inactive") {
		return item, fmt.Errorf("%w: name, unit and active/inactive status are required", ErrInvalidPieceworkPayItem)
	}
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		tx = tx.WithContext(ctx)
		var before *models.PieceworkPayItem
		if item.ID == "" {
			item.ID, item.Version = uuid.NewString(), 1
			if item.Code == "" {
				item.Code = "PAY-" + strings.ToUpper(strings.ReplaceAll(item.ID, "-", ""))
			}
			if err := tx.Create(&item).Error; err != nil {
				if isDatabaseUniqueViolation(err) {
					return fmt.Errorf("%w: item code must be unique", ErrInvalidPieceworkPayItem)
				}
				return err
			}
		} else {
			var existing models.PieceworkPayItem
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&existing, "id = ?", item.ID).Error; err != nil {
				return err
			}
			if command.Version <= 0 || command.Version != existing.Version {
				return ErrPieceworkRateVersionConflict
			}
			if item.Code == "" {
				item.Code = existing.Code
			}
			before = &existing
			// Existing rates keep their unit; a new unit needs a separate pay item.
			if item.Unit != existing.Unit {
				var rates int64
				if err := tx.Unscoped().Model(&models.PieceworkRate{}).Where("pay_item_id = ?", item.ID).Count(&rates).Error; err != nil {
					return err
				}
				if rates > 0 {
					return fmt.Errorf("%w: a used item's unit is immutable", ErrInvalidPieceworkPayItem)
				}
			}
			item.Version = existing.Version + 1
			result := tx.Model(&models.PieceworkPayItem{}).Where("id = ? AND version = ?", item.ID, command.Version).Updates(map[string]any{"code": item.Code, "name": item.Name, "unit": item.Unit, "status": item.Status, "remarks": item.Remarks, "version": item.Version, "updated_at": time.Now().UTC()})
			if result.Error != nil {
				if isDatabaseUniqueViolation(result.Error) {
					return fmt.Errorf("%w: item code must be unique", ErrInvalidPieceworkPayItem)
				}
				return result.Error
			}
			if result.RowsAffected != 1 {
				return ErrPieceworkRateVersionConflict
			}
		}
		if err := recordPieceworkPayrollSnapshotAudit(ctx, tx, "PieceworkPayItem", item.ID, "save", map[string]any{"before": before, "after": item}); err != nil {
			return err
		}
		return tx.First(&item, "id = ?", item.ID).Error
	})
	return item, err
}

// Serializes rate maintenance for the same pay item.
func lockActivePieceworkPayItemTx(tx *gorm.DB, id, unit string) (models.PieceworkPayItem, error) {
	var item models.PieceworkPayItem
	if _, err := uuid.Parse(id); err != nil {
		return item, fmt.Errorf("%w: payItemId must be a UUID", ErrInvalidPieceworkPayItem)
	}
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&item, "id = ?", id).Error; err != nil {
		return item, err
	}
	if item.Status != "active" || item.Unit != unit {
		return item, fmt.Errorf("%w: item must be active and unit must match", ErrInvalidPieceworkPayItem)
	}
	return item, nil
}
