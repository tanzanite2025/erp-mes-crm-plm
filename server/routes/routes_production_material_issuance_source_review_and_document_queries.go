package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

// These endpoints only read reviewed bases and existing documents. The view
// permission does not authorize dispatch, withdrawal or warehouse movements.
func registerProductionMaterialIssuanceSourceReviewAndDocumentQueryRoutes(authorized *gin.RouterGroup) {
	issuanceQueries := authorized.Group("/mrp/production-material-issuance")
	productionAccess := middleware.RequireAnyPermission(authz.MenuMrp, authz.TabMrpRequirements, authz.TabMrpProductionMaterialIssuance)
	documentAccess := middleware.RequireAnyPermission(authz.MenuMrp, authz.TabMrpRequirements, authz.TabMrpProductionMaterialIssuance, authz.MenuWarehouse)
	issuanceView := middleware.RequireAnyPermission(authz.ActionProductionMaterialIssuanceView)
	issuanceQueries.GET("/source-options", productionAccess, issuanceView, handlers.QueryProductionMaterialIssuanceSourceOptionsHandler)
	issuanceQueries.POST("/source-preparation", productionAccess, issuanceView, handlers.PrepareProductionMaterialIssuanceSourcesHandler)
	issuanceQueries.GET("/active-order-progress", productionAccess, issuanceView, handlers.QueryProductionMaterialIssuanceActiveOrderProgressHandler)
	issuanceQueries.POST("/source-review", productionAccess, issuanceView, handlers.ReviewProductionMaterialIssuanceSourcesHandler)
	issuanceQueries.GET("/documents", documentAccess, issuanceView, handlers.ListProductionMaterialIssuanceDocumentsHandler)
	issuanceQueries.GET("/documents/:id", documentAccess, issuanceView, handlers.GetProductionMaterialIssuanceDocumentHandler)
}
