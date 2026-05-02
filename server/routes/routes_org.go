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
	orgUpdate := middleware.RequirePermissions(authz.ActionOrgProfileUpdate)
	orgDelete := middleware.RequirePermissions(authz.PermissionManage, authz.PermissionUserDelete)
	employeeWrite := middleware.RequirePermissions(authz.PermissionManage, authz.PermissionUserCreate, authz.PermissionUserEdit)
	employeeUpdate := middleware.RequirePermissions(authz.ActionEmployeeUpdate)
	employeeDelete := middleware.RequirePermissions(authz.PermissionManage, authz.PermissionUserDelete)
	employeeImportPreview := middleware.RequirePermissions(authz.ActionEmployeeImportPreview)
	employeeImportCommit := middleware.RequirePermissions(authz.ActionEmployeeImportCommit)

	authorized.GET("/org/tree", middleware.RequirePermissions(authz.MenuOrg), handlers.GetOrgTreeHandler)
	authorized.GET("/stats/excellence", middleware.RequirePermissions(authz.MenuOrg), handlers.GetExcellentRankingHandler)

	authorized.POST("/org", orgWrite, handlers.SaveOrgHandler)
	authorized.PATCH("/org/:id", orgUpdate, handlers.PatchOrgHandler)
	authorized.POST("/org/sync", adminOnly, handlers.BulkSyncOrgHandler)
	authorized.DELETE("/org/:id", orgDelete, handlers.DeleteOrgHandler)
	authorized.GET("/employees", middleware.RequirePermissions(authz.MenuOrg), handlers.GetEmployeesHandler)
	authorized.GET("/employees/:id", middleware.RequirePermissions(authz.ActionHRDetailView), handlers.GetEmployeeDetailHandler)
	authorized.GET("/positions", middleware.RequirePermissions(authz.MenuOrg), handlers.GetPositionsHandler)
	authorized.POST("/employees", employeeWrite, handlers.SaveEmployeeHandler)
	authorized.PATCH("/employees/:id", employeeUpdate, handlers.PatchEmployeeHandler)
	authorized.POST("/employees/:id/change-org-unit", employeeUpdate, handlers.ChangeEmployeeOrgUnitHandler)
	authorized.POST("/employees/:id/change-position", employeeUpdate, handlers.ChangeEmployeePositionHandler)
	authorized.POST("/employees/:id/clear-position", employeeUpdate, handlers.ClearEmployeePositionHandler)
	authorized.PATCH("/employees/status", employeeWrite, handlers.BulkUpdateEmployeeStatusHandler)
	authorized.POST("/employees/import/preview", employeeImportPreview, handlers.PreviewEmployeeImportHandler)
	authorized.POST("/employees/import/commit", employeeImportCommit, handlers.CommitEmployeeImportHandler)
	authorized.POST("/employees/sync", adminOnly, handlers.BulkSyncEmployeesHandler)
	authorized.DELETE("/employees/:id", employeeDelete, handlers.DeleteEmployeeHandler)
}
