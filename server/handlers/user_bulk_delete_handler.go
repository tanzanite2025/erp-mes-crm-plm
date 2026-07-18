package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type BulkDeleteUsersRequest struct {
	UserIDs []string `json:"userIds" binding:"required"`
}

func BulkDeleteUsersHandler(c *gin.Context) {
	var input BulkDeleteUsersRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] userIds are required"})
		return
	}

	deletedCount, err := services.BulkDeleteUsers(
		auditContextFromGin(c),
		strings.TrimSpace(middleware.GetSafeUserID(c)),
		input.UserIDs,
	)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrUserBulkDeleteInvalidPayload):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrUserBulkDeleteTargetNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrUserBulkDeleteSelf), errors.Is(err, services.ErrProtectedUserMutation):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete users"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"deleted": deletedCount})
}
