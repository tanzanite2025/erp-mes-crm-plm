package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerLeaveRoutes(authorized *gin.RouterGroup) {
	leaveGroup := authorized.Group("/leaves")
	leaveGroup.Use(middleware.RequireAnyPermission(authz.MenuOrg))
	{
		leaveGroup.GET("/my", handlers.GetLeaveRequestsHandler)
		leaveGroup.GET("/stats", handlers.GetLeaveStatsHandler)
		leaveGroup.POST("/preview", handlers.PreviewLeaveRequestHandler)
		leaveGroup.POST("", handlers.CreateLeaveRequestHandler)
		leaveGroup.POST("/:id/cancel", handlers.CancelLeaveRequestHandler)
	}
}
