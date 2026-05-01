package services

import (
	"sort"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
)

const warehouseMasterDataSearchLimit = 200
const warehouseMasterDataActiveStatusWhere = "(COALESCE(status, '') = '' OR LOWER(status) IN ?)"

func normalizeWarehouseMasterDataSearchScope(scope string) WarehouseMasterDataSearchScope {
	switch WarehouseMasterDataSearchScope(strings.ToUpper(strings.TrimSpace(scope))) {
	case WarehouseMasterDataScopeInbound:
		return WarehouseMasterDataScopeInbound
	case WarehouseMasterDataScopeShipment:
		return WarehouseMasterDataScopeShipment
	default:
		return WarehouseMasterDataScopeAll
	}
}

func loadWarehouseMasterDataStock(ids []string) (map[string]float64, error) {
	stockByID := make(map[string]float64, len(ids))
	if len(ids) == 0 {
		return stockByID, nil
	}

	type stockRow struct {
		MaterialID string
		Stock      float64
	}
	var rows []stockRow
	if err := db.DB.Model(&models.Inventory{}).
		Select("material_id, COALESCE(SUM(quantity), 0) AS stock").
		Where("material_id IN ?", ids).
		Group("material_id").
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	for _, row := range rows {
		stockByID[strings.TrimSpace(row.MaterialID)] = row.Stock
	}
	return stockByID, nil
}

func appendWarehouseMaterialSearchItems(
	items []WarehouseMasterDataSearchItemResponse,
	query string,
	scope WarehouseMasterDataSearchScope,
) ([]WarehouseMasterDataSearchItemResponse, error) {
	tx := db.DB.Model(&models.Material{}).
		Select("materials.id, materials.code, materials.name, materials.category, materials.spec, materials.uom, materials.status").
		Where(warehouseMasterDataActiveStatusWhere, []string{"active", "enabled"})

	if scope == WarehouseMasterDataScopeShipment {
		stockSubQuery := db.DB.Model(&models.Inventory{}).
			Select("material_id, COALESCE(SUM(quantity), 0) AS stock").
			Group("material_id")
		tx = tx.Joins("JOIN (?) AS warehouse_stock ON warehouse_stock.material_id = materials.id", stockSubQuery).
			Where("warehouse_stock.stock > 0")
	}

	tx = tx.Order("code asc").Limit(warehouseMasterDataSearchLimit)

	if strings.TrimSpace(query) != "" {
		pattern := "%" + strings.ToLower(strings.TrimSpace(query)) + "%"
		tx = tx.Where(
			"LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR LOWER(spec) LIKE ? OR LOWER(category) LIKE ?",
			pattern,
			pattern,
			pattern,
			pattern,
		)
	}

	var materials []models.Material
	if err := tx.Find(&materials).Error; err != nil {
		return nil, err
	}

	ids := make([]string, 0, len(materials))
	for _, material := range materials {
		ids = append(ids, material.ID)
	}
	stockByID, err := loadWarehouseMasterDataStock(ids)
	if err != nil {
		return nil, err
	}

	for _, material := range materials {
		stock := stockByID[material.ID]
		if scope == WarehouseMasterDataScopeShipment && stock <= 0 {
			continue
		}
		category := strings.TrimSpace(material.Category)
		if category == "" {
			category = "MATERIAL"
		}
		uom := strings.TrimSpace(material.UOM)
		if uom == "" {
			uom = "PCS"
		}
		items = append(items, WarehouseMasterDataSearchItemResponse{
			ID:           material.ID,
			Name:         strings.TrimSpace(material.Name),
			Code:         strings.TrimSpace(material.Code),
			Spec:         strings.TrimSpace(material.Spec),
			UOM:          uom,
			Category:     category,
			SourceModule: "MATERIAL",
			Stock:        stock,
		})
	}
	return items, nil
}

func appendWarehouseProductSearchItems(
	items []WarehouseMasterDataSearchItemResponse,
	query string,
	scope WarehouseMasterDataSearchScope,
) ([]WarehouseMasterDataSearchItemResponse, error) {
	tx := db.DB.Model(&models.Product{}).
		Select("products.id, products.sku, products.name, products.model_code, products.description, products.status").
		Where(warehouseMasterDataActiveStatusWhere, []string{"active", "enabled"})

	if scope == WarehouseMasterDataScopeShipment {
		stockSubQuery := db.DB.Model(&models.Inventory{}).
			Select("material_id, COALESCE(SUM(quantity), 0) AS stock").
			Group("material_id")
		tx = tx.Joins("JOIN (?) AS warehouse_stock ON warehouse_stock.material_id = products.id", stockSubQuery).
			Where("warehouse_stock.stock > 0")
	}

	tx = tx.Order("sku asc").Limit(warehouseMasterDataSearchLimit)

	if strings.TrimSpace(query) != "" {
		pattern := "%" + strings.ToLower(strings.TrimSpace(query)) + "%"
		tx = tx.Where(
			"LOWER(sku) LIKE ? OR LOWER(name) LIKE ? OR LOWER(model_code) LIKE ? OR LOWER(description) LIKE ?",
			pattern,
			pattern,
			pattern,
			pattern,
		)
	}

	var products []models.Product
	if err := tx.Find(&products).Error; err != nil {
		return nil, err
	}

	ids := make([]string, 0, len(products))
	for _, product := range products {
		ids = append(ids, product.ID)
	}
	stockByID, err := loadWarehouseMasterDataStock(ids)
	if err != nil {
		return nil, err
	}

	for _, product := range products {
		stock := stockByID[product.ID]
		if scope == WarehouseMasterDataScopeShipment && stock <= 0 {
			continue
		}
		spec := strings.TrimSpace(product.Description)
		if spec == "" {
			spec = strings.TrimSpace(product.ModelCode)
		}
		items = append(items, WarehouseMasterDataSearchItemResponse{
			ID:           product.ID,
			Name:         strings.TrimSpace(product.Name),
			Code:         strings.TrimSpace(product.SKU),
			Spec:         spec,
			UOM:          "PCS",
			Category:     "FINISHED",
			SourceModule: "PRODUCT",
			Stock:        stock,
		})
	}
	return items, nil
}

func SearchWarehouseMasterData(query string, scopeRaw string) ([]WarehouseMasterDataSearchItemResponse, error) {
	scope := normalizeWarehouseMasterDataSearchScope(scopeRaw)
	items := make([]WarehouseMasterDataSearchItemResponse, 0)

	var err error
	items, err = appendWarehouseMaterialSearchItems(items, query, scope)
	if err != nil {
		return nil, err
	}
	items, err = appendWarehouseProductSearchItems(items, query, scope)
	if err != nil {
		return nil, err
	}

	sort.SliceStable(items, func(i, j int) bool {
		if items[i].SourceModule != items[j].SourceModule {
			return items[i].SourceModule == "PRODUCT"
		}
		return items[i].Code < items[j].Code
	})

	if len(items) > warehouseMasterDataSearchLimit {
		items = items[:warehouseMasterDataSearchLimit]
	}
	return items, nil
}
