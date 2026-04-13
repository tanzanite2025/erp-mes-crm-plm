package routes

import (
	"xdfc-server/handlers"

	"github.com/gin-gonic/gin"
)

func registerPersonalWorkbenchRoutes(authorized *gin.RouterGroup) {
	group := authorized.Group("/personal-workbench")
	{
		group.GET("/records", handlers.GetPersonalWorkbenchRecordsHandler)
		group.POST("/records", handlers.CreatePersonalWorkbenchRecordHandler)
		group.POST("/records/reorder", handlers.ReorderPersonalWorkbenchRecordsHandler)
		group.PATCH("/records/:id", handlers.PatchPersonalWorkbenchRecordHandler)
	}
}
