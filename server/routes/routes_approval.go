package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerApprovalRoutes(authorized *gin.RouterGroup) {
	approvalConfigManage := middleware.RequirePermissions(authz.ActionApprovalConfigManage)
	approvalReview := middleware.RequirePermissions(authz.ActionApprovalReview)

	approvals := authorized.Group("/approvals")
	{
		approvals.GET("/configs", middleware.RequirePermissions(authz.MenuApproval), handlers.GetApprovalConfigsHandler)
		approvals.POST("/configs", approvalConfigManage, handlers.SaveApprovalConfigHandler)
		approvals.DELETE("/configs/:id", approvalConfigManage, handlers.DeleteApprovalConfigHandler)
		approvals.POST("/request", handlers.RequestApprovalHandler)
		approvals.GET("/my", middleware.RequirePermissions(authz.MenuApproval), handlers.GetMyApprovalsHandler)
		approvals.PATCH("/:id/approve", approvalReview, handlers.ApproveRequestHandler)
		approvals.POST("/verify", handlers.VerifyAuthCodeHandler)
	}
}
