package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerLeaveRoutes(authorized *gin.RouterGroup) {
	leaveGroup := authorized.Group("/leaves")
	leaveGroup.Use(middleware.RequirePermissions(authz.MenuOrg))
	{
		leaveGroup.GET("/my", handlers.GetMyLeaveRequestsHandler)
		leaveGroup.GET("/stats", handlers.GetMyLeaveStatsHandler)
		leaveGroup.POST("/preview", handlers.PreviewMyLeaveRequestHandler)
		leaveGroup.POST("", handlers.CreateMyLeaveRequestHandler)
		leaveGroup.POST("/:id/cancel", handlers.CancelMyLeaveRequestHandler)
	}
}
