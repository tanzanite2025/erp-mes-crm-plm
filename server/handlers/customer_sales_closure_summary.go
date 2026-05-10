package handlers

import (
	"net/http"
	"sort"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/services"
	statemachine "xdfc-server/services/state_machine"

	"github.com/gin-gonic/gin"
)

type customerSalesClosureSummaryRow struct {
	CustomerID    string `gorm:"column:customer_id"`
	Status        string `gorm:"column:status"`
	LastOrderDate string `gorm:"column:last_order_date"`
	OrderCount    int64  `gorm:"column:order_count"`
}

type customerSalesClosureSummaryAccumulator struct {
	CustomerID          string
	LastOrderDate       string
	LastOrderDateParsed time.Time
	HasParsedOrderDate  bool
	StatusCounts        map[string]int64
	TotalOrders         int64
	CanceledOrderCount  int64
}

type CustomerSalesStatusCountResponse struct {
	Code  string `json:"code"`
	Phase string `json:"phase"`
	Count int64  `json:"count"`
}

type CustomerSalesClosureSummaryResponse struct {
	CustomerID          string                             `json:"customerId"`
	CanceledOrderCount  int64                              `json:"canceledOrderCount"`
	EffectiveOrderCount int64                              `json:"effectiveOrderCount"`
	PrimaryStatusCode   string                             `json:"primaryStatusCode"`
	PrimaryStatusPhase  string                             `json:"primaryStatusPhase"`
	StatusCounts        []CustomerSalesStatusCountResponse `json:"statusCounts"`
	LastOrderDate       string                             `json:"lastOrderDate"`
	DaysSinceLastOrder  *int                               `json:"daysSinceLastOrder,omitempty"`
	TotalOrders         int64                              `json:"totalOrders"`
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

func normalizeCustomerSalesSummaryStatusCode(raw string) string {
	trimmedLower := strings.ToLower(strings.TrimSpace(raw))
	switch trimmedLower {
	case "voided", "void":
		return string(statemachine.SalesOrderStatusCanceled)
	}
	normalized := strings.TrimSpace(string(statemachine.NormalizeSalesOrderStatus(raw)))
	if normalized != "" {
		return normalized
	}
	return "UNKNOWN"
}

func customerSalesSummaryStatusPhase(code string) string {
	normalized := statemachine.NormalizeSalesOrderStatus(code)
	for _, item := range statemachine.SalesOrderStatusCatalog() {
		if item.Status == normalized {
			return item.Phase
		}
	}
	return "custom"
}

func customerSalesSummaryStatusSortWeight(code string) int {
	normalized := statemachine.NormalizeSalesOrderStatus(code)
	for index, item := range statemachine.SalesOrderStatusCatalog() {
		if item.Status == normalized {
			return index
		}
	}
	return len(statemachine.SalesOrderStatusCatalog()) + 1
}

func buildCustomerSalesStatusCounts(counts map[string]int64) []CustomerSalesStatusCountResponse {
	statusCounts := make([]CustomerSalesStatusCountResponse, 0, len(counts))
	for code, count := range counts {
		if count <= 0 {
			continue
		}
		statusCounts = append(statusCounts, CustomerSalesStatusCountResponse{
			Code:  strings.TrimSpace(code),
			Phase: customerSalesSummaryStatusPhase(code),
			Count: count,
		})
	}
	sort.SliceStable(statusCounts, func(i, j int) bool {
		leftWeight := customerSalesSummaryStatusSortWeight(statusCounts[i].Code)
		rightWeight := customerSalesSummaryStatusSortWeight(statusCounts[j].Code)
		if leftWeight == rightWeight {
			return statusCounts[i].Code < statusCounts[j].Code
		}
		return leftWeight < rightWeight
	})
	return statusCounts
}

func customerSalesSummaryPrimaryStatusPriority(code string) int {
	switch statemachine.NormalizeSalesOrderStatus(code) {
	case statemachine.SalesOrderStatusInProgress:
		return 0
	case statemachine.SalesOrderStatusScheduling:
		return 1
	case statemachine.SalesOrderStatusPending:
		return 2
	case statemachine.SalesOrderStatusDraft:
		return 3
	case statemachine.SalesOrderStatusDone:
		return 4
	case statemachine.SalesOrderStatusCanceled:
		return 5
	default:
		return 6
	}
}

func resolveCustomerSalesSummaryPrimaryStatus(counts map[string]int64) (string, string) {
	primaryCode := ""
	primaryPriority := 999
	for code, count := range counts {
		if count <= 0 {
			continue
		}
		priority := customerSalesSummaryPrimaryStatusPriority(code)
		if primaryCode == "" || priority < primaryPriority || (priority == primaryPriority && code < primaryCode) {
			primaryCode = strings.TrimSpace(code)
			primaryPriority = priority
		}
	}
	if primaryCode == "" {
		return "", ""
	}
	return primaryCode, customerSalesSummaryStatusPhase(primaryCode)
}

func GetCustomerSalesClosureSummaryHandler(c *gin.Context) {
	var rows []customerSalesClosureSummaryRow
	if err := db.DB.Table("sales_orders AS so").
		Select(`
			so.customer_id AS customer_id,
			TRIM(COALESCE(so.status, '')) AS status,
			COALESCE(MAX(so.order_date), '') AS last_order_date,
			COUNT(DISTINCT so.id) AS order_count
		`).
		Where("so.deleted_at IS NULL AND COALESCE(so.customer_id, '') <> ''").
		Group("so.customer_id, TRIM(COALESCE(so.status, ''))").
		Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to aggregate customer sales closure summary"})
		return
	}

	accumulators := make(map[string]*customerSalesClosureSummaryAccumulator, len(rows))
	for _, row := range rows {
		customerID := strings.TrimSpace(row.CustomerID)
		if customerID == "" {
			continue
		}

		accumulator, exists := accumulators[customerID]
		if !exists {
			accumulator = &customerSalesClosureSummaryAccumulator{
				CustomerID:   customerID,
				StatusCounts: make(map[string]int64),
			}
			accumulators[customerID] = accumulator
		}

		orderCount := row.OrderCount
		if orderCount < 0 {
			orderCount = 0
		}
		statusCode := normalizeCustomerSalesSummaryStatusCode(row.Status)
		accumulator.TotalOrders += orderCount
		accumulator.StatusCounts[statusCode] += orderCount
		if statemachine.NormalizeSalesOrderStatus(statusCode) == statemachine.SalesOrderStatusCanceled {
			accumulator.CanceledOrderCount += orderCount
		}

		trimmedDate := strings.TrimSpace(row.LastOrderDate)
		if parsedDate, ok := parseSummaryOrderDate(trimmedDate); ok {
			if !accumulator.HasParsedOrderDate || parsedDate.After(accumulator.LastOrderDateParsed) {
				accumulator.LastOrderDate = trimmedDate
				accumulator.LastOrderDateParsed = parsedDate
				accumulator.HasParsedOrderDate = true
			}
		} else if accumulator.LastOrderDate == "" {
			accumulator.LastOrderDate = trimmedDate
		}
	}

	items := make([]CustomerSalesClosureSummaryResponse, 0, len(accumulators))
	today := time.Now().In(time.Local)
	for _, accumulator := range accumulators {
		effectiveOrderCount := accumulator.TotalOrders - accumulator.CanceledOrderCount
		if effectiveOrderCount < 0 {
			effectiveOrderCount = 0
		}
		primaryStatusCode, primaryStatusPhase := resolveCustomerSalesSummaryPrimaryStatus(accumulator.StatusCounts)

		item := CustomerSalesClosureSummaryResponse{
			CustomerID:          accumulator.CustomerID,
			CanceledOrderCount:  accumulator.CanceledOrderCount,
			EffectiveOrderCount: effectiveOrderCount,
			PrimaryStatusCode:   primaryStatusCode,
			PrimaryStatusPhase:  primaryStatusPhase,
			StatusCounts:        buildCustomerSalesStatusCounts(accumulator.StatusCounts),
			LastOrderDate:       strings.TrimSpace(accumulator.LastOrderDate),
			TotalOrders:         accumulator.TotalOrders,
		}
		if accumulator.HasParsedOrderDate {
			days := int(today.Sub(accumulator.LastOrderDateParsed.In(time.Local)).Hours() / 24)
			if days < 0 {
				days = 0
			}
			item.DaysSinceLastOrder = &days
		}
		items = append(items, item)
	}
	sort.SliceStable(items, func(i, j int) bool {
		return items[i].CustomerID < items[j].CustomerID
	})

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
