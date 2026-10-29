package services

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func normalizeProductionMaterialIssuanceSourceSelections(selections []ProductionMaterialIssuanceSourceSelection) ([]ProductionMaterialIssuanceSourceSelection, error) {
	if len(selections) == 0 || len(selections) > 500 {
		return nil, fmt.Errorf("%w: 请明确选择 1 至 500 条订单明细", ErrProductionMaterialIssuanceInvalidRequest)
	}
	normalized := append([]ProductionMaterialIssuanceSourceSelection(nil), selections...)
	seenLines := make(map[uint]bool)
	for index := range normalized {
		selection := &normalized[index]
		selection.SalesOrderID = strings.TrimSpace(selection.SalesOrderID)
		selection.BOMID = strings.TrimSpace(selection.BOMID)
		if selection.SalesOrderID == "" || selection.BOMID == "" || selection.SalesOrderLineID == 0 || seenLines[selection.SalesOrderLineID] {
			return nil, fmt.Errorf("%w: 来源身份和 BOM 必须明确且不能重复", ErrProductionMaterialIssuanceInvalidRequest)
		}
		seenLines[selection.SalesOrderLineID] = true
	}
	sort.Slice(normalized, func(i, j int) bool {
		if normalized[i].SalesOrderID != normalized[j].SalesOrderID {
			return normalized[i].SalesOrderID < normalized[j].SalesOrderID
		}
		return normalized[i].SalesOrderLineID < normalized[j].SalesOrderLineID
	})
	return normalized, nil
}

// This hash contains reviewed source, selected BOM and recipe/material snapshots,
// not stock availability, candidate BOMs or browser-calculated summary quantities.
func fingerprintProductionMaterialIssuanceReviewedBasis(basis ProductionMaterialIssuanceReviewedSourceBasis) (string, error) {
	basis.BasisFingerprint = ""
	raw, err := json.Marshal(basis)
	if err != nil {
		return "", err
	}
	hash := sha256.Sum256(raw)
	return hex.EncodeToString(hash[:]), nil
}

