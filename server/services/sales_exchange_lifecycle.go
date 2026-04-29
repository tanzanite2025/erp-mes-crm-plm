package services

import "strings"

const (
	SalesExchangeStatusDraft               = "Draft"
	SalesExchangeStatusOldItemReceived     = "OldItemReceived"
	SalesExchangeStatusReplacementPrepared = "ReplacementPrepared"
	SalesExchangeStatusReplacementShipped  = "ReplacementShipped"
	SalesExchangeStatusClosed              = "Closed"
	SalesExchangeStatusCanceled            = "Canceled"
)

func normalizeSalesExchangeStatus(raw string) string {
	trimmed := strings.TrimSpace(raw)
	switch {
	case strings.EqualFold(trimmed, SalesExchangeStatusDraft):
		return SalesExchangeStatusDraft
	case strings.EqualFold(trimmed, SalesExchangeStatusOldItemReceived):
		return SalesExchangeStatusOldItemReceived
	case strings.EqualFold(trimmed, SalesExchangeStatusReplacementPrepared):
		return SalesExchangeStatusReplacementPrepared
	case strings.EqualFold(trimmed, SalesExchangeStatusReplacementShipped):
		return SalesExchangeStatusReplacementShipped
	case strings.EqualFold(trimmed, SalesExchangeStatusClosed):
		return SalesExchangeStatusClosed
	case strings.EqualFold(trimmed, SalesExchangeStatusCanceled):
		return SalesExchangeStatusCanceled
	default:
		return trimmed
	}
}

func isTerminalSalesExchangeStatus(status string) bool {
	normalized := normalizeSalesExchangeStatus(status)
	return normalized == SalesExchangeStatusClosed || normalized == SalesExchangeStatusCanceled
}
