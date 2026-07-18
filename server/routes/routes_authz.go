package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerAuthzRoutes(authorized *gin.RouterGroup) {
	roleManage := middleware.RequireAnyPermission(authz.PermissionManage)

	roleGroup := authorized.Group("/roles")
	{
		roleGroup.GET("", middleware.RequireAnyPermission(authz.TabPersonnelAccounts, authz.TabPersonnelRights, authz.PermissionUserView, authz.PermissionManage), handlers.GetRolesHandler)
		roleGroup.POST("", roleManage, handlers.UpsertRoleHandler)
		roleGroup.DELETE("/:id", roleManage, handlers.DeleteRoleHandler)
	}
}
