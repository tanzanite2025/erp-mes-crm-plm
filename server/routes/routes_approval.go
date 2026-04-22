package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerApprovalRoutes(authorized *gin.RouterGroup) {
	approvalReview := middleware.RequirePermissions(authz.ActionApprovalReview)

	approvals := authorized.Group("/approvals")
	{
		approvals.POST("/request", handlers.RequestApprovalHandler)
		approvals.GET("/my", middleware.RequirePermissions(authz.MenuApproval), handlers.GetMyApprovalsHandler)
		approvals.PATCH("/:id/approve", approvalReview, handlers.ApproveRequestHandler)
		approvals.POST("/verify", handlers.VerifyAuthCodeHandler)
	}
}
