package routes

import (
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

// This route intentionally requires only an authenticated identity, never user_edit.
func registerAuthenticatedUserPasswordChangeRoutes(authorized *gin.RouterGroup) {
	authorized.POST("/auth/change-password", middleware.AuthenticatedUserPasswordChangeRateLimitMiddleware(), handlers.ChangeAuthenticatedUserPasswordHandler)
}
