package services

import (
	"errors"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func PatchSalesReturnLogistics(input PatchSalesReturnLogisticsInput) (SalesReturnResponse, error) {
	salesReturnID := strings.TrimSpace(input.SalesReturnID)
	if salesReturnID == "" {
		return SalesReturnResponse{}, errors.New("sales return id is required")
	}

	transportMode := normalizeSalesReturnTransportMode(input.TransportMode)
	if !isSalesReturnTransportModeKnown(transportMode) {
		return SalesReturnResponse{}, errors.New("transportMode is invalid")
	}

	shippedAt, err := parseOptionalSalesReturnTime(input.ShippedAtRaw, "shippedAt")
	if err != nil {
		return SalesReturnResponse{}, err
	}

	operator := strings.TrimSpace(input.Operator)
	if operator == "" {
		operator = "unknown"
	}
	trackingNo, carrier, shippedAt, logisticsNote := normalizeSalesReturnLogisticsPayload(
		transportMode,
		input.TrackingNo,
		input.Carrier,
		shippedAt,
		input.LogisticsNote,
	)

	var response SalesReturnResponse
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		var record models.SalesReturn
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Lines").First(&record, "id = ?", salesReturnID).Error; err != nil {
			return err
		}

		resolvedStatus, err := resolveSalesReturnLifecycleStatus(record.Status, input.Status, transportMode, trackingNo)
		if err != nil {
			return err
		}

		applySalesReturnLogisticsFields(&record, transportMode, trackingNo, carrier, shippedAt, logisticsNote, operator, time.Now())
		record.Status = resolvedStatus

		if err := tx.Save(&record).Error; err != nil {
			return err
		}
		if err := tx.Preload("Lines").First(&record, "id = ?", record.ID).Error; err != nil {
			return err
		}

		response = MapSalesReturnToResponse(record)
		return nil
	})
	if err != nil {
		return SalesReturnResponse{}, err
	}

	return response, nil
}

func parseOptionalSalesReturnTime(raw string, field string) (*time.Time, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}

	parsed, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return nil, errors.New(field + " 格式错误，需为 RFC3339")
	}
	return &parsed, nil
}

func normalizeSalesReturnLogisticsPayload(transportMode string, trackingNo string, carrier string, shippedAt *time.Time, logisticsNote string) (string, string, *time.Time, string) {
	normalizedTrackingNo := strings.TrimSpace(trackingNo)
	normalizedCarrier := strings.TrimSpace(carrier)
	normalizedLogisticsNote := strings.TrimSpace(logisticsNote)
	if !isSalesReturnTrackingRequired(transportMode) {
		return "", "", nil, normalizedLogisticsNote
	}
	return normalizedTrackingNo, normalizedCarrier, shippedAt, normalizedLogisticsNote
}

func applySalesReturnLogisticsFields(record *models.SalesReturn, transportMode string, trackingNo string, carrier string, shippedAt *time.Time, logisticsNote string, operator string, now time.Time) {
	if record == nil {
		return
	}

	previousTrackingNo := strings.TrimSpace(record.TrackingNo)
	previousTrackingFilledAt := record.TrackingFilledAt
	previousTrackingFilledBy := strings.TrimSpace(record.TrackingFilledBy)

	record.TransportMode = transportMode
	record.TrackingNo = trackingNo
	record.Carrier = carrier
	record.ShippedAt = shippedAt
	record.LogisticsNote = logisticsNote

	if trackingNo == "" {
		record.TrackingFilledAt = nil
		record.TrackingFilledBy = ""
		return
	}

	if previousTrackingNo == trackingNo && previousTrackingFilledAt != nil {
		record.TrackingFilledAt = previousTrackingFilledAt
		if previousTrackingFilledBy != "" {
			record.TrackingFilledBy = previousTrackingFilledBy
			return
		}
	}

	filledAt := now
	record.TrackingFilledAt = &filledAt
	record.TrackingFilledBy = operator
}
