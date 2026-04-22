package services

import (
	"sort"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func listReceivableOrders(query ReceivableLedgerQuery) (ReceivableLedgerListResponse, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	orders, err := loadReceivableOrders(db.DB, query)
	if err != nil {
		return ReceivableLedgerListResponse{}, err
	}
	bundle, err := loadReceivableSettlementBundle(db.DB, orders)
	if err != nil {
		return ReceivableLedgerListResponse{}, err
	}

	items := make([]ReceivableLedgerListItemResponse, 0, len(orders))
	for _, order := range orders {
		items = append(items, buildReceivableListItem(order, bundle))
	}
	items = filterReceivableListItemsByStatus(items, strings.ToUpper(strings.TrimSpace(query.Status)))
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].UpdatedAt.Equal(items[j].UpdatedAt) {
			return items[i].DocumentNo > items[j].DocumentNo
		}
		return items[i].UpdatedAt.After(items[j].UpdatedAt)
	})

	summary := summarizeReceivableOrderItems(items)
	total := int64(len(items))
	start := (page - 1) * pageSize
	if start > len(items) {
		start = len(items)
	}
	end := start + pageSize
	if end > len(items) {
		end = len(items)
	}

	return ReceivableLedgerListResponse{
		Items:    items[start:end],
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		Summary:  summary,
	}, nil
}

func searchReceivableOrders(query LedgerSearchQuery) (LedgerSearchResponse, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}

	orders, err := loadReceivableOrders(db.DB, ReceivableLedgerQuery{})
	if err != nil {
		return LedgerSearchResponse{}, err
	}
	bundle, err := loadReceivableSettlementBundle(db.DB, orders)
	if err != nil {
		return LedgerSearchResponse{}, err
	}

	status := strings.ToUpper(strings.TrimSpace(query.Status))
	currency := strings.ToUpper(strings.TrimSpace(query.Currency))
	keyword := strings.ToLower(strings.TrimSpace(query.Keyword))
	items := make([]LedgerSearchCandidateResponse, 0, len(orders))
	for _, order := range orders {
		item := buildReceivableSearchItem(order, bundle)
		if status != "" && !strings.EqualFold(item.Status, status) {
			continue
		}
		if currency != "" && !strings.EqualFold(item.Currency, currency) {
			continue
		}
		if query.OutstandingMin > 0 && item.OutstandingAmount < query.OutstandingMin {
			continue
		}
		if query.OutstandingMax > 0 && item.OutstandingAmount > query.OutstandingMax {
			continue
		}
		if keyword != "" {
			haystack := strings.ToLower(item.DocumentNo + " " + item.PartnerName)
			if !strings.Contains(haystack, keyword) {
				continue
			}
		}
		items = append(items, item)
	}

	sortReceivableSearchItems(items, query.SortBy, query.SortOrder)
	total := int64(len(items))
	start := (page - 1) * pageSize
	if start > len(items) {
		start = len(items)
	}
	end := start + pageSize
	if end > len(items) {
		end = len(items)
	}

	return LedgerSearchResponse{
		Items:    items[start:end],
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func loadReceivableOrders(tx *gorm.DB, query ReceivableLedgerQuery) ([]models.SalesOrder, error) {
	base := tx.Model(&models.SalesOrder{}).Where("is_deleted = ?", false)
	sourceType := strings.ToUpper(strings.TrimSpace(query.SourceType))
	if sourceType != "" && sourceType != "SALES_ORDER" {
		return []models.SalesOrder{}, nil
	}
	sourceRefID := strings.TrimSpace(query.SourceRefID)
	if sourceRefID != "" {
		base = base.Where("id = ?", sourceRefID)
	}
	var orders []models.SalesOrder
	if err := base.Find(&orders).Error; err != nil {
		return nil, err
	}
	return orders, nil
}

func filterReceivableListItemsByStatus(items []ReceivableLedgerListItemResponse, status string) []ReceivableLedgerListItemResponse {
	if status == "" {
		return items
	}
	filtered := make([]ReceivableLedgerListItemResponse, 0, len(items))
	for _, item := range items {
		if strings.EqualFold(item.Status, status) {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

func summarizeReceivableOrderItems(items []ReceivableLedgerListItemResponse) ReceivableSummaryResponse {
	summary := ReceivableSummaryResponse{}
	for _, item := range items {
		summary.TotalReceivable += item.OutstandingAmount
		if strings.EqualFold(item.Status, models.LedgerStatusOverdue) {
			summary.OverdueReceivable += item.OutstandingAmount
		}
		if item.OutstandingAmount > 0 && !strings.EqualFold(item.Status, models.LedgerStatusCancelled) {
			summary.PendingReceiptCount++
		}
	}
	return summary
}

func sortReceivableSearchItems(items []LedgerSearchCandidateResponse, sortBy string, sortOrder string) {
	desc := !strings.EqualFold(strings.TrimSpace(sortOrder), "asc")
	sort.SliceStable(items, func(i, j int) bool {
		switch strings.ToLower(strings.TrimSpace(sortBy)) {
		case "ledger_no":
			if desc {
				return items[i].DocumentNo > items[j].DocumentNo
			}
			return items[i].DocumentNo < items[j].DocumentNo
		case "updated_at":
			if desc {
				return items[i].DocumentNo > items[j].DocumentNo
			}
			return items[i].DocumentNo < items[j].DocumentNo
		default:
			if items[i].OutstandingAmount == items[j].OutstandingAmount {
				if desc {
					return items[i].DocumentNo > items[j].DocumentNo
				}
				return items[i].DocumentNo < items[j].DocumentNo
			}
			if desc {
				return items[i].OutstandingAmount > items[j].OutstandingAmount
			}
			return items[i].OutstandingAmount < items[j].OutstandingAmount
		}
	})
}
