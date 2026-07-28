package services

import (
	"errors"
	"strings"
)

const (
	AfterSalesSourceSalesReturn              = "SALES_RETURN"
	AfterSalesSourceSalesExchangeOldItem     = "SALES_EXCHANGE_OLD_ITEM"
	AfterSalesSourceSalesExchangeReplacement = "SALES_EXCHANGE_REPLACEMENT"

	AfterSalesAuditSalesReturnInbound          = "SALES_RETURN_INBOUND"
	AfterSalesAuditSalesExchangeOldItemInbound = "SALES_EXCHANGE_OLD_ITEM_INBOUND"
)

var ErrAfterSalesExecutionDedicatedPath = errors.New(
	"after-sales inventory execution must use its dedicated service",
)

func isAfterSalesExecutionSourceType(raw string) bool {
	switch strings.ToUpper(strings.TrimSpace(raw)) {
	case AfterSalesSourceSalesReturn,
		AfterSalesSourceSalesExchangeOldItem,
		AfterSalesSourceSalesExchangeReplacement:
		return true
	default:
		return false
	}
}
