package handlers

import (
	"net/http"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type customerSalesClosureSummaryRow struct {
	CustomerID         string `gorm:"column:customer_id"`
	LastOrderDate      string `gorm:"column:last_order_date"`
	OpenOrderCount     int64  `gorm:"column:open_order_count"`
	CanceledOrderCount int64  `gorm:"column:canceled_order_count"`
	TotalOrders        int64  `gorm:"column:total_orders"`
}

type CustomerSalesClosureSummaryResponse struct {
	CustomerID          string `json:"customerId"`
	HasOpenOrders       bool   `json:"hasOpenOrders"`
	OpenOrderCount      int64  `json:"openOrderCount"`
	ClosedOrderCount    int64  `json:"closedOrderCount"`
	CanceledOrderCount  int64  `json:"canceledOrderCount"`
	EffectiveOrderCount int64  `json:"effectiveOrderCount"`
	LastOrderDate       string `json:"lastOrderDate"`
	DaysSinceLastOrder  *int   `json:"daysSinceLastOrder,omitempty"`
	TotalOrders         int64  `json:"totalOrders"`
}

type CustomerSalesClosureSummaryMetadata struct {
	Pagination services.PartnerListPaginationMeta `json:"pagination"`
	Stats      services.CustomerListStats         `json:"stats"`
}

type CustomerSalesClosureSummaryListResponse struct {
	Items    []CustomerSalesClosureSummaryResponse `json:"items"`
	Total    int64                                 `json:"total"`
	Metadata CustomerSalesClosureSummaryMetadata   `json:"metadata"`
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
			COALESCE(MAX(so.order_date), '') AS last_order_date,
			COALESCE(SUM(CASE WHEN LOWER(TRIM(so.status)) IN ('draft', 'pending', 'inprogress', 'in_progress', 'in progress') THEN 1 ELSE 0 END), 0) AS open_order_count,
			COALESCE(SUM(CASE WHEN LOWER(TRIM(so.status)) IN ('canceled', 'cancelled', 'voided', 'void') THEN 1 ELSE 0 END), 0) AS canceled_order_count,
			COUNT(DISTINCT so.id) AS total_orders
		`).
		Where("so.deleted_at IS NULL AND COALESCE(so.customer_id, '') <> ''").
		Group("so.customer_id").
		Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to aggregate customer sales closure summary"})
		return
	}

	items := make([]CustomerSalesClosureSummaryResponse, 0, len(rows))
	today := time.Now().In(time.Local)
	for _, row := range rows {
		effectiveOrderCount := row.TotalOrders - row.CanceledOrderCount
		if effectiveOrderCount < 0 {
			effectiveOrderCount = 0
		}
		effectiveOpenOrderCount := row.OpenOrderCount
		if effectiveOpenOrderCount > effectiveOrderCount {
			effectiveOpenOrderCount = effectiveOrderCount
		}
		closedOrderCount := effectiveOrderCount - effectiveOpenOrderCount
		if closedOrderCount < 0 {
			closedOrderCount = 0
		}

		item := CustomerSalesClosureSummaryResponse{
			CustomerID:          strings.TrimSpace(row.CustomerID),
			HasOpenOrders:       effectiveOpenOrderCount > 0,
			OpenOrderCount:      effectiveOpenOrderCount,
			ClosedOrderCount:    closedOrderCount,
			CanceledOrderCount:  row.CanceledOrderCount,
			EffectiveOrderCount: effectiveOrderCount,
			LastOrderDate:       strings.TrimSpace(row.LastOrderDate),
			TotalOrders:         row.TotalOrders,
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

	total := int64(len(items))
	baseMetadata, err := services.BuildCustomerListMetadata(total, 1, len(items))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to aggregate customer sales closure metadata"})
		return
	}
	metadata := CustomerSalesClosureSummaryMetadata{
		Pagination: baseMetadata.Pagination,
		Stats:      baseMetadata.Stats,
	}

	c.JSON(http.StatusOK, CustomerSalesClosureSummaryListResponse{
		Items:    items,
		Total:    total,
		Metadata: metadata,
	})
}
