package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerCuttingOperationRoutes(authorized *gin.RouterGroup) {
	cuttingAccess := middleware.RequireAnyPermission(authz.MenuPiecework)
	sizeInventoryRecord := middleware.RequireAnyPermission(authz.ActionCuttingSizeInventoryRecord)

	cuttingGroup := authorized.Group("/cutting-operations")
	cuttingGroup.Use(cuttingAccess)
	{
		cuttingGroup.GET("/size-inventory", handlers.GetCutSizeInventoryHandler)
		cuttingGroup.POST("/size-inventory/records", sizeInventoryRecord, handlers.RecordCutSizeInventoryHandler)
	}
}
