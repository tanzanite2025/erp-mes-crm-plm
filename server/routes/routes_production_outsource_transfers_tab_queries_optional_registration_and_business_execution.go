package routes

import (
	"net/http"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

// A transfers-tab-only account can access outsourcing without receiving the broad
// production configuration or generic production command permissions.
func registerProductionOutsourceTransfersTabQueriesOptionalRegistrationAndBusinessExecutionRoutes(authorized *gin.RouterGroup) {
	queries := authorized.Group("/production/outsourcing")
	queries.Use(middleware.RequireAnyPermission(authz.MenuProdConfig, authz.TabProductionOutsourcingTransfers, "page_production_outsourcing", "tab_production_outsourcing_orders"))
	queries.GET("/orders", handlers.GetOutsourceOrdersHandler)
	queries.GET("/inventory-category-options", handlers.GetProductionOutsourceInventoryCategoryOptionsHandler)

	transfersTab := authorized.Group("/production/outsourcing")
	transfersTab.Use(middleware.RequireAnyPermission(authz.MenuProdConfig, authz.TabProductionOutsourcingTransfers))
	execution := transfersTab.Group("/order-lines")
	execution.PUT("/:lineId/registered-barcodes", middleware.RequireAnyPermission(authz.ActionOutsourceTransferExecute, authz.ActionOutsourceOrderManage), handlers.SaveProductionOutsourceOrderLineOptionalBarcodeRegistrationHandler)
	execution.GET("/:lineId/barcode-review", requireProductionOutsourceBarcodeReviewActionPermission, handlers.GetProductionOutsourceExecutionBarcodeReviewHandler)
	execution.POST("/:lineId/send", middleware.RequireAnyPermission(authz.ActionOutsourceTransferExecute), handlers.SendOutsourceOrderLineHandler)
	execution.POST("/:lineId/return", middleware.RequireAnyPermission(authz.ActionOutsourceTransferExecute), handlers.ReturnOutsourceOrderLineHandler)
	execution.POST("/:lineId/inspection-task", middleware.RequireAnyPermission(authz.ActionOutsourceInspectionSubmit), handlers.PrepareOutsourceInspectionTaskHandler)
	execution.POST("/:lineId/inspect", middleware.RequireAnyPermission(authz.ActionOutsourceInspectionSubmit), handlers.InspectOutsourceOrderLineHandler)
	transfersTab.GET("/diagnostics", handlers.GetOutsourceDiagnosticsHandler)
	transfersTab.GET("/transfers", handlers.GetOutsourceTransfersHandler)
	transfersTab.GET("/inspections", handlers.GetOutsourceInspectionsHandler)
}

func requireProductionOutsourceBarcodeReviewActionPermission(c *gin.Context) {
	switch strings.ToUpper(strings.TrimSpace(c.Query("action"))) {
	case "SEND", "RETURN":
		middleware.RequireAnyPermission(authz.ActionOutsourceTransferExecute)(c)
	case "INSPECT":
		middleware.RequireAnyPermission(authz.ActionOutsourceInspectionSubmit)(c)
	default:
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "请选择委外发出、回厂或检验动作"})
	}
}
