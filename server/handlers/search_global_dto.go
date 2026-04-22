package handlers

import (
	"net/url"
	"strings"
	"xdfc-server/models"
	"xdfc-server/services"
)

type GlobalSearchItemResponse struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Code        string  `json:"code"`
	Category    string  `json:"category"`
	Href        string  `json:"href"`
	ParentTitle string  `json:"parentTitle"`
	Score       float32 `json:"score"`
}

type globalSearchMatch struct {
	ID       string
	Category string
	Score    float32
}

func newGlobalSearchItemResponse(
	id string,
	title string,
	code string,
	category string,
	score float32,
) GlobalSearchItemResponse {
	meta := resolveGlobalSearchCategoryMeta(category)

	return GlobalSearchItemResponse{
		ID:          id,
		Title:       title,
		Code:        code,
		Category:    category,
		Href:        meta.Href,
		ParentTitle: meta.ParentTitle,
		Score:       score,
	}
}

func mapInventoryToGlobalSearchItem(
	inventory models.Inventory,
	score float32,
) GlobalSearchItemResponse {
	return newGlobalSearchItemResponse(
		inventory.ID,
		inventory.MaterialName,
		inventory.MaterialCode,
		services.SearchCategoryInventory,
		score,
	)
}

func mapSalesOrderToGlobalSearchItem(
	order models.SalesOrder,
	score float32,
) GlobalSearchItemResponse {
	title := strings.TrimSpace(order.OrderName)
	if title == "" {
		title = strings.TrimSpace(order.CustomerName)
	}
	if title == "" {
		title = strings.TrimSpace(order.OrderNo)
	}

	item := newGlobalSearchItemResponse(
		order.ID,
		title,
		strings.TrimSpace(order.OrderNo),
		services.SearchCategorySalesOrder,
		score,
	)

	query := url.Values{}
	if strings.TrimSpace(order.OrderNo) != "" {
		query.Set("search", strings.TrimSpace(order.OrderNo))
	}
	query.Set("detailId", strings.TrimSpace(order.ID))
	item.Href = "/trading/sales-orders?" + query.Encode()

	return item
}

func mapPurchaseOrderToGlobalSearchItem(
	order models.PurchaseOrder,
	score float32,
) GlobalSearchItemResponse {
	title := strings.TrimSpace(order.SupplierName)
	if title == "" {
		title = strings.TrimSpace(order.OrderNo)
	}

	item := newGlobalSearchItemResponse(
		order.ID,
		title,
		strings.TrimSpace(order.OrderNo),
		services.SearchCategoryPurchaseOrder,
		score,
	)

	query := url.Values{}
	if strings.TrimSpace(order.OrderNo) != "" {
		query.Set("search", strings.TrimSpace(order.OrderNo))
	}
	query.Set("detailId", strings.TrimSpace(order.ID))
	item.Href = "/purchase/orders?" + query.Encode()

	return item
}

func mapSupplierToGlobalSearchItem(
	supplier models.Supplier,
	score float32,
) GlobalSearchItemResponse {
	title := strings.TrimSpace(supplier.Name)
	if title == "" {
		title = strings.TrimSpace(supplier.Code)
	}

	item := newGlobalSearchItemResponse(
		supplier.ID,
		title,
		strings.TrimSpace(supplier.Code),
		services.SearchCategorySupplier,
		score,
	)

	query := url.Values{}
	searchTerm := strings.TrimSpace(supplier.Code)
	if searchTerm == "" {
		searchTerm = title
	}
	if searchTerm != "" {
		query.Set("search", searchTerm)
	}
	query.Set("detailId", strings.TrimSpace(supplier.ID))
	item.Href = "/purchase/suppliers?" + query.Encode()

	return item
}

func mapApprovalRequestToGlobalSearchItem(
	request models.ApprovalRequest,
	score float32,
) GlobalSearchItemResponse {
	title := strings.TrimSpace(request.Reason)
	if title == "" {
		title = strings.TrimSpace(strings.Join([]string{request.Module, request.Action}, " "))
	}
	if title == "" {
		title = strings.TrimSpace(request.ID)
	}

	code := strings.TrimSpace(request.TargetID)
	if code == "" {
		code = strings.TrimSpace(request.ID)
	}

	item := newGlobalSearchItemResponse(
		request.ID,
		title,
		code,
		services.SearchCategoryApprovalRequest,
		score,
	)

	query := url.Values{}
	query.Set("requestId", strings.TrimSpace(request.ID))
	item.Href = "/approval/requests?" + query.Encode()

	return item
}

func mapGlobalSearchMatches(
	matches []globalSearchMatch,
	inventoryByID map[string]models.Inventory,
	salesOrderByID map[string]models.SalesOrder,
	purchaseOrderByID map[string]models.PurchaseOrder,
	supplierByID map[string]models.Supplier,
	approvalRequestByID map[string]models.ApprovalRequest,
) []GlobalSearchItemResponse {
	results := make([]GlobalSearchItemResponse, 0, len(matches))
	for _, match := range matches {
		switch match.Category {
		case services.SearchCategorySalesOrder:
			order, ok := salesOrderByID[match.ID]
			if !ok {
				continue
			}
			results = append(results, mapSalesOrderToGlobalSearchItem(order, match.Score))
		case services.SearchCategoryPurchaseOrder:
			order, ok := purchaseOrderByID[match.ID]
			if !ok {
				continue
			}
			results = append(results, mapPurchaseOrderToGlobalSearchItem(order, match.Score))
		case services.SearchCategorySupplier:
			supplier, ok := supplierByID[match.ID]
			if !ok {
				continue
			}
			results = append(results, mapSupplierToGlobalSearchItem(supplier, match.Score))
		case services.SearchCategoryApprovalRequest:
			request, ok := approvalRequestByID[match.ID]
			if !ok {
				continue
			}
			results = append(results, mapApprovalRequestToGlobalSearchItem(request, match.Score))
		default:
			inventory, ok := inventoryByID[match.ID]
			if !ok {
				continue
			}
			results = append(results, mapInventoryToGlobalSearchItem(inventory, match.Score))
		}
	}
	return results
}
