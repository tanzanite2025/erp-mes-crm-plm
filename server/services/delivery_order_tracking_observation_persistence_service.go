package services

import (
	"context"
	"crypto/md5"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrInvalidDeliveryTrackingObservation = errors.New("invalid delivery tracking observation")

type DeliveryTrackingTrace struct {
	Time     time.Time
	Context  string
	Location string
}

// DeliveryOrderTrackingObservation carries provider facts, never business completion commands.
type DeliveryOrderTrackingObservation struct {
	TrackingNo      string
	CarrierCode     string
	ReportedStatus  string
	Traces          []DeliveryTrackingTrace
	ObservedAt      time.Time
	QuotaProviderID uint
}

// PersistDeliveryOrderTrackingObservation serializes both callback and query writes on the same order.
func PersistDeliveryOrderTrackingObservation(ctx context.Context, observation DeliveryOrderTrackingObservation) (int, error) {
	observation.TrackingNo = strings.TrimSpace(observation.TrackingNo)
	observation.CarrierCode = strings.TrimSpace(observation.CarrierCode)
	if observation.TrackingNo == "" || observation.CarrierCode == "" || observation.ObservedAt.IsZero() {
		return 0, ErrInvalidDeliveryTrackingObservation
	}
	if observation.ReportedStatus != "" && !isRecognizedDeliveryTrackingStatus(observation.ReportedStatus) {
		return 0, ErrInvalidDeliveryTrackingObservation
	}
	// A status without a dated trace cannot establish ordering against earlier facts.
	if observation.ReportedStatus != "" && len(observation.Traces) == 0 {
		return 0, ErrInvalidDeliveryTrackingObservation
	}
	traces := append([]DeliveryTrackingTrace(nil), observation.Traces...)
	for index := range traces {
		// PostgreSQL timestamps retain microseconds; use that precision for both identity and ordering.
		traces[index].Time = traces[index].Time.UTC().Truncate(time.Microsecond)
		traces[index].Context = strings.TrimSpace(traces[index].Context)
		traces[index].Location = strings.TrimSpace(traces[index].Location)
		if traces[index].Time.IsZero() || traces[index].Context == "" {
			return 0, ErrInvalidDeliveryTrackingObservation
		}
	}
	sort.Slice(traces, func(i, j int) bool {
		if traces[i].Time.Equal(traces[j].Time) {
			if traces[i].Context == traces[j].Context {
				return traces[i].Location < traces[j].Location
			}
			return traces[i].Context < traces[j].Context
		}
		return traces[i].Time.Before(traces[j].Time)
	})
	inserted := 0
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var order models.DeliveryOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("tracking_no = ? AND carrier_code = ?", observation.TrackingNo, observation.CarrierCode).First(&order).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrDeliveryTrackingOrderNotFound
			}
			return err
		}
		// Stored traces are the fact boundary, including observations written before this request.
		var previousLatest models.DeliveryTrackingDetail
		previousLatestResult := tx.Where("delivery_order_id = ?", order.ID).Order("time desc, id desc").First(&previousLatest)
		if previousLatestResult.Error != nil && !errors.Is(previousLatestResult.Error, gorm.ErrRecordNotFound) {
			return previousLatestResult.Error
		}
		watermark := order.LastEventAt
		if previousLatestResult.Error == nil && (watermark == nil || previousLatest.Time.After(*watermark)) {
			watermark = &previousLatest.Time
		}
		for _, trace := range traces {
			detail := models.DeliveryTrackingDetail{DeliveryOrderID: order.ID, Time: trace.Time, Context: trace.Context, Location: trace.Location,
				HashKey: generateDeliveryTrackingHash(order.TrackingNo, trace.Time, trace.Context)}
			result := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "hash_key"}}, DoNothing: true}).Create(&detail)
			if result.Error != nil {
				return result.Error
			}
			inserted += int(result.RowsAffected)
		}
		updates := map[string]any{}
		if order.LastPushAt == nil || observation.ObservedAt.After(*order.LastPushAt) {
			updates["last_push_at"] = observation.ObservedAt.UTC()
		}
		projectionChanged := false
		if len(traces) > 0 {
			latest := traces[len(traces)-1]
			if watermark == nil || latest.Time.After(*watermark) {
				status := observation.ReportedStatus
				if status == "" {
					status = deriveDeliveryTrackingStatus(order.Status, latest.Context)
				}
				// A later transit scan cannot undo delivery; an explicit return can follow signing.
				if order.Status == deliveryOrderStatusReturned || (order.Status == deliveryOrderStatusSigned && status != deliveryOrderStatusReturned) {
					status = order.Status
				}
				updates["status"] = status
				updates["last_event"] = latest.Context
				updates["last_location"] = latest.Location
				updates["last_event_at"] = latest.Time
				if status == deliveryOrderStatusSigned && order.Status != deliveryOrderStatusSigned {
					updates["signed_at"] = latest.Time
				}
				projectionChanged = true
			}
		}
		if inserted > 0 || projectionChanged {
			updates["version"] = order.Version + 1
		}
		if len(updates) > 0 {
			if err := tx.Model(&order).Updates(updates).Error; err != nil {
				return err
			}
		}
		if observation.QuotaProviderID != 0 {
			result := tx.Model(&models.LogisticsAPIProvider{}).Where("id = ? AND code = ?", observation.QuotaProviderID, observation.CarrierCode).Update("quota_used", gorm.Expr("quota_used + 1"))
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected != 1 {
				return errors.New("tracking quota provider no longer exists")
			}
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return inserted, nil
}

func isRecognizedDeliveryTrackingStatus(status string) bool {
	switch status {
	case deliveryOrderStatusPending, deliveryOrderStatusCollected, deliveryOrderStatusInTransit, deliveryOrderStatusDelivering, deliveryOrderStatusSigned, deliveryOrderStatusException, deliveryOrderStatusReturned:
		return true
	default:
		return false
	}
}

func generateDeliveryTrackingHash(trackingNo string, eventTime time.Time, context string) string {
	raw := fmt.Sprintf("%s|%s|%s", trackingNo, eventTime.UTC().Truncate(time.Microsecond).Format(time.RFC3339Nano), context)
	return fmt.Sprintf("%x", md5.Sum([]byte(raw)))
}

func ParseDeliveryTrackingEventTime(value string) (time.Time, bool) {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return time.Time{}, false
	}
	for _, layout := range []string{
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"2006-01-02",
		time.RFC3339,
	} {
		if parsed, err := time.ParseInLocation(layout, normalized, time.Local); err == nil {
			return parsed, true
		}
	}
	return time.Time{}, false
}
