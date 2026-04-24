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
	SalesReturnStatusCompleted = "Completed"
)

var salesReturnStatuses = []string{
	SalesReturnStatusCreated,
	SalesReturnStatusInTransit,
	SalesReturnStatusReceived,
	SalesReturnStatusClosed,
	SalesReturnStatusCanceled,
}

func normalizeSalesReturnStatus(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if strings.EqualFold(trimmed, SalesReturnStatusCompleted) {
		return SalesReturnStatusClosed
	}
	for _, candidate := range salesReturnStatuses {
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

func deriveSalesReturnPendingTracking(trackingNo string, status string) bool {
	normalizedStatus := normalizeSalesReturnStatus(status)
	if normalizedStatus == SalesReturnStatusClosed || normalizedStatus == SalesReturnStatusCanceled {
		return false
	}
	return strings.TrimSpace(trackingNo) == ""
}

func resolveSalesReturnLifecycleStatus(currentStatus string, requestedStatus string, trackingNo string) (string, error) {
	normalizedCurrent := normalizeSalesReturnStatus(currentStatus)
	if normalizedCurrent == "" {
		normalizedCurrent = SalesReturnStatusCreated
	}

	normalizedRequested := normalizeSalesReturnStatus(requestedStatus)
	if normalizedRequested == "" {
		if strings.TrimSpace(trackingNo) == "" {
			if normalizedCurrent == SalesReturnStatusInTransit {
				return SalesReturnStatusCreated, nil
			}
			return normalizedCurrent, nil
		}
		if normalizedCurrent == SalesReturnStatusCreated {
			return SalesReturnStatusInTransit, nil
		}
		return normalizedCurrent, nil
	}

	return validateSalesReturnStatusTransition(normalizedCurrent, normalizedRequested, trackingNo)
}

func validateSalesReturnStatusTransition(currentStatus string, nextStatus string, trackingNo string) (string, error) {
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
	return normalizedNext, nil
}
