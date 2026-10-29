package db

import (
	"fmt"
	"xdfc-server/models"

	"gorm.io/gorm"
)

// alignProductionMaterialPendingConsumptionWarehouseSystemCapabilities explicitly
// persists false flags because Gorm's default:true tag otherwise replaces a false
// AllowStocktake during Create. This custody destination never receives generic
// stocktakes, purchases or default inbound routing. Its directional switches are
// preserved so administrators can suspend production custody transfers.
func alignProductionMaterialPendingConsumptionWarehouseSystemCapabilities(database *gorm.DB) error {
	var category models.WarehouseCategory
	if err := database.Where("code = ?", models.ProductionMaterialPendingConsumptionWarehouseCategoryCode).
		First(&category).Error; err != nil {
		return fmt.Errorf("load production material pending consumption warehouse: %w", err)
	}

	updates := map[string]interface{}{}
	if category.Name != "生产待耗用物料" {
		updates["name"] = "生产待耗用物料"
	}
	if category.AllowStocktake {
		updates["allow_stocktake"] = false
	}
	if category.AllowPurchaseReceipt {
		updates["allow_purchase_receipt"] = false
	}
	if category.DefaultForProductInbound {
		updates["default_for_product_inbound"] = false
	}
	if category.DefaultForMaterialInbound {
		updates["default_for_material_inbound"] = false
	}
	if category.DefaultForPurchaseReceipt {
		updates["default_for_purchase_receipt"] = false
	}
	if len(updates) == 0 {
		return nil
	}
	if err := database.Model(&category).Updates(updates).Error; err != nil {
		return fmt.Errorf("persist production material pending consumption warehouse capabilities: %w", err)
	}
	return nil
}
