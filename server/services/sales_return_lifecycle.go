package services

import (
	"errors"
	"fmt"
	"strings"
)

const (
	SalesReturnStatusCreated   = "Created"
	SalesReturnStatusInTransit = "InTransit"
	SalesReturnStatusReceived  = "Received"
	SalesReturnStatusClosed    = "Closed"
	SalesReturnStatusCanceled  = "Canceled"
)

const (
	SalesReturnTransportModeCourier = "Courier"
	SalesReturnTransportModeOther   = "Other"
)

var salesReturnStatuses = []string{
	SalesReturnStatusCreated,
	SalesReturnStatusInTransit,
	SalesReturnStatusReceived,
	SalesReturnStatusClosed,
	SalesReturnStatusCanceled,
}

var salesReturnTransportModes = []string{
	SalesReturnTransportModeCourier,
	SalesReturnTransportModeOther,
}

func normalizeSalesReturnStatus(raw string) string {
	trimmed := strings.TrimSpace(raw)
	for _, candidate := range salesReturnStatuses {
		if strings.EqualFold(trimmed, candidate) {
			return candidate
		}
	}
	return trimmed
}

func normalizeSalesReturnTransportMode(raw string) string {
	trimmed := strings.TrimSpace(raw)
	for _, candidate := range salesReturnTransportModes {
		if strings.EqualFold(trimmed, candidate) {
			return candidate
		}
	}
	return trimmed
}

func isSalesReturnStatusKnown(status string) bool {
	normalized := normalizeSalesReturnStatus(status)
	for _, candidate := range salesReturnStatuses {
		if normalized == candidate {
			return true
		}
	}
	return false
}

func isSalesReturnTransportModeKnown(mode string) bool {
	normalized := normalizeSalesReturnTransportMode(mode)
	for _, candidate := range salesReturnTransportModes {
		if normalized == candidate {
			return true
		}
	}
	return false
}

func isSalesReturnTrackingRequired(mode string) bool {
	return normalizeSalesReturnTransportMode(mode) == SalesReturnTransportModeCourier
}

func deriveSalesReturnPendingTracking(mode string, trackingNo string, status string) bool {
	normalizedStatus := normalizeSalesReturnStatus(status)
	if normalizedStatus == SalesReturnStatusClosed || normalizedStatus == SalesReturnStatusCanceled {
		return false
	}
	return isSalesReturnTrackingRequired(mode) && strings.TrimSpace(trackingNo) == ""
}

func resolveSalesReturnLifecycleStatus(currentStatus string, requestedStatus string, transportMode string, trackingNo string) (string, error) {
	normalizedCurrent := normalizeSalesReturnStatus(currentStatus)
	if normalizedCurrent == "" {
		normalizedCurrent = SalesReturnStatusCreated
	}

	normalizedRequested := normalizeSalesReturnStatus(requestedStatus)
	if normalizedRequested == "" {
		if isSalesReturnTrackingRequired(transportMode) {
			if strings.TrimSpace(trackingNo) == "" {
				if normalizedCurrent == SalesReturnStatusInTransit {
					return SalesReturnStatusCreated, nil
				}
				return normalizedCurrent, nil
			}
			if normalizedCurrent == SalesReturnStatusCreated {
				return SalesReturnStatusInTransit, nil
			}
		}
		return normalizedCurrent, nil
	}

	return validateSalesReturnStatusTransition(normalizedCurrent, normalizedRequested, transportMode, trackingNo)
}

func validateSalesReturnStatusTransition(currentStatus string, nextStatus string, transportMode string, trackingNo string) (string, error) {
	normalizedCurrent := normalizeSalesReturnStatus(currentStatus)
	if normalizedCurrent == "" {
		normalizedCurrent = SalesReturnStatusCreated
	}
	normalizedNext := normalizeSalesReturnStatus(nextStatus)
	if !isSalesReturnStatusKnown(normalizedNext) {
		return "", fmt.Errorf("unsupported sales return status: %s", nextStatus)
	}
	if normalizedCurrent == normalizedNext {
		return normalizedNext, nil
	}

	allowedTransitions := map[string]map[string]struct{}{
		SalesReturnStatusCreated: {
			SalesReturnStatusInTransit: {},
			SalesReturnStatusReceived:  {},
			SalesReturnStatusCanceled:  {},
		},
		SalesReturnStatusInTransit: {
			SalesReturnStatusReceived: {},
			SalesReturnStatusCanceled: {},
		},
		SalesReturnStatusReceived: {
			SalesReturnStatusClosed:   {},
			SalesReturnStatusCanceled: {},
		},
		SalesReturnStatusClosed:   {},
		SalesReturnStatusCanceled: {},
	}

	if _, ok := allowedTransitions[normalizedCurrent][normalizedNext]; !ok {
		return "", fmt.Errorf("invalid sales return status transition: %s -> %s", normalizedCurrent, normalizedNext)
	}
	if normalizedNext == SalesReturnStatusInTransit && strings.TrimSpace(trackingNo) == "" {
		return "", errors.New("tracking no is required before moving to InTransit")
	}
	if normalizedNext == SalesReturnStatusClosed && isSalesReturnTrackingRequired(transportMode) && strings.TrimSpace(trackingNo) == "" {
		return "", errors.New("tracking no is required before closing courier return")
	}
	return normalizedNext, nil
}
