package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerProductionMaterialIssuanceWarehouseReviewAllocationSuggestionAndMovementConfirmationRoutes(authorized *gin.RouterGroup) {
	review := authorized.Group("/mrp/production-material-issuance")
	review.Use(middleware.RequireAnyPermission(authz.MenuMrp, authz.TabMrpRequirements, authz.TabMrpProductionMaterialIssuance, authz.MenuWarehouse))
	review.Use(middleware.RequireAnyPermission(authz.ActionProductionMaterialIssuanceView))
	review.GET("/documents/:id/warehouse-review", handlers.GetProductionMaterialIssuanceWarehouseReviewHandler)
	review.POST("/documents/:id/ordinary-allocation-suggestion", handlers.SuggestProductionMaterialIssuanceOrdinaryOrderLineAllocationsHandler)
	review.POST("/documents/:id/material-batches", handlers.GetProductionMaterialIssuanceVersionedMaterialBatchAvailabilityHandler)

	// Inventory custody transfers require warehouse access and their own explicit
	// action. MRP access, dispatch, withdrawal and sales shipment cannot substitute.
	confirmation := authorized.Group("/mrp/production-material-issuance")
	confirmation.Use(middleware.RequireAnyPermission(authz.MenuWarehouse))
	confirmation.Use(middleware.RequireAnyPermission(authz.ActionProductionMaterialIssuanceView))
	confirmation.POST("/documents/:id/issue", middleware.RequireAnyPermission(authz.ActionProductionMaterialIssuanceWarehouseIssue), handlers.ConfirmProductionMaterialIssuanceOrdinaryWarehouseIssueHandler)
	confirmation.POST("/documents/:id/supplement", middleware.RequireAnyPermission(authz.ActionProductionMaterialIssuanceWarehouseSupplement), handlers.ConfirmProductionMaterialIssuanceWarehouseSupplementHandler)
	confirmation.POST("/documents/:id/return", middleware.RequireAnyPermission(authz.ActionProductionMaterialIssuanceWarehouseReturn), handlers.ConfirmProductionMaterialIssuanceWarehouseReturnHandler)
}
