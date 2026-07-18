package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type BulkSyncUserRequest struct {
	ID          string `json:"id" binding:"required"`
	Username    string `json:"username"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phoneNumber"`
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	Status      string `json:"status"`
	EmployeeID  string `json:"employeeId"`
}

func BulkSyncUsersHandler(c *gin.Context) {
	if !enforceBulkSyncPermissions(c) {
		return
	}

	var input []BulkSyncUserRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid bulk sync payload: " + err.Error()})
		return
	}

	serviceInput := make([]services.BulkSyncUserInput, 0, len(input))
	for _, item := range input {
		serviceInput = append(serviceInput, services.BulkSyncUserInput{
			ID:          item.ID,
			Username:    item.Username,
			Email:       item.Email,
			PhoneNumber: item.PhoneNumber,
			FirstName:   item.FirstName,
			LastName:    item.LastName,
			Status:      item.Status,
			EmployeeID:  item.EmployeeID,
		})
	}

	result, err := services.BulkSyncUsers(auditContextFromGin(c), serviceInput)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrUserBulkSyncInvalidPayload), errors.Is(err, services.ErrUserEmployeeBindingTargetNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrUserBulkSyncUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrUserEmployeeAlreadyBound):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_SYNC_FAILED] bulk sync users failed and was rolled back"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":           "success",
		"count":            result.Updated,
		"skippedProtected": result.SkippedProtected,
	})
}
