package services

import (
	"context"
	"errors"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var ErrPieceworkRateNotFound = errors.New("piecework rate not found")

type PieceworkRateMatchKind string

const (
	PieceworkRateMatchByRouteStep   PieceworkRateMatchKind = "route_step"
	PieceworkRateMatchByProcessStep PieceworkRateMatchKind = "process_step"
)

// PieceworkRateLookup is the only input shape used by rate resolution.
// Names and process codes are intentionally absent because they are display
// snapshots, not stable matching identities.
type PieceworkRateLookup struct {
	ProductID     string
	RouteStepID   string
	ProcessStepID string
	At            time.Time
}

type PieceworkRateMatch struct {
	Rate models.PieceworkRate
	Kind PieceworkRateMatchKind
}

type PieceworkRateResolver struct {
	db *gorm.DB
}

func NewPieceworkRateResolver(txManager transactionManager) *PieceworkRateResolver {
	return &PieceworkRateResolver{db: txManager.DB()}
}

var defaultPieceworkRateResolver = NewPieceworkRateResolver(defaultServiceRuntime().txManager)

func ResolvePieceworkRate(ctx context.Context, lookup PieceworkRateLookup) (PieceworkRateMatch, error) {
	return defaultPieceworkRateResolver.Resolve(ctx, lookup)
}

func (r *PieceworkRateResolver) Resolve(
	ctx context.Context,
	lookup PieceworkRateLookup,
) (PieceworkRateMatch, error) {
	lookup.ProductID = strings.TrimSpace(lookup.ProductID)
	lookup.RouteStepID = strings.TrimSpace(lookup.RouteStepID)
	lookup.ProcessStepID = strings.TrimSpace(lookup.ProcessStepID)
	if lookup.ProductID == "" {
		return PieceworkRateMatch{}, fmtPieceworkRateLookupError("productId is required")
	}
	if lookup.RouteStepID == "" && lookup.ProcessStepID == "" {
		return PieceworkRateMatch{}, fmtPieceworkRateLookupError("routeStepId or processStepId is required")
	}
	if lookup.At.IsZero() {
		lookup.At = time.Now().UTC()
	} else {
		lookup.At = lookup.At.UTC()
	}

	baseQuery := func() *gorm.DB {
		return r.db.WithContext(ctx).
			Where("product_id = ?", lookup.ProductID).
			Where("LOWER(status) = ?", "active").
			Where("effective_from <= ?", lookup.At).
			Where("(effective_to IS NULL OR effective_to > ?)", lookup.At)
	}

	if lookup.RouteStepID != "" {
		var rate models.PieceworkRate
		err := baseQuery().
			Where("route_step_id = ?", lookup.RouteStepID).
			Order("effective_from DESC, created_at DESC").
			First(&rate).Error
		if err == nil {
			return PieceworkRateMatch{
				Rate: rate,
				Kind: PieceworkRateMatchByRouteStep,
			}, nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return PieceworkRateMatch{}, err
		}
	}

	if lookup.ProcessStepID == "" {
		return PieceworkRateMatch{}, ErrPieceworkRateNotFound
	}

	var rate models.PieceworkRate
	err := baseQuery().
		Where("route_step_id IS NULL").
		Where("process_step_id = ?", lookup.ProcessStepID).
		Order("effective_from DESC, created_at DESC").
		First(&rate).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return PieceworkRateMatch{}, ErrPieceworkRateNotFound
	}
	if err != nil {
		return PieceworkRateMatch{}, err
	}
	return PieceworkRateMatch{
		Rate: rate,
		Kind: PieceworkRateMatchByProcessStep,
	}, nil
}

type pieceworkRateLookupError string

func (e pieceworkRateLookupError) Error() string {
	return "invalid piecework rate lookup: " + string(e)
}

func fmtPieceworkRateLookupError(message string) error {
	return pieceworkRateLookupError(message)
}
