package routes

import (
	"xdfc-server/authz"
	"xdfc-server/middleware"
	apsenginehandler "xdfc-server/modules/aps-scheduling-engine/api/handler"

	"github.com/gin-gonic/gin"
)

func registerApsSchedulingRoutes(authorized *gin.RouterGroup) {
	apsSchedulingRead := middleware.RequirePermissions(authz.MenuPiecework)
	apsEngineAPIHandler := apsenginehandler.NewAPIHandler(nil)

	apsSchedulingGroup := authorized.Group("/aps-scheduling")
	{
		apsSchedulingGroup.POST("/plans", apsSchedulingRead, apsEngineAPIHandler.CreatePlan)
		apsSchedulingGroup.GET("/plans", apsSchedulingRead, apsEngineAPIHandler.ListPlans)
		apsSchedulingGroup.GET("/plans/:id", apsSchedulingRead, apsEngineAPIHandler.GetPlan)
		apsSchedulingGroup.POST("/plans/:id/recalculate", apsSchedulingRead, apsEngineAPIHandler.RecalculatePlan)
		apsSchedulingGroup.POST("/events", apsSchedulingRead, apsEngineAPIHandler.IngestEvent)
	}
}
