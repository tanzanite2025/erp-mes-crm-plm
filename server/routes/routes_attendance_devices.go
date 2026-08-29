package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerAttendanceDeviceRoutes(authorized *gin.RouterGroup) {
	attendanceGroup := authorized.Group("/attendance-devices")
	attendanceGroup.Use(middleware.RequireAnyPermission(authz.MenuOrg))
	{
		attendanceGroup.GET("", handlers.GetAttendanceDevicesHandler)
		attendanceGroup.GET("/templates", handlers.GetAttendanceDeviceTemplatesHandler)
		attendanceGroup.GET("/events", handlers.ListAttendanceEventsHandler)
		attendanceGroup.GET("/mappings", handlers.ListAttendanceDeviceMappingsHandler)

		deviceManage := middleware.RequireAnyPermission(authz.ActionAttendanceDeviceManage, authz.PermissionManage)
		attendanceGroup.POST("", deviceManage, handlers.SaveAttendanceDeviceHandler)
		attendanceGroup.DELETE("/:id", deviceManage, handlers.DeleteAttendanceDeviceHandler)
		attendanceGroup.POST("/:id/test", deviceManage, handlers.TestAttendanceDeviceHandler)
		attendanceGroup.POST("/:id/sync", deviceManage, handlers.SyncAttendanceDeviceHandler)
		attendanceGroup.POST("/:id/ingress-token", deviceManage, handlers.SetAttendanceIngressTokenHandler)
		attendanceGroup.POST("/:id/mappings", deviceManage, handlers.SaveAttendanceDeviceMappingHandler)
		attendanceGroup.DELETE("/mappings/:id", deviceManage, handlers.DeleteAttendanceDeviceMappingHandler)
	}
}
