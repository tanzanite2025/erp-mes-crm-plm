package services

import (
	"math"
	"strings"
	"time"
	"xdfc-server/models"
)

func calculateReceivableAmounts(order models.SalesOrder, bundle receivableOrderSettlementBundle) (float64, float64) {
	received := math.Round(bundle.receivedAmountByOrderID[order.ID]*100) / 100
	if strings.EqualFold(strings.TrimSpace(order.Status), "Canceled") {
		return received, 0
	}
	outstanding := math.Round((order.Amount-received)*100) / 100
	if outstanding < 0 {
		outstanding = 0
	}
	return received, outstanding
}

func deriveReceivableOrderStatus(order models.SalesOrder, outstanding float64, received float64) string {
	if strings.EqualFold(strings.TrimSpace(order.Status), "Canceled") {
		return models.LedgerStatusCancelled
	}
	if outstanding <= 0 {
		return models.LedgerStatusSettled
	}
	if isDatePast(resolveReceivableDueDate(order)) {
		return models.LedgerStatusOverdue
	}
	if received > 0 {
		return models.LedgerStatusPartial
	}
	return models.LedgerStatusOpen
}

func isReceivableOrderNotAllocatable(order models.SalesOrder, outstanding float64) bool {
	status := deriveReceivableOrderStatus(order, outstanding, 0)
	return strings.EqualFold(status, models.LedgerStatusCancelled) || strings.EqualFold(status, models.LedgerStatusSettled) || strings.EqualFold(status, models.LedgerStatusVoided)
}

func isDatePast(raw string) bool {
	value := strings.TrimSpace(raw)
	if value == "" {
		return false
	}
	date, err := time.Parse("2006-01-02", value)
	if err != nil {
		return false
	}
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	return date.Before(today)
}
