package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerEquipmentRoutes(authorized *gin.RouterGroup) {
	equipmentAccess := middleware.RequireAnyPermission(authz.MenuEquipment)
	moldManage := middleware.RequireAnyPermission(authz.ActionEquipmentMoldManage)
	moldSync := middleware.RequireAnyPermission(authz.ActionEquipmentMoldSync)
	drawingManage := middleware.RequireAnyPermission(authz.ActionEquipmentDrawingManage)
	drawingUpdate := middleware.RequireAnyPermission(authz.ActionEquipmentDrawingUpdate)
	drawingDelete := middleware.RequireAnyPermission(authz.ActionEquipmentDrawingDelete)
	furnaceManage := middleware.RequireAnyPermission(authz.ActionEquipmentFurnaceManage)
	furnaceSync := middleware.RequireAnyPermission(authz.ActionEquipmentFurnaceSync)
	partnerManage := middleware.RequireAnyPermission(authz.ActionEquipmentPartnerManage)
	partnerUpdate := middleware.RequireAnyPermission(authz.ActionEquipmentPartnerUpdate)
	loanManage := middleware.RequireAnyPermission(authz.ActionEquipmentLoanManage)
	telemetryUpdate := middleware.RequireAnyPermission(authz.ActionEquipmentTelemetryUpdate)
	maintenanceManage := middleware.RequireAnyPermission(authz.ActionEquipmentMaintenanceManage)

	equipmentGroup := authorized.Group("")
	equipmentGroup.Use(equipmentAccess)

	moldGroup := equipmentGroup.Group("/molds")
	moldGroup.GET("/dashboard/stats", handlers.GetAssetDashboardStatsHandler)
	moldGroup.GET("/capacity", handlers.GetMoldCapacityHandler)
	moldGroup.POST("/capacity-alerts", handlers.CheckMoldCapacityAlertsHandler)
	moldGroup.GET("/check-sn", handlers.CheckMoldDuplicateSNHandler)
	moldGroup.GET("/group-names", handlers.GetMoldGroupNamesHandler)
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

	// Maintenance Records routes
	equipmentGroup.GET("/maintenance-records", handlers.GetMaintenanceRecordsHandler)
	equipmentGroup.GET("/maintenance-records/stats", handlers.GetMaintenanceRecordStatsHandler)
	equipmentGroup.GET("/maintenance-records/:id", handlers.GetMaintenanceRecordHandler)
	equipmentGroup.POST("/maintenance-records", maintenanceManage, handlers.CreateMaintenanceRecordHandler)
	equipmentGroup.PATCH("/maintenance-records/:id", maintenanceManage, handlers.PatchMaintenanceRecordHandler)
	equipmentGroup.DELETE("/maintenance-records/:id", maintenanceManage, handlers.DeleteMaintenanceRecordHandler)
}
