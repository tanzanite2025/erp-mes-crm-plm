package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// PatchInventoryHandler updates an inventory record via SDRTS delta payload.
func PatchInventoryHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.PatchInventoryHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondInventoryError(c, http.StatusBadRequest, "INVENTORY_PATCH_VALIDATION_FAILED", "[VALIDATION] invalid inventory patch payload: "+err.Error())
		return
	}

	var inventory models.Inventory
	if err := db.DB.First(&inventory, "id = ?", id).Error; err != nil {
		respondInventoryError(c, http.StatusNotFound, "INVENTORY_NOT_FOUND", "inventory record not found")
		return
	}

	patch := services.PatchInventoryRequest{ID: id, Version: req.Metadata.Version}
	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			respondInventoryError(c, http.StatusBadRequest, "INVENTORY_PATCH_VALIDATION_FAILED", "[VALIDATION] invalid inventory delta item")
			return
		}
		switch key {
		case "materialId":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_PATCH_VALIDATION_FAILED", "[VALIDATION] materialId 字段错误")
				return
			}
			patch.MaterialID = &value
		case "materialName":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_PATCH_VALIDATION_FAILED", "[VALIDATION] materialName 字段错误")
				return
			}
			patch.MaterialName = &value
		case "materialCode":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_PATCH_VALIDATION_FAILED", "[VALIDATION] materialCode 字段错误")
				return
			}
			patch.MaterialCode = &value
		case "materialSpec":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_PATCH_VALIDATION_FAILED", "[VALIDATION] materialSpec 字段错误")
				return
			}
			patch.MaterialSpec = &value
		case "quantity":
			var value float64
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_PATCH_VALIDATION_FAILED", "[VALIDATION] quantity 字段错误")
				return
			}
			patch.Quantity = &value
		case "totalValue":
			var value float64
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_PATCH_VALIDATION_FAILED", "[VALIDATION] totalValue 字段错误")
				return
			}
			patch.TotalValue = &value
		case "averageUnitCost":
			var value float64
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_PATCH_VALIDATION_FAILED", "[VALIDATION] averageUnitCost 字段错误")
				return
			}
			patch.AverageUnitCost = &value
		case "categoryCode":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_PATCH_VALIDATION_FAILED", "[VALIDATION] categoryCode 字段错误")
				return
			}
			patch.CategoryCode = &value
		case "batchNo":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_PATCH_VALIDATION_FAILED", "[VALIDATION] batchNo 字段错误")
				return
			}
			patch.BatchNo = &value
		case "uom":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_PATCH_VALIDATION_FAILED", "[VALIDATION] uom 字段错误")
				return
			}
			patch.UOM = &value
		}
	}

	services.ApplyPatchInventoryRequestToModel(&inventory, patch)
	if err := db.DB.Model(&inventory).Updates(map[string]any{
		"material_id":       inventory.MaterialID,
		"material_name":     inventory.MaterialName,
		"material_code":     inventory.MaterialCode,
		"material_spec":     inventory.MaterialSpec,
		"quantity":          inventory.Quantity,
		"total_value":       inventory.TotalValue,
		"average_unit_cost": inventory.AverageUnitCost,
		"category_code":     inventory.CategoryCode,
		"batch_no":          inventory.BatchNo,
		"uom":               inventory.UOM,
	}).Error; err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_PATCH_FAILED", "[SERVER] failed to patch inventory: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, inventory)
}

// PatchShipmentHandler updates a DRAFT shipment record via SDRTS delta payload.
func PatchShipmentHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.PatchInventoryHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] invalid shipment patch payload: "+err.Error())
		return
	}

	var shipment models.ShipmentRecord
	if err := db.DB.First(&shipment, "id = ?", id).Error; err != nil {
		respondInventoryError(c, http.StatusNotFound, "INVENTORY_SHIPMENT_NOT_FOUND", "shipment not found")
		return
	}
	if shipment.Status != "DRAFT" {
		respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_NOT_DRAFT", "only DRAFT shipment can be patched")
		return
	}

	patch := services.PatchShipmentRequest{ID: id, Version: req.Metadata.Version}
	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] invalid shipment delta item")
			return
		}
		switch key {
		case "materialId":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] materialId 字段错误")
				return
			}
			patch.MaterialID = &value
		case "materialName":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] materialName 字段错误")
				return
			}
			patch.MaterialName = &value
		case "materialCode":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] materialCode 字段错误")
				return
			}
			patch.MaterialCode = &value
		case "salesOrderId":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] salesOrderId 字段错误")
				return
			}
			patch.SalesOrderID = &value
		case "salesOrderLineId":
			var value uint
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] salesOrderLineId 字段错误")
				return
			}
			patch.SalesOrderLineID = &value
		case "quantity":
			var value float64
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] quantity 字段错误")
				return
			}
			patch.Quantity = &value
		case "sourceCategory":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] sourceCategory 字段错误")
				return
			}
			patch.SourceCategory = &value
		case "batchNo":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] batchNo 字段错误")
				return
			}
			patch.BatchNo = &value
		case "orderNo":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] orderNo 字段错误")
				return
			}
			patch.OrderNo = &value
		case "shipmentDate":
			value, err := parseOptionalTimeValue(valueRaw)
			if err != nil || value == nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] shipmentDate 字段错误")
				return
			}
			patch.ShipmentDate = value
		case "operator":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] operator 字段错误")
				return
			}
			patch.Operator = &value
		case "remarks":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_PATCH_VALIDATION_FAILED", "[VALIDATION] remarks 字段错误")
				return
			}
			patch.Remarks = &value
		}
	}

	services.ApplyPatchShipmentRequestToModel(&shipment, patch)
	if err := db.DB.Model(&shipment).Updates(map[string]any{
		"material_id":         shipment.MaterialID,
		"material_name":       shipment.MaterialName,
		"material_code":       shipment.MaterialCode,
		"sales_order_id":      shipment.SalesOrderID,
		"sales_order_line_id": shipment.SalesOrderLineID,
		"quantity":            shipment.Quantity,
		"source_category":     shipment.SourceCategory,
		"batch_no":            shipment.BatchNo,
		"order_no":            shipment.OrderNo,
		"shipment_date":       shipment.ShipmentDate,
		"operator":            shipment.Operator,
		"remarks":             shipment.Remarks,
	}).Error; err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_SHIPMENT_PATCH_FAILED", "[SERVER] failed to patch shipment: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, services.MapShipmentRecordToResponse(shipment))
}

