package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func handleSidebarCommandError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, services.ErrSidebarCommandUserNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
	case errors.Is(err, services.ErrSidebarCommandDefinitionNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Sidebar command definition not found"})
	case errors.Is(err, services.ErrSidebarCommandDefinitionConflict):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrSidebarCommandCategoryNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Sidebar command category not found"})
	case errors.Is(err, services.ErrSidebarCommandCategoryConflict):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrSidebarCommandInvalid):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrSidebarCommandEmptyTargets):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, gorm.ErrInvalidDB):
		c.JSON(http.StatusInternalServerError, gin.H{"error": fallback})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": fallback})
	}
}
