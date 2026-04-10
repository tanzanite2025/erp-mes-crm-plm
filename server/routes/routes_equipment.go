package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerEquipmentRoutes(authorized *gin.RouterGroup) {
	equipmentAccess := middleware.RequirePermissions(authz.MenuEquipment)
	moldManage := middleware.RequirePermissions(authz.ActionEquipmentMoldManage)
	moldSync := middleware.RequirePermissions(authz.ActionEquipmentMoldSync)
	drawingManage := middleware.RequirePermissions(authz.ActionEquipmentDrawingManage)
	drawingUpdate := middleware.RequirePermissions(authz.ActionEquipmentDrawingUpdate)
	drawingDelete := middleware.RequirePermissions(authz.ActionEquipmentDrawingDelete)
	furnaceManage := middleware.RequirePermissions(authz.ActionEquipmentFurnaceManage)
	furnaceSync := middleware.RequirePermissions(authz.ActionEquipmentFurnaceSync)
	partnerManage := middleware.RequirePermissions(authz.ActionEquipmentPartnerManage)
	partnerUpdate := middleware.RequirePermissions(authz.ActionEquipmentPartnerUpdate)
	loanManage := middleware.RequirePermissions(authz.ActionEquipmentLoanManage)
	telemetryUpdate := middleware.RequirePermissions(authz.ActionEquipmentTelemetryUpdate)

	equipmentGroup := authorized.Group("")
	equipmentGroup.Use(equipmentAccess)

	moldGroup := equipmentGroup.Group("/molds")
	moldGroup.GET("/dashboard/stats", handlers.GetAssetDashboardStatsHandler)
	moldGroup.GET("/capacity", handlers.GetMoldCapacityHandler)
	moldGroup.POST("/capacity-alerts", handlers.CheckMoldCapacityAlertsHandler)
	moldGroup.GET("/check-sn", handlers.CheckMoldDuplicateSNHandler)
	moldGroup.GET("", handlers.GetMoldsHandler)
	moldGroup.GET("/:id", handlers.GetMoldHandler)
	moldGroup.POST("", moldManage, handlers.SaveMoldHandler)
	moldGroup.PATCH("/:id", moldManage, handlers.PatchMoldHandler)
	moldGroup.POST("/:id/telemetry", telemetryUpdate, handlers.UpdateTelemetryHandler)
	moldGroup.POST("/sync", moldSync, handlers.BulkSyncMoldsHandler)

	partnerGroup := equipmentGroup.Group("/equipment-partners")
	partnerGroup.GET("", handlers.GetEquipmentPartnersHandler)
	partnerGroup.POST("", partnerManage, handlers.SaveEquipmentPartnerHandler)
	partnerGroup.PATCH("/:id", partnerUpdate, handlers.PatchEquipmentPartnerHandler)
	partnerGroup.DELETE("/:id", partnerManage, handlers.DeleteEquipmentPartnerHandler)

	drawingGroup := equipmentGroup.Group("/drawings")
	drawingGroup.GET("", handlers.GetDrawingsHandler)
	drawingGroup.POST("", drawingManage, handlers.SaveDrawingHandler)
	drawingGroup.PATCH("/:id", drawingUpdate, handlers.PatchDrawingHandler)
	drawingGroup.GET("/:id/logs", handlers.GetDrawingLogsHandler)
	drawingGroup.GET("/by-mold/:moldSn", handlers.GetDrawingsByMoldHandler)
	drawingGroup.DELETE("/:id", drawingDelete, handlers.DeleteDrawingHandler)

	furnaceGroup := equipmentGroup.Group("/furnaces")
	furnaceGroup.GET("", handlers.GetFurnacesHandler)
	furnaceGroup.POST("", furnaceManage, handlers.SaveFurnaceHandler)
	furnaceGroup.PATCH("/:id", furnaceManage, handlers.PatchFurnaceHandler)
	furnaceGroup.POST("/:id/telemetry", telemetryUpdate, handlers.UpdateFurnaceTelemetryHandler)
	furnaceGroup.POST("/sync", furnaceSync, handlers.BulkSyncFurnacesHandler)

	equipmentGroup.GET("/mold-loans", handlers.GetLoansHandler)
	equipmentGroup.POST("/mold-loans", loanManage, handlers.CreateLoanWithStatusHandler)
	equipmentGroup.POST("/mold-loans/:id/return", loanManage, handlers.ReturnLoanHandler)
}