func reviewProductionMaterialIssuanceSourcesWithinTransaction(tx *gorm.DB, selections []ProductionMaterialIssuanceSourceSelection, asOf time.Time, lockSources bool) ([]ProductionMaterialIssuanceReviewedSourceBasis, error) {
	normalized, err := normalizeProductionMaterialIssuanceSourceSelections(selections)
	if err != nil {
		return nil, err
	}
	orderIDs, lineIDs := make([]string, 0), make([]uint, 0, len(normalized))
	seenOrders := make(map[string]bool)
	for _, selection := range normalized {
		if !seenOrders[selection.SalesOrderID] {
			orderIDs = append(orderIDs, selection.SalesOrderID)
			seenOrders[selection.SalesOrderID] = true
		}
		lineIDs = append(lineIDs, selection.SalesOrderLineID)
	}
	orderQuery := applySalesOrderRecordScope(tx.Where("id IN ?", orderIDs)).Order("id ASC")
	if lockSources {
		orderQuery = orderQuery.Clauses(clause.Locking{Strength: "UPDATE"})
	}
	var orders []models.SalesOrder
	if err := orderQuery.Find(&orders).Error; err != nil {
		return nil, err
	}
	if len(orders) != len(orderIDs) {
		return nil, fmt.Errorf("%w: 订单来源已不可用，请重新核对", ErrProductionMaterialIssuanceBasisChanged)
	}
	for index := range orders {
		if orders[index].Status != "Pending" && orders[index].Status != "Scheduling" && orders[index].Status != "InProgress" {
			return nil, fmt.Errorf("%w: 订单 %s 当前状态不允许下发", ErrProductionMaterialIssuanceBasisChanged, orders[index].OrderNo)
		}
		if err := tx.Where("sales_order_id = ?", orders[index].ID).Order("id ASC").Find(&orders[index].Lines).Error; err != nil {
			return nil, err
		}
	}
	if err := rejectAlreadyCoveredProductionMaterialIssuanceSourcesTx(tx, lineIDs); err != nil {
		return nil, err
	}
	linesByID := make(map[uint]models.SalesOrderLine)
	ordersByID := make(map[string]models.SalesOrder)
	productIDs := make([]string, 0)
	seenProducts := make(map[string]bool)
	for _, order := range orders {
		ordersByID[order.ID] = order
		seenLineNos := make(map[int]bool)
		for _, line := range order.Lines {
			if line.LineNo <= 0 || seenLineNos[line.LineNo] {
				return nil, fmt.Errorf("%w: 订单 %s 的明细行号异常", ErrProductionMaterialIssuanceInvalidRequest, order.OrderNo)
			}
			seenLineNos[line.LineNo] = true
			linesByID[line.ID] = line
		}
	}
	keys, choices := make([]string, 0, len(normalized)), make([]ProductionMaterialRequirementBOMSelection, 0, len(normalized))
	for _, selection := range normalized {
		line, exists := linesByID[selection.SalesOrderLineID]
		if !exists || line.SalesOrderID != selection.SalesOrderID || line.ProductID == "" || strings.TrimSpace(line.UOM) == "" {
			return nil, fmt.Errorf("%w: 订单明细、产品或成品单位已不可用", ErrProductionMaterialIssuanceBasisChanged)
		}
		// These transient keys are derived only after locating the real line ID.
		keys = append(keys, fmt.Sprintf("%s-%d", ordersByID[line.SalesOrderID].OrderNo, line.LineNo))
		choices = append(choices, ProductionMaterialRequirementBOMSelection{SalesOrderID: line.SalesOrderID, SalesOrderLineID: line.ID, BOMID: selection.BOMID})
		if !seenProducts[line.ProductID] {
			productIDs = append(productIDs, line.ProductID)
			seenProducts[line.ProductID] = true
		}
	}
	sort.Strings(productIDs)
	readQuery := func() *gorm.DB {
		if lockSources {
			return tx.Clauses(clause.Locking{Strength: "SHARE"})
		}
		return tx
	}
	var warehouse models.WarehouseCategory
	if err := readQuery().Where("code = ? AND is_system = ? AND active = ? AND allow_shipment = ?", ProductionMaterialInventoryWarehouseCategoryCode, true, true, true).First(&warehouse).Error; err != nil {
		return nil, fmt.Errorf("%w: 生产物料仓库不可用: %v", ErrProductionMaterialIssuanceInvalidRequest, err)
	}
	var boms []models.BOM
	if err := readQuery().Where("product_id IN ? AND status = ? AND bom_type = ?", productIDs, models.BOMStatusReleased, models.BOMTypeMBOM).Order("id ASC").Find(&boms).Error; err != nil {
		return nil, err
	}
	bomIDs := make([]string, 0, len(boms))
	for _, bom := range boms {
		bomIDs = append(bomIDs, bom.ID)
	}
	var items []models.BOMItem
	if len(bomIDs) > 0 {
		if err := readQuery().Where("bom_id IN ?", bomIDs).Order("id ASC").Find(&items).Error; err != nil {
			return nil, err
		}
	}
	itemsByBOM := make(map[string][]models.BOMItem)
	materialIDs := make([]string, 0)
	seenMaterials := make(map[string]bool)
	for _, item := range items {
		itemsByBOM[item.BOMID] = append(itemsByBOM[item.BOMID], item)
		if item.MaterialID != "" && !seenMaterials[item.MaterialID] {
			materialIDs = append(materialIDs, item.MaterialID)
			seenMaterials[item.MaterialID] = true
		}
	}
	for index := range boms {
		boms[index].Items = itemsByBOM[boms[index].ID]
	}
	sort.Strings(materialIDs)
	var materials []models.Material
	if len(materialIDs) > 0 {
		if err := readQuery().Where("id IN ?", materialIDs).Order("id ASC").Find(&materials).Error; err != nil {
			return nil, err
		}
	}
	var products []models.Product
	if err := readQuery().Select("id", "sku", "name", "tech_series", "brake_type").Where("id IN ?", productIDs).Order("id ASC").Find(&products).Error; err != nil {
		return nil, err
	}
	if len(products) != len(productIDs) {
		return nil, fmt.Errorf("%w: 产品来源已不可用", ErrProductionMaterialIssuanceBasisChanged)
	}
	var options []models.ProductAttributeOption
	if err := tx.Where("category = ?", "versionLevel").Find(&options).Error; err != nil {
		return nil, err
	}
	expansion, err := ExpandProductionMaterialRequirements(ProductionMaterialRequirementExpansionInput{Orders: orders, BOMs: boms, Materials: materials, Products: products, SelectedKeys: keys, BOMSelections: choices, PerformanceVersionOptions: options, AsOf: asOf})
	if err != nil {
		return nil, err
	}
	if !expansion.IsComplete || len(expansion.SourceLines) != len(normalized) {
		return nil, fmt.Errorf("%w: 来源或配方不完整，请重新核对 BOM 与领料前提", ErrProductionMaterialIssuanceBasisChanged)
	}
	if _, err := ProjectMRPRequirementsFromExpandedSources(expansion, materials, nil, nil); err != nil {
		return nil, err
	}
	materialByID := make(map[string]models.Material)
	for _, material := range materials {
		materialByID[material.ID] = material
	}
	bases := make([]ProductionMaterialIssuanceReviewedSourceBasis, 0, len(expansion.SourceLines))
	for _, source := range expansion.SourceLines {
		if source.BOM == nil || len(productionMaterialIssuanceSourcePrerequisiteIssueCodes(source, linesByID[source.SalesOrderLineID].UOM)) > 0 {
			return nil, fmt.Errorf("%w: 来源版本或成品重量不完整", ErrProductionMaterialIssuanceBasisChanged)
		}
		basis := ProductionMaterialIssuanceReviewedSourceBasis{SalesOrderID: source.SalesOrderID, SalesOrderLineID: source.SalesOrderLineID, OrderVersion: source.OrderVersion,
			OrderNo: source.OrderNo, LineNo: source.LineNo, CustomerID: source.CustomerID, CustomerName: source.CustomerName, ProductID: source.ProductID, ProductName: source.ProductName,
			FinishedQty: source.FinishedQty, FinishedUnit: strings.TrimSpace(linesByID[source.SalesOrderLineID].UOM), BOM: *source.BOM,
			Contributions: make([]ProductionMaterialIssuanceFrozenMaterialContribution, 0, len(source.Contributions))}
		for _, contribution := range source.Contributions {
			material := materialByID[contribution.MaterialID]
			basis.Contributions = append(basis.Contributions, ProductionMaterialIssuanceFrozenMaterialContribution{ProductionMaterialRequirementContribution: contribution, MaterialCode: material.Code, MaterialName: material.Name, MaterialSpec: material.Spec})
		}
		sort.Slice(basis.Contributions, func(i, j int) bool { return basis.Contributions[i].BOMItemID < basis.Contributions[j].BOMItemID })
		basis.BasisFingerprint, err = fingerprintProductionMaterialIssuanceReviewedBasis(basis)
		if err != nil {
			return nil, err
		}
		bases = append(bases, basis)
	}
	sort.Slice(bases, func(i, j int) bool {
		if bases[i].SalesOrderID != bases[j].SalesOrderID {
			return bases[i].SalesOrderID < bases[j].SalesOrderID
		}
		return bases[i].SalesOrderLineID < bases[j].SalesOrderLineID
	})
	return bases, nil
}

func rejectAlreadyCoveredProductionMaterialIssuanceSourcesTx(tx *gorm.DB, lineIDs []uint) error {
	var coverage models.ProductionMaterialIssuanceActiveSourceCoverage
	err := tx.Where("sales_order_line_id IN ?", lineIDs).Order("sales_order_line_id ASC").First(&coverage).Error
	if err == gorm.ErrRecordNotFound {
		return nil
	}
	if err != nil {
		return err
	}
	return fmt.Errorf("%w: 明细 %d 已关联领料单 %s，请查看原单", ErrProductionMaterialIssuanceSourceCovered, coverage.SalesOrderLineID, coverage.DocumentID)
}
