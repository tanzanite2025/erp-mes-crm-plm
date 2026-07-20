package handlers

import (
	"errors"
	"strings"
)

var (
	errInvalidLogisticsRecordType = errors.New("invalid logistics record type")
	errForbiddenLogisticsScope    = errors.New("forbidden logistics scope")
)

func resolveLogisticsRecordTypeScope(requested string, canReadTrading bool, canReadPurchase bool) (string, error) {
	normalized := strings.TrimSpace(requested)
	switch normalized {
	case "Receipt":
		if !canReadPurchase {
			return "", errForbiddenLogisticsScope
		}
		return normalized, nil
	case "Shipment":
		if !canReadTrading {
			return "", errForbiddenLogisticsScope
		}
		return normalized, nil
	case "":
		switch {
		case canReadTrading && canReadPurchase:
			return "", nil
		case canReadPurchase:
			return "Receipt", nil
		case canReadTrading:
			return "Shipment", nil
		default:
			return "", errForbiddenLogisticsScope
		}
	default:
		return "", errInvalidLogisticsRecordType
	}
}

func canReadDeliveryOrderBusinessType(bizType string, canReadTrading bool, canReadPurchase bool) bool {
	switch strings.ToLower(strings.TrimSpace(bizType)) {
	case "", "sales":
		return canReadTrading
	case "purchase":
		return canReadPurchase
	default:
		return false
	}
}
