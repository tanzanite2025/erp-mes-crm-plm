package services

import (
	"errors"
	"xdfc-server/models"
)

var (
	ErrProductionMaterialIssuanceStockUnavailable  = errors.New("production material issuance stock unavailable")
	ErrProductionMaterialIssuanceAllocationInvalid = errors.New("production material issuance allocation invalid")
)

const productionMaterialIssuanceQuantityTolerance = 1e-9

type ProductionMaterialIssuanceWarehouseAllocationInput struct {
	SalesOrderLineID     uint    `json:"salesOrderLineId"`
	Quantity             float64 `json:"quantity"`
	OriginalAllocationID *string `json:"originalAllocationId"`
}

type ProductionMaterialIssuanceWarehouseMaterialInput struct {
	MaterialID  string                                               `json:"materialId"`
	BatchNo     string                                               `json:"batchNo"`
	Quantity    float64                                              `json:"quantity"`
	Allocations []ProductionMaterialIssuanceWarehouseAllocationInput `json:"allocations"`
}

type ProductionMaterialIssuanceWarehouseConfirmationRequest struct {
	CommandID       string                                             `json:"commandId"`
	DocumentID      string                                             `json:"documentId"`
	ExpectedVersion int                                                `json:"expectedVersion"`
	Kind            string                                             `json:"kind"`
	Reason          string                                             `json:"reason"`
	Materials       []ProductionMaterialIssuanceWarehouseMaterialInput `json:"materials"`
}

type ProductionMaterialIssuanceSourceMaterialProgress struct {
	SourceSnapshotID string  `json:"sourceSnapshotId"`
	SalesOrderLineID uint    `json:"salesOrderLineId"`
	Position         int     `json:"position"`
	MaterialID       string  `json:"materialId"`
	MaterialCode     string  `json:"materialCode"`
	MaterialName     string  `json:"materialName"`
	Unit             string  `json:"unit"`
	StandardQty      float64 `json:"standardQty"`
	IssuedQty        float64 `json:"issuedQty"`
	ReturnedQty      float64 `json:"returnedQty"`
	NetQty           float64 `json:"netQty"`
	RemainingQty     float64 `json:"remainingQty"`
	ExcessQty        float64 `json:"excessQty"`
}

type ProductionMaterialIssuanceMaterialProgressTotal struct {
	MaterialID   string  `json:"materialId"`
	Unit         string  `json:"unit"`
	StandardQty  float64 `json:"standardQty"`
	IssuedQty    float64 `json:"issuedQty"`
	ReturnedQty  float64 `json:"returnedQty"`
	NetQty       float64 `json:"netQty"`
	RemainingQty float64 `json:"remainingQty"`
	ExcessQty    float64 `json:"excessQty"`
}

type ProductionMaterialIssuanceWarehouseMaterialDetail struct {
	Material    models.ProductionMaterialIssuanceWarehouseMovementMaterial `json:"material"`
	Allocations []models.ProductionMaterialIssuanceOrderLineAllocation     `json:"allocations"`
}

type ProductionMaterialIssuanceWarehouseMovementDetail struct {
	Movement  models.ProductionMaterialIssuanceWarehouseMovement  `json:"movement"`
	Materials []ProductionMaterialIssuanceWarehouseMaterialDetail `json:"materials"`
}

type ProductionMaterialIssuanceWarehouseReview struct {
	WarehouseActionBlockers map[string]string                                        `json:"warehouseActionBlockers"`
	Document                models.ProductionMaterialIssuanceDocument                `json:"document"`
	SourceMaterials         []ProductionMaterialIssuanceSourceMaterialProgress       `json:"sourceMaterials"`
	MaterialTotals          []ProductionMaterialIssuanceMaterialProgressTotal        `json:"materialTotals"`
	Movements               []ProductionMaterialIssuanceWarehouseMovementDetail      `json:"movements"`
	ReturnableAllocations   []ProductionMaterialIssuanceReturnableOriginalAllocation `json:"returnableAllocations"`
}

type ProductionMaterialIssuanceReturnableOriginalAllocation struct {
	OriginalAllocationID string  `json:"originalAllocationId"`
	SalesOrderLineID     uint    `json:"salesOrderLineId"`
	MaterialID           string  `json:"materialId"`
	BatchNo              string  `json:"batchNo"`
	Unit                 string  `json:"unit"`
	ReturnableQty        float64 `json:"returnableQty"`
}

type ProductionMaterialIssuanceWarehouseConfirmationResult struct {
	Document models.ProductionMaterialIssuanceDocument         `json:"document"`
	Movement ProductionMaterialIssuanceWarehouseMovementDetail `json:"movement"`
}
