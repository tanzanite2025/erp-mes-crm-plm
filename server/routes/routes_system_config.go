package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

// registerSystemConfigRoutes registers system configuration management routes.
func registerSystemConfigRoutes(authorized *gin.RouterGroup) {
	configManage := middleware.RequirePermissions(authz.PermissionManage)
	configGroup := authorized.Group("/system/configs")
	{
		configGroup.GET("", middleware.RequirePermissions(authz.MenuSystem), handlers.GetSystemConfigsHandler)
		configGroup.POST("", configManage, handlers.UpdateSystemConfigHandler)
	}
}
