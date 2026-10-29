package services

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"
	"unicode/utf8"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type ProductionMaterialIssuanceSourceOptionsQuery struct {
	Search   string `json:"search"`
	Page     int    `json:"page"`
	PageSize int    `json:"pageSize"`
}

type ProductionMaterialIssuanceSourceOption struct {
	SalesOrderID     string  `json:"salesOrderId"`
	SalesOrderLineID uint    `json:"salesOrderLineId"`
	OrderNo          string  `json:"orderNo"`
	LineNo           int     `json:"lineNo"`
	OrderVersion     int     `json:"orderVersion"`
	Status           string  `json:"status"`
	CustomerName     string  `json:"customerName"`
	ProductName      string  `json:"productName"`
	FinishedQty      float64 `json:"finishedQty"`
	FinishedUnit     string  `json:"finishedUnit"`
	DocumentID       string  `json:"documentId"`
	DocumentNo       string  `json:"documentNo"`
}

type ProductionMaterialIssuanceSourceOptions struct {
	ProductionMaterialIssuanceSourceOptionsQuery
	Items []ProductionMaterialIssuanceSourceOption `json:"items"`
	Total int64                                    `json:"total"`
}

type ProductionMaterialIssuanceSourcePreparationSelection struct {
	SalesOrderID     string `json:"salesOrderId"`
	SalesOrderLineID uint   `json:"salesOrderLineId"`
	BOMID            string `json:"bomId,omitempty"`
}

type ProductionMaterialIssuanceSourcePrerequisiteIssue struct {
	SalesOrderLineID uint   `json:"salesOrderLineId"`
	Code             string `json:"code"`
}

type ProductionMaterialIssuanceSourcePreparation struct {
	SourceLines           []ProductionMaterialRequirementSourceLine           `json:"sourceLines"`
	Issues                []ProductionMaterialIssuanceSourcePrerequisiteIssue `json:"issues"`
	IsReady               bool                                                `json:"isReady"`
	WarehouseCategoryCode string                                              `json:"warehouseCategoryCode"`
}

// Browsing sources never expands recipes or reads historical warehouse movements.
func QueryProductionMaterialIssuanceSourceOptions(ctx context.Context, database *gorm.DB, query ProductionMaterialIssuanceSourceOptionsQuery) (ProductionMaterialIssuanceSourceOptions, error) {
	query.Search = strings.TrimSpace(query.Search)
	result := ProductionMaterialIssuanceSourceOptions{ProductionMaterialIssuanceSourceOptionsQuery: query, Items: []ProductionMaterialIssuanceSourceOption{}}
	if database == nil || query.Page < 1 || query.PageSize < 1 || query.PageSize > 100 || query.Page-1 > math.MaxInt/query.PageSize || utf8.RuneCountInString(query.Search) > 200 {
		return result, ErrProductionMaterialIssuanceInvalidRequest
	}
	err := database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		base := func() *gorm.DB {
			q := applyProductionMaterialRequirementActiveOrderScope(tx.Model(&models.SalesOrder{})).
				Joins("JOIN sales_order_lines AS source_lines ON source_lines.sales_order_id = sales_orders.id").
				Joins("LEFT JOIN production_material_issuance_active_source_coverages AS coverage ON coverage.sales_order_line_id = source_lines.id").
				Joins("LEFT JOIN production_material_issuance_documents AS documents ON documents.id = coverage.document_id")
			if query.Search != "" {
				pattern := "%" + strings.NewReplacer("!", "!!", "%", "!%", "_", "!_").Replace(strings.ToLower(query.Search)) + "%"
				q = q.Where("(LOWER(sales_orders.order_no) LIKE ? ESCAPE '!' OR LOWER(sales_orders.customer_name) LIKE ? ESCAPE '!' OR LOWER(source_lines.product_model) LIKE ? ESCAPE '!' OR LOWER(source_lines.product_display_full_label_snapshot) LIKE ? ESCAPE '!')", pattern, pattern, pattern, pattern)
			}
			return q
		}
		if err := base().Count(&result.Total).Error; err != nil {
			return err
		}
		return base().Select(`sales_orders.id AS sales_order_id, source_lines.id AS sales_order_line_id,
			sales_orders.order_no, source_lines.line_no, sales_orders.version AS order_version, sales_orders.status,
			sales_orders.customer_name, COALESCE(NULLIF(source_lines.product_display_full_label_snapshot, ''), source_lines.product_model, '') AS product_name,
			source_lines.qty AS finished_qty, source_lines.uom AS finished_unit,
			COALESCE(CAST(coverage.document_id AS TEXT), '') AS document_id, COALESCE(documents.document_no, '') AS document_no`).
			Order("sales_orders.order_no ASC, sales_orders.id ASC, source_lines.line_no ASC, source_lines.id ASC").
			Offset((query.Page - 1) * query.PageSize).Limit(query.PageSize).Scan(&result.Items).Error
	}, productionMaterialIssuanceConsistentReadOptions(database)...)
	return result, err
}