// RecordInboundHandler records inbound flow and updates inventory atomically.
func RecordInboundHandler(c *gin.Context) {
	var req services.RecordInboundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondInventoryError(c, http.StatusBadRequest, "INVENTORY_INBOUND_VALIDATION_FAILED", "[VALIDATION] invalid inbound payload: "+err.Error())
		return
	}

	inbound := services.MapRecordInboundRequestToModel(req)

	if err := services.RecordInbound(&inbound); err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_INBOUND_FAILED", "[SERVER] inbound operation failed: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, services.MapInboundRecordToResponse(inbound))
}

// RecordShipmentHandler creates shipment draft record.
func RecordShipmentHandler(c *gin.Context) {
	var req services.RecordShipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_VALIDATION_FAILED", "[VALIDATION] invalid shipment payload: "+err.Error())
		return
	}

	shipment := services.MapRecordShipmentRequestToModel(req)

	if err := services.CreateShipmentDraft(&shipment); err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_SHIPMENT_CREATE_FAILED", "[SERVER] failed to save shipment draft: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, services.MapShipmentRecordToResponse(shipment))
}

// CommitShipmentHandler commits a DRAFT shipment and deducts inventory.
func CommitShipmentHandler(c *gin.Context) {
	id := c.Param("id")

	shipment, err := services.CommitShipment(id)
	if errors.Is(err, services.ErrShipmentNotFound) {
		respondInventoryError(c, http.StatusNotFound, "INVENTORY_SHIPMENT_NOT_FOUND", "shipment not found")
		return
	}
	if errors.Is(err, services.ErrShipmentNotDraft) {
		respondInventoryError(c, http.StatusBadRequest, "INVENTORY_SHIPMENT_NOT_DRAFT", "only DRAFT shipment can be committed")
		return
	}
	if err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_COMMIT_FAILED", "[SERVER] commit shipment failed: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, shipment)
}

// TransferInventoryHandler transfers stock between categories.
func TransferInventoryHandler(c *gin.Context) {
	var request services.TransferInventoryRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		respondInventoryError(c, http.StatusBadRequest, "INVENTORY_TRANSFER_VALIDATION_FAILED", "[VALIDATION] invalid transfer payload")
		return
	}

	input := services.MapTransferInventoryRequestToInput(request)

	if err := services.TransferInventory(input); err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_TRANSFER_FAILED", "[SERVER] transfer failed: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, services.InventoryCommandStatusResponse{Status: "success"})
}

// ReconcileInventoryHandler fixes negative quantity records to zero.
func ReconcileInventoryHandler(c *gin.Context) {
	if err := services.ReconcileNegativeInventory(); err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_RECONCILE_FAILED", "reconcile failed")
		return
	}
	c.JSON(http.StatusOK, services.InventoryCommandStatusResponse{Status: "success"})
}

// VoidShipmentHandler voids shipment and rolls back inventory for committed records.
func VoidShipmentHandler(c *gin.Context) {
	id := c.Param("id")

	var input services.VoidShipmentRequest
	c.ShouldBindJSON(&input)

	if err := CheckAndConsumeApproval("Inventory", "VOID", id, input.ApprovalId); err != nil {
		respondInventoryError(c, http.StatusForbidden, "INVENTORY_VOID_FORBIDDEN", "[SECURITY_LOCK] "+err.Error())
		return
	}

	if err := services.VoidShipment(c.Request.Context(), id); err != nil {
		log.Printf("[LOCK_INFO] operation conflict: %v", err)
		if errors.Is(err, services.ErrVoidInProgress) {
			respondInventoryError(c, http.StatusConflict, "INVENTORY_VOID_IN_PROGRESS", "record is being processed, please do not repeat")
			return
		}
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_VOID_FAILED", "[SERVER] operation failed: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, services.InventoryCommandStatusResponse{Status: "success"})
}

// BulkSyncInventoryHandler bulk upserts inventory records.
func BulkSyncInventoryHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var input []services.BulkSyncInventoryItemRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		respondInventoryError(c, http.StatusBadRequest, "INVENTORY_BULK_SYNC_VALIDATION_FAILED", "[VALIDATION] invalid bulk sync payload: "+err.Error())
		return
	}

	if err := services.BulkSyncInventory(input); err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_BULK_SYNC_FAILED", "[SERVER] bulk sync failed: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, services.BulkSyncInventoryResponse{Status: "success", Count: len(input)})
}
