package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerProductionMaterialIssuanceDispatchAndWithdrawalCommandRoutes(authorized *gin.RouterGroup) {
	commands := authorized.Group("/mrp/production-material-issuance")
	commands.Use(middleware.RequireAnyPermission(authz.MenuMrp, authz.TabMrpRequirements, authz.TabMrpProductionMaterialIssuance))
	commands.Use(middleware.RequireAnyPermission(authz.ActionProductionMaterialIssuanceView))
	commands.POST("/dispatch", middleware.RequireAnyPermission(authz.ActionProductionMaterialIssuanceDispatch), handlers.DispatchProductionMaterialIssuanceReviewedBasisHandler)
	commands.POST("/documents/:id/withdraw", middleware.RequireAnyPermission(authz.ActionProductionMaterialIssuanceWithdraw), handlers.WithdrawProductionMaterialIssuanceDocumentWithExpectedVersionHandler)
}
