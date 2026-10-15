package services

import (
	"context"
	"errors"
	"fmt"
	"gorm.io/gorm"
	"strings"
	"time"
	"xdfc-server/models"
)

var ErrPieceworkRateNotFound = errors.New("piecework rate not found")

type PieceworkRateLookup struct {
	PayItemID string
	Unit      string
	At        time.Time
}

type PieceworkRateMatch struct{ Rate models.PieceworkRate }
type PieceworkRateResolver struct{ txManager transactionManager }

func NewPieceworkRateResolver(manager transactionManager) *PieceworkRateResolver {
	return &PieceworkRateResolver{txManager: manager}
}

func ResolvePieceworkRate(ctx context.Context, lookup PieceworkRateLookup) (PieceworkRateMatch, error) {
	return NewPieceworkRateResolver(defaultServiceRuntime().txManager).Resolve(ctx, lookup)
}

func (r *PieceworkRateResolver) Resolve(ctx context.Context, lookup PieceworkRateLookup) (PieceworkRateMatch, error) {
	return resolvePieceworkRateForPayrollItemTx(ctx, r.txManager.DB(), lookup)
}

func resolvePieceworkRateForPayrollItemTx(ctx context.Context, tx *gorm.DB, lookup PieceworkRateLookup) (PieceworkRateMatch, error) {
	lookup.At = lookup.At.UTC()
	if strings.TrimSpace(lookup.PayItemID) == "" || strings.TrimSpace(lookup.Unit) == "" {
		return PieceworkRateMatch{}, fmt.Errorf("%w: payItemId and unit are required", ErrInvalidPieceworkRate)
	}
	if err := validatePieceworkCalendarDate(lookup.At); err != nil {
		return PieceworkRateMatch{}, fmt.Errorf("%w: %v", ErrInvalidPieceworkRate, err)
	}
	rates := []models.PieceworkRate{}
	err := tx.WithContext(ctx).Where("pay_item_id = ? AND unit = ? AND status = 'active'", lookup.PayItemID, lookup.Unit).
		Where("effective_from <= ? AND (effective_to IS NULL OR effective_to > ?)", lookup.At, lookup.At).Limit(2).Find(&rates).Error
	if err != nil {
		return PieceworkRateMatch{}, err
	}
	if len(rates) == 0 {
		return PieceworkRateMatch{}, ErrPieceworkRateNotFound
	}
	if len(rates) != 1 {
		return PieceworkRateMatch{}, fmt.Errorf("%w: ambiguous overlapping payroll rates", ErrInvalidPieceworkRate)
	}
	return PieceworkRateMatch{Rate: rates[0]}, nil
}
