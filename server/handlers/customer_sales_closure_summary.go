package handlers

import (
	"net/http"
	"strings"
	"time"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
)

type customerSalesClosureSummaryRow struct {
	CustomerID      string `gorm:"column:customer_id"`
	LastOrderDate   string `gorm:"column:last_order_date"`
	OpenOrderCount  int64  `gorm:"column:open_order_count"`
	TotalOrders     int64  `gorm:"column:total_orders"`
}

type CustomerSalesClosureSummaryResponse struct {
	CustomerID         string `json:"customerId"`
	HasOpenOrders      bool   `json:"hasOpenOrders"`
	OpenOrderCount     int64  `json:"openOrderCount"`
	LastOrderDate      string `json:"lastOrderDate"`
	DaysSinceLastOrder *int   `json:"daysSinceLastOrder"`
	TotalOrders        int64  `json:"totalOrders"`
}

func parseSummaryOrderDate(value string) (time.Time, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return time.Time{}, false
	}

	layouts := []string{
		time.RFC3339,
		"2006-01-02",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
	}
	for _, layout := range layouts {
		parsed, err := time.Parse(layout, trimmed)
		if err == nil {
			return parsed, true
		}
	}
	return time.Time{}, false
}

func GetCustomerSalesClosureSummaryHandler(c *gin.Context) {
	var rows []customerSalesClosureSummaryRow
	if err := db.DB.Table("sales_orders AS so").
		Select(`
			so.customer_id AS customer_id,
			MAX(so.order_date) AS last_order_date,
			COALESCE(SUM(CASE WHEN so.status IN ('Draft', 'Pending', 'InProgress') THEN 1 ELSE 0 END), 0) AS open_order_count,
			COUNT(DISTINCT so.id) AS total_orders
		`).
		Where("so.is_deleted = ? AND COALESCE(so.customer_id, '') <> ''", false).
		Group("so.customer_id").
		Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to aggregate customer sales closure summary"})
		return
	}

	items := make([]CustomerSalesClosureSummaryResponse, 0, len(rows))
	today := time.Now().In(time.Local)
	for _, row := range rows {
		item := CustomerSalesClosureSummaryResponse{
			CustomerID:     strings.TrimSpace(row.CustomerID),
			HasOpenOrders:  row.OpenOrderCount > 0,
			OpenOrderCount: row.OpenOrderCount,
			LastOrderDate:  strings.TrimSpace(row.LastOrderDate),
			TotalOrders:    row.TotalOrders,
		}
		if parsedDate, ok := parseSummaryOrderDate(row.LastOrderDate); ok {
			days := int(today.Sub(parsedDate.In(time.Local)).Hours() / 24)
			if days < 0 {
				days = 0
			}
			item.DaysSinceLastOrder = &days
		}
		items = append(items, item)
	}

	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"total": len(items),
	})
}
