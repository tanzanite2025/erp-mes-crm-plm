package services

import (
	"fmt"
	"gorm.io/gorm"
	"strings"
	"xdfc-server/models"
)

type ProductionRouteSalesOrderLineCandidateDTO struct {
	ID                  uint   `json:"id"`
	SalesOrderID        string `json:"salesOrderId"`
	SalesOrderNo        string `json:"salesOrderNo"`
	CustomerName        string `json:"customerName"`
	LineNo              int    `json:"lineNo"`
	ProductID           string `json:"productId"`
	ProductModel        string `json:"productModel"`
	ProductCode         string `json:"productCode"`
	Specification       string `json:"specification"`
	BOMOwnerType        string `json:"bomOwnerType"`
	BOMOwnerCustomerID  string `json:"bomOwnerCustomerId"`
	BOMVersionLevel     string `json:"bomVersionLevel"`
	ProductionRouteMode string `json:"productionRouteMode"`
	HasProductionRoute  bool   `json:"hasProductionRoute"`
}

type ProductionRouteSalesOrderLineCandidatesResponse struct {
	Items []ProductionRouteSalesOrderLineCandidateDTO `json:"items"`
}

func ListProductionRouteSalesOrderLineCandidates(productID string) ([]ProductionRouteSalesOrderLineCandidateDTO, error) {
	return defaultProductionService.ListProductionRouteSalesOrderLineCandidates(productID)
}

func (service *ProductionService) ListProductionRouteSalesOrderLineCandidates(productID string) ([]ProductionRouteSalesOrderLineCandidateDTO, error) {
	productID = strings.TrimSpace(productID)
	var candidates []ProductionRouteSalesOrderLineCandidateDTO
	currentBranches := queryCurrentProductionRouteBOMBranches(service.txManager.DB()).
		Select(`b.product_id AS product_id,
			UPPER(b.owner_type) AS bom_owner_type,
			COALESCE(b.owner_customer_id, '') AS bom_owner_customer_id,
			COALESCE(b.version_level, '') AS bom_version_level`).
		Distinct()
	query := service.txManager.DB().Table("sales_order_lines AS sol").
		Select(`sol.id, sol.sales_order_id, so.order_no AS sales_order_no, so.customer_name,
			sol.line_no, sol.product_id, sol.product_model, sol.product_code, sol.specification,
			UPPER(COALESCE(sol.bom_owner_type, '')) AS bom_owner_type,
			COALESCE(sol.bom_owner_customer_id, '') AS bom_owner_customer_id,
			COALESCE(sol.bom_version_level, '') AS bom_version_level,
			UPPER(COALESCE(sol.production_route_mode, 'DEFAULT')) AS production_route_mode,
			CASE WHEN existing_route.id IS NOT NULL THEN 1 ELSE 0 END AS has_production_route`).
		Joins("INNER JOIN sales_orders AS so ON so.id = sol.sales_order_id").
		Joins(`INNER JOIN (?) AS current_branch
			ON current_branch.product_id = sol.product_id
			AND current_branch.bom_owner_type = UPPER(COALESCE(sol.bom_owner_type, ''))
			AND current_branch.bom_owner_customer_id = COALESCE(sol.bom_owner_customer_id, '')
			AND current_branch.bom_version_level = COALESCE(sol.bom_version_level, '')`, currentBranches).
		Joins(`LEFT JOIN production_route_families AS existing_route
			ON existing_route.scope_type = ? AND existing_route.sales_order_line_id = sol.id`, productionRouteScopeSalesOrderLine).
		Where("TRIM(COALESCE(sol.bom_owner_type, '')) <> '' AND so.deleted_at IS NULL")
	if service.txManager.DB().Migrator().HasTable(&models.ProductionRouteFamily{}) {
		query = query.Where(`(
			UPPER(COALESCE(sol.production_route_mode, 'DEFAULT')) = 'CUSTOM'
			OR NOT EXISTS (
				SELECT 1 FROM production_route_families AS line_route
				WHERE line_route.scope_type = ? AND line_route.sales_order_line_id = sol.id
			)
		)`, productionRouteScopeSalesOrderLine)
	}
	if productID != "" {
		query = query.Where("sol.product_id = ?", productID)
	}
	err := query.Order("so.order_date DESC, so.order_no ASC, sol.line_no ASC").Scan(&candidates).Error
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
