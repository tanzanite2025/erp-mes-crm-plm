package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

// registerBusinessAnalysisRoutes exposes read-only cross-domain analysis
// endpoints. Domain facts remain owned by their source modules.
func registerBusinessAnalysisRoutes(authorized *gin.RouterGroup) {
	analysisGroup := authorized.Group("/business-analysis")
	analysisGroup.Use(middleware.RequireAnyPermission(authz.MenuBusinessAnalysis))
	{
		analysisGroup.GET(
			"/production-capacity/options",
			handlers.GetBusinessAnalysisProductionCapacityOptionsHandler,
		)
		analysisGroup.GET(
			"/production-capacity",
			handlers.GetBusinessAnalysisProductionCapacityHandler,
		)
	}
}
