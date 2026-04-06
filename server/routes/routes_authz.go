package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

// registerAuthzRoutes registers authorization-related management routes.
func registerAuthzRoutes(authorized *gin.RouterGroup) {

	roleManage := middleware.RequirePermissions(authz.PermissionManage)

	roleGroup := authorized.Group("/roles")
	{
		roleGroup.GET("", middleware.RequirePermissions(authz.MenuOrg), handlers.GetRolesHandler)
		roleGroup.POST("", roleManage, handlers.UpsertRoleHandler)
		roleGroup.DELETE("/:id", roleManage, handlers.DeleteRoleHandler)
	}

	configGroup := authorized.Group("/system/configs")
	{
		configGroup.GET("", middleware.RequirePermissions(authz.MenuSystem), handlers.GetSystemConfigsHandler)
		configGroup.POST("", roleManage, handlers.UpdateSystemConfigHandler)
	}
}
