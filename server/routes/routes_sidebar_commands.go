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
		sidebarCommands.GET("/categories", middleware.RequireAnyPermission(authz.MenuSettings), handlers.GetSidebarCommandCategoriesHandler)
		sidebarCommands.POST("/categories", middleware.RequireAnyPermission(authz.MenuSettings), handlers.CreateSidebarCommandCategoryHandler)
		sidebarCommands.PUT("/categories/:categoryId", middleware.RequireAnyPermission(authz.MenuSettings), handlers.UpdateSidebarCommandCategoryHandler)
		sidebarCommands.PATCH("/categories/:categoryId/enabled", middleware.RequireAnyPermission(authz.MenuSettings), handlers.SetSidebarCommandCategoryEnabledHandler)
		sidebarCommands.GET("/library", middleware.RequireAnyPermission(authz.MenuSettings), handlers.GetSidebarCommandLibraryHandler)
		sidebarCommands.POST("/library", middleware.RequireAnyPermission(authz.MenuSettings), handlers.CreateSidebarCommandDefinitionHandler)
		sidebarCommands.PUT("/library/sort", middleware.RequireAnyPermission(authz.MenuSettings), handlers.ReorderSidebarCommandDefinitionsHandler)
		sidebarCommands.PUT("/library/:commandId", middleware.RequireAnyPermission(authz.MenuSettings), handlers.UpdateSidebarCommandDefinitionHandler)
		sidebarCommands.PATCH("/library/:commandId/enabled", middleware.RequireAnyPermission(authz.MenuSettings), handlers.SetSidebarCommandDefinitionEnabledHandler)
		sidebarCommands.GET("/commands", middleware.RequireAnyPermission(authz.MenuSettings), handlers.GetAssignableSidebarCommandsHandler)
		sidebarCommands.GET("/users", middleware.RequireAnyPermission(authz.MenuSettings), handlers.GetSidebarCommandAssignmentUsersHandler)
		sidebarCommands.GET("/users/:id", middleware.RequireAnyPermission(authz.MenuSettings), handlers.GetUserSidebarCommandAssignmentHandler)
		sidebarCommands.PUT("/users/:id", middleware.RequireAnyPermission(authz.MenuSettings), handlers.ReplaceUserSidebarCommandAssignmentHandler)
		sidebarCommands.POST("/batch", middleware.RequireAnyPermission(authz.MenuSettings), handlers.BatchAssignSidebarCommandsHandler)
		sidebarCommands.POST("/copy", middleware.RequireAnyPermission(authz.MenuSettings), handlers.CopySidebarCommandAssignmentHandler)
	}
}
