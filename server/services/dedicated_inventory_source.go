package services

import (
	"errors"
	"strings"
)

const (
	DedicatedInventorySourceProductionOutsource = "PRODUCTION_OUTSOURCE"

	AfterSalesSourceSalesReturn              = "SALES_RETURN"
	AfterSalesSourceSalesExchangeOldItem     = "SALES_EXCHANGE_OLD_ITEM"
	AfterSalesSourceSalesExchangeReplacement = "SALES_EXCHANGE_REPLACEMENT"

	AfterSalesAuditSalesReturnInbound          = "SALES_RETURN_INBOUND"
	AfterSalesAuditSalesExchangeOldItemInbound = "SALES_EXCHANGE_OLD_ITEM_INBOUND"
)

var ErrDedicatedInventoryExecutionPath = errors.New(
	"dedicated inventory execution source must use its owning service",
)

var ErrAfterSalesExecutionDedicatedPath = ErrDedicatedInventoryExecutionPath

func isAfterSalesExecutionSourceType(raw string) bool {
	switch normalizeDedicatedInventorySourceType(raw) {
	case AfterSalesSourceSalesReturn,
		AfterSalesSourceSalesExchangeOldItem,
		AfterSalesSourceSalesExchangeReplacement:
		return true
	default:
		return false
	}
}

func isProductionOutsourceExecutionSourceType(raw string) bool {
	return normalizeDedicatedInventorySourceType(raw) == DedicatedInventorySourceProductionOutsource
}

func isDedicatedInventoryCategory(raw string) bool {
	return normalizeDedicatedInventorySourceType(raw) == ProductionOutsourceInventoryCategory
}

func isDedicatedInventoryExecutionSourceType(raw string) bool {
	return isAfterSalesExecutionSourceType(raw) || isProductionOutsourceExecutionSourceType(raw)
}

func normalizeDedicatedInventorySourceType(raw string) string {
	return strings.ToUpper(strings.TrimSpace(raw))
}
