package services

import (
	"errors"
	"math"
	"sort"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const ShippingVirtualCategoryCode = "SHIPPING_VIRTUAL"

const shipmentDemandTolerance = 1e-9

type shipmentVirtualReadyRow struct {
	SalesOrderLineID uint
	Quantity         float64
}

type shipmentDemandStockRow struct {
	MaterialID   string
	CategoryCode string
	BatchNo      string
	Quantity     float64
}

func shipmentDemandKey(materialID string) string {
	return strings.TrimSpace(materialID)
}

func activeShipmentDemandOrderStatuses() []string {
	return []string{"Pending", "InProgress"}
}

func ListShipmentDemands() (ShipmentDemandListResponse, error) {
	var orders []models.SalesOrder
	if err := db.DB.
		Preload("Lines").
		Where("is_deleted = ? AND status IN ?", false, activeShipmentDemandOrderStatuses()).
		Order("delivery_date asc, order_date asc, order_no asc").
		Find(&orders).Error; err != nil {
		return ShipmentDemandListResponse{}, err
	}

	lineIDs := make([]uint, 0)
	materialIDs := make([]string, 0)
	materialIDSet := map[string]bool{}
	for _, order := range orders {
		for _, line := range order.Lines {
			lineIDs = append(lineIDs, line.ID)
			materialID := shipmentDemandKey(line.ProductID)
			if materialID == "" || materialIDSet[materialID] {
				continue
			}
			materialIDSet[materialID] = true
			materialIDs = append(materialIDs, materialID)
		}
	}

	virtualReadyByLineID := make(map[uint]float64, len(lineIDs))
	if len(lineIDs) > 0 {
		var readyRows []shipmentVirtualReadyRow
		if err := db.DB.Model(&models.ShipmentRecord{}).
			Select("sales_order_line_id, COALESCE(SUM(quantity), 0) AS quantity").
			Where("source_category = ? AND status = ? AND sales_order_line_id IN ?", ShippingVirtualCategoryCode, "DRAFT", lineIDs).
			Group("sales_order_line_id").
			Scan(&readyRows).Error; err != nil {
			return ShipmentDemandListResponse{}, err
		}
		for _, row := range readyRows {
			virtualReadyByLineID[row.SalesOrderLineID] = row.Quantity
		}
	}

	availableByMaterialID := make(map[string]float64, len(materialIDs))
	breakdownByMaterialID := make(map[string][]ShipmentDemandStockBreakdownResponse, len(materialIDs))
	if len(materialIDs) > 0 {
		var stockRows []shipmentDemandStockRow
		if err := db.DB.Model(&models.Inventory{}).
			Select("material_id, category_code, batch_no, COALESCE(SUM(quantity), 0) AS quantity").
			Where("material_id IN ? AND category_code <> ? AND quantity > ?", materialIDs, ShippingVirtualCategoryCode, 0).
			Group("material_id, category_code, batch_no").
			Scan(&stockRows).Error; err != nil {
			return ShipmentDemandListResponse{}, err
		}
		for _, row := range stockRows {
			key := shipmentDemandKey(row.MaterialID)
			availableByMaterialID[key] += row.Quantity
			breakdownByMaterialID[key] = append(breakdownByMaterialID[key], ShipmentDemandStockBreakdownResponse{
				CategoryCode: row.CategoryCode,
				BatchNo:      row.BatchNo,
				Quantity:     row.Quantity,
			})
		}
		for materialID := range breakdownByMaterialID {
			sort.SliceStable(breakdownByMaterialID[materialID], func(i, j int) bool {
				left := breakdownByMaterialID[materialID][i]
				right := breakdownByMaterialID[materialID][j]
				if left.CategoryCode == right.CategoryCode {
					return left.BatchNo < right.BatchNo
				}
				return left.CategoryCode < right.CategoryCode
			})
		}
	}

	items := make([]ShipmentDemandResponse, 0)
	for _, order := range orders {
		for _, line := range order.Lines {
			materialID := shipmentDemandKey(line.ProductID)
			if materialID == "" || line.Qty <= shipmentDemandTolerance {
				continue
			}
			virtualReadyQty := virtualReadyByLineID[line.ID]
			remainingToPrepare := line.Qty - line.DeliveredQty - virtualReadyQty
			if remainingToPrepare <= shipmentDemandTolerance {
				continue
			}
			if math.Abs(remainingToPrepare) <= shipmentDemandTolerance {
				remainingToPrepare = 0
			}

			items = append(items, ShipmentDemandResponse{
				SalesOrderID:       order.ID,
				SalesOrderLineID:   line.ID,
				OrderNo:            order.OrderNo,
				CustomerName:       order.CustomerName,
				DeliveryDate:       order.DeliveryDate,
				MaterialID:         materialID,
				MaterialName:       line.ProductModel,
				MaterialCode:       line.ProductCode,
				MaterialSpec:       line.Specification,
				UOM:                line.UOM,
				OrderedQty:         line.Qty,
				DeliveredQty:       line.DeliveredQty,
				VirtualReadyQty:    virtualReadyQty,
				RemainingToPrepare: remainingToPrepare,
				AvailableQty:       availableByMaterialID[materialID],
				StockBreakdown:     breakdownByMaterialID[materialID],
			})
		}
	}

	return ShipmentDemandListResponse{
		Items: items,
		Total: len(items),
	}, nil
}

func PrepareVirtualShipment(input PrepareVirtualShipmentRequest) (InventoryShipmentRecordResponse, error) {
	if input.Quantity <= shipmentDemandTolerance {
		return InventoryShipmentRecordResponse{}, errors.New("[VALIDATION] quantity must be greater than zero")
	}
	if strings.TrimSpace(input.SalesOrderID) == "" || input.SalesOrderLineID == 0 {
		return InventoryShipmentRecordResponse{}, errors.New("[VALIDATION] sales order and line are required")
	}
	sourceCategory := strings.TrimSpace(input.SourceCategory)
	if sourceCategory == "" {
		return InventoryShipmentRecordResponse{}, errors.New("[VALIDATION] source category is required")
	}
	if sourceCategory == ShippingVirtualCategoryCode {
		return InventoryShipmentRecordResponse{}, errors.New("[VALIDATION] source category cannot be virtual shipping warehouse")
	}

	var shipment models.ShipmentRecord
	materialID := ""
	batchNo := strings.TrimSpace(input.BatchNo)

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var order models.SalesOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND is_deleted = ?", input.SalesOrderID, false).
			First(&order).Error; err != nil {
			return errors.New("[CRITICAL_DATA_INTEGRITY] sales order not found")
		}
		if !isShipmentDemandOrderStatusActive(order.Status) {
			return errors.New("[VALIDATION] sales order is not ready for shipment preparation")
		}

		var line models.SalesOrderLine
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND sales_order_id = ?", input.SalesOrderLineID, input.SalesOrderID).
			First(&line).Error; err != nil {
			return errors.New("[CRITICAL_DATA_INTEGRITY] sales order line not found")
		}
		materialID = strings.TrimSpace(line.ProductID)
		if materialID == "" {
			return errors.New("[CRITICAL_DATA_INTEGRITY] sales order line has no product binding")
		}

		var virtualReadyQty float64
		if err := tx.Model(&models.ShipmentRecord{}).
			Select("COALESCE(SUM(quantity), 0)").
			Where("source_category = ? AND status = ? AND sales_order_line_id = ?", ShippingVirtualCategoryCode, "DRAFT", line.ID).
			Scan(&virtualReadyQty).Error; err != nil {
			return err
		}
		remainingToPrepare := line.Qty - line.DeliveredQty - virtualReadyQty
		if input.Quantity > remainingToPrepare+shipmentDemandTolerance {
			return errors.New("[VALIDATION] virtual shipment quantity exceeds remaining order demand")
		}

		if err := transferInventoryTx(tx, TransferInventoryInput{
			MaterialID:   materialID,
			Quantity:     input.Quantity,
			FromCategory: sourceCategory,
			ToCategory:   ShippingVirtualCategoryCode,
			BatchNo:      batchNo,
		}); err != nil {
			return err
		}

		shipmentDate := input.ShipmentDate
		if shipmentDate.IsZero() {
			shipmentDate = time.Now()
		}
		shipment = models.ShipmentRecord{
			MaterialID:       materialID,
			MaterialName:     strings.TrimSpace(line.ProductModel),
			MaterialCode:     strings.TrimSpace(line.ProductCode),
			SalesOrderID:     order.ID,
			SalesOrderLineID: line.ID,
			Quantity:         input.Quantity,
			SourceCategory:   ShippingVirtualCategoryCode,
			BatchNo:          batchNo,
			OrderNo:          order.OrderNo,
			Status:           "DRAFT",
			ShipmentDate:     shipmentDate,
			Operator:         strings.TrimSpace(input.Operator),
			Remarks:          strings.TrimSpace(input.Remarks),
		}
		if shipment.MaterialName == "" {
			shipment.MaterialName = strings.TrimSpace(line.Description)
		}
		if err := tx.Create(&shipment).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return InventoryShipmentRecordResponse{}, err
	}

	syncShipmentPreparationInventory(materialID, sourceCategory, ShippingVirtualCategoryCode, batchNo)
	return MapShipmentRecordToResponse(shipment), nil
}

func isShipmentDemandOrderStatusActive(status string) bool {
	for _, activeStatus := range activeShipmentDemandOrderStatuses() {
		if status == activeStatus {
			return true
		}
	}
	return false
}

func syncShipmentPreparationInventory(materialID string, sourceCategory string, targetCategory string, batchNo string) {
	if strings.TrimSpace(materialID) == "" {
		return
	}
	for _, category := range []string{sourceCategory, targetCategory} {
		var inv models.Inventory
		if db.DB.Where("material_id = ? AND category_code = ? AND batch_no = ?", materialID, category, batchNo).First(&inv).Error == nil {
			syncInventoryToSearch(inv)
		}
	}
}
