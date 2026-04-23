package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerProductionRoutes(authorized *gin.RouterGroup) {
	productionAccess := middleware.RequirePermissions(authz.MenuProdConfig)
	adminOnly := middleware.RequirePermissions(authz.PermissionManage)
	productionLineUpdate := middleware.RequirePermissions(authz.ActionProductionLineUpdate)

	productionGroup := authorized.Group("/production")
	productionGroup.Use(productionAccess)
	{
		productionGroup.GET("/lines", handlers.GetProductionLinesHandler)
		productionGroup.POST("/lines", adminOnly, handlers.SaveProductionLineHandler)
		productionGroup.PATCH("/lines/:id", productionLineUpdate, handlers.PatchProductionLineHandler)
		productionGroup.DELETE("/lines/:id", adminOnly, handlers.DeleteProductionLineHandler)
		productionGroup.GET("/processes", handlers.GetProcessStepsHandler)
		productionGroup.POST("/processes", adminOnly, handlers.SaveProcessStepHandler)
		productionGroup.DELETE("/processes/:id", adminOnly, handlers.DeleteProcessStepHandler)
		productionGroup.POST("/mappings/assign", adminOnly, handlers.AssignProcessToJobCategoryHandler)
		productionGroup.POST("/mappings/remove", adminOnly, handlers.RemoveProcessFromJobCategoryHandler)
		productionGroup.GET("/plans", handlers.GetProductionPlansHandler)
		productionGroup.POST("/plans", handlers.SaveProductionPlanHandler)
		productionGroup.GET("/cutting-issuances/trace-report", handlers.GetCuttingIssuanceTraceReportHandler)
		productionGroup.GET("/cutting-issuances", handlers.GetCuttingIssuanceExecutionsHandler)
		productionGroup.POST("/cutting-issuances", handlers.CreateCuttingIssuanceExecutionHandler)
		productionGroup.GET("/stats", handlers.GetProductionStatsHandler)
		productionGroup.GET("/order-progress", handlers.GetOrderProgressHandler)
	}
}
