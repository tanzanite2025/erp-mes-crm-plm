package services

import (
	"fmt"
	"gorm.io/gorm"
	"strings"
)

type ProductionRouteSalesOrderLineCandidateDTO struct {
	ID            uint   `json:"id"`
	SalesOrderID  string `json:"salesOrderId"`
	SalesOrderNo  string `json:"salesOrderNo"`
	CustomerName  string `json:"customerName"`
	LineNo        int    `json:"lineNo"`
	ProductID     string `json:"productId"`
	ProductModel  string `json:"productModel"`
	ProductCode   string `json:"productCode"`
	Specification string `json:"specification"`
}

type ProductionRouteSalesOrderLineCandidatesResponse struct {
	Items []ProductionRouteSalesOrderLineCandidateDTO `json:"items"`
}

func ListProductionRouteSalesOrderLineCandidates(productID string) ([]ProductionRouteSalesOrderLineCandidateDTO, error) {
	return defaultProductionService.ListProductionRouteSalesOrderLineCandidates(productID)
}

func (service *ProductionService) ListProductionRouteSalesOrderLineCandidates(productID string) ([]ProductionRouteSalesOrderLineCandidateDTO, error) {
	productID = strings.TrimSpace(productID)
	if productID == "" {
		return nil, fmt.Errorf("productId is required")
	}
	var candidates []ProductionRouteSalesOrderLineCandidateDTO
	err := service.txManager.DB().Table("sales_order_lines AS sol").
		Select("sol.id, sol.sales_order_id, so.order_no AS sales_order_no, so.customer_name, sol.line_no, sol.product_id, sol.product_model, sol.product_code, sol.specification").
		Joins("INNER JOIN sales_orders AS so ON so.id = sol.sales_order_id").
		Where("sol.product_id = ? AND so.deleted_at IS NULL", productID).
		Order("so.order_date DESC, so.order_no ASC, sol.line_no ASC").
		Scan(&candidates).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list route sales order line candidates: %w", err)
	}
	if candidates == nil {
		candidates = []ProductionRouteSalesOrderLineCandidateDTO{}
	}
	return candidates, nil
}

func addProductionRouteSalesOrderLineDetails(database *gorm.DB, routes []ProductionRouteDTO) error {
	lineIDs := make([]uint, 0, len(routes))
	seenLineIDs := make(map[uint]struct{}, len(routes))
	for _, route := range routes {
		if route.SalesOrderLineID == 0 {
			continue
		}
		if _, exists := seenLineIDs[route.SalesOrderLineID]; exists {
			continue
		}
		seenLineIDs[route.SalesOrderLineID] = struct{}{}
		lineIDs = append(lineIDs, route.SalesOrderLineID)
	}
	if len(lineIDs) == 0 {
		return nil
	}
	var candidates []ProductionRouteSalesOrderLineCandidateDTO
	if err := database.Table("sales_order_lines AS sol").
		Select("sol.id, so.order_no AS sales_order_no, sol.line_no").
		Joins("INNER JOIN sales_orders AS so ON so.id = sol.sales_order_id").
		Where("sol.id IN ?", lineIDs).
		Scan(&candidates).Error; err != nil {
		return fmt.Errorf("failed to load production route sales order line details: %w", err)
	}
	byLineID := make(map[uint]ProductionRouteSalesOrderLineCandidateDTO, len(candidates))
	for _, candidate := range candidates {
		byLineID[candidate.ID] = candidate
	}
	for index := range routes {
		candidate, exists := byLineID[routes[index].SalesOrderLineID]
		if !exists {
			continue
		}
		routes[index].SalesOrderNo = candidate.SalesOrderNo
		routes[index].SalesOrderLineNo = candidate.LineNo
	}
	return nil
}
