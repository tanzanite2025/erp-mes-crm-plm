package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerProductionRoutes(authorized *gin.RouterGroup) {
	productionAccess := middleware.RequireAnyPermission(authz.MenuProdConfig)
	adminOnly := middleware.RequireAnyPermission(authz.PermissionManage)
	productionLineUpdate := middleware.RequireAnyPermission(authz.ActionProductionLineUpdate)
	productionRouteManage := middleware.RequireAnyPermission(authz.ActionProductionRouteManage)
	outsourcePartnerManage := middleware.RequireAnyPermission(authz.ActionOutsourcePartnerManage)
	outsourceOrderManage := middleware.RequireAnyPermission(authz.ActionOutsourceOrderManage)

	productionPlanManage := middleware.RequireAnyPermission(authz.ActionProductionPlanManage)
	productionIssuanceExecute := middleware.RequireAnyPermission(authz.ActionProductionIssuanceExecute)
	barcodeBindingManage := middleware.RequireAnyPermission(authz.ActionBarcodeBindingManage)

	productionGroup := authorized.Group("/production")
	productionGroup.Use(productionAccess)
	{
		productionGroup.GET("/lines", handlers.GetProductionLinesHandler)
		productionGroup.POST("/lines", adminOnly, handlers.SaveProductionLineHandler)
		productionGroup.PATCH("/lines/:id", productionLineUpdate, handlers.PatchProductionLineHandler)
		productionGroup.DELETE("/lines/:id", adminOnly, handlers.DeleteProductionLineHandler)
		productionGroup.GET("/routes", handlers.GetProductionRoutesHandler)
		productionGroup.POST("/routes", productionRouteManage, handlers.SaveProductionRouteHandler)
		productionGroup.DELETE("/routes/:id", productionRouteManage, handlers.DeleteProductionRouteHandler)
		productionGroup.GET("/processes", handlers.GetProcessStepsHandler)
		productionGroup.POST("/processes", adminOnly, handlers.SaveProcessStepHandler)
		productionGroup.DELETE("/processes/:id", adminOnly, handlers.DeleteProcessStepHandler)
		productionGroup.GET("/plans", handlers.GetProductionPlansHandler)
		productionGroup.POST("/plans", productionPlanManage, handlers.SaveProductionPlanHandler)
		productionGroup.GET("/cutting-issuances/trace-report", handlers.GetCuttingIssuanceTraceReportHandler)
		productionGroup.GET("/cutting-issuances", handlers.GetCuttingIssuanceExecutionsHandler)
		productionGroup.POST("/cutting-issuances", productionIssuanceExecute, handlers.CreateCuttingIssuanceExecutionHandler)
		productionGroup.POST("/product-barcode-capture-sessions", handlers.CreateProductBarcodeCaptureSessionHandler)
		productionGroup.GET("/product-barcode-capture-sessions/:sessionId", handlers.GetProductBarcodeCaptureSessionHandler)
		productionGroup.GET("/product-barcode-bindings", handlers.GetProductBarcodeBindingsHandler)
		productionGroup.GET("/product-barcode-bindings/count", handlers.CountProductBarcodeBindingsHandler)
		productionGroup.POST("/product-barcode-bindings", barcodeBindingManage, handlers.CreateProductBarcodeBindingHandler)
		productionGroup.GET("/product-barcode-states/:productBarcode", handlers.GetProductBarcodeStateHandler)
		productionGroup.POST("/product-barcode-states", productionIssuanceExecute, handlers.SaveProductBarcodeStateHandler)
		productionGroup.GET("/execution-lots", handlers.GetProductionExecutionLotsHandler)
		productionGroup.POST("/execution-lots", productionIssuanceExecute, handlers.SaveProductionExecutionLotHandler)
		productionGroup.GET("/operation-executions", handlers.GetProductionOperationExecutionsHandler)
		productionGroup.POST("/operation-executions", productionIssuanceExecute, handlers.RecordProductionOperationExecutionHandler)
		productionGroup.POST("/scan-commands/execute", productionIssuanceExecute, handlers.ExecuteProductionScanCommandHandler)
		productionGroup.GET("/outsourcing/orders", handlers.GetOutsourceOrdersHandler)
		productionGroup.POST("/outsourcing/orders", outsourceOrderManage, handlers.CreateOutsourceOrderHandler)
		productionGroup.PATCH("/outsourcing/orders/:id", outsourceOrderManage, handlers.UpdateOutsourceOrderHandler)
		productionGroup.DELETE("/outsourcing/orders/:id", outsourceOrderManage, handlers.DeleteOutsourceOrderHandler)
		productionGroup.POST("/outsourcing/orders/:id/release", outsourceOrderManage, handlers.ReleaseOutsourceOrderHandler)
		productionGroup.GET("/outsourcing/partners", handlers.GetOutsourcePartnersHandler)
		productionGroup.POST("/outsourcing/partners", outsourcePartnerManage, handlers.CreateOutsourcePartnerHandler)
		productionGroup.PATCH("/outsourcing/partners/:id", outsourcePartnerManage, handlers.UpdateOutsourcePartnerHandler)
		productionGroup.DELETE("/outsourcing/partners/:id", outsourcePartnerManage, handlers.DeleteOutsourcePartnerHandler)
		productionGroup.GET("/stats", handlers.GetProductionStatsHandler)
		productionGroup.GET("/order-progress", handlers.GetOrderProgressHandler)
	}
}
