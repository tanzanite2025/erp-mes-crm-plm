package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerUserRoutes(authorized *gin.RouterGroup) {
	authorized.GET("/users", middleware.RequireAnyPermission(authz.TabPersonnelAccounts, authz.TabPersonnelRights, authz.PermissionUserView, authz.PermissionManage), handlers.GetUsersHandler)
	authorized.GET("/users/options", middleware.RequireAnyPermission(authz.TabPersonnelAccounts, authz.TabPersonnelRights, authz.MenuSystem, authz.PermissionUserView, authz.PermissionManage), handlers.GetUserOptionsHandler)
	authorized.POST("/users/admin/verify", middleware.RequireAnyPermission(authz.PermissionManage), handlers.VerifyAdminChallengeHandler)
	authorized.GET("/users/:id/access", middleware.RequireAnyPermission(authz.TabPersonnelRights, authz.PermissionManage), handlers.GetUserAccessSnapshotHandler)
	authorized.GET("/users/:id/permissions", middleware.RequireAnyPermission(authz.TabPersonnelRights, authz.PermissionManage), handlers.GetUserPermissionsHandler)
	authorized.PUT("/users/:id/permissions", middleware.RequireAnyPermission(authz.PermissionManage), handlers.ReplaceUserPermissionsHandler)
	authorized.POST("/users/:id/bind-employee", middleware.RequireAnyPermission(authz.PermissionManage), handlers.BindUserEmployeeHandler)
	authorized.POST("/users/:id/unbind-employee", middleware.RequireAnyPermission(authz.PermissionManage), handlers.UnbindUserEmployeeHandler)
	authorized.POST("/users", middleware.RequireAnyPermission(authz.PermissionUserCreate), handlers.CreateUserHandler)
	authorized.PATCH("/users/:id", middleware.RequireAnyPermission(authz.PermissionUserEdit), handlers.PatchUserHandler)
	authorized.PUT("/users/:id", middleware.RequireAnyPermission(authz.PermissionUserEdit), handlers.ReplaceUserHandler)
	authorized.DELETE("/users/:id", middleware.RequireAnyPermission(authz.PermissionUserDelete), handlers.DeleteUserHandler)
	authorized.POST("/users/bulk-delete", middleware.RequireAnyPermission(authz.PermissionUserDelete), handlers.BulkDeleteUsersHandler)
	authorized.POST("/users/sync", middleware.RequireAnyPermission(authz.PermissionManage), handlers.BulkSyncUsersHandler)
}
