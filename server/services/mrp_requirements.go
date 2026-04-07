package services

import (
	"fmt"
	"sort"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type MrpRequirementSourceOrder struct {
	OrderNo      string  `json:"orderNo"`
	CustomerName string  `json:"customerName"`
	Qty          float64 `json:"qty"`
	ProductName  string  `json:"productName"`
	LineNo       int     `json:"lineNo"`
	TotalLines   int     `json:"totalLines"`
}

type MrpRequirementPackaging struct {
	PackUnit  string  `json:"packUnit"`
	Factor    float64 `json:"factor"`
	PackQty   int     `json:"packQty"`
	Direction string  `json:"direction,omitempty"`
}

type MrpRequirementItem struct {
	MaterialID    string                      `json:"materialId"`
	MaterialCode  string                      `json:"materialCode"`
	MaterialName  string                      `json:"materialName"`
	MaterialSpec  string                      `json:"materialSpec"`
	Section       string                      `json:"section"`
	TotalRequired float64                     `json:"totalRequired"`
	InventoryQty  float64                     `json:"inventoryQty"`
	ShortageGap   float64                     `json:"shortageGap"`
	Unit          string                      `json:"unit"`
	SourceOrders  []MrpRequirementSourceOrder `json:"sourceOrders"`
	HasBOM        bool                        `json:"hasBOM"`
	Packaging     *MrpRequirementPackaging    `json:"packaging,omitempty"`
}

type MrpAnalyzedModel struct {
	ModelName string  `json:"modelName"`
	TotalQty  float64 `json:"totalQty"`
}

type MrpRequirementStats struct {
	TotalMaterials   int                `json:"totalMaterials"`
	MissingBOMCount  int                `json:"missingBOMCount"`
	ActiveOrderCount int                `json:"activeOrderCount"`
	AnalyzedModels   []MrpAnalyzedModel `json:"analyzedModels"`
}

type MrpRequirementsResponse struct {
	Requirements []MrpRequirementItem `json:"requirements"`
	Stats        MrpRequirementStats  `json:"stats"`
}

type GetMrpRequirementsParams struct {
	SelectedKeys []string
}

type mrpSelectedLine struct {
	OrderNo string
	LineNo  int
}

func GetMrpRequirements(params GetMrpRequirementsParams) (MrpRequirementsResponse, error) {
	selected := make(map[string]mrpSelectedLine, len(params.SelectedKeys))
	for _, key := range params.SelectedKeys {
		parts := strings.Split(strings.TrimSpace(key), "-")
		if len(parts) < 2 {
			continue
		}
		lineNoPart := parts[len(parts)-1]
		orderNo := strings.Join(parts[:len(parts)-1], "-")
		var lineNo int
		_, err := fmt.Sscanf(lineNoPart, "%d", &lineNo)
		if err != nil || orderNo == "" {
			continue
		}
		selected[key] = mrpSelectedLine{OrderNo: orderNo, LineNo: lineNo}
	}

	var orders []models.SalesOrder
	if err := db.DB.Preload("Lines", func(tx *gorm.DB) *gorm.DB {
		return tx.Select("id", "sales_order_id", "line_no", "product_id", "product_model", "product_code", "specification", "qty", "uom", "status")
	}).Select("id", "order_no", "customer_name", "status", "order_date", "delivery_date", "is_deleted").
		Where("is_deleted = ? AND status IN ?", false, []string{"Pending", "InProgress"}).
		Order("order_date desc").
		Find(&orders).Error; err != nil {
		return MrpRequirementsResponse{}, err
	}

	var boms []models.BOM
	if err := db.DB.Select("id", "product_id", "status").Preload("Items", func(tx *gorm.DB) *gorm.DB {
		return tx.Select("id", "bom_id", "section", "material_id", "unit", "standard_usage")
	}).Where("status = ?", "active").Find(&boms).Error; err != nil {
		return MrpRequirementsResponse{}, err
	}

	var materials []models.Material
	if err := db.DB.Select("id", "code", "name", "spec", "uom").Find(&materials).Error; err != nil {
		return MrpRequirementsResponse{}, err
	}

	var products []models.Product
	if err := db.DB.Select("id", "sku", "name", "tech_series", "brake_type", "version_level").Find(&products).Error; err != nil {
		return MrpRequirementsResponse{}, err
	}

	var rules []models.PackagingRule
	if err := db.DB.Select("id", "material_id", "pack_unit", "conversion_factor", "direction").Find(&rules).Error; err != nil {
		return MrpRequirementsResponse{}, err
	}

	var inventory []models.Inventory
	if err := db.DB.Select("id", "material_id", "quantity").Find(&inventory).Error; err != nil {
		return MrpRequirementsResponse{}, err
	}

	requirementMap := make(map[string]*MrpRequirementItem)
	productsMissingBOM := make(map[string]struct{})
	modelQtyMap := make(map[string]float64)
	activeOrderCount := 0

	for _, order := range orders {
		matchedOrder := false
		for _, line := range order.Lines {
			if line.ProductID == "" {
				continue
			}
			selectionKey := fmt.Sprintf("%s-%d", order.OrderNo, line.LineNo)
			if len(selected) > 0 {
				if _, ok := selected[selectionKey]; !ok {
					continue
				}
			}
			matchedOrder = true
			modelName := strings.TrimSpace(line.ProductModel)
			if modelName == "" {
				modelName = "未知型号"
			}
			modelQtyMap[modelName] += line.Qty

			var productBOM *models.BOM
			for idx := range boms {
				if boms[idx].ProductID == line.ProductID {
					productBOM = &boms[idx]
					break
				}
			}
			if productBOM == nil {
				productsMissingBOM[modelName] = struct{}{}
				continue
			}

			friendlyProductName := line.ProductModel
			for _, product := range products {
				if product.ID == line.ProductID || product.SKU == line.ProductCode {
					friendlyProductName = formatMRPProductName(product, line.ProductModel)
					break
				}
			}

			for _, bomItem := range productBOM.Items {
				materialID := bomItem.MaterialID
				section := strings.TrimSpace(bomItem.Section)
				if section == "" {
					section = "其他"
				}
				compositeKey := section + "_" + materialID
				qtyNeeded := line.Qty * bomItem.StandardUsage

				req, ok := requirementMap[compositeKey]
				if !ok {
					mInfo := findMRPMaterial(materials, materialID)
					inventoryQty := 0.0
					for _, stock := range inventory {
						if stock.MaterialID == materialID {
							inventoryQty += stock.Quantity
						}
					}
					req = &MrpRequirementItem{
						MaterialID:    materialID,
						MaterialCode:  strings.ToUpper(resolveMRPMaterialCode(mInfo, materialID)),
						MaterialName:  resolveMRPMaterialName(mInfo, materialID),
						MaterialSpec:  resolveMRPMaterialSpec(mInfo),
						Section:       section,
						TotalRequired: 0,
						InventoryQty:  inventoryQty,
						ShortageGap:   0,
						Unit:          resolveMRPUnit(mInfo, bomItem.Unit),
						SourceOrders:  make([]MrpRequirementSourceOrder, 0),
						HasBOM:        true,
					}
					requirementMap[compositeKey] = req
				}

				req.TotalRequired += qtyNeeded
				existingIndex := -1
				for idx := range req.SourceOrders {
					so := req.SourceOrders[idx]
					if so.OrderNo == order.OrderNo && so.ProductName == friendlyProductName && so.LineNo == line.LineNo {
						existingIndex = idx
						break
					}
				}
				if existingIndex >= 0 {
					req.SourceOrders[existingIndex].Qty += line.Qty
				} else {
					req.SourceOrders = append(req.SourceOrders, MrpRequirementSourceOrder{
						OrderNo:      order.OrderNo,
						CustomerName: defaultMRPString(order.CustomerName, "未知客户"),
						Qty:          line.Qty,
						ProductName:  friendlyProductName,
						LineNo:       line.LineNo,
						TotalLines:   len(order.Lines),
					})
				}
			}
		}
		if matchedOrder {
			activeOrderCount++
		}
	}

	requirements := make([]MrpRequirementItem, 0, len(requirementMap))
	for _, req := range requirementMap {
		req.ShortageGap = maxMRPFloat(0, req.TotalRequired-req.InventoryQty)
		for _, rule := range rules {
			if rule.MaterialID != req.MaterialID {
				continue
			}
			packQty := 0
			if rule.Direction == "reverse" {
				packQty = int(ceilMRP(req.TotalRequired * rule.ConversionFactor))
			} else if rule.ConversionFactor > 0 {
				packQty = int(ceilMRP(req.TotalRequired / rule.ConversionFactor))
			}
			req.Packaging = &MrpRequirementPackaging{
				PackUnit:  rule.PackUnit,
				Factor:    rule.ConversionFactor,
				PackQty:   packQty,
				Direction: rule.Direction,
			}
			break
		}
		requirements = append(requirements, *req)
	}

	sort.Slice(requirements, func(i, j int) bool {
		if requirements[i].Section != requirements[j].Section {
			return requirements[i].Section < requirements[j].Section
		}
		return requirements[i].TotalRequired > requirements[j].TotalRequired
	})

	analyzedModels := make([]MrpAnalyzedModel, 0, len(modelQtyMap))
	for name, qty := range modelQtyMap {
		analyzedModels = append(analyzedModels, MrpAnalyzedModel{ModelName: name, TotalQty: qty})
	}
	sort.Slice(analyzedModels, func(i, j int) bool {
		return analyzedModels[i].ModelName < analyzedModels[j].ModelName
	})

	if requirements == nil {
		requirements = make([]MrpRequirementItem, 0)
	}
	if analyzedModels == nil {
		analyzedModels = make([]MrpAnalyzedModel, 0)
	}

	return MrpRequirementsResponse{
		Requirements: requirements,
		Stats: MrpRequirementStats{
			TotalMaterials:   len(requirements),
			MissingBOMCount:  len(productsMissingBOM),
			ActiveOrderCount: activeOrderCount,
			AnalyzedModels:   analyzedModels,
		},
	}, nil
}

func findMRPMaterial(materials []models.Material, materialID string) *models.Material {
	for idx := range materials {
		material := &materials[idx]
		if material.ID == materialID || material.Code == materialID || material.Name == materialID {
			return material
		}
	}
	return nil
}

func resolveMRPMaterialCode(material *models.Material, materialID string) string {
	if material != nil && strings.TrimSpace(material.Code) != "" {
		return material.Code
	}
	if strings.TrimSpace(materialID) != "" {
		return materialID
	}
	return "UNKNOWN"
}

func resolveMRPMaterialName(material *models.Material, materialID string) string {
	if material != nil && strings.TrimSpace(material.Name) != "" {
		return material.Name
	}
	if strings.TrimSpace(materialID) != "" {
		return materialID
	}
	return "未命名物料"
}

func resolveMRPMaterialSpec(material *models.Material) string {
	if material != nil && strings.TrimSpace(material.Spec) != "" {
		return material.Spec
	}
	return "-"
}

func resolveMRPUnit(material *models.Material, fallback string) string {
	if material != nil && strings.TrimSpace(material.UOM) != "" {
		return material.UOM
	}
	if strings.TrimSpace(fallback) != "" {
		return fallback
	}
	return "双"
}

func formatMRPProductName(product models.Product, fallback string) string {
	parts := make([]string, 0, 3)
	if strings.TrimSpace(product.TechSeries) != "" {
		parts = append(parts, product.TechSeries)
	}
	if strings.TrimSpace(product.BrakeType) != "" {
		parts = append(parts, product.BrakeType)
	}
	if strings.TrimSpace(product.VersionLevel) != "" {
		parts = append(parts, product.VersionLevel)
	}
	if strings.TrimSpace(product.Name) != "" {
		if len(parts) > 0 {
			return fmt.Sprintf("%s (%s)", product.Name, strings.Join(parts, "/"))
		}
		return product.Name
	}
	if strings.TrimSpace(product.SKU) != "" {
		return product.SKU
	}
	if strings.TrimSpace(fallback) != "" {
		return fallback
	}
	return "UNNAMED"
}

func defaultMRPString(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func maxMRPFloat(a float64, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func ceilMRP(value float64) float64 {
	integer := int(value)
	if value == float64(integer) {
		return value
	}
	if value > 0 {
		return float64(integer + 1)
	}
	return float64(integer)
}
