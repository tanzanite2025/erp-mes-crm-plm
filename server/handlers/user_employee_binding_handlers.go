package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type BindUserEmployeeRequest struct {
	EmployeeID string `json:"employeeId" binding:"required"`
}

func BindUserEmployeeHandler(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("id"))
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] user id is required"})
		return
	}

	var input BindUserEmployeeRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	employeeRef := strings.TrimSpace(input.EmployeeID)
	if employeeRef == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] employeeId cannot be empty"})
		return
	}

	updatedUser, err := services.BindUserEmployee(auditContextFromGin(c), userID, employeeRef)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrProtectedUserMutation):
			c.JSON(http.StatusForbidden, gin.H{"error": "Protected account employee binding cannot be modified"})
		case errors.Is(err, services.ErrUserEmployeeBindingTargetNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] employee does not exist"})
		case errors.Is(err, services.ErrUserEmployeeAlreadyBound):
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] employee is already bound to another account"})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to bind employee"})
		}
		return
	}
	c.JSON(http.StatusOK, mapUserToResponse(updatedUser))
}

func UnbindUserEmployeeHandler(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("id"))
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] user id is required"})
		return
	}

	updatedUser, err := services.UnbindUserEmployee(auditContextFromGin(c), userID)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrProtectedUserMutation):
			c.JSON(http.StatusForbidden, gin.H{"error": "Protected account employee binding cannot be modified"})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unbind employee"})
		}
		return
	}
	c.JSON(http.StatusOK, mapUserToResponse(updatedUser))
}
