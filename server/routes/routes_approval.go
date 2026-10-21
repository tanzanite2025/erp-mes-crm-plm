package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerApprovalRoutes(authorized *gin.RouterGroup) {
	approvalReview := middleware.RequireAnyPermission(authz.ActionApprovalReview)

	approvals := authorized.Group("/approvals")
	{
		approvals.POST("/request", handlers.RequestApprovalHandler)
		approvals.GET("/my", middleware.RequireAnyPermission(authz.MenuApproval), handlers.GetMyApprovalsHandler)
		approvals.GET("/policies", middleware.RequireAnyPermission(authz.MenuApproval), handlers.ListBusinessApprovalPolicyConfigurationsHandler)
		approvals.PUT("/policies/:businessType", middleware.RequireAnyPermission(authz.PermissionManage), handlers.SaveBusinessApprovalPolicyConfigurationHandler)
		approvals.PATCH("/:id/approve", approvalReview, handlers.ApproveRequestHandler)
		approvals.POST("/verify", handlers.VerifyAuthCodeHandler)
	}
}