// These prerequisites are shared with formal review; expansion completeness alone is insufficient.
func productionMaterialIssuanceSourcePrerequisiteIssueCodes(source ProductionMaterialRequirementSourceLine, finishedUnit string) []string {
	codes := []string{}
	if source.IssueCode != "" {
		codes = append(codes, source.IssueCode)
	}
	if strings.TrimSpace(finishedUnit) == "" {
		codes = append(codes, "MISSING_FINISHED_UNIT")
	}
	if source.OrderVersion <= 0 || (source.BOM != nil && source.BOM.Version <= 0) {
		codes = append(codes, "INVALID_SOURCE_VERSION")
	}
	if source.BOM != nil && (source.BOM.MeasuredWeight <= 0 || strings.TrimSpace(source.BOM.MeasuredWeightUnit) == "") {
		codes = append(codes, "INVALID_FINISHED_WEIGHT")
	}
	return codes
}

// Locate stable identities first. Legacy display keys are derived inside the read transaction only.
func PrepareProductionMaterialIssuanceSources(ctx context.Context, database *gorm.DB, selections []ProductionMaterialIssuanceSourcePreparationSelection) (ProductionMaterialIssuanceSourcePreparation, error) {
	result := ProductionMaterialIssuanceSourcePreparation{SourceLines: []ProductionMaterialRequirementSourceLine{}, Issues: []ProductionMaterialIssuanceSourcePrerequisiteIssue{}, WarehouseCategoryCode: ProductionMaterialInventoryWarehouseCategoryCode}
	if database == nil || len(selections) < 1 || len(selections) > 500 {
		return result, ErrProductionMaterialIssuanceInvalidRequest
	}
	orderIDs, lineIDs := []string{}, []uint{}
	selected := make(map[uint]ProductionMaterialIssuanceSourcePreparationSelection)
	for _, selection := range selections {
		if selection.SalesOrderID == "" || selection.SalesOrderLineID == 0 {
			return result, ErrProductionMaterialIssuanceInvalidRequest
		}
		if _, exists := selected[selection.SalesOrderLineID]; exists {
			return result, ErrProductionMaterialIssuanceInvalidRequest
		}
		selected[selection.SalesOrderLineID] = selection
		orderIDs, lineIDs = append(orderIDs, selection.SalesOrderID), append(lineIDs, selection.SalesOrderLineID)
	}
	err := database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var warehouse models.WarehouseCategory
		if err := tx.Where("code = ? AND is_system = ? AND active = ? AND allow_shipment = ?", ProductionMaterialInventoryWarehouseCategoryCode, true, true, true).First(&warehouse).Error; err != nil {
			return fmt.Errorf("%w: 生产物料仓库不可用", ErrProductionMaterialIssuanceInvalidRequest)
		}
		if err := rejectAlreadyCoveredProductionMaterialIssuanceSourcesTx(tx, lineIDs); err != nil {
			return err
		}
		orders, err := readProductionMaterialRequirementActiveOrders(tx.Where("sales_orders.id IN ?", orderIDs))
		if err != nil {
			return err
		}
		keys := []string{}
		choices := []ProductionMaterialRequirementBOMSelection{}
		units := make(map[uint]string)
		productIDs := []string{}
		for _, order := range orders {
			for _, line := range order.Lines {
				selection, exists := selected[line.ID]
				if !exists {
					continue
				}
				if selection.SalesOrderID != order.ID {
					return ErrProductionMaterialIssuanceBasisChanged
				}
				keys = append(keys, fmt.Sprintf("%s-%d", order.OrderNo, line.LineNo))
				units[line.ID] = line.UOM
				productIDs = append(productIDs, line.ProductID)
				if selection.BOMID != "" {
					choices = append(choices, ProductionMaterialRequirementBOMSelection{SalesOrderID: order.ID, SalesOrderLineID: line.ID, BOMID: selection.BOMID})
				}
			}
		}
		if len(keys) != len(selections) {
			return fmt.Errorf("%w: 所选订单行已不可用，请重新选择", ErrProductionMaterialIssuanceBasisChanged)
		}
		input, err := readProductionMaterialRequirementCurrentRecipeSnapshotForProducts(tx, productIDs)
		if err != nil {
			return err
		}
		input.Orders, input.SelectedKeys, input.BOMSelections, input.AsOf = orders, keys, choices, time.Now().UTC()
		expansion, err := ExpandProductionMaterialRequirements(input)
		if err != nil {
			return err
		}
		if len(expansion.SourceLines) != len(selections) {
			return ErrProductionMaterialIssuanceBasisChanged
		}
		result.SourceLines = expansion.SourceLines
		products := make(map[string]bool)
		for _, product := range input.Products {
			products[product.ID] = true
		}
		for _, source := range result.SourceLines {
			selection, exists := selected[source.SalesOrderLineID]
			if !exists || selection.SalesOrderID != source.SalesOrderID {
				return ErrProductionMaterialIssuanceBasisChanged
			}
			for _, code := range productionMaterialIssuanceSourcePrerequisiteIssueCodes(source, units[source.SalesOrderLineID]) {
				result.Issues = append(result.Issues, ProductionMaterialIssuanceSourcePrerequisiteIssue{SalesOrderLineID: source.SalesOrderLineID, Code: code})
			}
			if !products[source.ProductID] {
				result.Issues = append(result.Issues, ProductionMaterialIssuanceSourcePrerequisiteIssue{SalesOrderLineID: source.SalesOrderLineID, Code: "MISSING_PRODUCT"})
			}
		}
		result.IsReady = expansion.IsComplete && len(result.Issues) == 0
		return nil
	}, productionMaterialIssuanceConsistentReadOptions(database)...)
	return result, err
}
