package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerOrgRoutes(authorized *gin.RouterGroup) {
	adminOnly := middleware.RequirePermissions(authz.PermissionManage)

	orgWrite := middleware.RequirePermissions(authz.PermissionManage, authz.PermissionUserCreate, authz.PermissionUserEdit)
	orgDelete := middleware.RequirePermissions(authz.PermissionManage, authz.PermissionUserDelete)
	employeeWrite := middleware.RequirePermissions(authz.PermissionManage, authz.PermissionUserCreate, authz.PermissionUserEdit)
	employeeDelete := middleware.RequirePermissions(authz.PermissionManage, authz.PermissionUserDelete)

	authorized.GET("/org/tree", middleware.RequirePermissions(authz.MenuOrg), handlers.GetOrgTreeHandler)
	authorized.GET("/stats/excellence", middleware.RequirePermissions(authz.MenuOrg), handlers.GetExcellentRankingHandler)

	authorized.POST("/org", orgWrite, handlers.SaveOrgHandler)
	authorized.PATCH("/org/:id", orgWrite, handlers.PatchOrgHandler)
	authorized.POST("/org/sync", adminOnly, handlers.BulkSyncOrgHandler)
	authorized.DELETE("/org/:id", orgDelete, handlers.DeleteOrgHandler)
	authorized.GET("/employees", middleware.RequirePermissions(authz.MenuOrg), handlers.GetEmployeesHandler)
	authorized.POST("/employees", employeeWrite, handlers.SaveEmployeeHandler)
	authorized.PATCH("/employees/:id", employeeWrite, handlers.PatchEmployeeHandler)
	authorized.PATCH("/employees/status", employeeWrite, handlers.BulkUpdateEmployeeStatusHandler)
	authorized.POST("/employees/import/preview", adminOnly, handlers.PreviewEmployeeImportHandler)
	authorized.POST("/employees/import/commit", adminOnly, handlers.CommitEmployeeImportHandler)
	authorized.POST("/employees/sync", adminOnly, handlers.BulkSyncEmployeesHandler)
	authorized.DELETE("/employees/:id", employeeDelete, handlers.DeleteEmployeeHandler)
}
