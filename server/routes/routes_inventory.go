package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerInventoryRoutes(authorized *gin.RouterGroup) {
	warehouseAccess := middleware.RequireAnyPermission(authz.MenuWarehouse)
	warehouseThresholdAccess := middleware.RequireAnyPermission(authz.MenuWarehouse, authz.MenuWarehouseConfig)
	inboundRecord := middleware.RequireAnyPermission(authz.ActionWarehouseInboundRecord)
	shipmentRecord := middleware.RequireAnyPermission(authz.ActionWarehouseShipmentRecord)
	shipmentUpdate := middleware.RequireAnyPermission(authz.ActionWarehouseShipmentUpdate)
	shipmentCommit := middleware.RequireAnyPermission(authz.ActionWarehouseShipmentCommit)
	shipmentVoid := middleware.RequireAnyPermission(authz.ActionWarehouseShipmentVoid)
	transferInventory := middleware.RequireAnyPermission(authz.ActionWarehouseTransfer)
	reconcileInventory := middleware.RequireAnyPermission(authz.ActionWarehouseReconcile)
	inventorySync := middleware.RequireAnyPermission(authz.ActionWarehouseSync)
	categoryManage := middleware.RequireAnyPermission(authz.ActionWarehouseCategoryManage)
	stocktakeManage := middleware.RequireAnyPermission(authz.ActionWarehouseStocktakeManage)
	adjustmentSubmit := middleware.RequireAnyPermission(authz.ActionWarehouseAdjustmentSubmit)
	adjustmentUpdate := middleware.RequireAnyPermission(authz.ActionWarehouseAdjustmentUpdate)
	adjustmentExecute := middleware.RequireAnyPermission(authz.ActionWarehouseAdjustmentExecute)

	inventoryGroup := authorized.Group("")
	inventoryGroup.Use(warehouseAccess)
	inventoryGroup.GET("/inventory", handlers.GetInventoryHandler)
	inventoryGroup.GET("/warehouse/master-data/search", handlers.SearchWarehouseMasterDataHandler)
	inventoryGroup.GET("/inventory/valuation", handlers.GetInventoryValuationHandler)
	inventoryGroup.GET("/inventory/alerts/summary", handlers.GetInventoryAlertSummaryHandler)
	inventoryGroup.GET("/inventory/alerts/bom-details", handlers.GetInventoryBOMAlertDetailsHandler)
	inventoryGroup.PATCH("/inventory/:id", adjustmentUpdate, handlers.PatchInventoryHandler)
	inventoryGroup.GET("/inventory/inbound", handlers.GetInboundHistoryHandler)
	inventoryGroup.POST("/inventory/inbound", inboundRecord, handlers.RecordInboundHandler)
	inventoryGroup.GET("/inventory/shipment", handlers.GetShipmentHistoryHandler)
	inventoryGroup.GET("/inventory/shipment-demands", handlers.GetShipmentDemandsHandler)
	inventoryGroup.POST("/inventory/shipment", shipmentRecord, handlers.RecordShipmentHandler)
	inventoryGroup.POST("/inventory/shipment/virtual-lock", shipmentRecord, handlers.PrepareVirtualShipmentHandler)
	inventoryGroup.PATCH("/inventory/shipment/:id", shipmentUpdate, handlers.PatchShipmentHandler)
	inventoryGroup.POST("/inventory/shipment/:id/commit", shipmentCommit, handlers.CommitShipmentHandler)
	inventoryGroup.POST("/inventory/shipment/:id/void", shipmentVoid, handlers.VoidShipmentHandler)
	inventoryGroup.POST("/inventory/transfer", transferInventory, handlers.TransferInventoryHandler)
	inventoryGroup.POST("/inventory/reconcile", reconcileInventory, handlers.ReconcileInventoryHandler)
	inventoryGroup.POST("/inventory/sync", inventorySync, handlers.BulkSyncInventoryHandler)

	categoryGroup := inventoryGroup.Group("/warehouse/categories")
	categoryGroup.GET("", handlers.GetWarehouseCategoriesHandler)
	categoryGroup.GET("/options", handlers.GetWarehouseCategoryOptionsHandler)
	categoryGroup.POST("", categoryManage, handlers.SaveWarehouseCategoryHandler)
	categoryGroup.PATCH("/:id", categoryManage, handlers.PatchWarehouseCategoryHandler)
	categoryGroup.DELETE("/:id", categoryManage, handlers.DeleteWarehouseCategoryHandler)

	packagingAssemblyGroup := inventoryGroup.Group("/warehouse/packaging-assemblies")
	packagingAssemblyGroup.GET("", handlers.GetPackagingAssembliesHandler)
	packagingAssemblyGroup.POST("/capture-sessions", handlers.CreatePackagingAssemblyCaptureSessionHandler)
	packagingAssemblyGroup.GET("/capture-sessions/:sessionId", handlers.GetPackagingAssemblyCaptureSessionHandler)

	thresholdRuleGroup := authorized.Group("/warehouse/threshold-rules")
	thresholdRuleGroup.Use(warehouseThresholdAccess)
	thresholdRuleGroup.GET("", handlers.GetInventoryThresholdRulesHandler)
	thresholdRuleGroup.GET("/target-options", handlers.GetInventoryThresholdTargetOptionsHandler)
	thresholdRuleGroup.POST("", categoryManage, handlers.SaveInventoryThresholdRuleHandler)
	thresholdRuleGroup.PATCH("/:id", categoryManage, handlers.PatchInventoryThresholdRuleHandler)
	thresholdRuleGroup.DELETE("/:id", categoryManage, handlers.DeleteInventoryThresholdRuleHandler)

	stocktakeGroup := inventoryGroup.Group("/stocktakes")
	stocktakeGroup.GET("", handlers.GetStocktakeTasksHandler)
	stocktakeGroup.POST("", stocktakeManage, handlers.CreateStocktakeTaskHandler)
	stocktakeGroup.PATCH("/items/:id", stocktakeManage, handlers.PatchStocktakeItemHandler)
	stocktakeGroup.GET("/:id/items", handlers.GetStocktakeItemsHandler)
	stocktakeGroup.POST("/:taskId/post-adjustment", adjustmentSubmit, handlers.SubmitAdjustmentApprovalHandler)

	adjustmentGroup := inventoryGroup.Group("/warehouse/adjustments")
	adjustmentGroup.GET("", handlers.GetAdjustmentHistoryHandler)
	adjustmentGroup.POST("/:id/execute", adjustmentExecute, handlers.ExecuteAdjustmentHandler)
}
