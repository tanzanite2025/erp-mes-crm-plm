package handlers

import (
	"fmt"
	"strings"
)

func appendLimitedSample(samples *[]string, sample string, limit int) {
	if len(*samples) >= limit {
		return
	}
	*samples = append(*samples, sample)
}

func formatSummaryWithSamples(base string, sections map[string][]string) string {
	var parts []string
	for label, values := range sections {
		if len(values) == 0 {
			continue
		}
		parts = append(parts, fmt.Sprintf("%s=[%s]", label, strings.Join(values, ",")))
	}
	if len(parts) == 0 {
		return base
	}
	return base + " " + strings.Join(parts, " ")
}

func buildOrgBulkSyncSummary(created, parentChanged, typeChanged, managerChanged int, parentSamples, typeSamples, managerSamples []string) string {
	base := fmt.Sprintf(
		"sensitivity=HIGH created=%d parent_changed=%d type_changed=%d manager_changed=%d",
		created, parentChanged, typeChanged, managerChanged,
	)
	return formatSummaryWithSamples(base, map[string][]string{
		"parent_samples":  parentSamples,
		"type_samples":    typeSamples,
		"manager_samples": managerSamples,
	})
}

func buildEmployeeBulkSyncSummary(created, statusChanged, deptChanged, lineChanged, processChanged int, statusSamples, deptSamples []string) string {
	base := fmt.Sprintf(
		"sensitivity=HIGH created=%d status_changed=%d dept_changed=%d line_changed=%d process_changed=%d",
		created, statusChanged, deptChanged, lineChanged, processChanged,
	)
	return formatSummaryWithSamples(base, map[string][]string{
		"status_samples": statusSamples,
		"dept_samples":   deptSamples,
	})
}

func buildMaterialBulkSyncSummary(created, statusChanged, categoryChanged, supplierChanged, minStockChanged, costPriceChanged int, statusSamples, categorySamples []string) string {
	base := fmt.Sprintf(
		"sensitivity=MEDIUM created=%d status_changed=%d category_changed=%d supplier_changed=%d min_stock_changed=%d cost_price_changed=%d",
		created, statusChanged, categoryChanged, supplierChanged, minStockChanged, costPriceChanged,
	)
	return formatSummaryWithSamples(base, map[string][]string{
		"status_samples":   statusSamples,
		"category_samples": categorySamples,
	})
}

func buildInventoryBulkSyncSummary(newRecords, quantityChanged, quantityIncrease, quantityDecrease, categoryChanged, batchChanged int, quantitySamples, categorySamples []string) string {
	base := fmt.Sprintf(
		"sensitivity=CRITICAL new_records=%d quantity_changed=%d quantity_inc=%d quantity_dec=%d category_changed=%d batch_changed=%d",
		newRecords, quantityChanged, quantityIncrease, quantityDecrease, categoryChanged, batchChanged,
	)
	return formatSummaryWithSamples(base, map[string][]string{
		"quantity_samples": quantitySamples,
		"category_samples": categorySamples,
	})
}
