package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerWorkflowRoutes(authorized *gin.RouterGroup) {
	workflowRead := middleware.RequirePermissions(authz.MenuApproval)
	workflowDefineManage := middleware.RequirePermissions(authz.ActionApprovalConfigManage)
	workflowTaskReview := middleware.RequirePermissions(authz.ActionApprovalReview)

	workflows := authorized.Group("/workflows")
	{
		workflows.GET("/definitions", workflowRead, handlers.GetWorkflowDefinitionsHandler)
		workflows.POST("/definitions", workflowDefineManage, handlers.SaveWorkflowDefinitionHandler)
		workflows.GET("/instances", workflowRead, handlers.GetWorkflowInstancesHandler)
		workflows.POST("/instances", workflowDefineManage, handlers.CreateWorkflowInstanceHandler)
		workflows.GET("/tasks", workflowRead, handlers.GetWorkflowTasksHandler)
		workflows.PATCH("/tasks/:id/approve", workflowTaskReview, handlers.ApproveWorkflowTaskHandler)
		workflows.PATCH("/tasks/:id/reject", workflowTaskReview, handlers.RejectWorkflowTaskHandler)
	}
}
