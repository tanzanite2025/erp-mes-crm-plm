package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type ProductionOutsourceInventoryCategoryOptionResponse struct {
	Value                     string `json:"value"`
	Label                     string `json:"label"`
	Code                      string `json:"code"`
	Name                      string `json:"name"`
	Active                    bool   `json:"active"`
	SortOrder                 int    `json:"sortOrder"`
	AllowInbound              bool   `json:"allowInbound"`
	AllowShipment             bool   `json:"allowShipment"`
	AllowStocktake            bool   `json:"allowStocktake"`
	AllowPurchaseReceipt      bool   `json:"allowPurchaseReceipt"`
	DefaultForProductInbound  bool   `json:"defaultForProductInbound"`
	DefaultForMaterialInbound bool   `json:"defaultForMaterialInbound"`
	DefaultForPurchaseReceipt bool   `json:"defaultForPurchaseReceipt"`
}

func GetOutsourceOrdersHandler(c *gin.Context) {
	response, err := services.ListOutsourceOrders(services.OutsourceOrderListQuery{
		Search:     c.Query("search"),
		Status:     c.Query("status"),
		SourceType: c.Query("sourceType"),
		PartnerID:  c.Query("partnerId"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch outsource orders"})
		return
	}
	c.JSON(http.StatusOK, response)
}

// GetProductionOutsourceInventoryCategoryOptionsHandler exposes a read-only
// projection for production execution without requiring warehouse menu access.
func GetProductionOutsourceInventoryCategoryOptionsHandler(c *gin.Context) {
	var categories []models.WarehouseCategory
	if err := db.DB.
		Where("active = ? AND code <> ?", true, services.ProductionOutsourceInventoryCategory).
		Order("sort_order asc, code asc").
		Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch outsource inventory category options"})
		return
	}

	options := make([]ProductionOutsourceInventoryCategoryOptionResponse, 0, len(categories))
	for _, category := range categories {
		options = append(options, ProductionOutsourceInventoryCategoryOptionResponse{
			Value:                     category.Code,
			Label:                     category.Name,
			Code:                      category.Code,
			Name:                      category.Name,
			Active:                    category.Active,
			SortOrder:                 category.SortOrder,
			AllowInbound:              category.AllowInbound,
			AllowShipment:             category.AllowShipment,
			AllowStocktake:            category.AllowStocktake,
			AllowPurchaseReceipt:      category.AllowPurchaseReceipt,
			DefaultForProductInbound:  category.DefaultForProductInbound,
			DefaultForMaterialInbound: category.DefaultForMaterialInbound,
			DefaultForPurchaseReceipt: category.DefaultForPurchaseReceipt,
		})
	}

	c.JSON(http.StatusOK, options)
}

func GetOutsourceTransfersHandler(c *gin.Context) {
	response, err := services.ListOutsourceTransfers(services.OutsourceTransferListQuery{
		OutsourceOrderID:     c.Query("outsourceOrderId"),
		OutsourceOrderLineID: c.Query("outsourceOrderLineId"),
		TransferType:         c.Query("transferType"),
		ProductBarcode:       c.Query("productBarcode"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch outsource transfers"})
		return
	}
	c.JSON(http.StatusOK, response)
}

func GetOutsourceInspectionsHandler(c *gin.Context) {
	response, err := services.ListOutsourceInspections(services.OutsourceInspectionListQuery{
		OutsourceOrderID:     c.Query("outsourceOrderId"),
		OutsourceOrderLineID: c.Query("outsourceOrderLineId"),
		ProductBarcode:       c.Query("productBarcode"),
		Result:               c.Query("result"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch outsource inspections"})
		return
	}
	c.JSON(http.StatusOK, response)
}

func GetOutsourceDiagnosticsHandler(c *gin.Context) {
	response, err := services.GetOutsourceDiagnostics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch outsource diagnostics"})
		return
	}
	c.JSON(http.StatusOK, response)
}

func CreateOutsourceOrderHandler(c *gin.Context) {
	var input services.OutsourceOrderDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	order, err := services.CreateOutsourceOrder(services.SaveOutsourceOrderRequest{
		Order:    input,
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		respondOutsourceOrderError(c, err, "Failed to create outsource order")
		return
	}

	c.JSON(http.StatusOK, order)
}

func UpdateOutsourceOrderHandler(c *gin.Context) {
	var input services.OutsourceOrderDTO
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	order, err := services.UpdateOutsourceOrder(services.UpdateOutsourceOrderRequest{
		ID:       c.Param("id"),
		Order:    input,
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		respondOutsourceOrderError(c, err, "Failed to update outsource order")
		return
	}

	c.JSON(http.StatusOK, order)
}

func DeleteOutsourceOrderHandler(c *gin.Context) {
	err := services.DeleteOutsourceOrder(services.DeleteOutsourceOrderRequest{
		ID:       c.Param("id"),
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		respondOutsourceOrderError(c, err, "Failed to delete outsource order")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted successfully"})
}

func ReleaseOutsourceOrderHandler(c *gin.Context) {
	order, err := services.ReleaseOutsourceOrder(services.ReleaseOutsourceOrderRequest{
		ID:       c.Param("id"),
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		respondOutsourceOrderError(c, err, "Failed to release outsource order")
		return
	}

	c.JSON(http.StatusOK, order)
}

func CancelOutsourceOrderHandler(c *gin.Context) {
	order, err := services.CancelOutsourceOrder(services.CancelOutsourceOrderRequest{
		ID:       c.Param("id"),
		ActorID:  middleware.GetSafeUserID(c),
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		respondOutsourceOrderError(c, err, "Failed to cancel outsource order")
		return
	}

	c.JSON(http.StatusOK, order)
}

func SendOutsourceOrderLineHandler(c *gin.Context) {
	var input services.OutsourceTransferRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input.OutsourceOrderLineID = c.Param("lineId")
	input.ActorID = middleware.GetSafeUserID(c)
	input.Operator = middleware.GetSafeUsername(c)
	input.IP = c.ClientIP()

	response, err := services.SendOutsourceOrderLine(input)
	if err != nil {
		respondOutsourceOrderError(c, err, "Failed to send outsource order line")
		return
	}

	c.JSON(http.StatusOK, response)
}

func ReturnOutsourceOrderLineHandler(c *gin.Context) {
	var input services.OutsourceTransferRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input.OutsourceOrderLineID = c.Param("lineId")
	input.ActorID = middleware.GetSafeUserID(c)
	input.Operator = middleware.GetSafeUsername(c)
	input.IP = c.ClientIP()

	response, err := services.ReturnOutsourceOrderLine(input)
	if err != nil {
		respondOutsourceOrderError(c, err, "Failed to return outsource order line")
		return
	}

	c.JSON(http.StatusOK, response)
}

func PrepareOutsourceInspectionTaskHandler(c *gin.Context) {
	var input services.OutsourceInspectionTaskRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input.OutsourceOrderLineID = c.Param("lineId")
	input.ActorID = middleware.GetSafeUserID(c)
	input.Operator = middleware.GetSafeUsername(c)
	input.IP = c.ClientIP()

	task, err := services.PrepareOutsourceInspectionTask(input)
	if err != nil {
		respondOutsourceOrderError(c, err, "Failed to prepare outsource inspection task")
		return
	}
	c.JSON(http.StatusOK, task)
}

func InspectOutsourceOrderLineHandler(c *gin.Context) {
	var input services.OutsourceInspectionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input.OutsourceOrderLineID = c.Param("lineId")
	input.ActorID = middleware.GetSafeUserID(c)
	input.Operator = middleware.GetSafeUsername(c)
	input.IP = c.ClientIP()

	response, err := services.InspectOutsourceOrderLine(input)
	if err != nil {
		respondOutsourceOrderError(c, err, "Failed to inspect outsource order line")
		return
	}

	c.JSON(http.StatusOK, response)
}

func respondOutsourceOrderError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, services.ErrInvalidOutsourceOrder):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrQualityInspectionTaskClaimed):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrOutsourceOrderDuplicateNo):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrOutsourceOrderVersionConflict):
		respondVersionConflict(c)
	case errors.Is(err, services.ErrOutsourceOrderNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": fallback + ": " + err.Error()})
	}
}
