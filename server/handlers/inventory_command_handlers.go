package handlers

import (
	"errors"
	"log"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

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
