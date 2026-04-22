package handlers

import (
	"net/http"
	"strings"
	"time"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
)

type customerSalesReturnSummaryRow struct {
	CustomerID         string  `gorm:"column:customer_id"`
	ReturnedQuantity   float64 `gorm:"column:returned_quantity"`
	ReturnedOrderCount int64   `gorm:"column:returned_order_count"`
	LastReturnDate     string  `gorm:"column:last_return_date"`
	TotalOrders        int64   `gorm:"column:total_orders"`
}

type CustomerSalesReturnSummaryResponse struct {
	CustomerID         string  `json:"customerId"`
	ReturnedQuantity   float64 `json:"returnedQuantity"`
	ReturnedOrderCount int64   `json:"returnedOrderCount"`
	LastReturnDate     string  `json:"lastReturnDate"`
	TotalOrders        int64   `json:"totalOrders"`
}

func GetCustomerSalesReturnSummaryHandler(c *gin.Context) {
	var rows []customerSalesReturnSummaryRow
	if err := db.DB.Table("sales_orders AS so").
		Select(`
			so.customer_id AS customer_id,
			COUNT(DISTINCT so.id) AS total_orders,
			COALESCE(return_agg.returned_quantity, 0) AS returned_quantity,
			COALESCE(return_agg.returned_order_count, 0) AS returned_order_count,
			COALESCE(return_agg.last_return_date, '') AS last_return_date
		`).
		Joins(`
			LEFT JOIN (
				SELECT
					sr.customer_id AS customer_id,
					COALESCE(SUM(srl.quantity), 0) AS returned_quantity,
					COUNT(DISTINCT sr.sales_order_id) AS returned_order_count,
					CAST(MAX(sr.return_date) AS TEXT) AS last_return_date
				FROM sales_returns AS sr
				LEFT JOIN sales_return_lines AS srl ON srl.sales_return_id = sr.id
				WHERE sr.deleted_at IS NULL
				GROUP BY sr.customer_id
			) AS return_agg ON return_agg.customer_id = so.customer_id
		`).
		Where("so.is_deleted = ? AND COALESCE(so.customer_id, '') <> ''", false).
		Group("so.customer_id, return_agg.returned_quantity, return_agg.returned_order_count, return_agg.last_return_date").
		Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to aggregate customer sales return summary"})
		return
	}

	items := make([]CustomerSalesReturnSummaryResponse, 0, len(rows))
	for _, row := range rows {
		items = append(items, CustomerSalesReturnSummaryResponse{
			CustomerID:         strings.TrimSpace(row.CustomerID),
			ReturnedQuantity:   row.ReturnedQuantity,
			ReturnedOrderCount: row.ReturnedOrderCount,
			LastReturnDate:     normalizeCustomerSalesReturnDate(row.LastReturnDate),
			TotalOrders:        row.TotalOrders,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"total": len(items),
	})
}

func normalizeCustomerSalesReturnDate(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	layouts := []string{
		time.RFC3339,
		"2006-01-02 15:04:05-07:00",
		"2006-01-02 15:04:05-07",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	for _, layout := range layouts {
		parsed, err := time.Parse(layout, trimmed)
		if err == nil {
			return parsed.In(time.Local).Format("2006-01-02")
		}
	}
	if len(trimmed) >= len("2006-01-02") {
		return trimmed[:10]
	}
	return trimmed
}
