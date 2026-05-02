package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
)

type salesAnalyticsProductStat struct {
	ProductID    string  `json:"productId"`
	ProductModel string  `json:"productModel"`
	ProductCode  string  `json:"productCode"`
	TotalQty     float64 `json:"totalQty"`
	OrderCount   int64   `json:"orderCount"`
	TotalAmount  float64 `json:"totalAmount"`
}

type customerAnalyticsResponse struct {
	CustomerID   string                      `json:"customerId"`
	CustomerName string                      `json:"customerName"`
	TotalOrders  int64                       `json:"totalOrders"`
	TotalAmount  float64                     `json:"totalAmount"`
	Products     []salesAnalyticsProductStat `json:"products"`
}

type customerSummaryRow struct {
	CustomerID   string  `gorm:"column:customer_id"`
	CustomerName string  `gorm:"column:customer_name"`
	TotalOrders  int64   `gorm:"column:total_orders"`
	TotalAmount  float64 `gorm:"column:total_amount"`
}

type customerProductAggRow struct {
	CustomerID   string  `gorm:"column:customer_id"`
	CustomerName string  `gorm:"column:customer_name"`
	ProductID    string  `gorm:"column:product_id"`
	ProductModel string  `gorm:"column:product_model"`
	ProductCode  string  `gorm:"column:product_code"`
	TotalQty     float64 `gorm:"column:total_qty"`
	OrderCount   int64   `gorm:"column:order_count"`
	TotalAmount  float64 `gorm:"column:total_amount"`
}

type globalProductAggRow struct {
	ProductID    string  `gorm:"column:product_id"`
	ProductModel string  `gorm:"column:product_model"`
	ProductCode  string  `gorm:"column:product_code"`
	TotalQty     float64 `gorm:"column:total_qty"`
	OrderCount   int64   `gorm:"column:order_count"`
	TotalAmount  float64 `gorm:"column:total_amount"`
}

func normalizeCustomerName(name string) string {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return "Unknown Customer"
	}
	return trimmed
}

func normalizeProductModel(model string, productID string, productCode string) string {
	if trimmed := strings.TrimSpace(model); trimmed != "" {
		return trimmed
	}
	if trimmed := strings.TrimSpace(productCode); trimmed != "" {
		return trimmed
	}
	if trimmed := strings.TrimSpace(productID); trimmed != "" {
		return trimmed
	}
	return "Unknown Product"
}

func GetSalesOrderCustomerProductStatsHandler(c *gin.Context) {
	customerID := strings.TrimSpace(c.Query("customerId"))

	summaryQuery := db.DB.Table("sales_orders AS so").
		Select(`
			so.customer_id AS customer_id,
			MAX(so.customer_name) AS customer_name,
			COUNT(DISTINCT so.id) AS total_orders,
			COALESCE(SUM(so.amount), 0) AS total_amount
		`).
		Where("so.deleted_at IS NULL")
	if customerID != "" {
		summaryQuery = summaryQuery.Where("so.customer_id = ?", customerID)
	}

	var customerRows []customerSummaryRow
	if err := summaryQuery.
		Group("so.customer_id").
		Order("MAX(so.customer_name) ASC").
		Scan(&customerRows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to aggregate customer sales analytics"})
		return
	}

	productQuery := db.DB.Table("sales_orders AS so").
		Joins("INNER JOIN sales_order_lines AS sol ON sol.sales_order_id = so.id").
		Select(`
			so.customer_id AS customer_id,
			MAX(so.customer_name) AS customer_name,
			sol.product_id AS product_id,
			MAX(sol.product_model) AS product_model,
			MAX(sol.product_code) AS product_code,
			COALESCE(SUM(sol.qty), 0) AS total_qty,
			COUNT(DISTINCT so.id) AS order_count,
			COALESCE(SUM(sol.amount), 0) AS total_amount
		`).
		Where("so.deleted_at IS NULL")
	if customerID != "" {
		productQuery = productQuery.Where("so.customer_id = ?", customerID)
	}

	var productRows []customerProductAggRow
	if err := productQuery.
		Group("so.customer_id, sol.product_id").
		Order("MAX(so.customer_name) ASC").
		Order("COALESCE(SUM(sol.qty), 0) DESC").
		Scan(&productRows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to aggregate customer product analytics"})
		return
	}

	customerMap := make(map[string]*customerAnalyticsResponse, len(customerRows))
	result := make([]customerAnalyticsResponse, 0, len(customerRows))
	for _, row := range customerRows {
		entry := customerAnalyticsResponse{
			CustomerID:   row.CustomerID,
			CustomerName: normalizeCustomerName(row.CustomerName),
			TotalOrders:  row.TotalOrders,
			TotalAmount:  row.TotalAmount,
			Products:     []salesAnalyticsProductStat{},
		}
		result = append(result, entry)
		customerMap[row.CustomerID] = &result[len(result)-1]
	}

	for _, row := range productRows {
		existing := customerMap[row.CustomerID]
		if existing == nil {
			orphan := customerAnalyticsResponse{
				CustomerID:   row.CustomerID,
				CustomerName: normalizeCustomerName(row.CustomerName),
				Products:     []salesAnalyticsProductStat{},
			}
			result = append(result, orphan)
			existing = &result[len(result)-1]
			customerMap[row.CustomerID] = existing
		}

		existing.Products = append(existing.Products, salesAnalyticsProductStat{
			ProductID:    row.ProductID,
			ProductModel: normalizeProductModel(row.ProductModel, row.ProductID, row.ProductCode),
			ProductCode:  row.ProductCode,
			TotalQty:     row.TotalQty,
			OrderCount:   row.OrderCount,
			TotalAmount:  row.TotalAmount,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"items": result,
		"total": len(result),
	})
}

func GetSalesOrderGlobalProductRankingHandler(c *gin.Context) {
	limit := 10
	if raw := strings.TrimSpace(c.DefaultQuery("limit", "10")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}
	if limit < 1 {
		limit = 1
	}
	if limit > 100 {
		limit = 100
	}

	var rows []globalProductAggRow
	if err := db.DB.Table("sales_orders AS so").
		Joins("INNER JOIN sales_order_lines AS sol ON sol.sales_order_id = so.id").
		Select(`
			sol.product_id AS product_id,
			MAX(sol.product_model) AS product_model,
			MAX(sol.product_code) AS product_code,
			COALESCE(SUM(sol.qty), 0) AS total_qty,
			COUNT(DISTINCT so.id) AS order_count,
			COALESCE(SUM(sol.amount), 0) AS total_amount
		`).
		Where("so.deleted_at IS NULL").
		Group("sol.product_id").
		Order("COALESCE(SUM(sol.qty), 0) DESC").
		Limit(limit).
		Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to aggregate global product ranking"})
		return
	}

	result := make([]salesAnalyticsProductStat, 0, len(rows))
	for _, row := range rows {
		result = append(result, salesAnalyticsProductStat{
			ProductID:    row.ProductID,
			ProductModel: normalizeProductModel(row.ProductModel, row.ProductID, row.ProductCode),
			ProductCode:  row.ProductCode,
			TotalQty:     row.TotalQty,
			OrderCount:   row.OrderCount,
			TotalAmount:  row.TotalAmount,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"items": result,
		"total": len(result),
	})
}
