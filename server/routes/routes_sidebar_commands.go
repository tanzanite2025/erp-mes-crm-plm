package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerSidebarCommandRoutes(authorized *gin.RouterGroup) {
	sidebarCommands := authorized.Group("/quick-actions/sidebar")
	{
		sidebarCommands.GET("/me", handlers.GetMySidebarCommandsHandler)
		sidebarCommands.GET("/categories", middleware.RequirePermissions(authz.MenuSettings), handlers.GetSidebarCommandCategoriesHandler)
		sidebarCommands.POST("/categories", middleware.RequirePermissions(authz.MenuSettings), handlers.CreateSidebarCommandCategoryHandler)
		sidebarCommands.PUT("/categories/:categoryId", middleware.RequirePermissions(authz.MenuSettings), handlers.UpdateSidebarCommandCategoryHandler)
		sidebarCommands.PATCH("/categories/:categoryId/enabled", middleware.RequirePermissions(authz.MenuSettings), handlers.SetSidebarCommandCategoryEnabledHandler)
		sidebarCommands.GET("/library", middleware.RequirePermissions(authz.MenuSettings), handlers.GetSidebarCommandLibraryHandler)
		sidebarCommands.POST("/library", middleware.RequirePermissions(authz.MenuSettings), handlers.CreateSidebarCommandDefinitionHandler)
		sidebarCommands.PUT("/library/sort", middleware.RequirePermissions(authz.MenuSettings), handlers.ReorderSidebarCommandDefinitionsHandler)
		sidebarCommands.PUT("/library/:commandId", middleware.RequirePermissions(authz.MenuSettings), handlers.UpdateSidebarCommandDefinitionHandler)
		sidebarCommands.PATCH("/library/:commandId/enabled", middleware.RequirePermissions(authz.MenuSettings), handlers.SetSidebarCommandDefinitionEnabledHandler)
		sidebarCommands.GET("/commands", middleware.RequirePermissions(authz.MenuSettings), handlers.GetAssignableSidebarCommandsHandler)
		sidebarCommands.GET("/users", middleware.RequirePermissions(authz.MenuSettings), handlers.GetSidebarCommandAssignmentUsersHandler)
		sidebarCommands.GET("/users/:id", middleware.RequirePermissions(authz.MenuSettings), handlers.GetUserSidebarCommandAssignmentHandler)
		sidebarCommands.PUT("/users/:id", middleware.RequirePermissions(authz.MenuSettings), handlers.ReplaceUserSidebarCommandAssignmentHandler)
		sidebarCommands.POST("/batch", middleware.RequirePermissions(authz.MenuSettings), handlers.BatchAssignSidebarCommandsHandler)
		sidebarCommands.POST("/copy", middleware.RequirePermissions(authz.MenuSettings), handlers.CopySidebarCommandAssignmentHandler)
	}
}
