package services

import (
	"xdfc-server/models"
	statemachine "xdfc-server/services/state_machine"

	"gorm.io/gorm"
)

// Shared scope for requirement analysis and issuance progress; quotations are not production orders.
func applyProductionMaterialRequirementActiveOrderScope(database *gorm.DB) *gorm.DB {
	return applySalesOrderRecordScope(database).Where("sales_orders.status IN ?", statemachine.SalesOrderProductionSourceStatuses())
}

func readProductionMaterialRequirementActiveOrders(database *gorm.DB) ([]models.SalesOrder, error) {
	orders := []models.SalesOrder{}
	err := applyProductionMaterialRequirementActiveOrderScope(database).Preload("Lines", func(tx *gorm.DB) *gorm.DB {
		return tx.Order("line_no ASC, id ASC")
	}).Order("order_no ASC, id ASC").Find(&orders).Error
	return orders, err
}

// This reads current master data only. Frozen documents never pass through current BOM expansion.
func readProductionMaterialRequirementCurrentRecipeSnapshot(database *gorm.DB) (ProductionMaterialRequirementExpansionInput, error) {
	return readProductionMaterialRequirementCurrentRecipeSnapshotForProducts(database, nil)
}

func readProductionMaterialRequirementCurrentRecipeSnapshotForProducts(database *gorm.DB, productIDs []string) (ProductionMaterialRequirementExpansionInput, error) {
	var input ProductionMaterialRequirementExpansionInput
	bomQuery, productQuery, materialQuery := database, database, database
	if productIDs != nil {
		// Optional UUID columns can read as an empty string. Keep those sources
		// for prerequisite reporting without passing empty UUIDs to PostgreSQL.
		nonemptyProductIDs := make([]string, 0, len(productIDs))
		for _, productID := range productIDs {
			if productID != "" {
				nonemptyProductIDs = append(nonemptyProductIDs, productID)
			}
		}
		productIDs = nonemptyProductIDs
		bomQuery = bomQuery.Where("product_id IN ?", productIDs)
		productQuery = productQuery.Where("id IN ?", productIDs)
	}
	if err := bomQuery.Preload("Items", func(tx *gorm.DB) *gorm.DB {
		return tx.Order("sort_order ASC, id ASC")
	}).Where("status = ? AND bom_type = ?", models.BOMStatusReleased, models.BOMTypeMBOM).Find(&input.BOMs).Error; err != nil {
		return input, err
	}
	if productIDs != nil {
		materialIDs := []string{}
		for _, bom := range input.BOMs {
			for _, item := range bom.Items {
				if item.MaterialID != "" {
					materialIDs = append(materialIDs, item.MaterialID)
				}
			}
		}
		materialQuery = materialQuery.Where("id IN ?", materialIDs)
	}
	if err := materialQuery.Find(&input.Materials).Error; err != nil {
		return input, err
	}
	if err := productQuery.Select("id", "sku", "name", "tech_series", "brake_type").Find(&input.Products).Error; err != nil {
		return input, err
	}
	if err := database.Where("category = ?", "versionLevel").Find(&input.PerformanceVersionOptions).Error; err != nil {
		return input, err
	}
	return input, nil
}
