package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerAuthzRoutes(authorized *gin.RouterGroup) {
	permissionPresetManage := middleware.RequireAnyPermission(authz.PermissionManage)

	permissionPresetGroup := authorized.Group("/permission-presets")
	{
		permissionPresetGroup.GET("", middleware.RequireAnyPermission(authz.TabPersonnelAccounts, authz.TabPersonnelRights, authz.PermissionUserView, authz.PermissionManage), handlers.GetPermissionPresetsHandler)
		permissionPresetGroup.POST("", permissionPresetManage, handlers.UpsertPermissionPresetHandler)
		permissionPresetGroup.DELETE("/:id", permissionPresetManage, handlers.DeletePermissionPresetHandler)
	}
}
