package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerInventoryRoutes(authorized *gin.RouterGroup) {
	warehouseAccess := middleware.RequirePermissions(authz.MenuWarehouse)
	inboundRecord := middleware.RequirePermissions(authz.ActionWarehouseInboundRecord)
	shipmentRecord := middleware.RequirePermissions(authz.ActionWarehouseShipmentRecord)
	shipmentCommit := middleware.RequirePermissions(authz.ActionWarehouseShipmentCommit)
	shipmentVoid := middleware.RequirePermissions(authz.ActionWarehouseShipmentVoid)
	transferInventory := middleware.RequirePermissions(authz.ActionWarehouseTransfer)
	reconcileInventory := middleware.RequirePermissions(authz.ActionWarehouseReconcile)
	inventorySync := middleware.RequirePermissions(authz.ActionWarehouseSync)
	categoryManage := middleware.RequirePermissions(authz.ActionWarehouseCategoryManage)
	stocktakeManage := middleware.RequirePermissions(authz.ActionWarehouseStocktakeManage)
	adjustmentSubmit := middleware.RequirePermissions(authz.ActionWarehouseAdjustmentSubmit)
	adjustmentExecute := middleware.RequirePermissions(authz.ActionWarehouseAdjustmentExecute)

	inventoryGroup := authorized.Group("")
	inventoryGroup.Use(warehouseAccess)
	inventoryGroup.GET("/inventory", handlers.GetInventoryHandler)
	inventoryGroup.PATCH("/inventory/:id", adjustmentSubmit, handlers.PatchInventoryHandler)
	inventoryGroup.GET("/inventory/inbound", handlers.GetInboundHistoryHandler)
	inventoryGroup.POST("/inventory/inbound", inboundRecord, handlers.RecordInboundHandler)
	inventoryGroup.GET("/inventory/shipment", handlers.GetShipmentHistoryHandler)
	inventoryGroup.POST("/inventory/shipment", shipmentRecord, handlers.RecordShipmentHandler)
	inventoryGroup.PATCH("/inventory/shipment/:id", shipmentRecord, handlers.PatchShipmentHandler)
	inventoryGroup.POST("/inventory/shipment/:id/commit", shipmentCommit, handlers.CommitShipmentHandler)
	inventoryGroup.POST("/inventory/shipment/:id/void", shipmentVoid, handlers.VoidShipmentHandler)
	inventoryGroup.POST("/inventory/transfer", transferInventory, handlers.TransferInventoryHandler)
	inventoryGroup.POST("/inventory/reconcile", reconcileInventory, handlers.ReconcileInventoryHandler)
	inventoryGroup.POST("/inventory/sync", inventorySync, handlers.BulkSyncInventoryHandler)

	categoryGroup := inventoryGroup.Group("/warehouse/categories")
	categoryGroup.GET("", handlers.GetWarehouseCategoriesHandler)
	categoryGroup.POST("", categoryManage, handlers.SaveWarehouseCategoryHandler)
	categoryGroup.DELETE("/:id", categoryManage, handlers.DeleteWarehouseCategoryHandler)

	stocktakeGroup := inventoryGroup.Group("/stocktakes")
	stocktakeGroup.GET("", handlers.GetStocktakeTasksHandler)
	stocktakeGroup.POST("", stocktakeManage, handlers.CreateStocktakeTaskHandler)
	stocktakeGroup.GET("/:id/items", handlers.GetStocktakeItemsHandler)
	stocktakeGroup.POST("/:taskId/post-adjustment", adjustmentSubmit, handlers.SubmitAdjustmentApprovalHandler)

	adjustmentGroup := inventoryGroup.Group("/warehouse/adjustments")
	adjustmentGroup.GET("", handlers.GetAdjustmentHistoryHandler)
	adjustmentGroup.POST("/:id/execute", adjustmentExecute, handlers.ExecuteAdjustmentHandler)
}
